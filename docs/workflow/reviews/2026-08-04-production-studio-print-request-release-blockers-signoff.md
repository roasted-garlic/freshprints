# Signoff: Studio Print Request Release-Blocker Remediation (PR #37, #38, #39)

Date: 2026-08-04
Active managed goal: `production-release`
Scope: three sequential Studio Print Requests defects discovered during stable `v1.0.0` release
smoke-testing, each independently Planned, Formally Reviewed, Implemented, Test-Reported, and
independently Implementation-Reviewed before merge.

## Summary

All three remediations are merged to `production`, owner-QA-confirmed **PASS**, and the stable
`v1.0.0` GitHub Release draft has remained unpublished throughout the entire remediation sequence.

| # | PR | Defect | Merge commit | Owner QA |
|---|----|--------|---------------|----------|
| 1 | #37 | Show Queue deep link opened Working instead of the authoritative `queueTab`; a related wrong-tab list-contamination defect in Show Queue's own merge logic | `2d2697d022a551fc33bfc1815843e5fa7cfdfa3a` | **PASS** |
| 2 | #38 | Direct request-ID hydration could inject a queued request into `PrintRequestsPage`'s Working-tab list; catalog design's saved `artworkBackgroundHex` was never applied to Studio Print Request item previews (thumbnail and lightbox) | `e1e83ae5db447f996490e2edab8578717a068d9a` | **PASS** |
| 3 | #39 | A render-timing gap in `usePrintRequests`'s tab-driven reset could show the previous tab's stale request list under a newly active tab for one or more renders before the async reset completed | `70c083af6ec0165e95f439fe6111e7e0a62c8ecd` | **PASS** |

**Final production source SHA (as of this signoff): `70c083af6ec0165e95f439fe6111e7e0a62c8ecd`**
(confirmed both `HEAD` and `origin/production` on the `production` branch, fast-forward-only pull,
no divergence).

## Per-remediation record

### PR #37 — Show Queue deep-link tab integrity

- Plan: `docs/workflow/plans/2026-08-03-production-studio-print-request-deep-link-tab-integrity-plan.md`
- Formal Review: `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-review.md`
  (verdict: APPROVED WITH REQUIRED AMENDMENT)
- Implementation Review (two passes — initial + follow-up): `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-implementation-review.md`
  (final verdict: APPROVED)
- Root cause: `UpcomingShowsPage.tsx`'s Attached Print Requests link builder recomputed the target
  tab client-side via a live re-derivation instead of the request's own authoritative `queueTab`,
  racing against a once-per-mount, never-refreshed allocation-totals snapshot. A second, independent
  defect in `mergeShowQueuePrintRequestSources` allowed a wrong-tab request to be merged into another
  tab's local source.
- Owner QA: **PASS** — confirmed the Show Queue deep link now resolves directly to the Queued tab.

### PR #38 — Working-tab containment and artwork background

- Plan: `docs/workflow/plans/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-plan.md`
- Formal Review: `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-review.md`
  (verdict: APPROVED WITH ONE REQUIRED AMENDMENT — the `DesignPreviewLightbox` call site)
- Test Report: `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-test-report.md`
- Implementation Review: `docs/workflow/reviews/2026-08-03-production-studio-print-request-working-tab-containment-and-artwork-background-implementation-review.md`
  (verdict: APPROVED)
- Root cause (two independent defects): `usePrintRequests.ts`'s `ensureRequestsLoaded` merged a
  directly-fetched request into `state.requests` with no check against the currently active tab
  (`mergePrintRequestsById` — new `queueTab`-vs-`activeTab` admission guard, using a live ref to
  avoid a stale-closure variant of the same race). `PrintRequestItemCard.tsx` never passed the
  catalog design's saved `artworkBackgroundHex` to either of its two artwork-rendering call sites
  (`DesignThumbnailPanel` and `DesignPreviewLightbox`).
- Owner QA: **PASS** — confirmed the queued request no longer appears in Working after deep-link
  navigation, and confirmed the Yellowstone design's artwork mat renders correctly in both the
  thumbnail and the lightbox.

### PR #39 — Tab-switch stale-list state

- Plan: `docs/workflow/plans/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-plan.md`
- Formal Review: `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-review.md`
  (verdict: APPROVED — no required amendment)
- Test Report: `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-test-report.md`
- Implementation Review: `docs/workflow/reviews/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-implementation-review.md`
  (verdict: APPROVED — no correction required)
- Root cause: `usePrintRequests.ts`'s tab-driven reset (`loadFirstPage`) is triggered by a plain
  `useEffect`, which React only runs after the render where `activeTab` changed has already
  committed and painted. On that transitional render the hook still returned the previous tab's
  `requests` and `isLoading: false`, since nothing reset either synchronously — distinct from both
  PR #37 and PR #38, neither of which is in this call path (no deep link, no direct-ID fetch
  involved in this reproduction). Fixed via two coordinated layers: a synchronous `isLoading`
  derivation comparing a `loadedTabRef` against the live `activeTab` during render (closing the gap
  before the effect ever runs), plus a render-time `queueTab` containment filter in
  `PrintRequestsPage.tsx` as defense-in-depth.
- Owner QA: **PASS** — confirmed manually switching from Queued to Working no longer shows the
  stale queued request, with no Refresh or navigation required.

## Confirmation: v1.0.0 draft Release status throughout remediation

Per the standing human checkpoint recorded at the close of Phase G (the original stable `1.0.0`
internal-unsigned workflow run) and reaffirmed in every Plan and Review document across all three
remediations above, **the `v1.0.0` GitHub Release draft has remained unpublished for the entire
duration of this remediation sequence.** No installer was rebuilt, no Release was published, and no
production Firebase resource was modified as part of any of the three PRs — each PR's own
Confirmation section states this explicitly, and no PR in this sequence touched
`.github/workflows/studio-release.yml`, any Firestore Rule/index, any Cloud Function, or Portal code.

## Architecture follow-ups explicitly carried forward (not fixed, not silently dropped)

- `usePrintRequestAllocationTotals`'s pre-existing full-collection scan of all show allocations —
  first flagged during PR #37's Implementation Review, re-confirmed untouched and still out of scope
  in both PR #38 and PR #39.

## Next step

This signoff clears the "owner manual QA after implementation" human checkpoint for all three PRs.
Per the active FreshForge task, verification now proceeds to the read-only GitHub Release/tag audit
and full final-source verification on `70c083af6ec0165e95f439fe6111e7e0a62c8ecd` before any decision
is made about re-running the stable release workflow. The `v1.0.0` draft Release remains unpublished
pending that verification and separate, explicit owner approval to trigger a new workflow run.
