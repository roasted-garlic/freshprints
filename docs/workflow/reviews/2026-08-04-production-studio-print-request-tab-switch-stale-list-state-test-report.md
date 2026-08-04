# Test Report: Studio Print Request Tab-Switch Stale List State

Date: 2026-08-04
Branch: `fix/studio-print-request-tab-switch-stale-list-state`
Plan: `docs/workflow/plans/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-plan.md`
Formal Review: `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-review.md`
(verdict: **APPROVED — no required amendment**)
Implementation authorized via: `APPROVE STUDIO PRINT REQUEST TAB-SWITCH STALE LIST STATE IMPLEMENTATION`

## What changed

### Root cause recap

`usePrintRequests.ts`'s tab-driven reset (`loadFirstPage`) is triggered by a plain `useEffect`, which
React only runs after the render where `activeTab` changed has already committed and painted. On
that transitional render, the hook still returned the **previous** tab's `requests` and
`isLoading: false` — nothing reset either synchronously. `PrintRequestsPage.tsx` never applied a
render-time `queueTab === activeListTab` filter, fully trusting the hook to already be tab-pure.

### Fix — Layer 1: synchronous loading-state derivation (`usePrintRequests.ts`)

Added `loadedTabRef` (`useRef<PrintRequestListTab | null>(null)`), updated only at `loadFirstPage`'s
three terminal points (the `!user`/permission-denied reset, the success path, and the catch/error
path — all three genuinely represent "this tab's load attempt has concluded"). The hook now exposes
`isLoading` as `derivePrintRequestsListLoading(state.isLoading, loadedTabRef.current, activeTab)` —
`true` whenever `state.isLoading` is `true` **or** `loadedTabRef.current !== activeTab`, closing the
gap on the exact render where `activeTab` has changed but the effect hasn't run yet, since this
comparison only depends on values already available synchronously during render.

### Fix — Layer 2: render-time containment filter (`PrintRequestsPage.tsx`)

`activeTabRequests` now also filters through `filterPrintRequestsByActiveTab(requests,
activeListTab)` before its existing `status !== "archived"` filter — rejecting any request whose own
`queueTab` disagrees with `activeListTab` (admitting a request with no `queueTab` unconditionally,
matching the identical precedent in `mergePrintRequestsById` and `mergeShowQueuePrintRequestSources`).
This is explicitly a defense-in-depth second layer, not a substitute for Layer 1 — confirmed in both
the Plan and Formal Review that filtering alone (without fixing `isLoading`'s timing) would produce a
different but still-incorrect UX (a misleading "Nothing here yet" empty state instead of a loading
spinner during the transitional window).

## Verification results

| Check | Result |
|---|---|
| `derivePrintRequestsListLoading.test.ts` (new, 6 tests) | **6/6 pass** |
| `filterPrintRequestsByActiveTab.test.ts` (new, 5 tests) | **5/5 pass** |
| Regression proof: reverted `derivePrintRequestsListLoading.ts` to ignore `loadedTab`, re-ran its test file | **2/6 fail**, confirming genuine discriminating power; restored, 6/6 pass |
| Regression proof: reverted `filterPrintRequestsByActiveTab.ts` to a no-op passthrough, re-ran its test file | **3/5 fail**, confirming genuine discriminating power; restored, 5/5 pass |
| PR #37 regression: `showQueuePrintRequestSources.test.ts`, `printRequestRoutes.test.ts` | pass (unaffected — this fix does not touch either file) |
| PR #38 regression: `mergePrintRequestsById.test.ts`, `resolvePrintRequestItemArtworkBackground.test.ts` | pass (unaffected — this fix does not touch either file) |
| `reconcileDeletedOrArchivedRequest.test.ts` (unchanged, re-run as an additional regression check) | pass |
| **Combined total across all 7 relevant test files** | **50/50 pass** |
| Repo lint (`npm run lint`) | exit 0, 0 warnings |
| Studio typecheck (`tsc --noEmit`, after generating the build-time packaged-config file) | exit 0 |
| Studio production build (`tsc && vite build` for renderer, main, and preload) | exit 0, all three bundles built successfully; pre-existing chunk-size/dynamic-import warnings unrelated to this change |
| `git diff --check` | exit 0 |

## New test coverage added

**`derivePrintRequestsListLoading.test.ts`** (6 tests):
- Initial mount reports loading (`loadedTab: null`).
- Steady state (`loadedTab === activeTab`, `state.isLoading: false`) reports not loading.
- **The exact reported defect** — Queued finished loading, `activeTab` becomes `"working"`, but
  `state.isLoading` has not yet flipped `true` — correctly reports loading.
- Genuine `state.isLoading: true` reports loading regardless of `loadedTab`.
- A completed load for the new tab correctly reports not loading.
- Rapid switching across three tabs before any resolves reports loading throughout, settling to not
  loading only once the last-requested tab's load completes.

**`filterPrintRequestsByActiveTab.test.ts`** (5 tests):
- Matching `queueTab` kept.
- Mismatched `queueTab` rejected (the render-time safety-net scenario).
- Absent `queueTab` kept regardless of active tab (legacy fallback).
- All four `queueTab` values matrixed against every other active tab (16 combinations).
- A mixed list correctly retains only matching-or-legacy entries.

## Files changed

- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.test.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByActiveTab.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByActiveTab.test.ts` (new)
- This Test Report (new).

No Cloud Function, Firestore Rule/index, Portal file, or dependency was changed. No new Firestore
read, listener, or query shape was introduced — both fixes operate entirely on how already-fetched
data is exposed to the render tree. `usePrintRequestAllocationTotals`'s pre-existing full-collection
scan, PR #37's deep-link resolution, and PR #38's artwork-background/merge-guard logic were all
independently confirmed unmodified (each has an empty diff against this branch's base).

## Manual/owner verification still required

This environment cannot launch the packaged Electron app or a live Firebase-connected dev session.
The owner should re-run the exact originally-reported scenario against `fresh-prints-dev`:

1. Open the attached queued request from Show Queue — confirm Queued opens automatically.
2. Manually click Working — confirm the queued request is **never** visible, including momentarily,
   and the list either shows a loading spinner or the correct empty state immediately.
3. Confirm Working's count and visible list agree (both `0` / empty simultaneously).
4. Switch back to Queued — confirm the request appears exactly once.
5. Repeat Queued → Working → Queued rapidly several times — confirm no duplication or leakage under
   any tab.
6. Confirm Refresh and route navigation still work as before.
7. Confirm the request's artwork background (PR #38) still renders correctly, unaffected.

## Human checkpoint carried forward

The stable `1.0.0` release draft remains unpublished pending this fix's owner verification.

## Confirmation

No Firestore Rules, indexes, Cloud Functions, or production/dev deployment action was performed in
this pass. All changes are local, committed Studio renderer source and test files on
`fix/studio-print-request-tab-switch-stale-list-state`.
