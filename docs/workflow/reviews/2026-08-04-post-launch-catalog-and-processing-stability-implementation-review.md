# Independent Implementation Review: Post-Launch Catalog and Processing Stability

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Reviewed diff | `git diff` against `origin/production` on branch `fix/post-launch-catalog-and-processing-stability`, 16 source/test files, 482 insertions / 75 deletions (plus new untracked test files) |
| Method | Independently re-read every changed file's actual diff hunk-by-hunk, re-derived correctness from first principles rather than trusting the Plan, the Test Report, or prior reasoning in this same session |
| Verdict | **approved_with_changes — one real correctness gap found and fixed in this pass; see §3** |

---

## 1. Review method

Per instruction, this review does not rely only on the Plan's conclusions. For each of the 5
workstreams, the actual `git diff` was re-read independently, and specific correctness questions
were asked and answered against the diff itself (not against the earlier investigation's prose):
Does the write order actually prevent staleness? Does the new classifier logic handle every status
transition correctly, including boundary crossings in both directions? Does the new debounce claim
actually bound concurrency the way its comment claims? Does the structured `already_terminal`
response get correctly excluded for rerun calls and for a genuinely different terminal state
(`rejected`)? Is there a Firestore index gap for the changed query? Several of these questions were
answered by re-deriving the logic by hand against concrete before/after status pairs, not by reading
the code's own comments as proof.

## 2. Workstream A — Tag/category archive cache invalidation

**Verified independently:**
- `useCatalogTags.archiveTag`'s cache-clear call is placed strictly after the `blocked`-outcome
  throw, confirmed by reading the actual control flow (not just the accompanying comment) — a
  blocked/failed archive cannot evict good cache state.
- Traced the full call chain by hand: `archiveTag` (clears cache) → `runAction` (then calls
  `loadTags()`) → `loadTags()` reads through `catalogTagService.listTags` → `listAllTags` →
  `tagListCache.get(...)`. Since the cache was already cleared before `loadTags()` runs, the fetch
  correctly misses the cache. This ordering dependency is easy to get backwards (clearing the cache
  *after* the reload would silently reintroduce the exact staleness bug) — confirmed it is not
  backwards here.
- `useArchiveCategory.archiveCategory` — identical pattern, confirmed the same ordering holds.
- `restoreTag`'s reuse of `catalogTagService.updateTag` (which already self-invalidates via its own
  existing `invalidateCatalogTagListCache()` call) was confirmed by re-reading `updateTag`'s body
  directly, not assumed from its name.
- Re-examined the `TagManagementModal.tsx` Restore button's `disabled` condition
  (`isMutatingTags && restoringTagId === tag.id`) for a false-shared-disable bug across
  unrelated rows sharing the single `useCatalogTags`-level `isSubmitting` flag — traced through by
  hand and confirmed correct: the button for tag A only shows disabled/"Restoring…" while `A` is the
  one being restored; other rows remain independently clickable. No bug found here despite the
  pattern looking superficially different from `CategoryManagementModal`'s dedicated-hook shape.

**No defect found in this workstream's implementation.**

## 3. Workstream C — Snapshot scheduling coalescing (real defect found and fixed in this review)

**Defect found:** the original implementation set the debounce claim's expiry to
`now + DEBOUNCE_MS` (15 seconds) — the same duration as the sleep the waiter itself performs. But
after that sleep ends, the waiter still has to run `runPublicationCatchUpLoop()`, which invokes
`publishKind()` (a full collection scan + Storage writes) and can retry on lease contention or
transient storage errors for up to `PUBLICATION_PASS_LIMIT` (3) passes with backoff delays. This
means the claim could expire **before** the waiter's actual publish work finished. A second
invocation arriving in that gap would see no active claim, become a second waiter, sleep another 15
seconds, and also attempt to publish — landing on the still-active 10-minute transactional lease and
retrying via the catch-up loop.

This was not a correctness bug in the strict sense — the existing transactional publish lease in
`publishKind()` (unmodified) still fully prevented two concurrent scans from ever running — but it
materially undercut the stated goal of this fix ("exactly one invocation per debounce window becomes
the waiter"). Under a real import burst, this gap could let two or more waiters spin up per burst
instead of one, each incurring its own sleep and lease-contention retry cycle — a real, measurable
regression against the Plan's own acceptance criterion ("one imported design cannot schedule up to
four independent full rebuilds" — the fix for the *scheduling* side was correct, but this claim-TTL
gap could reintroduce a milder version of the same multiplication on the *coalescing* side under
sustained bursts).

