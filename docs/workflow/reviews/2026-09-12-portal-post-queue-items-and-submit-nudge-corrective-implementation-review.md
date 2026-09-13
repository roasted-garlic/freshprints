# Implementation Review — Portal post-queue items + submit nudge

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-post-queue-items-and-submit-nudge-corrective` |
| Plan | `docs/workflow/plans/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-review.md` (`approved_with_changes`) |
| Authorization | `OWNER ACCEPT PORTAL POST-QUEUE ITEMS + SUBMIT NUDGE CORRECTIVE + AUTHORIZE IMPLEMENT` |
| Status | **implemented; Owner DEV QA PASS; Signoff approved_with_notes** |

## Implemented

1. **Post-queue reload** — `handleQueuedToShow` always `clearPortalPrintRequestReadCache` then `await Promise.all([reload({ silent: true }), reloadRequestSchedules(), loadAllocationState()])`. Wave C zero-read exception documented in-source and contract updated.

2. **Subscribe merge safety** — working-items live subscribe merges full local cart excluding pending-removed ids (no longer optimistic-only). Empty projection snapshots cannot wipe hydrated rows; intentional deletes stay excluded.

3. **Submit nudge toast** — Replaced Undo announce with 8s toast: *You're not done yet — review and submit your request when you're ready.* Action **Review request** → `/requests/{id}` (fallback `/requests`). Optional `durationMs` on toast options; default 4s unchanged for other toasts. (Owner tuned from 15s → 8s during DEV QA.)

4. **Clear request rehydration fix** — Before the clear callable settles, mark all current item ids pending-removed and empty the local cart. Prevents live projection deletes from re-merging leftovers into the drawer/request page (owner: cleared 3, UI left 2 until refresh).

## Assisted Creation note

Assisted Add-to-Request success uses the progress modal and opens the Current Request drawer (no Undo toast). Left unchanged this turn; catalog first-add uses the new nudge.

## Files

- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts`
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
- `apps/portal/features/print-requests/utils/addDesignRuntime.ts` (+ test)
- `apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.ts` (+ test)
- `apps/portal/features/print-requests/utils/printRequestDetailPostQueueHydration.contract.test.ts`
- `apps/portal/features/print-requests/utils/workingItemsSubscribeMerge.contract.test.ts` (new)
- `apps/portal/features/shared/context/PortalToastContext.tsx`

## Not done

- Staging / commit / push / freeze / production (parent gates)
- Sentinel Signoff (separate child, if still open)