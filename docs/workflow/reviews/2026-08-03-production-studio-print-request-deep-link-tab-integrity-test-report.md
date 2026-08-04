# Test Report: Studio Print Request Deep-Link Tab Integrity

Date: 2026-08-03
Branch: `docs/production-studio-print-request-deep-link-tab-integrity`
Plan: `docs/workflow/plans/2026-08-03-production-studio-print-request-deep-link-tab-integrity-plan.md`
Formal Review: `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-review.md`
(verdict: **APPROVED WITH REQUIRED AMENDMENT**)
Implementation authorized via: `APPROVE STUDIO PRINT REQUEST DEEP-LINK TAB INTEGRITY IMPLEMENTATION`

## What changed

### Defect A fix — deep link opened on the wrong tab

`apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts`:
added `resolveShowQueuePrintRequestLinkTab()`, which prefers the matched request's own
server-maintained `queueTab` and falls back to a live `derivePrintRequestListTab` recomputation only
when `queueTab` is absent (pre-backfill legacy documents).

`apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`: the Attached
Print Requests link builder now calls `resolveShowQueuePrintRequestLinkTab` instead of recomputing
the tab directly from `derivePrintRequestListTab` over `usePrintRequestAllocationTotals`'s
once-per-mount, never-refreshed snapshot (the Review's confirmed mechanism: this made the bug
deterministic for the rest of any page session after adding a request to a show, not a rare race).

### Defect B fix — wrong-tab list contamination

`apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`: each of
the three `usePrintRequests` source instances (`working`, `queued`, `printing`) is now tagged with
its own `tab`, and `ensureRequestsLoaded` (the direct-by-ID fetch for attached requests outside a
tab's loaded page) is now called on **all three** sources instead of only `working` — necessary so
a Queued or Printing attached request has a legitimately-tab-matching source to land in once
`mergeShowQueuePrintRequestSources` starts filtering (see below); calling it on only one source
would otherwise have caused such a request to disappear from the merged list entirely instead of
merely being mis-bucketed.

`apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts`:
`mergeShowQueuePrintRequestSources` now skips admitting a request into a source's contribution when
the request's own `queueTab` disagrees with that source's tagged `tab`, and only carries forward a
summary entry for a request that was actually admitted. A request with no `queueTab` (pre-backfill)
is still admitted regardless of source, since no source is more "correct" than another for it.

## Verification results

| Check | Result |
|---|---|
| `showQueuePrintRequestSources.test.ts` (updated + 6 new cases) | **9/9 pass** |
| `printRequestRoutes.test.ts` (unchanged, re-run as a regression check) | pass (18 tests total across both files) |
| `printRequestListGrouping.test.ts` / `printRequestQueueTabRecompute.test.ts` (unchanged, sanity re-run — these functions were explicitly out of scope and not touched) | 16/16 pass |
| Repo lint (`npm run lint`) | exit 0, 0 warnings |
| Studio typecheck (`tsc --noEmit`, after generating the build-time packaged-config file) | exit 0 |
| `git diff --check` | exit 0 (only benign CRLF-normalization warnings, no real issue) |

## New test coverage added

- `showQueuePrintRequestSources.test.ts`:
  - Regression: a request force-loaded into a source whose tab disagrees with the request's own
    `queueTab` is not admitted into the merge output (the exact pre-fix contamination scenario).
  - A request admitted correctly when present in the source whose tab actually matches its
    `queueTab`, even if also present (and now correctly excluded) elsewhere.
  - A request with no `queueTab` (legacy/pre-backfill) is still admitted regardless of source.
  - `resolveShowQueuePrintRequestLinkTab`: prefers `queueTab` even when passed deliberately
    stale/zero totals (the Review's confirmed same-session staleness scenario); falls back to live
    derivation when `queueTab` is absent or no request has been matched yet.
- Updated the pre-existing merge test's fixture, which had (before this fix) demonstrated the
  now-corrected buggy unconditional-union behavior; it now demonstrates the same merge scenario
  under the corrected tab-matching rule.

## Files changed

- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.test.ts`
- This Test Report (new).

No Cloud Function, Firestore Rule/index, or Portal file was changed, matching the Plan's explicit
scope boundary. `usePrintRequestAllocationTotals`'s full-collection-scan pattern (flagged by the
Review as a related but separate finding) was **not** modified — it remains a candidate for a future,
separately-scoped tech-debt item.

## Manual/owner verification still required

This environment cannot launch the packaged Electron app or a live Firebase-connected dev session.
The owner should re-run the exact originally-reported scenario against `fresh-prints-dev`:

1. Add a print request to a show's queue via Show Queue's "+ Add Print Request" **without**
   navigating away from or reloading the Show Queue page afterward.
2. Click that request's link in "Attached Print Requests."
3. Confirm the Print Requests page opens directly on the **Queued** tab with the request selected,
   and confirm the request does not also appear in the **Working** tab's list.

## Human checkpoint carried forward

The stable `1.0.0` release draft remains unpublished pending this fix's owner verification, per the
checkpoint recorded in the Plan (§9) and reaffirmed in the Review.

## Confirmation

No Firestore Rules, indexes, Cloud Functions, or production/dev deployment action was performed in
this pass. All changes are local, uncommitted Studio renderer source and test files on the
`docs/production-studio-print-request-deep-link-tab-integrity` branch pending owner review and a
decision on how to land this fix (this branch was created for the Plan/Review docs-only phase; the
owner may want the implementation moved to its own appropriately-named branch before opening a PR —
flagged here rather than assumed).
