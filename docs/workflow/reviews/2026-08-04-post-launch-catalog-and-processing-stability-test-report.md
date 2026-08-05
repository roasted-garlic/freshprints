# Test Report: Post-Launch Catalog and Processing Stability

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Branch | `fix/post-launch-catalog-and-processing-stability` (renamed from the Plan/Review-phase branch `docs/studio-v1.0.0-final-release-refresh-checkpoint`, which was exactly 1 commit ahead of `origin/production` and 0 behind — confirmed via `git rev-list --left-right --count origin/production...HEAD`) |
| Plan | `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-review.md` (`approved_with_notes`) |

---

## 1. Implementation summary by workstream

### Workstream A — Tag/category archive cache invalidation

**Root cause confirmed:** `archiveTagWithGuards`/`archiveCategoryWithGuards` write through the Admin SDK, bypassing the client-side `tagListCache`/`categoryListCache` entirely. The guarded-archive call chains (`useCatalogTags.archiveTag`, `useArchiveCategory.archiveCategory`) never invalidated those caches, even though a ready-made helper (`clearStudioTaxonomyCaches()`) already existed and was wired only into `AuthProvider`'s auth-transition reset. Independently re-confirmed against source during implementation (not just the Plan's citation).

**Fix:**
- `useCatalogTags.ts` — `archiveTag` now calls `clearStudioTaxonomyCaches()` immediately after a confirmed (non-blocked) `archiveTagWithGuards` success, before returning. Added a new `restoreTag` action (`catalogTagService.updateTag(user, tagId, { status: "approved" })`, which already self-invalidates via the existing client-write path).
- `useArchiveCategory.ts` — same fix pattern for `archiveCategoryWithGuards`.
- `TagManagementModal.tsx` — added a Restore button/flow for archived tags, mirroring `CategoryManagementModal.tsx`'s existing restore pattern (archived tags previously had no restore path in the UI at all).

**Failed writes do not falsely update local state:** the cache-clear call is placed strictly after the `result.outcome === "blocked"` check throws — verified by a dedicated ordering assertion in the new test file.

**No broad polling/reload loop introduced:** verified by an explicit `doesNotMatch(/setInterval|setTimeout/)` assertion.

### Workstream B — Studio Design Library newest-first ordering

**Root cause confirmed:** `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` was literally `"updatedAt"` (with a comment stating the inverse of the product rule), and `useGeneratedReadyDesigns.ts`'s Firestore-fallback path independently hardcoded `"updatedAt"` too. The primary generated-index path was already correct.

**Fix:**
- `designLibraryFilters.ts` — `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` → `"createdAt"`; corrected the comment.
- `useGeneratedReadyDesigns.ts` — fallback query and re-sort now use `"createdAt"`.
- Existing missing/malformed-`createdAt` fallback behavior (`compareOptionalMillis`: missing timestamps sort last) was already correct and preserved unchanged — confirmed by reading `sortDesignsForListQuery.ts`, no change needed there.
- `designService.ts`'s internal `?? "updatedAt"` defaults were audited and left unchanged: every actual Design Library caller passes an explicit `sortField`, so these defaults are unreached by this surface (AI Review and print-request callers intentionally use their own explicit fields and are out of this Plan's scope).

**Metric collections untouched:** no change to Popular/Most Liked/Recently Requested ranking anywhere; verified by a negative-match assertion (`requestCount|favoriteCount|lastAddedToShowAt|lastRequestedAt` must not appear in either changed file).

### Workstream B — Portal ordering reproduction result

**Result: not reproduced. No Portal source change made.**

Re-inspected `useCatalogDesigns.ts` directly during implementation: `sortFieldForDiscovery` returns `'createdAt'` for default (non-metric) browse; the generated `discover.json` asset (which is itself metric-ranked) is explicitly re-sorted client-side by `createdAtMs desc, id desc` for default browse; filtered/searched/tagged browse preserves the publisher's `createdAt desc` order through ID-list intersection; the direct-Firestore fallback also defaults to `createdAt desc`. Ran the full existing Portal catalog test suite (56/56 pass) with no changes — all consistent with `createdAt` descending being the actual behavior in current source. Per the explicit governing instruction, since no deterministic reproduction was found, Portal was left untouched.

### Workstream C — Snapshot scheduling and Firestore cost containment

**Root cause confirmed and quantified:** a single imported design could schedule up to 4 independent full `portal-catalog` rebuild attempts across its status lifecycle (create → processing → imported-with-derivatives → ready), because `status` was unconditionally in `INDEX_FILTER_FIELDS` even though `publishPortal`'s own query only ever reads `status == "ready"`. The 15-second debounce was a plain per-invocation `setTimeout`, so concurrent trigger invocations each independently slept and raced for the publish lease, multiplying coordination-doc reads/writes (though the existing transactional lease correctly prevented concurrent full scans).

