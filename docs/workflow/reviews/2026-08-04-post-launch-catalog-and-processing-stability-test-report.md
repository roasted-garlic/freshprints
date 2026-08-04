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

## 14. Unresolved items and required owner QA

1. **Workstream E is fully unimplemented**, blocked on the evidence checklist in §1. This requires an authorized owner to run Studio interactively.
2. **Live controlled Firestore cost measurement** (§4) and **live AI Processing reconciliation UI verification** (§5) were not performed against real `fresh-prints-dev` traffic — both require an authenticated Studio session this environment cannot provide. Recommended owner follow-up: after reviewing this deploy, perform one real batch import (a handful of designs) and one real reprocess-a-design cycle in Studio against `fresh-prints-dev`, checking (a) the new `catalog-snapshot-scheduling`/`catalog-snapshot-publication` log events for a bounded publication count, and (b) that the Processing tab immediately reflects a completed reprocess without navigating away and back.
3. **Workstream A's required live-Firestore-document check** (per the managed-goal brief: "before deciding whether this is a write failure or stale-read failure" for Workstream A) was performed at the source level only (confirmed the write path and the missing invalidation directly in code) — an owner should still click Archive once in Studio against `fresh-prints-dev` and confirm the tag disappears from the active list immediately, to close the loop empirically.
4. **Category-archive parity** was implemented (not just flagged) in this pass, since the same guarded-callable-plus-unwired-cache-invalidation pattern was independently confirmed for categories during implementation — this exceeds the Review's "should be a required first step" framing by actually fixing it, not just re-flagging it.
