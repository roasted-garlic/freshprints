# Amendment 9 P0 Owner-QA Correction — AI Review post-action scroll

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 (open / unmerged) |
| Starting HEAD | `0a948e03df17b83b08bfbefcbe4f11b552d5fd3e` |
| Scope | Owner-QA scroll regression only (+ read-only server attribution docs). **No P1/P3/P4/Phase 1B. No Signoff.** |

## Owner FAIL findings addressed

1. **Scroll:** After successful approve/reject, next design selected but viewport stayed at bottom near action buttons.
2. **Console ~7.7K reads:** Client Debug met P0 budgets (~1,375 approx reads). Do **not** revert P0. Attribution is a separate read-only workstream (see server-read-attribution report).

## Scroll root cause

Studio AppShell’s `.page-content-area.page-content-area--ai-review` owns vertical scrolling (`overflow-y: auto`). P0 local reconciliation correctly advanced selection but **never scrolled that container**, so a reviewer scrolled to the action buttons remained at `scrollTop` near the bottom after the next design rendered.

`window` is **not** the scroll owner.

## Correction behavior

1. Successful `runInboxAction` (approve / reject / archive) completes P0 `reconcileSuccessfulInboxManualAction`.
2. Hook bumps `reviewScrollNonce` **only** on that success path (not on failure, field edits, or Processing patches).
3. `AiReviewWorkspace` `useLayoutEffect` depends on `[reviewScrollNonce, selectedDesign?.id]` and calls `scrollAiReviewPageContentToTop(workspaceTopRef)` after the next design (or empty state) has committed.
4. Helper sets `scrollTop = 0` on `.page-content-area--ai-review` (immediate; matches Studio reduced-motion / `scroll-behavior: auto` conventions). No `window.scrollTo`, timers, listeners, or Firestore ops.

## Files

| Path | Change |
|---|---|
| `apps/studio/.../utils/aiReviewWorkspaceScroll.ts` | New helper |
| `apps/studio/.../utils/aiReviewWorkspaceScroll.test.ts` | Unit + wiring tests |
| `apps/studio/.../hooks/useAiReviewInbox.ts` | `reviewScrollNonce` on success |
| `apps/studio/.../components/AiReviewWorkspace.tsx` | `useLayoutEffect` scroll |
| `apps/studio/.../pages/AiReviewPage.tsx` | Wire nonce prop |

## Explicit non-changes

- No `reloadDesigns` / `reloadCounts` on success
- No Firestore reads/listeners/polling
- No P1/P3/P4/Phase 1B
- No Firebase or production action
- No Signoff

## Related artifacts

- Updated test report: `docs/workflow/reviews/2026-08-06-amendment-9-p0-test-report.md`
- Scroll Implementation Review: `docs/workflow/reviews/2026-08-06-amendment-9-p0-scroll-correction-implementation-review.md`
- Server attribution: `docs/workflow/reviews/2026-08-06-amendment-9-p0-server-read-attribution.md`
- Owner re-QA: `docs/workflow/reviews/2026-08-06-amendment-9-p0-manual-qa.md`
