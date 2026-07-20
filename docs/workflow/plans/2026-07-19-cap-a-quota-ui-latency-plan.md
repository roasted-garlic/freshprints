# Plan: Cap A quota UI latency (optimistic remaining)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | complete (owner PASS 2026-07-19) |
| Workflow | managed-phase / hotfix |
| Related | docs/workflow/reviews/2026-07-19-cap-a-quota-ui-latency-review.md |

---

## Goal

Make Portal Cap A (daily print limit) banner / exhausted UI update near-immediately when Current Request quantities change on the request detail page, instead of lagging ~10s behind the cart badge.

## Background

Owner report: after adding two designs and typing qty 25 + 25 on request detail, cart updates immediately but Cap A (“Daily print limit reached” + helper + ? icon) takes ~10 seconds.

## Scope

### In Scope
- Optimistic Cap A remaining derived from working-item print total deltas (positive-only) after items are ready
- Optimistic `patchWorkingItems` at start of detail-page item save (before callable returns)
- `notifyCapAQuotaChanged` after detail `updateItem` succeeds (reconcile with server)
- Unit tests for optimistic remaining helper
- Manual QA steps

### Out of Scope
- Cap B allotment / split queue bugs (remain parked)
- Review Request nav race phase (parked; resume after this fix)
- Server Cap A charge logic changes
- Bypassing Cap A enforcement (server remains source of truth)

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/utils/printRequestDailyDesignLimit.ts` (+ test)
- `apps/portal/features/print-requests/hooks/usePortalCapAQuotaState.ts`
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`

### Architecture Impact
- [x] Details: Cap A display layer adds optimistic remaining; server quota callable still reconciles

### Security Impact
- [x] Details: UI-only early exhausted; callables still enforce Cap A — no bypass

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Banner / exhausted / disable gates track qty changes with cart latency

### Migration Impact
- [x] None

---

## Approach

### Root cause
1. Detail autosave awaits `updatePrintRequestItem` then `reloadWorkingItems`; cart (`currentRequestAggregates`) updates when `workingItems` land.
2. Cap A UI uses **server** `remaining` from `getDailyDesignQuota`, refreshed only after `workingPrintCount` / epoch change — a second callable RTT (often multi-second cold start).
3. Detail `updateItem` did not call `notifyCapAQuotaChanged`; no optimistic Cap A or cart patch before the save returns.

### Fix
1. **Positive-only optimistic remaining:** After Cap A server snapshot + working items are ready, baseline `workingPrintCount`. When local working prints increase by `delta`, display `max(0, serverRemaining - delta)` (and used += delta). Never inflate remaining from cart shrink (queue does not refund Cap A).
2. **Detail save:** `patchWorkingItems` with new qty **before** awaiting the callable so cart + Cap A move together; on failure reload/rollback; on success `notifyCapAQuotaChanged` to reconcile.
3. Keep poll/focus/epoch refresh as source-of-truth reconcile.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit | shared printRequestDailyDesignLimit tests | yes |
| Typecheck | portal tsc if available | yes if quick |

### Manual
1. Soft-reload Portal; Cap A limit known (e.g. 50).
2. Add two designs to Current Request; open detail.
3. Type qty 25 on first, Tab, 25 on second (or blur).
4. **Expected:** Header/bottom cart print count and Cap A banner / exhausted state update within ~debounce+frame of each commit (not ~10s later). Server still blocks over-limit saves.

---

## Human Checkpoints Anticipated
- Manual QA on Portal after soft-reload

## Risks and Rollback
- Hydration race (quota before items): mitigated by baselining only after items ready and not applying delta until baseline synced.
- Queue shrink must not raise remaining: positive-only delta.
- Rollback: revert Portal Cap A hook + detail patch; no backend deploy.

## Open Questions
- None blocking
