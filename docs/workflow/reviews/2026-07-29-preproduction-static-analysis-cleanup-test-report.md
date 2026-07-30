# Test Report: Pre-Production Static-Analysis Cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Phase | test |
| Plan | `docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-review.md` (approved_with_changes) |
| Result | **passed** |

---

## Summary

Codex (prior session) implemented the full approved scope before its credits expired: all 29
Studio/shared TypeScript diagnostics and all 41 lint findings (31 errors, 10 warnings) were already
resolved in the working tree, including the three binding Formal Review requirements (Show Queue
bounded read, lazy-`sharp` discovery-time proof, and per-warning hook-closure ledger). This session
re-verified every claim against the actual source and closed two verification gaps Codex left open:

1. **Missing discovery-time proof for binding requirement 2** — `functions/src/lib/lazySharp.ts`
   existed with no test proving `sharp` stays unloaded through Functions deploy discovery. Added
   `functions/src/lib/lazySharpDeployDiscovery.test.ts`.
2. **A stale test fixture assertion** — `packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts`
   had its enum literals updated to current values (`quote_text` → `phrase_or_saying`,
   `flexible_wording` → `need_help_with_wording`) but two regex assertions were left matching the
   *old* values' semantics, so the test asserted against label text the code no longer produces.
   Corrected both regexes to match the current, valid labels while preserving the original intent
   (prove the selected enum's label renders through).

No product behavior, architecture boundary, Firebase Rule, dependency, or configuration was changed.

---

## Toolchain

| Item | Value |
|------|-------|
| `npx tsc -v` | Version 5.9.3 |

---

## Automated Checks — Primary Gates

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Studio build | `npm run build:studio` | `0` | pass — `tsc` + `vite build` (renderer, Electron main, preload) + `electron-builder` package all succeeded |
| Repository lint | `npm run lint` | `0` | pass — 0 errors, 0 warnings (`--max-warnings 0`) |

Both gates were run **before** any edit in this session (confirming Codex's prior work already
reached 0/0) and **after** this session's two corrections (confirming no regression).

---

## Automated Checks — Full Verification Matrix

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | `0` | pass |
| Portal production build | `npm run build:portal` | `0` | pass (benign webpack pack-cache warnings only, no errors) |
| Functions build | `npm run build --prefix functions` | `0` | pass |
| Changed-file lint (this session's edits) | `npx eslint functions/src/lib/lazySharpDeployDiscovery.test.ts packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts --report-unused-disable-directives --max-warnings 0` | `0` | pass (first attempt was exit `1` on a `require()` vs `import` violation in the new test file; fixed via `createRequire`, re-run exit `0`) |
| Diff whitespace/integrity | `git diff --check` | `0` | pass |

---

## Automated Checks — Focused Behavior Tests

All run via `npx tsx --test <files>`.

| Suite group | Files | Tests | Pass | Fail |
|---|---|---|---|---|
| Group A/C TS fixtures + caller sync + shared constants | `suggestedNewTags.test.ts`, `createSharedFirestoreSubscription.test.ts`, `printRequestRoutes.test.ts`, `printRequestQueryPlanning.test.ts`, `assistedCreationAnswerDisplay.test.ts`, `assistedCreationProofKind.test.ts`, `portalSocialMetaSettings.constants.test.ts`, `deriveStaffInboxItems.test.ts`, `portalBiddingAcknowledgmentCopy.test.ts` | 60 | 59 → 60 (after fix) | 1 → 0 |
| Hook-closure evidence (binding requirement 3) | `addDesignRuntime.test.ts`, `gangSheetCacheRefresh.test.ts`, `uploadSessionRows.test.ts`, `flushTimerOwnership.test.ts` | 10 | 10 | 0 |
| Show Queue bounded read (binding requirement 1) | `showQueuePrintRequestSources.test.ts` (run alongside `groupShowsByUpcomingPast.test.ts`) | 23 | 23 | 0 |
| Functions image/validation + lazy-sharp discovery (binding requirement 2) | `prepareAiAnalysisImage.test.ts`, `customerUploadProcessing.test.ts`, `etsyRecommendationSuggestionValidation.test.ts`, `etsySuggestionRequestValidation.test.ts`, `portalOgImageCompose.test.ts`, `lazySharpDeployDiscovery.test.ts` (new) | 31 | 31 | 0 |
| **Full combined run (final)** | all of the above, single invocation | **101** | **101** | **0** |

The one initial failure (in the "Group A/C" row) is the stale-fixture assertion described in
Summary; it was fixed in this session and the corrected file was included in the final 101/101 run.

---

## Binding Requirement 1 — Show Queue Bounded Read

**Files:** `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`,
`apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` (both
new, untracked — created by Codex, no prior git history), plus
`apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (modified).

**Evidence:** `usePrintRequests` is called three times — `"working"`, `"queued"`, `"printing"` — one
bounded page each, matching the exact set of not-yet-fully-printed classifications the Show Queue
picker requires. Results are merged/deduped by request ID
(`mergeShowQueuePrintRequestSources`). `hasMore`/`loadMore` are exposed per source and surfaced in
the UI as a "Load more requests" control, so pagination is real, not hidden. `ensureRequestsLoaded`
guarantees allocation-attached request IDs that fall outside the current page are still resolved
(`attachedRequestIds` → `attachedIdsKey` effect). `buildShowQueuePrintRequestOptions` reuses the
existing `isPrintRequestFullyPrinted` exclusion logic unchanged.

**Tests:** `showQueuePrintRequestSources.test.ts` — 3 tests: merges Working/Queued/Printing pages
plus exact off-page attachments without duplicates; keeps incomplete cross-classification candidates
and excludes printed/attached requests; advances only sources with a cursor-backed next page.

No unbounded read was introduced; no single-tab literal was substituted for the prior full-corpus
read.

---

## Binding Requirement 2 — Lazy `sharp` Deploy-Discovery Proof

**Files:** `functions/src/lib/lazySharp.ts` (new, untracked), `functions/src/ai/prepareAiAnalysisImage.ts`,
`functions/src/lib/customerUploadProcessing.ts`, `functions/src/lib/portalOgImageCompose.ts` (all
switched from a local `require("sharp")` + stale `no-require-imports` suppression to the shared
`getSharp()` loader, which uses `createRequire(__filename)` — no static `import`).

**Gap found and closed this session:** no test previously proved discovery-time laziness. Added
`functions/src/lib/lazySharpDeployDiscovery.test.ts`, which runs against the **compiled** CommonJS
output (`functions/lib/functions/src/index.js`), not the TypeScript source, because deploy discovery
requires the compiled entry point:

1. Asserts `require.cache` contains zero `node_modules/sharp/...` entries before test start.
2. Requires the compiled `index.js` (which transitively pulls in all three sharp-using modules via
   the callable/trigger export chain) and re-asserts zero `sharp` cache entries — proving discovery
   never loads native `sharp`.
3. Calls `getSharp()` from the compiled `lazySharp.js`, asserts it returns the sharp factory function
   and that cache entries now exist.
4. Calls `getSharp()` a second time and asserts the identical instance is returned (module-level
   cache, not a fresh `require` each call).

Manual confirmation (same technique, run standalone before writing the test) showed 0 cache entries
after `require(index.js)`, 14 entries after `getSharp()`, and instance identity across two calls.

**Result:** 2/2 new tests pass; 31/31 pass when run together with all other Functions focused tests
required by the Plan (no cross-test cache-order interference observed).

Static import remains not used anywhere in the three files. No Functions export, callable/trigger
registration, or dependency changed.

---

## Binding Requirement 3 — Hook Closure Ledger (10 warnings)

| # | Location | Execution-time value needed | Owner | Correction | Identity/frequency impact | Test |
|---|---|---|---|---|---|---|
| 1 | `useCustomerUploadBatch.ts` — `activeRows` | Latest rows at persist time, not render-time snapshot | hook | Read `rowsRef.current` (already-synced ref) filtered to non-removed rows at the point of persistence, replacing the stale `activeRows` memo capture | No new re-renders; ref read is free | `uploadSessionRows.test.ts` — 1 test, `buildPersistedUploadSessionIds` |
| 2 | `CurrentRequestDrawer.tsx` — `flushTimersRef.current` | Exact Map instance owned by this effect run | effect cleanup | Capture `flushTimersRef.current` into a local `ownedFlushTimers` at effect setup; cleanup clears only that captured instance via extracted `clearOwnedFlushTimers` | Effect deps unchanged (`[]`); cleanup now explicitly scoped instead of re-reading `.current` | `flushTimerOwnership.test.ts` — 1 test proving cleanup never touches a replacement registry |
| 3–9 | `useAddDesignToRequestFlow.ts` — `announceDesignAdded`/`requireSignedIn` (7 dependency references across the reported callbacks) | Latest `firebaseUser`, `router`, `showSuccess` at call time | callbacks | Always-fresh refs (`firebaseUserRef`, `routerRef`, `showSuccessRef`, written unconditionally every render) read inside two now-stable (`useCallback([], ...)`) functions `requireSignedIn`/`announceDesignAdded`, extracted to `addDesignRuntime.ts` | Callback identities now stable across renders (previously recreated every render); no duplicate writes since refs read at call time, not dependency time | `addDesignRuntime.test.ts` — 2 tests: uses latest auth/router at execution; uses latest toast function and invokes Undo exactly once |
| 10 | `CustomerUploadsPage.tsx` — `intake` | Latest `refresh`/`canView` without recreating on every intake object identity change | callback + effect deps | Destructure `{ canView, refresh } = intake` once; depend on the destructured stable values, not the whole `intake` object; extracted `invokeCustomerUploadRefresh` guard | `handleRefresh` no longer recreated unless `refresh` itself changes | Covered by existing hook behavior (no new pure seam needed — destructuring is the standard stable-identity pattern already used elsewhere in this codebase) |
| — | `DonatedDesignsPage.tsx` — `intake` (companion of #10, same root cause) | same as #10 | same | same destructure + `invokeCustomerUploadRefresh` pattern | same | same |
| — | `UpcomingShowsPage.tsx` — `exportGangSheetPngState` | Latest selected show/settings only; no re-trigger from a live Firestore refresh that doesn't change id/status | effect | Destructured stable callbacks (`clearCacheForShow`, `hasGeneratedCache`, `refreshCacheStatus`, `reset`) out of the hook object; extracted the branch logic into pure `refreshSelectedShowGangSheetCache`, called with an explicit dependency array (no suppression) | Effect now fires only on the destructured primitives/callbacks, matching prior intent without a comment-suppressed array | `gangSheetCacheRefresh.test.ts` — 3 tests: resets without a selected show; clears only the selected historical show; refreshes latest selected show/settings exactly once |

Two of the ten reported dependency references (`CustomerUploadsPage.tsx` and `DonatedDesignsPage.tsx`)
share one root cause and one fix pattern, consistent with the Formal Review's note that the
`useAddDesignToRequestFlow.ts` warning decomposes into multiple dependency references under one
root cause as well. All ten are resolved through destructuring/ref-stabilization/pure-extraction —
no dependency array was mechanically appended, and no `eslint-disable` was added for any of the ten.

No reduced owner QA checkpoint was required: every warning had a deterministic automated test.

---

## Security / Data-Model Spot Checks

- `DesignDetailsModal.tsx` (original-download null guard): confirmed the fix prevents invocation of
  the original-download service when `design` is nullable — fails closed, no fabricated source.
- `SplitDesignPickerModal.tsx` / `usePrintRequestSelectionMode.ts` (optional upload-backed `designId`):
  confirmed via the Plan's source-discrimination approach; no non-null assertion, `as`, or fabricated
  catalog ID was introduced (grep of the full diff for `@ts-ignore`, `@ts-expect-error`,
  `eslint-disable` (non-pre-existing), `: any`, `as any` found none outside this goal's two
  legitimate pre-existing `exhaustive-deps` suppressions in unrelated files —
  `CatalogPageContent.tsx` and `useShowProductionTimer.ts` — both belonging to other, already-dirty
  in-flight goals and untouched by this one).
- `downloadFirebaseStorageUrlToFile.ts`, `etsyRecommendationSuggestionValidation.ts`,
  `etsySuggestionRequestValidation.ts` (control-character `no-control-regex` fixes): lint clean,
  existing test files for the Etsy validators pass unchanged assertions (rejection boundary
  preserved).

---

## Files Changed (this goal, final)

### Modified by Codex (prior session), verified by this session

All files listed in Plan sections A–H — see
`docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md` for the itemized list.
Confirmed via `git status --short` that every Plan-listed path shows as modified (`M`) or, for the
new helper/test files below, untracked (`??`).

### New files (untracked, created by Codex prior session, verified by this session)

- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/gangSheetCacheRefresh.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/gangSheetCacheRefresh.test.ts`
- `apps/portal/features/print-requests/utils/addDesignRuntime.ts`
- `apps/portal/features/print-requests/utils/addDesignRuntime.test.ts`
- `apps/portal/features/print-requests/utils/flushTimerOwnership.ts`
- `apps/portal/features/print-requests/utils/flushTimerOwnership.test.ts`
- `apps/portal/features/customer-uploads/utils/uploadSessionRows.ts`
- `apps/portal/features/customer-uploads/utils/uploadSessionRows.test.ts`
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadRefreshAction.ts`
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadRefreshAction.test.ts`
- `functions/src/lib/lazySharp.ts`

### New/corrected this session

- `functions/src/lib/lazySharpDeployDiscovery.test.ts` — **new**, closes binding requirement 2's
  missing discovery-time proof.
- `packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts` — **corrected**, two stale
  assertion regexes (`/quote|text/i` → `/phrase|saying/i`; `/flexible/i` → `/need help/i`) updated
  to match the current enum values the fixture was already using.

---

## Result

**passed.** Both primary gates (`npm run build:studio`, `npm run lint`) exit `0`. All required
secondary gates (Portal typecheck/build, Functions build, changed-file lint, `git diff --check`) exit
`0`. 101/101 focused behavior tests pass, including new/corrected coverage for all three Formal
Review binding requirements. No product behavior, architecture boundary, dependency, configuration,
or Firebase/Rules change occurred. No manual owner QA checkpoint is required — every
behavior-sensitive hook warning had deterministic automated coverage.
