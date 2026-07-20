# Signoff: Stash attention, Cap A refresh, first-add lag

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-stash-attention-quota-first-add-plan.md |
| Review | docs/workflow/reviews/2026-07-18-stash-attention-quota-first-add-review.md |
| Test report | docs/workflow/reviews/2026-07-18-stash-attention-quota-first-add-test-report.md |
| Status | **approved_with_notes** — awaiting owner manual smoke |

---

## Summary

Fixed three Portal Stash issues without Functions deploy:

1. **False “needs attention”** — Soft saveable DPI (`dpi_warning`) no longer increments Stash/header attention; optimistic first-add items now seed print inches so “1 Size” rows are not missing-size false positives.
2. **Cap A stuck at full remaining** — Mutation success bumps `capAQuotaEpoch` so banner + drawer re-fetch immediately (avoids race where length-change refresh ran before the charge callable finished).
3. **First-add lag** — `addOrIncrementCatalogDesign` loads the created item by id (not full list); create+add no longer awaits the full request list reload before UI settles.

## Files touched

- `packages/shared/src/utils/currentRequestAggregates.ts` (+ tests)
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx`
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/components/PortalPrintRequestDailyQuotaBanner.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- Workflow plan/review/test/manual QA docs

## Deploy

- **Functions:** not required  
- **Portal:** soft-reloaded on :3100  
- **Production:** none

## Manual tests

Requested: `docs/workflow/reviews/2026-07-18-stash-attention-quota-first-add-manual-qa.md`  
Completed: pending owner reply

## Risks / notes

- Soft DPI quality hints remain on Review Request detail if present; Stash chrome only shows blocking attention.
- Detail-page qty/remove also notifies Cap A epoch (same provider).
