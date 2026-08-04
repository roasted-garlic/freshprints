# Implementation Review: Studio Print Request Tab-Switch Stale List State

Date: 2026-08-04
Branch reviewed: `fix/studio-print-request-tab-switch-stale-list-state`
Diff base: `origin/production` at `e1e83ae5db447f996490e2edab8578717a068d9a` (the PR #38 merge)
Plan: `docs/workflow/plans/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-plan.md`
Formal Review (Plan phase): `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-review.md`
(verdict: APPROVED — no required amendment)
Test Report: `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-test-report.md`

Reviewer stance: independent re-derivation against the actual working-tree diff, not a re-read of
the implementer's own Test Report claims. Re-read every changed file in full, re-traced the downstream
consumers of every changed value (`isLoading`, `activeTabRequests`) to check for unintended
interactions with detail-panel state, Refresh, and pagination, and independently re-ran the
before/after test-discrimination proof rather than accepting the Test Report's account of having
done so.

## Verdict: APPROVED — NO CORRECTION REQUIRED

Both fix layers are correctly implemented, correctly scoped, and correctly verified. This review
found no defect requiring a follow-up correction pass.

## 1. Re-verification of Layer 1 — `usePrintRequests.ts`'s synchronous loading-state derivation

Re-read the full committed file. Confirmed:

- `loadedTabRef` is a `useRef<PrintRequestListTab | null>(null)`, written only at the three genuine
  terminal points of `loadFirstPage` (the `!user`/permission-denied reset, the success path after
  both awaits, and the catch/error path) — each of these represents "this tab's load attempt has
  concluded," so setting the ref at exactly these three points and nowhere else is correct; a fourth
  write site would either be redundant (mid-flight) or premature (before the load genuinely settles).
- `isLoading` is derived via the extracted `derivePrintRequestsListLoading(state.isLoading,
  loadedTabRef.current, activeTab)` and exposed in the hook's return object as `isLoading` (shadowing
  the spread `...state`'s own `isLoading` key via object property ordering — `isLoading` is listed
  after `...state` in the return object, confirmed this is the JS-correct way to override a spread
  property, not a bug).