**Fix implemented (exact architecture from the Plan/Review):**
1. **Narrowed scheduling trigger** (`portalCatalogChangeClassifier.ts`): `status` removed from the generic `INDEX_FILTER_FIELDS` diff; a new `isReadyBoundaryChange` check classifies a design write as `index-filter` only when it transitions into or out of `"ready"`. Status churn that never crosses that boundary (`imported`↔`processing`, `rejected`→`imported`, etc.) is now correctly classified `operational`/`card-only` and schedules nothing.
2. **Persistent debounce coalescing** (`publishCatalogSnapshots.ts`): replaced the bare `markDirty()` + unconditional `setTimeout` with `markDirtyAndClaimDebounceWaiter()` — a Firestore-transactional claim (`debounceOwner`/`debounceExpiresAt` fields on the coordination doc) that lets exactly one invocation per debounce window become the "waiter" that sleeps and publishes; every other invocation in the same window marks dirty and returns immediately, trusting the waiter's eventual publish (or the existing catch-up-loop generation check) to cover its dirty mark. `shouldBecomeDebounceWaiter` is the pure, exported decision function. The existing transactional publish lease in `publishKind()` is explicitly **unchanged** and remains the sole concurrency boundary for the actual scan/write — the new claim only reduces redundant sleeping/racing, never gates correctness.
3. **Attribution logging**: new `catalog-snapshot-scheduling` (claimed-waiter vs joined-existing-window, with `schedulingReason`), `catalog-snapshot-publication` info/warn (pass, duration, outcome, generation, approximate `readyDesignsRead`/`categoriesRead`/`tagsRead` counts) log events, always-on (not dev-project-gated, unlike the pre-existing detailed `portal-catalog-publication-accounting` logs which remain dev-only and unchanged in shape). No document contents, secrets, artwork metadata, or customer data are logged anywhere — verified by assertion.
4. **Last-valid-snapshot-serves-during-publish**: unchanged pre-existing behavior (the prior snapshot is never removed until the new one's manifest write succeeds) — explicitly preserved, not touched.
5. **No owner-pause UI**: not built, per explicit instruction that it is not required unless the approved Plan calls for it (it does not).

### Workstream D — AI Processing reconciliation

**Root cause confirmed (two compounding bugs):**
1. `enqueueAiEnrichment`'s plain-enqueue eligibility check threw a hard `failed-precondition` ("This design is no longer eligible for automatic AI enqueue.") for a stale/duplicate call against a design that had already reached its desired terminal state (`aiReviewStatus === "needs_review"` or `"approved"`) — a benign idempotency case, not a real failure.
2. `executeRerunToProcessing` (Studio) never called `reloadDesigns()`, relying solely on tab-navigation's own side-effect refetch to reconcile the Processing list; the count (`onQueueChanged`) was refreshed but the list was not guaranteed to be, unless the user happened to also change tabs.

**Fix implemented (both halves, per instruction):**
- **Backend structured response** (`enqueueAiEnrichmentValidation.ts` + `enqueueAiEnrichment.ts`): new `isAlreadyTerminalPlainEnqueue()` distinguishes this benign case; the callable now returns `{ queued: false, reason: "already_terminal", aiProcessingStage, aiReviewStatus, status }` instead of throwing, matching the existing `already_processing` structured-response pattern. Rerun calls (`rerunFromReview`/`rerunRejected`) are explicitly excluded from this classification — they have their own distinct eligibility checks and must never silently no-op.
- **Client reconciliation** (`enqueueResultPatch.ts`, `useAiProcessingQueue.ts`, `useAiReviewInbox.ts`): `buildDesignPatchFromEnqueueResult` now also builds a patch from an `already_terminal` result (previously only from `queued && completed`); `enqueueDesign` no longer throws when `reason === "already_terminal"`; `executeRerunToProcessing` now calls `reloadDesigns()` then `onQueueChanged()` before tab navigation, matching the established `runInboxAction` order used by every other inbox action in the same file.

**Genuine failures remain visible:** the `already_processing` throw path and the generic fallback throw are both unchanged and still tested.

**No design can be simultaneously retained in Processing and Needs Review locally, no late-async stale restoration:** this is a structural consequence of the fix — `reloadDesigns()` and `applyDesignPatch` both now consistently reflect the same authoritative response before selection/navigation proceeds, closing the window that previously allowed a stale list to persist.

### Workstream E — Studio import upload authorization

**Result: STOPPED. Not implemented.**

Per the governing instruction, the required first steps for this workstream are: (1) reproduce in `fresh-prints-dev` using an authorized owner account, (2) inspect read-only client and Firebase logs, (3) confirm the exact failing authorization stage, (4) confirm whether a forced ID-token refresh + one retry succeeds, (5) confirm the failure is not file-size/dimension/bucket/path related.

None of these can be performed from this environment: there is no interactive Electron/Chromium GUI available to run Studio, sign in as an owner, and attempt a real upload (the same, previously-documented limitation that blocked reproducing the 2026-07-30 Studio white-screen incident directly — see `.cursor/workflow/state.md`'s "this sandboxed environment cannot host a real Electron/Chromium GUI process" note). Application Default Credentials are also not configured in this environment (confirmed by attempting a direct Admin SDK Firestore read, which failed with "Could not load the default credentials"), so even a scripted, non-UI reproduction of the Storage-Rules-versus-client-bootstrap timing hypothesis is not possible here.

**Per the explicit instruction, this stop does not block A–D**, which have no unsafe shared dependency on E. A–D were completed, tested, deployed, and verified independently.

**Exact remaining evidence needed to close Workstream E** (unchanged from the Plan §7's open items, restated as the literal blocking checklist):
1. An authorized owner must run Studio (dev build or the packaged installer against `fresh-prints-dev`) and reproduce the first-upload-after-launch failure, capturing the exact Storage error code/message.
2. Firebase Console → Storage/Functions logs for the exact timestamp of that failed upload, to see the real `firestore.get(users/{uid})` evaluation Storage Rules performed at that moment.
3. The account's `users/{uid}` document's `isActive`/`role` field write timestamp, compared against the failed upload's timestamp, to test the "read-your-own-doc timing gap" hypothesis directly.
4. Confirmation of whether a manual forced `getIdToken(true)` + retry (with the *same* image, no reprocessing) succeeds, and how long after the first failure.

---

## 2. Portal ordering reproduction result (restated per required return item)

**Not reproduced. No Portal source change was made.** See Workstream B section above for the full trace re-confirmation.

---

## 3. Snapshot scheduling architecture implemented (restated per required return item)

Persistent debounce coalescing (one Firestore-transactional "debounce waiter" claim per kind per window) plus a narrowed `status`-transition trigger (only ready-boundary crossings schedule a full rebuild), built directly on top of the existing, unchanged transactional publish lease and existing last-valid-snapshot-serves-during-publish behavior. This is the exact architecture recommended in Plan §5 (Option 3 converging into Option 5), not a substitute design.

---

## 4. Before-and-after controlled Firestore cost results

**Not measured against live `fresh-prints-dev` data.** A live controlled-batch measurement (import N designs, count actual scheduling events vs. actual publisher executions) requires either an authenticated Studio import session or Admin-SDK-scripted Firestore writes — both blocked by the same environment constraints documented under Workstream E (no interactive Electron GUI; no Application Default Credentials configured for scripted Admin SDK access).

**What is verified instead, directly against the deployed source:**
- `snapshotSchedulingCoalescing.test.ts` (8/8 pass) proves `shouldBecomeDebounceWaiter`'s exact decision logic (claim/join/reclaim/malformed-doc-defensive-claim) and confirms the wiring at all three trigger call sites.
- `portalCatalogChangeClassifier.test.ts` (7/7 pass, including 2 new tests) proves a design write crossing `imported↔processing↔rejected` without crossing the `ready` boundary is classified `operational` (schedules nothing), while a genuine ready-boundary crossing is still classified `index-filter` (schedules a rebuild) — directly exercising the exact scenario the Plan quantified as producing up to 4 wasted schedule attempts per imported design.
- This closes the specific, cited gap ("one imported design cannot schedule up to four independent full rebuilds") at the unit level with the identical logic now running in the deployed `fresh-prints-dev` Functions (confirmed ACTIVE via `firebase functions:list`, revision timestamps confirmed current).

**Recommended owner follow-up** (outside this pass's available tooling): after this deploy, perform one real Studio batch import of a handful of designs against `fresh-prints-dev` and use the new `catalog-snapshot-scheduling`/`catalog-snapshot-publication` log events (via Firebase Console → Logs, filtering on those two message names) to directly count real scheduling vs. real publication events for that batch, confirming the bounded-publication-count acceptance criterion under real traffic.

---

## 5. AI Processing reconciliation results

**Not measured against a live Studio session** (same environment constraint). Verified instead via:
- `enqueueAiEnrichmentValidation.test.ts` (11/11 pass, including 5 new tests) — proves `isAlreadyTerminalPlainEnqueue` correctly distinguishes the benign already-terminal case from a genuine failure, and never misclassifies a `rerunFromReview`/`rerunRejected` call.
- `enqueueResultPatch.test.ts` (8/8 pass, including 2 new tests) — proves the client patch builder now treats an `already_terminal` result the same as a completed result.
- `aiProcessingReconciliation.test.ts` (5/5 pass, new file) — source-level wiring proof that `executeRerunToProcessing` calls `reloadDesigns()` then `onQueueChanged()` before tab navigation (not relying on navigation's side effect), and that `enqueueDesign` no longer throws on `already_terminal` while still throwing for genuine failures.
- Full `ai-review` feature test sweep: 82/82 pass (no regressions).

---

## 6. Upload authorization reproduction and outcome (restated per required return item)

**Not reproduced. Not implemented.** See Workstream E section above and §1's exact evidence checklist.

---

## 7. Every test command and result

| Command | Result |
|---|---|
| `npx tsx --test apps/studio/src/renderer/src/features/designs/hooks/taxonomyArchiveCacheInvalidation.test.ts` | **6/6 pass** |
| `npx tsx --test apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.test.ts` | **2/2 pass** |
| `npx tsx --test apps/studio/src/renderer/src/features/designs/hooks/studioDesignLibraryNewestFirst.test.ts` | **3/3 pass** |
| `npx tsx --test apps/portal/features/catalog/**/*.test.ts` | **56/56 pass** (no changes made; confirms no Portal regression / no reproduction) |
| `npx tsx --test functions/src/catalogSnapshots/portalCatalogChangeClassifier.test.ts` | **7/7 pass** |
| `npx tsx --test functions/src/catalogSnapshots/snapshotSchedulingCoalescing.test.ts` | **8/8 pass** |
| `npx tsx --test functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts functions/src/catalogSnapshots/snapshotBuilders.test.ts functions/src/catalogSnapshots/targetedPortalPublication.test.ts functions/src/catalogSnapshots/publicationRecovery.test.ts` | **93/93 pass** |
| `npx tsx --test functions/src/ai/enqueueAiEnrichmentValidation.test.ts` | **11/11 pass** |
| `npx tsx --test apps/studio/src/renderer/src/features/ai-review/**/*.test.ts` (13 files) | **82/82 pass** |
| `npx tsx --test packages/shared/src/**/*.test.ts` | **857/858 pass** — 1 pre-existing, unrelated failure, confirmed present on the clean `origin/production` tree before any change in this pass |
| `npx tsx --test functions/src/**/*.test.ts` (full sweep) | **516/518 pass** — 2 pre-existing, unrelated failures (`Wave C read containment wiring`'s stale assertion, `customerUploadValidation`'s "rejects oversized declared zip"), both confirmed present on the clean tree before any change in this pass |
| Full Studio test sweep (116 files, batched via PowerShell) | **670/678 pass** on this branch vs. **654/662 pass** on the clean tree — same 8 named failures on both (`sanitizeDownloadFileName`, `usePrintRequestSelectionMode`, `printRequestItemSizingAndNaming`, `printRequestOversizedSelection`, `portalSocialMetaSettingsService`) — all pre-existing and documented elsewhere as unrelated (the two print-request DPI/print-size failures are explicitly called out as pre-existing/unrelated in the 2026-07-27 Firestore Usage Efficiency Wave C signoff); the `+16` pass-count difference is exactly this pass's new/expanded test assertions |

**No test was claimed to pass without being run.** Every pre-existing failure above was independently re-verified against a fully clean tree (`git stash -u` including untracked files, confirmed via `git status` before/after) to distinguish it from anything introduced by this pass — zero new failures were introduced by any of the 4 completed workstreams.

---

## 8. Functions build result

`npm --prefix functions run build` — **exit 0**, run and confirmed clean 4 separate times across this pass (after Workstream C, after Workstream D, once more before deploy, and once more after the stash round-trip during verification).

---

## 9. Studio and Portal typecheck results

- `npx tsc --noEmit` (from `apps/studio/`) — **exit 0**, clean.
- `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**, clean.

---

## 10. Studio production build result

`npx vite build` (from `apps/studio/`) — **exit 0** for all three targets (renderer, Electron main, preload). No `CIRCULAR_CHUNK` warning (the existing white-screen-fix protection in `vite.config.ts`'s `rollupOptions.onwarn` remains intact and unmodified). Standard chunk-size-over-500kB advisory warning present, pre-existing, unrelated to this pass.

---

## 11. Lint and `git diff --check` results

- `npm run lint` (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`) — **exit 0**, zero warnings/errors.
- `git diff --check` — **exit 0**, clean (only benign LF/CRLF line-ending advisories from Git itself on Windows, not a whitespace-error finding).

---

## 12. Exact dev Functions deployed

```
firebase deploy --only functions:rebuildCatalogSnapshots,functions:retryPortalCatalogPublication,functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten,functions:enqueueAiEnrichment --project fresh-prints-dev
```

Before deploying: explicitly ran `firebase use fresh-prints-dev` and confirmed via `firebase use` that the active project alias was `fresh-prints-dev` — the ambient/default active project at the start of this session was actually `fresh-prints-prod` (confirmed via `firebase use` before switching), so this explicit switch plus the redundant `--project fresh-prints-dev` flag were both necessary safety steps, not routine formality.

**No Rules, indexes, Hosting, Storage Rules, extensions, secrets, or unrelated Functions were included** — confirmed by the `--only functions:<name>,...` scoping (Firebase CLI's `--only` flag with explicit function names deploys exactly and only those named functions; it cannot implicitly deploy Rules/indexes/Hosting) and by post-deploy `firebase functions:list --project fresh-prints-dev --json` showing **109 total functions**, unchanged from before (no addition, no removal — only the 6 named functions' revisions updated).

---

## 13. `fresh-prints-dev` deployment result

**Exit 0, "Deploy complete!"** All 6 functions show `"Successful update operation."` in the CLI output. Post-deploy `firebase functions:list --project fresh-prints-dev` confirms all 6 present, `us-central1`, correct trigger types (`callable` for `rebuildCatalogSnapshots`/`retryPortalCatalogPublication`/`enqueueAiEnrichment`; `google.cloud.firestore.document.v1.written` for the three `on*SnapshotSourceWritten` triggers), correct memory allocations unchanged (256Mi/256Mi/256Mi/256Mi/256Mi/512Mi respectively — no accidental resource-tier change). `firebase functions:log` immediately after deploy shows all 6 in `"state":"ACTIVE"` with current `updateTime` matching the deploy, and the only warnings/errors present are the standard cold-start HTTP-health-probe noise (`Request has invalid method. GET` / `Invalid request, unable to process.`) that every `onCall` function logs on every cold start — no application-level error from any of the changed code paths.

**Live functional verification (controlled batch import test, log-based scheduling/publication count) was not performed** — this requires either an authenticated Studio session or Application Default Credentials for scripted Admin SDK access, neither available in this environment (see §4 and the Workstream E section above for the exact same underlying constraint). This is recorded as required owner follow-up, not silently skipped.

**Addendum — redeployed after the Implementation Review's in-scope correction:** the independent Implementation Review (`docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-implementation-review.md`) found a real correctness gap in the debounce-claim duration (the claim expired after only `DEBOUNCE_MS`, before the ensuing publish attempt could reliably finish) and fixed it in the same pass. The 5 affected functions (`rebuildCatalogSnapshots`, `retryPortalCatalogPublication`, `onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten`) were redeployed to `fresh-prints-dev` after that fix — exit 0, "Deploy complete!", all 5 confirmed `ACTIVE` post-redeploy via `firebase functions:list --project fresh-prints-dev`, function count unchanged at 109. `enqueueAiEnrichment` was not part of this second deploy since the fix did not touch it. This test report's §7 command list and §12/§13 originally described the first deploy only; see the Implementation Review §3 for the fix's own full build/test/lint/redeploy verification.

---

## 14. Unresolved items and required owner QA (original A–D pass)

1. **Workstream E is fully unimplemented**, blocked on the evidence checklist in §1. This requires an authorized owner to run Studio interactively.
2. **Live controlled Firestore cost measurement** (§4) and **live AI Processing reconciliation UI verification** (§5) were not performed against real `fresh-prints-dev` traffic — both require an authenticated Studio session this environment cannot provide. Recommended owner follow-up: after reviewing this deploy, perform one real batch import (a handful of designs) and one real reprocess-a-design cycle in Studio against `fresh-prints-dev`, checking (a) the new `catalog-snapshot-scheduling`/`catalog-snapshot-publication` log events for a bounded publication count, and (b) that the Processing tab immediately reflects a completed reprocess without navigating away and back.
3. **Workstream A's required live-Firestore-document check** (per the managed-goal brief: "before deciding whether this is a write failure or stale-read failure" for Workstream A) was performed at the source level only (confirmed the write path and the missing invalidation directly in code) — an owner should still click Archive once in Studio against `fresh-prints-dev` and confirm the tag disappears from the active list immediately, to close the loop empirically.
4. **Category-archive parity** was implemented (not just flagged) in this pass, since the same guarded-callable-plus-unwired-cache-invalidation pattern was independently confirmed for categories during implementation — this exceeds the Review's "should be a required first step" framing by actually fixing it, not just re-flagging it.

---

## 15. Owner QA Amendment 1 — Test Report addendum

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Amendment Plan | `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1.md` |
| Amendment Formal Review | `docs/workflow/reviews/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1-review.md` |

### 15.1 Implementation summary

**Workstream 1 — Studio ready-design invisibility (highest priority):**
- `DesignLibraryPage.tsx`: removed `useGeneratedReadyDesigns` from the page's design-list decision entirely. `useDesigns`/`designService.listDesignsPage` (bounded, cursor-paginated, `createdAt desc`, 15s-TTL-cached with confirmed pre-existing `invalidateDesignReadCaches` invalidation on approval) is now the unconditional primary source for both normal and archived browse. Generated taxonomy (`useGeneratedDesignLibraryTaxonomy`) is completely unchanged and remains the source for categories/tags in normal browse. `refreshCatalog` now unconditionally calls `reloadDesigns()` (previously skipped for generated-catalog mode). `handleDesignUpdated`/`handleArchiveConfirm` simplified to use `applyDesignPatch`/`refreshCatalog` directly instead of generated-index reconciliation machinery that no longer applies.
- `useGeneratedReadyDesigns.ts` itself is **unchanged and retained** — it remains the active source for `useReadyDesignsForAssistedCatalogPicker.ts` (the Assisted Creation catalog-share picker), its one other real consumer, confirmed via repo-wide grep before and after the change.
- `designLibraryFirestoreLoadPolicy.ts`: `loadReadyDesignPage` is now `true` unconditionally (previously `false` whenever `usingGeneratedCatalog` was true — the exact line the defect lived on).
- Removed `sortDesignLibraryResults.ts` and its test — confirmed orphaned (zero remaining consumers) after the above change; kept dead code out per coding standards rather than leaving it silently unused.
- `publishCatalogSnapshots.ts` (ready-boundary publisher self-healing fix): replaced the debounce claim's `DEBOUNCE_MS + LEASE_MS` (~10m15s) duration with `DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS` (a new 90-second constant, ~1m45s total) so a waiter invocation killed by its own function timeout mid-publish self-heals in roughly two minutes instead of ten. Added explicit `timeoutSeconds: 300` to all three `onDocumentWritten` triggers (previously relying on the 60-second platform default), converting each to the options-object call form.

**Workstream 2 — AI Processing controller/count reconciliation:**
- `useAiProcessingQueue.ts`: added `onQueueChanged?: () => void` to the options interface; `refreshDesignList` (shared by both `processSelectedDesign` and `runAutoQueueLoop`) now calls it after `reloadDesigns()` — closing the gap where the manual single-image "Process" and auto-advance-queue paths never reconciled Processing/Needs Review counts at all (only the previously-fixed rerun-from-inbox path did). Both `processSelectedDesign`'s post-completion branch and `runAutoQueueLoop`'s two natural loop-exit points now explicitly call `requestSelectDesign(null)` when no design remains awaiting AI start, instead of leaving `selectedDesignId` dangling on a design already filtered out of `designs` — this was the exact mechanism causing "Start AI" to stay permanently disabled until an unrelated route remount.
- `useAiReviewInbox.ts`: threads `options?.onQueueChanged` into the `useAiProcessingQueue` call, so `AiReviewPage.tsx`'s existing `onQueueChanged: () => void tabCounts.reloadCounts()` now genuinely reaches the manual/auto-queue paths.

**Workstream 3 — large Studio import picker-provenance failure:**
- `importFileSession.ts`: `registerImportFilePath` no longer unconditionally clears the session Sets on every call — it is now a no-op when re-registering the exact same (normalized) path already active, while still correctly clearing when a genuinely different path is registered (preserving the intended "one file at a time" model). This is the fix for the confirmed structural defect: previously, any second registration for the identical file — plausible during the wider validate-to-upload window a large/slow file creates — silently wiped provenance/validation state and produced "Use a PNG file only after selecting it with the file picker." even for a genuinely still-valid, already-validated selection.
- `readSelectedPngFileBytes.ts`: the redundant second `validatePngFile()` call is now skipped on a `consumeCorrectedImportBytes` cache hit (the file was already fully validated once during `VALIDATE_SELECTED_PNG`) — only a genuine cache miss (e.g. a retry) re-validates from scratch. This roughly halves the large-file processing cost that widened the original exposure window.
- Arbitrary-filesystem-path protection (`isUnsafeClientFilePath`) is completely unchanged — confirmed by direct re-reading of every call site; this fix narrows *identity* handling, not *authorization*.

### 15.2 Ready-boundary publisher root cause and correction (restated per required return item)

**Root cause (confirmed via live `fresh-prints-dev` log inspection, not source-only inference):** the debounce-waiter claim (shipped in the prior A–D pass, then further extended by that pass's own Implementation Review to `DEBOUNCE_MS + LEASE_MS` ≈ 10m15s) vastly outlived the three trigger functions' default 60-second Cloud Functions timeout. A genuinely slow publish (full collection scan + many Storage writes) reliably risked exceeding the ~45 seconds remaining after the 15-second sleep, and a hard function-timeout kill skips the `finally { releaseDebounceClaimIfOwned }` block entirely — stranding the claim, unreleased, for up to its full ~10-minute duration. Direct evidence: a 500-line `fresh-prints-dev` log window showed 18 consecutive `"joined-existing-debounce-window"` scheduling events with **zero** `"claimed-debounce-waiter"` and **zero** `"catalog-snapshot-publication"` events in the same window — every incoming design write, including the owner's real approvals, silently deferred to a claim that was never going to publish.

**Correction:** (1) shrunk the claim's own liability window from `DEBOUNCE_MS + LEASE_MS` to `DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS` (90s), so a killed waiter now self-heals in roughly two minutes; (2) explicitly raised `timeoutSeconds` to 300 on all three triggers so a hard kill becomes rare in the first place, rather than a routine occurrence on any catalog of real size. The existing transactional publish lease (`LEASE_MS`, `publishKind`'s own guard) is completely unchanged — it remains the correctness boundary for preventing concurrent scans.

### 15.3 Three-approval publication measurement — not performed live; owner QA checklist provided

Per explicit instruction and consistent with the original A–D pass's documented, unchanged environment constraints (no interactive Electron/Chromium session; no Application Default Credentials for scripted Admin SDK writes — both re-confirmed still true this pass), a live controlled three-approval measurement could not be performed. Source implementation and automated tests were completed regardless, per the explicit instruction that lack of interactive access must not block implementing the Studio authoritative bounded path.

**Compact owner QA checklist (perform against `fresh-prints-dev` after this deploy):**

1. In Studio, import 3 designs, run AI processing to completion, and manually approve all 3 to `ready` in Needs Review.
2. Immediately open Studio Design Library (normal, non-archived view) — **expected: all 3 designs are visible immediately, with no wait, no refresh, no navigation required.**
3. Wait ~2–3 minutes, then check Firebase Console → Cloud Functions → Logs (or `firebase functions:log --project fresh-prints-dev`), filtering for `catalog-snapshot-scheduling` and `catalog-snapshot-publication` — **expected: a bounded number of `claimed-debounce-waiter` events (not one per design write), followed by at least one `catalog-snapshot-publication` event with `"outcome":"success"` and a real `durationMs` value** (record this value — it is the first real data point for how long a full publish actually takes on this catalog's current scale, informing whether 90s/300s remain comfortable margins as the catalog grows).
4. Open Portal (or the Portal catalog preview) and confirm the same 3 designs eventually appear in the public catalog once the publication event above completes — **expected: Portal reflects the 3 designs after that publish, without needing a manual `rebuildCatalogSnapshots` trigger.**
5. While waiting for step 3, confirm Portal's existing catalog (any previously-published designs) remains fully browsable and unaffected — **expected: no visible Portal outage or stale-to-broken transition, only stale-to-fresher.**

### 15.4 Studio visibility before and after (restated per required return item)

**Before:** approved `status: ready` designs never appeared in Studio Design Library — confirmed dependent entirely on generated Storage snapshot publication, which was itself confirmed stalled by the root cause in §15.2. **After:** Studio Design Library's design list is sourced unconditionally from bounded Firestore (`useDesigns`), independent of generated-snapshot publication health — confirmed via `designLibraryAuthoritativeSource.test.ts` (7/7 pass, 4/7 independently confirmed to fail against the pre-fix source) and via the existing `invalidateDesignReadCaches` call already present on the approval write path (`designService.ts:1132`, unchanged, now actually reachable for this surface).

### 15.5 Portal behavior after the change (restated per required return item)

**Unchanged.** Portal continues to read exclusively from `generated/portal-catalog/**` assets — confirmed no Portal file was touched by this Amendment (`git diff --stat` shows zero files under `apps/portal/`). Portal's own visibility timing now depends on the corrected, self-healing publisher (§15.2), not on any Studio-side change.

### 15.6 AI Processing stale-state root cause and reproduction (restated per required return item)

**Confirmed root cause:** two independent gaps, both in the manual "Process image with AI" / auto-advance-queue paths (`useAiProcessingQueue.ts`), neither touched by the prior pass's rerun-path-only fix: (1) no `onQueueChanged`-equivalent callback existed at all on this hook, so Processing/Needs Review counts were never reconciled after these paths' completions; (2) when the just-completed design was the last one awaiting AI start, no reselection occurred, leaving `selectedDesignId` dangling on a design already filtered out of the tab's `designs` array — collapsing this hook's own `selectedDesign` derivation to `null` and permanently disabling `canProcessSelected`/"Start AI" until an unrelated route remount re-populated selection.

**Before:** reprocess → completes → Processing count stays stale → "Start AI" stays disabled → only fixed by navigating away and back. **After:** `onQueueChanged` fires after every completion through these paths (confirmed wired end-to-end: `AiReviewPage.tsx` → `useAiReviewInbox.ts` → `useAiProcessingQueue.ts`), and `requestSelectDesign(null)` is called at every point selection would otherwise dangle — confirmed via `aiProcessingReconciliation.test.ts`'s new 5 tests (10/10 total pass, 5/5 new tests independently confirmed to fail against the pre-fix source).

### 15.7 Exact source of the picker-only PNG error and large-file reproduction (restated per required return items)

**Exact source:** `validateReadPngFileBytesRequest.ts:61,87` and `importIpcHandlers.ts:52` (`validateFilePathInput`), all gated by `!isRegisteredImportFilePath(...)`, itself backed by the single global `Set<string>` in `importFileSession.ts`. **Before:** any second call to `registerImportFilePath` — plausible during the wider validate-to-upload window a 159MB/10800×10800 file's slower processing creates — unconditionally wiped the session via `clearImportFileSession()`, producing the exact confirmed error even for a genuinely still-valid, already-validated selection. **After:** re-registering the identical already-active path is a no-op (confirmed via `importFileSession.test.ts`'s 6 tests, 2/6 independently confirmed to fail against the pre-fix source); the redundant second full-file validation pass in `readSelectedPngFileBytes.ts` (which roughly doubled the exposure window for large files specifically) is skipped on a cache hit (confirmed via `readSelectedPngFileBytesValidation.test.ts`'s 2 tests, both independently confirmed to fail against the pre-fix source). Arbitrary-path protection is unaffected.

### 15.8 Every test command and result (Amendment 1)

| Command | Result |
|---|---|
| `npx tsx --test apps/studio/src/renderer/src/features/designs/pages/designLibraryAuthoritativeSource.test.ts` | **7/7 pass** (new file; 4/7 confirmed to fail against pre-fix source) |
| `npx tsx --test apps/studio/src/renderer/src/features/designs/utils/designLibraryFirestoreLoadPolicy.test.ts` | **6/6 pass** (updated) |
| `npx tsx --test apps/studio/src/renderer/src/features/designs/hooks/studioDesignLibraryNewestFirst.test.ts` | **3/3 pass** (unchanged, re-confirmed) |
| `npx tsx --test functions/src/catalogSnapshots/snapshotSchedulingCoalescing.test.ts` | **13/13 pass** (4 new tests added; stale assertion corrected) |
| `npx tsx --test functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts functions/src/catalogSnapshots/snapshotBuilders.test.ts functions/src/catalogSnapshots/targetedPortalPublication.test.ts functions/src/catalogSnapshots/publicationRecovery.test.ts functions/src/catalogSnapshots/portalCatalogChangeClassifier.test.ts` | **100/100 pass** |
| `npx tsx --test apps/studio/src/renderer/src/features/ai-review/hooks/aiProcessingReconciliation.test.ts` (+ 12 other ai-review test files) | **87/87 pass** (5 new tests added; 5/5 confirmed to fail against pre-fix source) |
| `npx tsx --test apps/studio/electron/ipc/import/importFileSession.test.ts` | **6/6 pass** (new file; 2/6 confirmed to fail against pre-fix source) |
| `npx tsx --test apps/studio/electron/ipc/import/readSelectedPngFileBytesValidation.test.ts` | **2/2 pass** (new file; 2/2 confirmed to fail against pre-fix source) |
| `npx tsx --test apps/studio/src/renderer/src/features/firebase/utils/firestoreRouteContainment.test.ts` | **10/10 pass** (updated — one assertion encoded the pre-Amendment architecture and was corrected) |
| `npx tsx --test functions/src/**/*.test.ts` (full sweep) | **522/524 pass** — same 2 pre-existing, unrelated failures as the original A–D pass, re-confirmed |
| `npx tsx --test packages/shared/src/**/*.test.ts` | **857/858 pass** — same 1 pre-existing, unrelated failure |
| Full Studio test sweep (118 files, batched via PowerShell) | **690/698 pass** — same 8 pre-existing, unrelated failures as the original A–D pass (`sanitizeDownloadFileName`, `usePrintRequestSelectionMode`, print request item sizing/oversized selection, `portalSocialMetaSettingsService`); zero new failures beyond the one already-corrected `firestoreRouteContainment.test.ts` assertion |

Every discriminating test above was independently confirmed to fail against the corresponding pre-fix source (via `git stash push -- <file>` / re-run / `git stash pop`), not merely asserted to pass post-fix.

### 15.9 Functions build, typecheck, build, lint, diff-check (Amendment 1)

- `npm --prefix functions run build` — exit 0.
- `npx tsc --noEmit` (Studio renderer, from `apps/studio/`) — exit 0.
- `npx tsc --noEmit -p tsconfig.node.json` (Studio Electron/main context) — exit 0.
- `npm run typecheck --workspace @fresh-prints/portal` — exit 0 (no Portal source changed; run regardless since shared-adjacent files changed).
- `npx vite build` (Studio, all 3 targets: renderer, main, preload) — exit 0, no `CIRCULAR_CHUNK` warning.
- `npm run lint` — exit 0.
- `git diff --check` — exit 0.

### 15.10 Exact dev Functions deployed (Amendment 1)

```
firebase deploy --only functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

Confirmed `firebase use` was still `fresh-prints-dev` from the prior pass before deploying (re-checked, not assumed). `enqueueAiEnrichment`, `rebuildCatalogSnapshots`, and `retryPortalCatalogPublication` were **not** redeployed in this pass since none of their source changed. Post-deploy `firebase functions:list --project fresh-prints-dev` confirms all 3 `ACTIVE`, total function count unchanged at 109. Post-deploy `firebase functions:log` directly confirms `"timeoutSeconds":300` is genuinely live on the deployed functions (not merely present in source). No Rules, Storage Rules, indexes, Hosting, extensions, secrets, or unrelated Function were touched.

### 15.11 Remaining owner QA (Amendment 1, in addition to §14's original items)

1. **§15.3's compact 3-approval checklist** — not performed live in this environment; required to empirically confirm the ready-boundary publisher fix under real traffic and to capture a real `durationMs` data point for future capacity planning.
2. **Existing stuck claim risk:** if a debounce claim was already stranded on `fresh-prints-dev` from before this deploy (consistent with the log evidence in §15.2), it will not retroactively shrink to the new, smaller duration — it will continue to block publication until its own original (pre-fix, ~10-minute) expiry elapses at most once more. After that single natural expiry, all future claims use the corrected, smaller duration. No manual intervention is required, but the owner should not expect the very first post-deploy write to necessarily publish instantly if a stale claim happens to still be active from before this deploy.
3. Workstream 1's Studio-visibility fix should be spot-checked by the owner directly (approve a design, confirm immediate Design Library visibility) as the highest-priority empirical confirmation, independent of the log-based checklist above.

---

## 16. Owner QA Amendment 2 — Test Report addendum

See Amendment 2 Plan/Review for root causes. Summary: Defect A (backend-initiated AI completion count staleness) and Defect B (misleading Storage permission error on legitimately oversized upload buffer) fixed; Defect C (ready-transition ordering) blocked pending owner approval of a new field/index.

**Tests:** `aiProcessingReconciliation.test.ts` 11/11 pass (1 new, discriminating vs pre-fix confirmed via stash); `importUploadServiceSizeCheck.test.ts` 1/1 pass (new, discriminating confirmed). Combined ai-review + import regression: 87/87 pass.

**Builds:** Functions build, Studio typecheck, Portal typecheck, Studio 3-target Vite build, lint, `git diff --check` — all exit 0.

**Deploy:** none — both fixes are Studio-renderer-only, no Functions changed.

**Defect C:** blocked. Approval phrase: `APPROVE READY-TRANSITION TIMESTAMP FIELD AND INDEX`.

---

## 17. Owner QA Amendment 3 — Test Report addendum

**Failure 1 (AI queue 3→0):** `importAiBackgroundQueue.ts`'s pump was already strictly sequential but entirely detached from AI Review — it never signalled per-design terminal transitions, so Processing held its initial count then collapsed to zero. Added a bounded in-process observer on the existing pump; `useAiReviewInbox` subscribes while the Processing tab is active. No Firestore listener, no polling, no concurrency change.

**Failure 2 (large PNG):** added `normalizeImportOutputBytes` — lossless max-compression re-encode first, then bounded (≤4) minimal proportional downscale to a 97% target, preserving transparency/aspect, never upscaling. Final pixels flow back through `normalizedWidth/Height` so `importOrchestrationService` recalculates stored print size from what is actually persisted. Single upload, single `createDesign`. Real error surfaced when it cannot fit.

**Ordering:** new `readyAt` timestamp stamped only on the ready transition in `applyCatalogApprovalUpdate`. Documented legacy fallback to `createdAt` (`resolveReadyOrderMillis` / `resolveCardReadyOrderMillis`) so pre-existing ready designs stay visible without a migration. Applied in Studio Design Library, Portal default browse + filtered results, generated browse/Studio ready-index orders, and the change classifier. Metric collections unchanged.

**Tests:** sequencing 5/5 (proves 3→2→1→0 and single-flight), normalization 12/12, readyAt ordering 15/15; combined Studio regression 299/299 pass. `catalogSnapshots` 116/117 — the single failure is the pre-existing, unrelated `Wave C read containment wiring` assertion (confirmed identical on a clean tree).

**Builds:** Functions build, Studio renderer/node typecheck, Portal typecheck, Studio 3-target production build, lint, `git diff --check` — all exit 0.

**Dev deploy:** `firestore:indexes` (adds `designs: status ASC, readyAt DESC, __name__ DESC`, confirmed live) and Functions `rebuildCatalogSnapshots`, `retryPortalCatalogPublication`, `onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten`, `onPortalCatalogSnapshotSourceWritten` — all successful on `fresh-prints-dev`. No Rules deployed, no production action.

**Future production checkpoint (prepared, not executed):** deploy the same index to `fresh-prints-prod`, then optionally backfill `readyAt` for legacy ready designs and retire the `createdAt` fallback. Until backfilled, the bounded Firestore query intentionally still orders by `createdAt` (a Firestore `orderBy("readyAt")` would silently exclude legacy documents); ready-transition order is applied over the bounded page.

---

## 18. Global-ordering follow-up correction (commit `c031c01`) — Test Report addendum

**Defect found in Amendment 3's own shipped fix:** the note directly above ("ready-transition order
is applied over the bounded page") was the defect. `readyAt` ordering had been implemented as a
**page-local sort** — fetch one bounded page in `createdAt` order, then re-sort just that page by
`readyAt`. This is structurally incapable of surfacing a design that was re-approved (ready-
transition bumped) after the page it belongs to (by `createdAt`) had already been paginated past.
An old design reapproved today could never reach the top of a page-local sort, because it was never
fetched into that page at all.

**Fix:** replaced the page-local sort with a genuine server-side Firestore query:
`where(status == "ready") orderBy(readyAt, desc) orderBy(__name__, desc)`, using the existing cursor
pagination shape. `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` is now `readyAt`; a new
`DESIGN_LIBRARY_ARCHIVED_SORT_FIELD` keeps archived browse on `createdAt` (archived designs may
never have received a `readyAt` stamp). `getDesignSortMillis`/`getDesignSortValue` resolve `readyAt`
with a `createdAt` fallback so client-side cursor values mirror what Firestore itself ordered by.
Removed the now-incorrect page-local `sortReadyDesigns` call from `DesignLibraryPage.tsx`. Portal's
generated-catalog sorting was already `readyAtMs`-with-`createdAtMs`-fallback and required no change.

**Completeness guard (new, added specifically to prevent a silent regression during the pre-backfill
window):** Firestore's `orderBy("readyAt")` silently omits any document that lacks the field
entirely — before a backfill runs, this would *hide* every legacy ready design from Studio, a worse
outcome than the page-local bug it replaces. `listDesignsPage` now runs the `readyAt`-ordered query
and independently compares its result count against `countDesigns`'s exact count for the same
filter; if they disagree (or the query itself fails with a missing-index error), it transparently
falls back to the already-proven `createdAt`-ordered query for that same page request. Once the
backfill has run, the counts agree and the fallback never triggers.

**Indexes (dev only):** added and deployed all four `readyAt` composite-index variants needed to
match every existing `createdAt` variant (`status`; `categoryId+status`; `tags+status`;
`categoryId+tags+status`; each `+readyAt DESC +__name__ DESC`) — no filtered Design Library query
shape can hit a missing index. **Independently re-verified live in this pass** via
`firebase firestore:indexes --project fresh-prints-dev` (not merely re-stated from the commit
message) — all 4 confirmed present.

**Backfill: written, NOT executed, genuinely blocked.**
`functions/scripts/backfill-design-ready-at.mjs` is idempotent, dry-run-by-default, and refuses any
non-dev project without an explicit override. It could not be run in this environment: no
Application Default Credentials are configured (`firebase login:application-default` is not a
command in the installed CLI version; no `gcloud`; no service-account key), and there is no
interactive terminal available to run one. **This is a required owner action, not an optional
follow-up** — until it runs, any pre-existing ready design that predates the `readyAt` field will be
served via the `createdAt` fallback (correct, but not in the intended `readyAt`-first order) rather
than by its actual most-recent-approval time.

**Rules: written, NOT deployed, independently re-verified in this pass.** The same commit added
`isOptionalTimestamp(data, "readyAt")` to the design-document validator in `firestore.rules`. This
pass ran `node functions/scripts/compare-deployed-firestore-rules.mjs` against `fresh-prints-dev`
and confirmed the live ruleset (`c3b89a7a-ae2a-4e0d-978e-c98c3e10991e`, created 2026-08-02) predates
this change and does not contain it. Confirmed via direct inspection of the design validator that it
has no `hasOnly` restriction, so this is a tightening (adds type validation), not a gate — `readyAt`
writes already succeed today without it, merely unvalidated. Deploying this Rules change requires
its own separate owner approval and is not bundled into any approval already granted for this goal.

**Tests:** `readyOrderPagination.test.ts` (8/8, new) is the required failing-before/passing-after
pair — proves a `createdAt`-ordered page provably excludes a reapproved design and that no
page-local sort can recover it, while the corrected `readyAt`-ordered query surfaces it first;
includes tie-breaking and gap-free-pagination coverage. `readyOrder.test.ts` (updated) and
`studioDesignLibraryNewestFirst.test.ts` (updated) had their "never `updatedAt`" invariant assertions
adjusted to assert `readyAt` (their original protective intent is unchanged, only the expected field
name). Combined Studio regression: 337/337 pass (per the commit). **Independently re-run fresh in
this pass** (not merely re-stated): full Studio sweep 732/740 pass, full Functions sweep 522/524
pass, full shared sweep 857/858 pass — the same pre-existing, unrelated failures documented
throughout this entire managed goal, zero new failures.

**Builds (independently re-run fresh in this pass):** Functions build, Studio typecheck, Portal
typecheck, Studio 3-target Vite build, repo lint, `git diff --check` — all exit 0.

**No new Functions deploy was required or performed for this correction** — it is a Studio-client
query change plus an index addition (already deployed per the commit) and a Rules change (not yet
deployed, see above). No production action of any kind occurred.

---

## 19. `readyAt` development backfill — execution results

Application Default Credentials became available in this environment, unblocking the backfill
previously documented as written-but-not-executed in §18. Ran the pre-approved script exactly as
written, with no code changes.

**1. Project confirmation:** `firebase use` → `fresh-prints-dev`. The script's own project guard
(`projectId !== "fresh-prints-dev" && !allowNonDev` → refuse) was not triggered, confirming the
script itself also resolved `fresh-prints-dev`.

**2. Dry run (before):**

```
node functions/scripts/backfill-design-ready-at.mjs
project=fresh-prints-dev ready=99 alreadySet=0 needsBackfill=99 mode=DRY-RUN
Dry run only — re-run with APPLY=1 to write.
```

99 `status: "ready"` designs, 0 already carrying `readyAt`, 99 needing backfill.

**3. Apply:**

```
APPLY=1 node functions/scripts/backfill-design-ready-at.mjs
project=fresh-prints-dev ready=99 alreadySet=0 needsBackfill=99 mode=APPLY
committed 99/99
Backfill complete: 99 design(s) updated.
```

All 99 writes committed successfully; 0 failures.

**4. Dry run (after), verifying zero remain without `readyAt`:**

```
node functions/scripts/backfill-design-ready-at.mjs
project=fresh-prints-dev ready=99 alreadySet=99 needsBackfill=0 mode=DRY-RUN
Dry run only — re-run with APPLY=1 to write.
```

99 `status: "ready"` designs, all 99 now carrying `readyAt`, 0 needing backfill — confirms the
backfill is complete and idempotent (re-running performs no further writes).

**Effect:** every pre-existing `fresh-prints-dev` ready design now has a real `readyAt` value, seeded
per the script's documented precedence (`aiReviewedAt` → `updatedAt` → `createdAt`, best evidence
first). §18's completeness-guard fallback to `createdAt` ordering will no longer trigger for any of
these 99 designs going forward, since the `readyAt`-ordered query and `countDesigns` will now agree
for every filter combination that includes them.

**No Rules, index, Function, or production change was made or is required for this step.** The
`readyAt` Rules type-guard remains undeployed (§18) — this backfill does not depend on it, since the
design validator has no `hasOnly` restriction and the write already succeeds without it. The 4
`readyAt` indexes were already confirmed live before this step and were not touched.

**Production backfill remains a separate, later human checkpoint** — not performed, not requested,
not implied by this dev-only execution.

---

## 20. Owner QA Amendment 4 — AI Processing race fix (Test Report addendum)

### 20.1 Owner reproduction

With three newly imported designs: Processing correctly showed 3, the first design began
processing and its progress advanced step 1 → step 2, then the page/list attempted to refresh —
the first design **still** appeared as Processing and its progress **regressed** from step 2 back
to step 1. The UI hung on that design while the remaining two completed server-side, then all
three disappeared together. Required behavior (`3 → 2 → 1 → 0`, one design leaving individually,
next design becoming the active selection) was not met.

### 20.2 Root cause

Amendment 3's fix for the prior "3 → 0" defect (Test Report §17) subscribed AI Review to the
background AI pump's per-design terminal events, but reconciled each one with an **unconditional,
ungated `void reloadDesigns()`** call. `useDesigns.loadDesigns()` had exactly one staleness guard —
`listQueryKeyRef.current !== requestQueryKey`, which only discards a response if the *query itself*
changed. It had **no protection against multiple calls for the *same* query racing each other**.
Three designs completing in quick succession fired three independent, ungated reloads; whichever
resolved *last* — not whichever was *most recent* — won, because there was nothing comparing "is
this the newest request" versus "is this the newest *resolved* request." An earlier-started,
slower-resolving reload could overwrite state a later-started, faster-resolving reload (or a design
patch) had already correctly updated. Independently reproduced this exact mechanism in isolation
(Node, no test framework) before writing any fix — three synchronous reload calls representing "A
removed," "B+C removed," then a deliberately-last-resolving stale snapshot still showing "B+C
pending" overwrote the correct empty state, reproducing the reported stall-then-mass-disappearance
symptom precisely.

The visible progress regression (step 2 → step 1) is the same mechanism observed on the currently
selected design: the 3-step pipeline UI (`AI_PROCESSING_UI_PIPELINE_GROUPS`,
`aiProcessingOutput.ts`) derives its step purely from whatever `aiProcessingStage` currently sits on
that design in `designs` — it holds no local "high water mark." A stale reload overwriting the
selected design with an older cached `aiProcessingStage` value is visually indistinguishable from a
genuine regression.

**Stale cache vs. out-of-order reload:** out-of-order reload resolution is the confirmed mechanism,
not a stale in-memory cache — `designService.listDesignsPage` reads Firestore directly per call with
no client-side cache layer in this path; the staleness is purely a same-query-race timing issue in
`useDesigns`, not any cached response being served.

### 20.3 Fix

1. **`importAiBackgroundQueue.ts`** — the pump's success notification now carries the enqueue
   callable's own already-available terminal response (`patchSource`) instead of discarding it.
2. **`backgroundAiQueueReconciliation.ts`** (new, pure) — `reconcileBackgroundAiQueueEvent` derives,
   from one event: the `Partial<Design>` patch to apply (via the existing
   `buildDesignPatchFromEnqueueResult`), and — only when the completed design is the current
   selection — the index to hand to the existing `pendingAdvanceIndexRef` mechanism (already used
   elsewhere in this file for approve/reject actions) so the next remaining design becomes selected
   deterministically once `designs` recomputes.
3. **`useAiReviewInbox.ts`** — the background-queue observer now calls this pure function and
   applies the patch by design ID as the **primary** reconciliation mechanism. The design leaves
   Processing immediately because this hook's own `designs` memo already client-re-filters by
   `aiReviewStatus` on every render (`filterDesignsByAiReviewStatus(filtered, "pending")`) — no
   explicit removal code was needed. A reload is retained only as a fallback for the one case with
   no usable patch (a genuine enqueue failure), and that fallback is itself now protected by item 4.
4. **`useDesigns.ts`** — added a monotonic `generationRef` counter. Every `loadDesigns()` call
   captures the generation in effect at its own start; a response is only committed to state if the
   generation is still current when it resolves. `applyDesignPatch` also bumps the generation, so
   any reload already in flight when a patch lands is discarded on arrival rather than overwriting
   the patch — while a reload started *after* the patch still gets its own fresh generation and is
   honored normally as a legitimate confirmation read. This is the "existing generation/request-
   token pattern... or the narrowest equivalent" called for — narrowly scoped to `useDesigns`, no
   new listener, no new dependency.

No full designs listener, no per-design listener, no concurrency change (the pump remains strictly
sequential — confirmed unchanged, see §20.4), no permanent polling, and no unbounded reads were
introduced. `readyAt` ordering and the large-PNG normalization implementation were not touched.

### 20.4 Proof of required behaviors

All proven in `backgroundAiQueueReconciliation.test.ts` (new, 13 tests) by chaining the actual
production functions (`reconcileBackgroundAiQueueEvent`, `designMatchesInboxTab`,
`filterDesignsByAiReviewStatus`, `sortInboxDesigns`) against realistic `Design` fixtures — not an
isolated pump simulation:

- **`3 → 2 → 1 → 0`**: proven directly; each of the three designs' completion event is reconciled
  one at a time, and the Processing-tab-derived design count is asserted to be `[3, 2, 1, 0]` after
  each — never a stall followed by a group drop.
- **`Design A → Design B → Design C → none`**: proven directly; the selection sequence produced by
  chaining `pendingAdvanceIndex` through the same re-derivation the real `pendingAdvanceIndexRef`
  effect performs is asserted equal to `["a", "b", "c", null]`.
- **Monotonic progress (never `1 → 2 → 1`)**: proven via the 3-group pipeline-step mapping used by
  the real UI; asserts the observed group sequence never decreases.
- **Stale reload cannot reinsert a completed design**: a reload started before design A completes,
  deliberately resolved *after* A's patch has already landed, is proven discarded (does not
  reinsert A) via the generation-guard simulation — which itself is a faithful mirror of
  `useDesigns`'s real comparison, independently confirmed present in source by a companion test.
- **An older async response cannot overwrite a newer queue state**: proven directly — an older
  reload resolving after a newer one still loses, regardless of resolve order.
- **Needs Review receives each design exactly once; counts remain exact**: proven directly across
  all three designs; a `Set` guards against any design entering Needs Review twice.
- **`maxConcurrent === 1`**: proven via the pre-existing sequential-pump source assertion, re-
  confirmed unaffected by this fix (`importAiBackgroundQueueSequencing.test.ts`).
- **Controls reset correctly when the queue becomes empty**: unaffected by this fix — the existing
  `runAutoQueueLoop`/`processSelectedDesign` `requestSelectDesign(null)` paths (Owner QA Amendment 1)
  remain untouched and still covered by `aiProcessingReconciliation.test.ts`.

Also independently reproduced the pre-fix bug mechanism in isolation (documented in §20.2) to
confirm the fix targets the actual cause, not a plausible-sounding alternative.

### 20.5 Tests and results

| Command | Result |
|---|---|
| `npx tsx --test .../backgroundAiQueueReconciliation.test.ts` | **14/14 pass** (new; includes one test added during the Implementation Review, see the appended Implementation Review section) |
| `npx tsx --test .../importAiBackgroundQueueSequencing.test.ts` | **5/5 pass** (2 assertions updated to match the corrected observer signature/behavior; 3 unchanged) |
| Combined AI Processing + designs focused regression (14 files) | **104/104 pass** |
| `readyOrderPagination.test.ts` + `readyOrder.test.ts` | **23/23 pass** (unaffected, confirmed) |
| Full Studio test sweep (740 files → 748 with new tests) | **745/753 pass** — the same 8 pre-existing, unrelated failures documented throughout this entire managed goal; zero new failures |
| `npm --prefix functions run build` | not required — no Functions/backend file touched; confirmed via `git status` |
| Studio typecheck (`npx tsc --noEmit`) | exit 0 |
| Portal typecheck | exit 0 (no shared code touched; run anyway per instruction) |
| Studio 3-target Vite build (renderer/main/preload) | exit 0, no new build warning |
| `npm run lint` | exit 0 |
| `git diff --check` | exit 0 |

### 20.6 Files changed

- `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts` (modified)
- `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueueSequencing.test.ts` (modified — 2 stale assertions corrected)
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` (modified)
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` (modified)
- `apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.ts` (new)
- `apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.test.ts` (new)

**No Rules, index, Function, secret, or production file was touched.** No deployment was needed or
performed. `readyAt` ordering and the large-PNG normalization implementation are confirmed
byte-for-byte unchanged (`git diff` shows zero hunks in any file under
`apps/studio/.../designs/utils/readyOrder*` or `apps/studio/electron/services/import/normalizeImportOutputBytes.ts`).

---

## 21. Owner QA Amendment 5 — AI Processing still froze after Amendment 4 (Test Report addendum)

### 21.1 Critical architecture correction

The task brief for this amendment assumed `enqueueAiEnrichment` writes a queued state and an async
Firestore trigger (`onDesignAiEnrichmentQueued`) later performs the Gemini pipeline. **This is not
the deployed architecture.** Confirmed directly from source, not assumed: `functions/src/index.ts:63`
exports only `enqueueAiEnrichment`; a repo-wide `grep -rn "onDesignAiEnrichmentQueued"` across
`functions/src/**/*.ts` returns zero matches; `docs/architecture/BACKEND.md:272` explicitly
documents that trigger as "Legacy compatibility trigger; live Processing flow should use direct
callable execution." `enqueueAiEnrichment.ts:193-219` calls
`await runAiEnrichmentPipeline(...)` **synchronously inside the callable** and returns only after
re-reading the design's real post-completion Firestore state. **Amendment 4's premise (trusting
the enqueue callable's own returned terminal fields) is architecturally correct for this
codebase's actual contract** — it was not the source of the still-frozen symptom.

### 21.2 Actual root cause found

A genuine, previously unexamined client/server timeout mismatch:
- Server: `enqueueAiEnrichment` is provisioned with `timeoutSeconds: 180` (3 minutes).
- Client: `httpsCallable(...)` was called with no `timeout` option anywhere in the call chain,
  leaving the Firebase JS SDK's documented **70-second** default in effect — independently
  confirmed against the actual installed SDK source
  (`node_modules/@firebase/functions/dist/index.cjs.js:623-624`:
  `// Default timeout to 70s, but let the options override it.` /
  `const timeout = options.timeout || 70000;`), not merely Firebase's public docs.
- Any design whose Gemini pipeline genuinely ran longer than 70s caused the **client** call to
  reject with `functions/deadline-exceeded` while the **server-side pipeline kept running to
  completion independently** (`onCall` execution is not cancelled by a client disconnect). The
  pump's `catch` block then notified observers with `outcome: "failed"` and no `patchSource`;
  `reconcileBackgroundAiQueueEvent` correctly fell back to `reloadDesigns()` — but that reload ran
  immediately upon the client timeout, before the still-running server pipeline had actually
  finished, so it read the design as still `pending`/mid-stage. This is the confirmed mechanism
  behind "the count and list then remain frozen" and "one final refresh removes everything
  together" (some later, unrelated reload eventually catches the true state once all pipelines
  have genuinely finished server-side).
- Secondary, smaller gap: `hasPendingBackgroundAiWork()` was exported but never consumed anywhere —
  confirmed via `grep` returning zero references in `useAiReviewInbox.ts`/`useAiProcessingQueue.ts`
  before this amendment.

### 21.3 Fix

1. `tracedCallable.ts` — `callTracedFunction` accepts an optional `HttpsCallableOptions` parameter,
   forwarded to `httpsCallable`. Omitting it preserves the SDK's existing default exactly.
2. `aiEnrichmentCallableErrorMessage.ts` (new, pure — extracted from `aiEnrichmentEnqueueService.ts`
   specifically so it could be unit-tested without importing the Firebase-config-coupled service
   module) — `ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS = 200_000` (a real buffer above the server's
   180,000ms, not merely matching it) and a new `functions/deadline-exceeded` case in
   `resolveAiEnrichmentCallableErrorMessage` mapping to an accurate, non-alarming message.
3. `aiEnrichmentEnqueueService.ts` — imports from the new pure module; passes the aligned timeout
   specifically on the `enqueueAiEnrichment` call only (`resetAiEnrichmentForProcessing`, a
   Firestore-only callable with its own unrelated, shorter server timeout, is unaffected).
4. `useAiReviewInbox.ts` — a new, narrowly-scoped effect reuses `hasPendingBackgroundAiWork()`: on
   mount or switching to the Processing tab, if the pump reports pending work, triggers one bounded
   `reloadDesigns()` + `onQueueChanged()` pass (dependency array is `[filters.tab]` only —
   deliberately not re-triggered by every `designs` change, which would turn a bounded check into
   an unbounded reload loop). No new listener, no enqueue call, no restart of in-flight work.

No Firestore subscription, no per-design listener, no polling, and no concurrency change were
introduced — the literally-requested Firestore-subscription architecture was not built, since the
independently-confirmed real cause did not require it (see §21.1; the Formal Review concurred, see
the Owner QA Amendment 5 Review document).

### 21.4 Tests and results

| Command | Result |
|---|---|
| `npx tsx --test .../aiEnrichmentCallableErrorMessage.test.ts` | **8/8 pass** (new) |
| `npx tsx --test .../backgroundAiQueueReconciliation.test.ts` | **17/17 pass** (3 new tests for the mount-reconciliation wiring; 14 pre-existing unaffected) |
| Combined AI Processing + designs focused regression (11 files) | **91/91 pass** |
| Full Studio test sweep (740 → 757 with new tests) | **757/765 pass** — the same 8 pre-existing, unrelated failures documented throughout this entire managed goal; zero new failures |
| Studio typecheck (`npx tsc --noEmit`) | exit 0 |
| Studio 3-target Vite build (renderer/main/preload) | exit 0, no new build warning |
| `npm run lint` | exit 0 |
| `git diff --check` | exit 0 |
| `npm --prefix functions run build` | not required — no Functions/backend file touched; confirmed via `git status` |

### 21.5 Files changed

- `apps/studio/src/renderer/src/config/tracedCallable.ts` (modified)
- `apps/studio/src/renderer/src/features/ai-review/services/aiEnrichmentEnqueueService.ts` (modified)
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` (modified)
- `apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.test.ts` (modified — 3 new tests)
- `apps/studio/src/renderer/src/features/ai-review/utils/aiEnrichmentCallableErrorMessage.ts` (new)
- `apps/studio/src/renderer/src/features/ai-review/utils/aiEnrichmentCallableErrorMessage.test.ts` (new)

**No Rules, index, Function, secret, or production file was touched.** `readyAt` ordering and the
large-PNG normalization implementation are confirmed byte-for-byte unchanged (`git diff` shows zero
hunks in `apps/studio/.../designs/utils/readyOrder*`,
`apps/studio/electron/services/import/normalizeImportOutputBytes.ts`, or any `functions/` file).

## 22. Owner QA Amendment 6 — Runtime trace, then cross-window transport fix (Test Report addendum)

### 22.1 Amendment 6, first pass (commit `8e2f6a2`) — instrumentation only

Owner reproduction after Amendment 5 still showed AI Processing failing (Processing count varying
by mount timing, the active design flickering as if removed, the list/count freezing, then all
designs disappearing at once on a later reload) — this **disproved Amendment 5's conclusion** that
the client/server callable timeout mismatch was the primary cause (the fix was kept, as it is a
real, independently-verified issue, just not the whole story). Per the task's explicit instruction,
no further behavioral fix was attempted in this pass; instead a dev-only, bounded (max 1,000
events), field-allowlisted runtime trace (`packages/shared/src/utils/aiQueueTrace.ts`) was added
and wired into `importAiBackgroundQueue.ts`, `useAiReviewInbox.ts`, and `useDesigns.ts`, with a
"Copy AI Queue Trace" / "Reset AI Queue Trace" action added to the Firebase Debug panel. Self-review
during this pass caught and fixed a `setState`-updater-purity bug (trace calls were originally
inside `setState` updaters in `useDesigns.ts`, which React 18 StrictMode double-invokes in
development — moved outside the updaters via a read-only `designsMirrorRef`).

### 22.2 Amendment 6 follow-up — the instrumentation itself was broken (this addendum)

Owner reproduction of the Amendment 6 instrumentation returned
`{"enabled": false, "eventCount": 0, "events": []}` from the Firebase Debug panel for both a
mid-run and a final copy. Per the task's explicit instruction, AI queue behavior was not
investigated or modified in this pass — only the trace transport.

**Confirmed reason tracing was disabled.** `openFirebaseDebugWindow()` (`firebaseDebugWindowService.ts`)
opens the Firebase Debug panel as a genuinely separate Electron `BrowserWindow`
(`firebaseDebugIpcHandlers.ts`'s `new BrowserWindow({...})`), with its own independent renderer
process and JS module scope. The original `aiQueueTrace.ts` stored `enabled`/`events` as plain
module-level variables. Each renderer (the main Studio window and the Debug window) therefore
imported its **own independent copy** of that state — writes from the Studio window's renderer
(where `traceAiQueueEvent` calls actually happen) never reached the Debug window's renderer (where
`getAiQueueTraceSnapshot`/`resetAiQueueTrace` were being called), and
`FirebaseDebugPanelMount.tsx`'s renderer-side `setAiQueueTraceEnabled(isEnabled)` call only ever
enabled the Debug window's own disconnected copy — never the Studio window's. This matches exactly
the failure the owner reported: always `enabled: false, eventCount: 0` from the Debug window, no
matter what happened in the app.

**Final shared transport/store.** `aiQueueTrace.ts` was refactored from module-level functions into
a pure, environment-agnostic `AiQueueTraceStore` class (same allowlist, same 1,000-event bound, same
sanitize logic — unchanged). Exactly one instance of this class now lives in the Electron **main**
process, constructed once at module scope in the new
`apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts` (mirroring the existing
`firebaseDebugIpcHandlers.ts`'s `latestSnapshot`/`debugWindowLifecycle` precedent exactly). Four IPC
channels (`ai-queue-trace:append`, `:get-snapshot`, `:reset`, `:is-enabled`) are registered via
`registerAiQueueTraceIpcHandlers`, called once from `apps/studio/electron/main.ts` inside
`app.whenReady().then(...)`. The preload script (`apps/studio/electron/preload.ts`) exposes a
`window.freshPrints.aiQueueTrace` bridge with the same four methods over
`ipcRenderer.send`/`ipcRenderer.invoke`. Because both the main Studio window and the Debug window
load the **same** preload script, both get the same bridge into the **same** main-process store —
there is no second instance anywhere. A new renderer-side thin client
(`apps/studio/src/renderer/src/config/aiQueueTraceClient.ts`) is the only file any renderer code
imports from; all four instrumented call sites
(`importAiBackgroundQueue.ts`, `useAiReviewInbox.ts`, `useDesigns.ts`,
`FirebaseDebugPanel.tsx`) were repointed from the old direct shared-package import to this client.
No Firestore, Storage, localStorage, disk file, or new backend service is used.

**Where enable gating occurs.** `registerAiQueueTraceIpcHandlers` calls
`store.setEnabled(!options.isPackaged())` exactly once, at registration time, in the main process
only — confirmed by a test asserting `store.setEnabled(` appears exactly once in the handler
module's source. `FirebaseDebugPanelMount.tsx`'s renderer-side enable call was removed entirely (the
defect's root cause); neither renderer can enable or disable the store. Every handler
(`APPEND`/`GET_SNAPSHOT`/`RESET`/`IS_ENABLED`) additionally short-circuits per-call when
`options.isPackaged()` is true, so a production build gets an inert `{enabled: false, eventCount: 0,
events: []}` snapshot and never mutates the store even if IPC glue were somehow reachable — no trace
code path can affect a packaged build.

**Proof a main-renderer event is visible in the Debug window.** No live Electron process is
available in this environment (consistent with every prior amendment in this managed goal), so this
is proven from source plus a same-instance IPC simulation test rather than a real two-window run —
the same proof style already established for the sibling `firebaseDebug` feature in this codebase.
The new test `"simulated writer (Studio window) and reader (Debug window) IPC calls observe the
same store"` (`packages/shared/src/utils/aiQueueTrace.test.ts`) enables the one real store instance
exactly as `registerAiQueueTraceIpcHandlers` does, appends an event the way the Studio-window
`append()` → `ipcRenderer.send` → `ipcMain.on` path ultimately would, then reads it back the way the
Debug-window `getSnapshot()` → `ipcRenderer.invoke` → `ipcMain.handle` path ultimately would —
confirming `enabled: true` and the appended event are visible, that `reset()` clears what was
written, and that a write after reset remains visible (proving closing/reopening the Debug window
cannot lose events from the active Studio session, since the store's lifetime is tied to the main
process, not to either renderer window).

### 22.3 Tests and results

| Command | Result |
|---|---|
| `npx tsx --test packages/shared/src/utils/aiQueueTrace.test.ts` | **19/19 pass** (rewritten for the `AiQueueTraceStore` class API; includes 7 new cross-window/IPC regression tests) |
| Studio typecheck (`npx tsc --noEmit`) | exit 0 |
| Studio 3-target Vite build (renderer/main/preload) | exit 0, no new build warning |
| `npm run lint` | exit 0 |
| `git diff --check` | exit 0 (CRLF-on-checkout warnings only, pre-existing repo line-ending config, not whitespace errors) |

### 22.4 Files changed (this follow-up)

- `packages/shared/src/utils/aiQueueTrace.ts` (rewritten: module-level functions → `AiQueueTraceStore` class)
- `packages/shared/src/utils/aiQueueTrace.test.ts` (rewritten for the class API; added cross-window/IPC regression tests)
- `packages/shared/src/types/aiQueueTrace/aiQueueTraceIpc.types.ts` (new)
- `packages/shared/src/types/import/importIpc.types.ts` (modified — added `aiQueueTrace` field to `FreshPrintsPreloadApi`)
- `apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcChannels.ts` (new)
- `apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts` (new — the one real store instance)
- `apps/studio/electron/main.ts` (modified — registers the new IPC handlers once, alongside `registerFirebaseDebugIpcHandlers`)
- `apps/studio/electron/preload.ts` (modified — exposes `window.freshPrints.aiQueueTrace`)
- `apps/studio/src/renderer/src/config/aiQueueTraceClient.ts` (new — the only renderer-side import point)
- `apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelMount.tsx` (modified — removed the renderer-side enable effect that was the root cause)
- `apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanel.tsx` (modified — import swapped to the IPC client; `handleCopyAiQueueTrace` now awaits the async `getSnapshot()`)
- `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts` (modified — import swapped)
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` (modified — import swapped)
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` (modified — import swapped; unrelated Amendment 6 `designsMirrorRef` purity fix retained)

**No AI queue behavior, Firebase project, or production action was touched or performed.** This
pass is transport-only: the trace's enable gate, field allowlist, 1,000-event bound, and every
instrumented call site's position in the existing control flow are unchanged from Amendment 6's
first pass — confirmed by the unmodified subset of tests in §22.3's test file (the pre-existing
safety-contract tests from the first pass all still pass unchanged) and by `git diff` showing zero
hunks in `importAiBackgroundQueue.ts`, `useAiReviewInbox.ts`, or `useDesigns.ts` outside of their
one-line import statements.