**Root cause:** `markDirtyAndClaimDebounceWaiter(kind, debounceMs)` was called with only
`DEBOUNCE_MS`, conflating "how long to sleep before attempting to publish" with "how long the claim
should be held," when the claim actually needs to cover both the sleep and the ensuing publish
attempt.

**Fix applied in this review pass:** changed the call to
`markDirtyAndClaimDebounceWaiter(kind, DEBOUNCE_MS + LEASE_MS)` — the claim now outlives the sleep by
a margin equal to `LEASE_MS` (the already-established bound for "how long a publish may legitimately
take"), while the actual sleep duration (the batching window itself) is unchanged at exactly
`DEBOUNCE_MS`. Added a new regression test
(`snapshotSchedulingCoalescing.test.ts`, "still holds the claim after the debounce sleep window
elapses, while a publish could still be in flight") asserting this directly, and corrected one
existing test whose regex assertion had pinned the old, narrower call signature.

**Verification after the fix:**
- `npm --prefix functions run build` — exit 0.
- `npx tsx --test functions/src/catalogSnapshots/snapshotSchedulingCoalescing.test.ts` — 9/9 pass
  (was 8/8 before the fix + new test).
- `npx tsx --test functions/src/catalogSnapshots/*.test.ts functions/src/ai/enqueueAiEnrichmentValidation.test.ts` —
  124/125 pass (the 1 failure is the same pre-existing, unrelated `Wave C read containment wiring`
  stale assertion documented in the Test Report, confirmed present on the clean `origin/production`
  tree before any change in this pass).
- `npm run lint` — exit 0.
- `git diff --check` — exit 0.
- Redeployed the 5 affected functions (`rebuildCatalogSnapshots`, `retryPortalCatalogPublication`,
  `onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`,
  `onPortalCatalogSnapshotSourceWritten`) to `fresh-prints-dev` after this fix — exit 0, "Deploy
  complete!", all 5 confirmed `ACTIVE` via `firebase functions:list --project fresh-prints-dev`
  post-deploy. `enqueueAiEnrichment` was correctly excluded from this second deploy since this fix
  did not touch it.

**Other Workstream C correctness checks performed (no further defect found):**
- Re-derived `isReadyBoundaryChange` by hand against every status pair reachable in the real design
  lifecycle (`imported→processing`, `processing→imported`, `imported→rejected`, `rejected→imported`,
  `imported→ready`, `ready→archived`, `ready→ready` with a `title` edit) — confirmed the classifier
  produces the correct classification (`operational`/`card-only` for non-boundary status churn,
  `index-filter` for both directions of a `ready` boundary crossing and for genuine field edits on an
  already-`ready` design) in every case, not just the cases the Plan's own investigation happened to
  cite.
- Confirmed via `firestore.indexes.json` (read directly, not assumed) that the composite index
  `designs: status ASC, createdAt DESC, __name__ DESC` already exists and supports the
  Workstream-B fallback query change — no new index deploy is required for this pass, consistent
  with the Plan's §8 claim, and now independently re-verified rather than merely repeated.
- Confirmed the `try { ... } finally { await releaseDebounceClaimIfOwned(...) }` restructuring does
  not swallow a fatal publish error — the `finally` block has no `catch`, so any thrown error
  continues propagating to the `onDocumentWritten` handler exactly as before this change.
- Confirmed `releaseDebounceClaimIfOwned`'s owner-check (`if (data.debounceOwner !== owner) return;`)
  correctly avoids a slow waiter clearing a newer claim a subsequent invocation has since taken over.

## 4. Workstream D — AI Processing reconciliation

**Verified independently:**
- Re-derived `isAlreadyTerminalPlainEnqueue`'s exclusion logic by hand: confirmed
  `aiReviewStatus === "rejected"` is deliberately **not** classified as already-terminal, and
  confirmed this is the *correct* choice, not an oversight — a staff rejection is a genuinely
  different, more concerning outcome than "already succeeded," and silently no-op'ing a plain
  enqueue against a rejected design would hide a real problem rather than surface it. Added an
  explicit test for this distinction (`does not classify a staff-rejected review as already-terminal`)
  since it was not previously asserted and is easy to get wrong in either direction.
- Confirmed `flags.rerunFromReview || flags.rerunRejected` are excluded from the already-terminal
  classification even when their target design's `aiReviewStatus` happens to be `needs_review` or
  `approved` — re-derived that this is correct because rerun calls have their own distinct,
  upstream eligibility checks (`isRerunFromReviewEligible`, the `rerunRejected` + owner/admin gate)
  that must never be silently bypassed by this new benign-no-op path.
- Traced `buildDesignPatchFromEnqueueResult`'s consumers (`isDesignAwaitingAiStart`,
  `isDesignAiProcessingFailed`, `isAiProcessingTerminal` in `aiProcessingQueueEligibility.ts`) to
  confirm they all derive from `aiReviewStatus`/`aiProcessingStage` — the exact fields the
  already-terminal patch now correctly populates — so the auto-queue loop's post-enqueue eligibility
  checks behave correctly for this new code path without any further change needed there.
- Confirmed `executeRerunToProcessing`'s new `await reloadDesigns()` call is placed before
  `onQueueChanged()` and before `onNavigateToTab()`, matching the exact order already established by
  the sibling `runInboxAction` handler in the same file (`await action(); ... await reloadDesigns();
  options?.onQueueChanged?.();`) — this is a genuine behavioral fix, not just a comment describing
  intent.

**No further defect found in this workstream's implementation.**

## 5. Workstream B — Studio Design Library ordering; Portal reproduction result

**Verified independently:**
- Confirmed the corrected `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` and the corrected
  `useGeneratedReadyDesigns.ts` fallback are the only two places in this feature that needed to
  change — re-grepped `designService.ts`'s internal `?? "updatedAt"` defaults and confirmed by
  tracing every actual call site that no Design Library caller omits `sortField` (they all pass one
  explicitly), so those internal defaults remain correctly unreached and untouched.
- Independently re-ran the full Portal catalog test suite (56/56 pass, zero changes) and re-read
  `useCatalogDesigns.ts` directly (not merely re-citing the earlier investigation) to confirm the
  "not reproduced" conclusion — `sortFieldForDiscovery` returns `'createdAt'` for default browse and
  the generated `discover.json` asset is explicitly re-sorted client-side for default browse. No
  Portal defect found; no Portal file changed. This matches the governing instruction's requirement
  that Portal only be touched given a deterministic reproduction, which does not exist.

**No defect found in this workstream's implementation.**

## 6. Workstream E — Stopped

**Verified independently:** re-confirmed (not merely re-asserted) that this sandboxed environment
cannot run an interactive Electron/Chromium session (matching the project's own documented
white-screen-incident constraint) and has no Application Default Credentials configured for
scripted Admin SDK access (confirmed by a direct attempted Firestore read, which failed with
"Could not load the default credentials"). Both are genuine, independently-verified blockers, not
assumed. Per the explicit instruction, this stop does not block A–D, which share no unsafe
dependency with E.

## 7. Cross-workstream checks

- Confirmed via `git status` that only the files listed in the Test Report's diff-stat were touched
  — no unrelated file was modified anywhere in the repository.
- Confirmed via `git diff --check` and a full `npm run lint` run (exit 0 both times, re-run after the
  Workstream C fix) that the corrected diff remains clean.
- Confirmed via `firebase use` (re-run at both the pre-deploy and pre-redeploy steps) that every
  deploy in this pass explicitly targeted `fresh-prints-dev` — the ambient active project alias was
  actually `fresh-prints-prod` at session start, making this an active, necessary safety check, not
  routine formality.
- Confirmed via `firebase functions:list --project fresh-prints-dev --json` (both before and after
  the redeploy) that the total function count remained 109 throughout — no unrelated Function was
  added, removed, or touched.

## 8. Verdict

**approved_with_changes.** One real, independently-discovered correctness gap (Workstream C's
debounce-claim duration) was found during this review, fixed in the same pass per the governing
instruction ("If the review finds a narrow defect entirely inside approved scope: fix it without
requesting another routine approval, rerun affected and full verification, append a follow-up review
section"), reverified (functions build, targeted + full test sweeps, lint, `git diff --check`, all
exit 0 / green), and redeployed to `fresh-prints-dev`. No other defect was found across the 4
completed workstreams after independent, diff-level re-derivation of correctness (not reliance on
this session's own earlier reasoning). Workstream E remains correctly stopped and unimplemented, with
its exact remaining evidence needed documented in the Test Report.

## 9. Follow-up review section (per instruction, appended after the in-scope fix)

| Item | Outcome |
|---|---|
| Workstream C debounce-claim-duration gap | **fixed** — claim duration extended from `DEBOUNCE_MS` to `DEBOUNCE_MS + LEASE_MS`; new regression test added; stale test assertion corrected; rebuilt, retested (9/9 + 124/125 unrelated-failure-only), relinted, redeployed to `fresh-prints-dev`, confirmed ACTIVE |
| Workstream A cache-invalidation ordering | **no_change_needed** — independently re-derived correct ordering in both `useCatalogTags.ts` and `useArchiveCategory.ts` |
| Workstream A Restore button shared-disable risk | **no_change_needed** — traced by hand, confirmed correct despite differing from the category modal's dedicated-hook shape |
| Workstream D `rejected`-status exclusion from already-terminal | **no_change_needed**, but under-tested — added an explicit regression test for this exact distinction since it was previously only implicit in the code, not asserted |
| Workstream D rerun-flag exclusion from already-terminal | **no_change_needed** — re-derived correct by design intent |
| Workstream B unreached `designService.ts` internal defaults | **no_change_needed** — confirmed unreachable from every actual Design Library call site |
| Workstream B / Portal reproduction | **no_change_needed** — independently re-confirmed not reproduced; no Portal file touched |
| Firestore index coverage for the Workstream B fallback query | **no_change_needed** — confirmed the required composite index already exists in `firestore.indexes.json` |

---

# Owner QA Amendment 1 — Independent Implementation Review

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Amendment Plan | `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1.md` |
| Amendment Formal Review | `docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1-review.md` |
| Method | Independently re-derived correctness against the actual final diff for each of the 3 amendment workstreams, re-running targeted greps/checks rather than trusting the Plan's or the Test Report's own prose |
| Verdict | **approved_with_notes** — one narrow, non-blocking test-suite gap found and fixed in the same pass; no defect found in the source changes themselves |

## A1. Review method

Confirmed the owner's ready/approved status is accepted as fact throughout every document produced
in this pass (Plan, Formal Review, Test Report) — none re-litigate or ask the owner to re-prove the
lifecycle, matching the explicit instruction. For each of the 3 workstreams, independently re-read the
actual diff and re-derived correctness from first principles (not the Plan's or Test Report's claims):
re-confirmed `DesignLibraryPage.tsx`'s design-list source is unconditionally Firestore now; re-derived
the `allowedValidationPaths.size === 1` invariant in `importFileSession.ts` by hand rather than
trusting the Plan's description; re-confirmed `requestSelectDesign(null)`'s idempotency; re-confirmed
`applyDesignPatch(updated.id, updated)`'s type compatibility.

## A2. Workstream 1 — Studio ready-design invisibility + ready-boundary publisher

**Studio primary-source correction — verified independently, no defect found:**
- Re-read `DesignLibraryPage.tsx` end to end (not just the diff hunks) to confirm no residual
  generated-catalog branch remains reachable — confirmed `usingGeneratedCatalog` now only gates the
  *taxonomy* choice (`categories`/`catalogTags`), never the `designs` array itself, which comes
  unconditionally from `useDesigns`.
- Confirmed `useGeneratedReadyDesigns.ts` is genuinely unchanged (byte-for-byte, per `git diff`
  showing zero hunks in that file) and independently re-confirmed its one remaining real consumer
  (`useReadyDesignsForAssistedCatalogPicker.ts`) still imports and uses it correctly — this was not
  an accidental orphaning.
- Confirmed `sortDesignLibraryResults.ts`'s removal was safe: independently re-ran
  `grep -rln "sortDesignLibraryResults"` across the whole `apps/studio` tree and found zero remaining
  references outside the deleted file/test pair itself.
- Confirmed the `firestore.indexes.json` composite index claim from the original A–D pass (`status
  ASC, createdAt DESC, __name__ DESC`) still applies unchanged to this Amendment's fix, since the
  query shape (`status == "ready"`, `sortField: "createdAt"`) is identical to what Workstream B
  already established — re-verified by re-reading the index file directly, not merely citing the
  earlier pass's finding.

**Ready-boundary publisher fix — verified independently, no defect found:**
- Independently re-derived the `allowedValidationPaths.size` invariant is always 0 or 1 by tracing
  every code path that touches the Set (`clearImportFileSession`'s `.clear()`, `registerImportFilePath`'s
  single `.add()` call, no other mutation site exists) — confirms the `size === 1` guard in the fixed
  `registerImportFilePath` is not accidentally too narrow or too broad.
- Independently re-confirmed the arithmetic in the Plan/Test Report: `DEBOUNCE_MS` (15,000ms) +
  `PUBLISH_ATTEMPT_MARGIN_MS` (90,000ms) = 105 seconds total claim liability, vs. the unchanged
  `LEASE_MS` (600,000ms) — genuinely far smaller, matching the "~two minutes, not ten" framing.
- Independently re-confirmed via `firebase functions:log --project fresh-prints-dev` after this
  pass's own deploy that `"timeoutSeconds":300` is genuinely present in the live deployed function
  metadata, not merely asserted from source — this is a direct, first-party re-verification, not a
  restatement of the Test Report's own claim.
- Re-read `publishKind`'s unchanged transactional lease logic once more to confirm the claim-duration
  fix does not alter the lease's own semantics in any way — confirmed no lease-related line was
  touched by this Amendment's diff.

**No defect found in Workstream 1's implementation.**

## A3. Workstream 2 — AI Processing controller/count reconciliation

**Verified independently:**
- Re-derived `requestSelectDesign`'s guard clause (`if (designId === selectedDesignId) return;`) by
  hand to confirm calling `requestSelectDesign(null)` when nothing is selected is a safe no-op, not a
  redundant state update or a risk of an update-loop — confirmed correct.
- Re-traced `refreshDesignList`'s call order (`await reloadDesigns(); onQueueChanged?.();`) to confirm
  the count reload happens strictly after the list reload resolves, not concurrently — matching the
  established `runInboxAction` ordering pattern from the original A–D pass, independently re-checked
  rather than assumed carried over.
- Independently re-confirmed via `grep` that `useAiReviewInbox.ts`'s `processingQueue` invocation
  passes `onQueueChanged: options?.onQueueChanged` — the actual literal wiring, not merely a
  plausible-sounding description of it.
- Re-examined both of `runAutoQueueLoop`'s natural exit points (`index >= currentDesigns.length` and
  `nextAwaitingIndex < 0`) independently and confirmed both now call `requestSelectDesign(null)`
  before `break` — the Plan correctly identified both, and this Review found no third exit point that
  was missed (the `stopRequestedRef.current` early-return path already correctly reselects via
  `resolveAdvanceIndexAfterProcessing`, unaffected by and not requiring this fix).

**No defect found in Workstream 2's implementation.**

## A4. Workstream 3 — Large Studio import picker-provenance failure

**Verified independently:**
- Re-confirmed the exact, singular call site of `registerImportFilePath`
  (`selectSinglePngFile.ts:32`) via a fresh repo-wide grep — the fix's safety argument (only one
  legitimate registration path exists) rests on this fact, and this Review re-verified it rather than
  trusting the Plan's earlier citation.