- `activeTabRef` (the pre-existing PR #38 mechanism for `ensureRequestsLoaded`'s merge guard) and the
  new `loadedTabRef` are two distinct refs serving two distinct purposes — confirmed no confusion or
  accidental merge between them anywhere in the diff.

**Independently re-traced the actual timing mechanism** rather than accepting the Plan/Review's prior
analysis: `usePrintRequests`'s `useEffect` at `cursorRef.current = undefined; void loadFirstPage();`
depends on `[loadFirstPage]`, whose own identity depends on `[activeTab, hydratePage, loadCounts,
user]` — confirmed this `useEffect` still runs on every `activeTab` change (unaffected by this diff),
and confirmed React's documented contract that plain `useEffect` callbacks execute after the browser
paints the triggering commit — meaning the derived `isLoading` genuinely closes the gap only a
synchronous, render-time comparison could close. **Confirmed correct.**

### 1.1 No regression to `loadMore`, Refresh, or the existing `requestGenerationRef` guard

- `loadMore` is unchanged in this diff and operates only within an already-stable `activeTab` (a
  tab switch always re-triggers `loadFirstPage` via its own effect, which would supersede any
  in-flight `loadMore` through the existing, unmodified `requestGenerationRef` check) — confirmed no
  interaction with the new `loadedTabRef` is needed or was added.
- `reloadPrintRequests` (Refresh) calls `loadFirstPage(options)` without changing `activeTab` —
  confirmed `loadedTabRef.current` is already equal to `activeTab` before Refresh starts (from the
  prior successful load), so the derived `isLoading` is governed purely by `state.isLoading`
  throughout a refresh, exactly matching pre-fix behavior and the `silent: true` UX
  `handleRefresh` relies on (independently re-confirmed at `PrintRequestsPage.tsx:407`, unchanged).
- The existing `requestGenerationRef` stale-response guard is completely untouched by this diff —
  confirmed via `git diff`, zero lines in that mechanism changed.

## 2. Re-verification of Layer 2 — `PrintRequestsPage.tsx`'s render-time containment filter

Re-read the full diff. Confirmed `activeTabRequests` now composes
`filterPrintRequestsByActiveTab(requests, activeListTab)` with the pre-existing
`isPrintRequestIncludedInListTabs(request.status)` filter, and its `useMemo` dependency array was
correctly extended to include `activeListTab` (previously only `[requests]` — a real, necessary
change, since the filter's output now also depends on `activeListTab`; omitting it would have been a
genuine stale-memoization bug this review specifically checked for and found correctly avoided).

**Independently re-traced every downstream consumer** of `activeTabRequests`
(`workingRequestsByFilter`, `routeEligibleRequests`, `visibleRequests`, and `canonicalRoute`'s
`requestsByTab` construction) — confirmed none of them needed independent modification, since they
already consume `activeTabRequests` as their sole input and the filter's effect propagates through
the existing chain automatically. **Confirmed no missed downstream call site.**

### 2.1 Confirmed the detail panel remains fully independent

Re-read `usePrintRequestDetails.ts` — empty diff against this branch's base. Re-traced
`isRequestLoading` (`PrintRequestsPage.tsx:300`, derived from `requestDetails.isLoading`, not
`usePrintRequests`'s `isLoading`) and `visibleSelectedRequest` — both confirmed to depend only on the
independent `usePrintRequestDetails` hook, with zero interaction with either of this diff's two
changed values. **Confirmed the required "detail panel and visible tab list remain logically
separate" constraint is fully satisfied, unchanged from before this fix.**

## 3. Re-verification of scope and safety

```
git status --porcelain | awk '{print $2}' | grep -vE "^docs/"
```
returns exactly 6 files, all under `apps/studio/src/renderer/src/features/print-requests/`. Grepped
the full diff for any `functions/`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`,
`apps/portal/`, or `package.json` path — zero matches. Grepped the diff for `onSnapshot`, `getDocs(`,
`collection(` — zero matches; no new Firestore read or listener was introduced anywhere. Re-confirmed
`usePrintRequestAllocationTotals.ts` has an empty diff — unaffected, still correctly out of scope.
PR #37's `showQueuePrintRequestSources.ts`/`.test.ts` and `UpcomingShowsPage.tsx` all have empty
diffs — confirmed untouched. PR #38's `mergePrintRequestsById.ts` and
`resolvePrintRequestItemArtworkBackground.ts` both have empty diffs — confirmed untouched, and their
respective test suites were independently re-run in this review (§5) and pass unmodified.

## 4. Re-verification of test quality

Re-read both new test files in full (`derivePrintRequestsListLoading.test.ts`,
`filterPrintRequestsByActiveTab.test.ts`) — confirmed both import and exercise the real production
modules (not reimplementations), confirmed the specific "Queued finished, activeTab becomes Working,
state.isLoading still false" scenario is explicitly named and tested (directly reproducing the
reported defect's exact precondition, not just a generic mismatch case), and confirmed the
`filterPrintRequestsByActiveTab` matrix test covers all 4×4 `queueTab`-vs-`activeTab` combinations,
matching the identical convention already established and reviewed for `mergePrintRequestsById.test.ts`
in PR #38.

**Independently re-ran the before/after discrimination proof**, not merely re-reading the Test
Report's account of it: physically swapped `derivePrintRequestsListLoading.ts` for a version that
ignores `loadedTab` entirely and re-ran its test file — **2 of 6 subtests failed**, exactly the ones
exercising the transitional-render and rapid-switching scenarios; restored the exact committed file
via a pre-swap backup and re-confirmed `git status --porcelain` showed a clean/untracked (expected,
since this is a new file) state afterward with no residual diff against the committed content.
**Confirmed genuine discriminating power, independently verified in this review pass, not merely
trusted from the Test Report.**

## 5. Final verification (independently re-run in this pass)

| Check | Result |
|---|---|
| `derivePrintRequestsListLoading.test.ts` + `filterPrintRequestsByActiveTab.test.ts` | **11/11 pass** |
| Same two files + `mergePrintRequestsById.test.ts` + `resolvePrintRequestItemArtworkBackground.test.ts` + `showQueuePrintRequestSources.test.ts` + `printRequestRoutes.test.ts` (PR #37/#38 regression) | **42/42 pass** |
| Physically-swapped no-`loadedTab` version of `derivePrintRequestsListLoading.ts`, re-run | **4/6 pass, 2/6 fail** (confirming discrimination); restored, tree clean |
| Studio typecheck (`tsc --noEmit`, after generating the build-time packaged-config file) | exit 0 |
| Studio production build (`tsc && vite build` for renderer, main, and preload) | exit 0, all three bundles built; identical pre-existing chunk-size/dynamic-import warnings, no new errors |
| Repo lint (`npm run lint`) | exit 0, 0 warnings |
| `git diff --check` | exit 0 |
| `git status --porcelain` (post-verification) | exactly the 9 expected files (6 source/test + 3 doc), no stray changes |

## Any required changes

None. No defect was found requiring a correction pass.

## Files reviewed (exact list)

- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (full re-read,
  full diff against `origin/production`)
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (full diff;
  targeted re-read of `activeTabRequests` and every downstream consumer)
- `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.ts`
  (full content; physically swapped and restored during verification)
- `apps/studio/src/renderer/src/features/print-requests/utils/derivePrintRequestsListLoading.test.ts`
  (full content)
- `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByActiveTab.ts`
  (full content)
- `apps/studio/src/renderer/src/features/print-requests/utils/filterPrintRequestsByActiveTab.test.ts`
  (full content)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts` (confirmed
  empty diff — detail-panel independence)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestAllocationTotals.ts`
  (confirmed empty diff — out-of-scope hook untouched)
- PR #37 files (`showQueuePrintRequestSources.ts`/`.test.ts`, `UpcomingShowsPage.tsx`) — confirmed
  empty diffs
- PR #38 files (`mergePrintRequestsById.ts`, `resolvePrintRequestItemArtworkBackground.ts`,
  `PrintRequestItemCard.tsx`) — confirmed empty diffs
- Full diff via `git status --porcelain`/`git diff --stat`

## Confirmation

No application source was modified by this review beyond the temporary, fully-restored swap used to
verify test discrimination in §4. This review created only this one document.
