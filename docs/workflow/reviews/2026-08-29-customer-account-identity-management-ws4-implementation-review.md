# Implementation Review: Customer Account Identity WS4 — Customer Activity + Deep Linking

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws4-customer-activity-and-deep-linking` |
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws4-customer-activity-and-deep-linking-plan.md` |
| Verdict | **pass_with_notes** |
| Production | **NOT AUTHORIZED** |

---

## Summary

WS4 replaces the flat customer **Recent activity** feed in `UserAuditTrailModal` with **Print Request history** (compact cards + lazy details), **Account Activity** (collapsed identity timeline), and deep links via `buildPrintRequestDeepLinkPath`. Team-user modals retain the legacy flat feed.

---

## Reconciliation checklist

| # | Item | Verdict | Notes |
|---|------|---------|-------|
| 1 | PR grouping correctness | **pass** | One card per deduped `printRequest.id`; create/update flat rows removed from customer primary surface |
| 2 | Show/date authority | **pass** | `upcomingShows.scheduledStartAt` on card; allocation `createdAt` labeled **Queued to show** in details |
| 3 | Conversion lineage | **pass** | `closureKind` + conversion IDs; CR retained; IR link via `internalDeepLinkPath` |
| 4 | Route helper usage | **pass** | `buildPrintRequestDeepLinkPath` only; no invented `resolvePrintRequestRouteFromRequest` |
| 5 | Merged identity queries | **pass** | `resolveLogicalCustomerIds`; PR/allocations deduped by request id |
| 6 | Duplicate suppression | **pass** | `dedupePrintRequestsById`; account events deduped by event id |
| 7 | Historical audit immutability | **pass** | Read-only alias queries on `customerActivityEvents`; no rewrites |
| 8 | Reconstruction truthfulness | **pass** | Allocation/detail events marked `reconstructed` internally; no fabricated timestamps |
| 9 | Query bounds | **pass** | Initial 15 PR cards; account activity collapsed + paginated; detail cap 25 |
| 10 | Pagination | **pass** | Client-side load-more after single bounded fetch per modal open |
| 11 | Permissions | **pass** | `canViewPrintRequests` gates PR section; existing staff rules on account activity |
| 12 | Modal performance | **pass_with_notes** | Single fetch per open; load-more is client slice — monitor customers with >100 identity events |
| 13 | Summary metric changes | **pass** | **Account Activity** tile replaces Recent events for customers |
| 14 | WS3 scope creep | **pass** | No merge semantic changes |
| 15 | Speculative backend/index | **pass** | No index deploy; no Functions changes |

---

## Files changed

### New

- `apps/studio/.../users/services/customerPrintRequestHistoryService.ts`
- `apps/studio/.../users/services/customerAccountActivityService.ts`
- `apps/studio/.../users/types/customerPrintRequestHistory.types.ts`
- `apps/studio/.../users/utils/resolveLogicalCustomerIds.ts`
- `apps/studio/.../users/utils/buildPrintRequestHistoryCard.ts`
- `apps/studio/.../users/hooks/useCustomerUserInfo.ts`
- `apps/studio/.../users/components/CustomerPrintRequestHistorySection.tsx`
- `apps/studio/.../users/components/CustomerPrintRequestHistoryDetail.tsx`
- `apps/studio/.../users/components/CustomerAccountActivitySection.tsx`
- Tests: `buildPrintRequestHistoryCard.test.ts`, `resolveLogicalCustomerIds.test.ts`

### Refactored

- `UserAuditTrailModal.tsx`
- `UserAuditTrailProfileCard.tsx`
- `apps/studio/src/renderer/src/styles/layout.css` (`.user-audit-trail-body`, PR/account sections)

---

## Automated tests

| Command | Result |
|---------|--------|
| `npx tsx --test apps/studio/src/renderer/src/features/users/utils/buildPrintRequestHistoryCard.test.ts apps/studio/src/renderer/src/features/users/utils/resolveLogicalCustomerIds.test.ts apps/studio/src/renderer/src/features/users/utils/customerIdentityActivityAudit.test.ts` | **pass** (11 tests) |

## Typecheck

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (from `apps/studio/`) | **pre-existing failures** in unrelated modules (ai-review, customer-uploads, upcoming-shows, etc.); **no new WS4-specific errors** after fixes |

---

## DEV backend / index deploy

**Not required** for WS4 MVP based on current query patterns (`customerId ==` / `in`, existing allocation reads). If DEV surfaces a missing composite index on `customerActivityEvents`, **STOP** and report exact Firebase index spec before deploy.

---

## Open follow-ups (non-blocking)

- Open in Show Queue — **deferred** per owner decision
- Optional cache of history context across detail opens (performance polish)
- Full Studio typecheck cleanup (pre-existing debt)

---

## Next step

Owner **DEV QA** using checklist below → Test phase → Signoff (no production).