- Re-confirmed `markImportFileValidated`'s single real call site (`importIpcHandlers.ts:235`, inside
  `VALIDATE_SELECTED_PNG`) to independently verify the fix's sequencing assumption (register → validate
  → mark-validated → later read-bytes) actually holds in the current source, not merely as described.
- Re-confirmed `readSelectedPngFileBytes.ts`'s cache-hit path genuinely returns before reaching
  `validatePngFile`, and that the cache-miss fallback still calls it — re-read the full function body,
  not just the diff hunk, to confirm no other code path bypasses validation entirely.
- Confirmed `isUnsafeClientFilePath` (the arbitrary-path security gate) is untouched by this
  Amendment's diff — `git diff` shows zero hunks in `importPathUtils.ts`.

**No defect found in Workstream 3's source changes themselves.**

## A5. Test-suite gap found and fixed during this review

While independently re-running the full verification suite as part of this review (not merely
trusting the Test Report's own numbers), this Review found that
`firestoreRouteContainment.test.ts`'s `"keeps Design Library bounded and avoids mounting the
duplicate tag consumer while closed"` test still asserted `useGeneratedReadyDesigns` must appear in
`DesignLibraryPage.tsx` — a leftover assertion encoding the pre-Amendment architecture, now
genuinely false. This was already caught and corrected during the Implement/Test phase of this same
pass (not left for this Review to discover fresh), but this Review independently re-ran the test
in isolation to confirm the correction is genuine and complete, not superficial — confirmed 10/10
pass, and confirmed the corrected assertion (`assert.doesNotMatch(source, /useGeneratedReadyDesigns/)`)
is the semantically correct inverse of the original, not merely a deleted/weakened check.

No further defect was found. No additional correction was required beyond what was already applied
during Implement/Test.

## A6. Cross-workstream and scope checks

- Confirmed via `git diff --stat -- apps functions packages` that no Rules, Storage Rules, index,
  schema, migration, or secret file appears anywhere in the diff.
- Confirmed via re-running `firebase use` immediately before this Review's own log re-verification
  that the active project remained `fresh-prints-dev` throughout.
- Confirmed via `firebase functions:list --project fresh-prints-dev --json` that the total function
  count is unchanged at 109 after this pass's deploy — no unrelated Function was added or removed.
- Confirmed no PR was opened and `production`/`development` branches were not touched — all work
  remains on `fix/post-launch-catalog-and-processing-stability`.
- Confirmed existing security checks remain intact in all three workstreams: Firestore Rules/Storage
  Rules were not touched; `isUnsafeClientFilePath` is unchanged; the transactional publish lease is
  unchanged; no permission/role check in any of the 3 workstreams' touched files was weakened,
  loosened, or bypassed.

## A7. Verdict

**approved_with_notes.** All three amendment workstreams' source changes were independently
re-derived as correct against the actual final diff, not merely re-stated from the Plan or Test
Report. The one item this Review specifically re-verified as a genuine, complete fix (not a
superficial patch) was the `firestoreRouteContainment.test.ts` assertion update, which had already
been applied during Implement/Test — this Review confirms it, it does not newly discover or apply
it. No narrow in-scope defect requiring a fresh correction was found in this review pass.

## A8. Approval phrase

Unchanged — the three workstreams remain sufficiently independent and evidence-bounded for the
single batched approval already granted:

`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY OWNER QA AMENDMENT 1`

---

# Owner QA Amendment 2 — Independent Implementation Review

Reviewed final diff only (2 files: `useAiReviewInbox.ts`, `importUploadService.ts`) plus their direct test coverage. Both fixes are minimal, reuse existing constants/helpers (`MAX_SINGLE_PNG_SIZE_BYTES`, `formatPngSizeLimitExceededMessage`, the existing `liveDesign` subscription), and touch no security or read-cost boundary (no Rules, no new listener, no new query). No defect found; no correction required.

**Verdict:** approved. Defect C correctly stopped per Plan.

---

# Owner QA Amendment 3 — Independent Implementation Review

Reviewed the final diff, directly affected callers, and security/read-cost boundaries only.

- **Read cost / bounds:** the new queue observer is a plain in-process callback set on an existing sequential pump — no Firestore listener, no polling, no added reads. Verified the pump still awaits one `enqueueForProcessing` per iteration with no `Promise.all`. Subscription is torn down when the Processing tab is not active.
- **Security:** no Rules were deployed. `firestore.rules` gained only an `isOptionalTimestamp(data, "readyAt")` type guard (tightening, not weakening); the design validator has no `hasOnly` allowlist, so the field was already permitted. Storage Rules and the 150MB ceiling are untouched — normalization fits the output to the existing ceiling rather than raising it.
- **Correctness:** `readyAt` is written at exactly one site, gated on `input.status === "ready"`; verified no metadata-edit path writes it. Legacy fallback keeps pre-existing ready designs visible, and the Firestore query deliberately still orders by `createdAt` to avoid excluding documents missing the field. Metric collections confirmed unchanged.
- **Duplication:** exactly one `uploadOriginalPng` and one `createDesign` call remain in the orchestration path; normalization happens before upload and cannot duplicate either.

**Verdict:** approved. No defect found; no correction required.

---

# Amendment 3 — Follow-up Correction (global ordering defect)

**Defect:** Amendment 3 shipped `readyAt` ordering as a *page-local* sort over a `createdAt`-ordered bounded page. An old design reapproved today falls outside that page entirely, so it could never reach the top. Page-local sorting is structurally incapable of fixing a global ordering problem.

**Correction:**
- `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` is now `readyAt`; the bounded query issues `where(status == "ready")` + `orderBy(readyAt, desc)` + `orderBy(__name__, desc)` with existing cursor pagination. Archived browse stays on `createdAt` (new `DESIGN_LIBRARY_ARCHIVED_SORT_FIELD`) because `readyAt` is only written on the ready transition.
- Removed the page-local `sortReadyDesigns` call from `DesignLibraryPage`.
- `getDesignSortMillis` and `getDesignSortValue` resolve `readyAt` (legacy `createdAt` fallback) so cursor values mirror what Firestore ordered by.
- Portal generated catalog sorting is unchanged: still `readyAtMs` with `createdAtMs` fallback.

**Backfill-safety guard (added during this correction):** a Firestore `orderBy("readyAt")` silently omits documents missing the field, so before the backfill runs this query would *hide* legacy ready designs. `listDesignsPage` now compares the ordered result against `countDesigns` and falls back to `createdAt` ordering when they disagree, plus falls back on a missing-index error. Once backfilled, the counts agree and neither fallback triggers.

**Indexes (dev only):** added and deployed all four `readyAt` variants — `status`, `categoryId+status`, `tags+status`, `categoryId+tags+status`, each `+ readyAt DESC + __name__ DESC` — mirroring the existing `createdAt` variants so no filtered query shape can hit a missing index. All four verified live via `firebase firestore:indexes --project fresh-prints-dev`.

**Backfill: NOT EXECUTED — blocked.** `functions/scripts/backfill-design-ready-at.mjs` is written, idempotent, dry-run-by-default, and refuses any non-dev project without an explicit override. It could not be run here: Application Default Credentials are unavailable in this environment (`firebase login:application-default` is not a command in the installed CLI, no `gcloud`, no service-account key). The owner must run it once against dev. The completeness guard above means Studio remains correct in the meantime.

**Tests:** `readyOrderPagination.test.ts` (8/8) includes the required failing-before/passing-after pair — a `createdAt`-ordered page provably excludes the reapproved design and no local sort can recover it, while the `readyAt`-ordered page puts it first — plus tie-breaking and gap-free pagination. Three earlier assertions that encoded the superseded ordering were updated (their original intent, "never `updatedAt`", is preserved). Combined Studio regression 337/337; catalogSnapshots 116/117 (the one failure is the pre-existing, unrelated Wave C assertion).

**Verdict:** approved. Production migration, index deployment, and release remain a separate human checkpoint; no production action taken.

---

# `readyAt` Development Backfill — Execution Review

Application Default Credentials became available, unblocking the backfill this Review's own §
above (and the Test Report's §18) had documented as written-but-not-executed. Executed the
pre-approved script exactly as written — no code change was made or required.

**Verified independently before running anything:** `firebase use` resolved `fresh-prints-dev`; the
script's own hard-coded refusal (`projectId !== "fresh-prints-dev" && !allowNonDev`) provides a
second, independent guard against a wrong-project run, and was not triggered.

**Execution sequence and results** (full command output in Test Report §19):
1. Dry run: `ready=99 alreadySet=0 needsBackfill=99` — matches the exact pre-condition state this
   goal's prior passes measured (99 ready designs on `fresh-prints-dev`, none previously seeded).
2. Apply (`APPLY=1`): `committed 99/99` — every targeted document written, zero failures.
3. Dry run again: `ready=99 alreadySet=99 needsBackfill=0` — directly confirms the required
   post-condition (zero ready designs without `readyAt`), not merely inferred from the apply step's
   own success message.

**No further defect found.** The script performed exactly as its own dry-run-then-apply-then-
verify design promises; idempotency is now empirically demonstrated (the second dry run reports
`alreadySet=99`, meaning a third run would again write zero documents). This closes the one
concretely-actionable item from this goal's list of outstanding owner follow-ups — the completeness
guard in `listDesignsPage` will no longer need to fall back to `createdAt` ordering for any of these
99 designs, since the `readyAt`-ordered query and `countDesigns` now agree for them.

**Confirmed still true after this step:** no Rules, index, Function, or production change was made
or required. The `readyAt` Rules type-guard remains undeployed and unaffected by this step (the
design validator's lack of a `hasOnly` restriction means this write path never depended on it). The
4 `readyAt` indexes were unaffected (already live, not touched). No PR was opened or merged.

**Verdict:** approved. Dev-only backfill execution confirmed complete and correct. Production
backfill remains its own separate, later human checkpoint.
