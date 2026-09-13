# Formal Review: Customer Account Identity WS4 — Customer Activity + Deep Linking

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws4-customer-activity-and-deep-linking-plan.md` |
| Goal | `customer-account-identity-management-ws4-customer-activity-and-deep-linking` |
| Verdict | **approved_with_changes** |
| Owner approval | **2026-08-29 — APPROVE WS4 PLAN** (binding decisions recorded in plan) |
| Production | **NOT AUTHORIZED** |
| Implement | **authorized** (2026-08-29) |

---

## Summary

The plan correctly identifies the current flat `UserAuditTrailModal` architecture, authoritative domain sources, merge alias requirements from WS3, and existing deep-link helpers. Scope is bounded for MVP with optional extras clearly separated. Formal Review approves direction with required plan acknowledgments below — no WS3 data-model corrective required.

---

## Review checklist (14 challenges)

| # | Challenge | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | Data source authority | **pass** | PR/show/conversion/merge fields correctly sourced from domain docs; audit events secondary |
| 2 | Merged-history query correctness | **pass_with_notes** | `mergedSourceCustomerIds[]` union is correct; implement must batch Firestore `in` (max 10) and document survivor-with-many-sources edge case |
| 3 | PR grouping correctness | **pass** | One card per `printRequest.id`; avoid duplicate create/update flat rows |
| 4 | CR→IR lineage | **pass** | Uses persisted conversion fields; plan forbids name-only inference |
| 5 | Show/date derivation | **pass_with_notes** | Must use `upcomingShows.scheduledStartAt` for show schedule; allocation `createdAt` labeled separately as “Queued to show” — do not conflate |
| 6 | Deep-link routing | **pass_with_notes** | Plan correctly rejects nonexistent `resolvePrintRequestRouteFromRequest`; implement via `buildPrintRequestDeepLinkPath` + `queueTab`/derive fallback |
| 7 | Immutable historical attribution | **pass** | No rewrite of `customerActivityEvents.customerId`; alias queries only |
| 8 | Reconstructed activity accuracy | **pass_with_notes** | PR+allocation reconstruction acceptable for MVP; no fabricated micro-events |
| 9 | Bounded-query behavior | **pass** | Pagination + lazy detail required; plan explicit |
| 10 | Permission handling | **pass** | Sub-section gates align with existing permissionService; not owner-only modal |
| 11 | Modal performance | **pass_with_notes** | Owner decision on page size; consider virtualized list if >50 PRs common |
| 12 | Index requirements | **pass_with_notes** | Defer composite index until DEV error; document in implement/test |
| 13 | New forward audit writers | **pass** | Not required for MVP; optional `printRequestId` on future events noted as non-blocker |
| 14 | WS3 data-model corrective | **pass** | None required |

---

## Required plan acknowledgments (for implement)

1. Add implement-step task: **audit show-queue deep link routes** before promising “Open in Show Queue”
2. Add implement-step task: **verify** `listPrintRequestsByCustomer` index behavior with logical-id `in` queries on DEV
3. When building deep links, **unit test** customer vs internal kind for converted pairs (both directions)
4. Keep flat Recent activity **removed** at signoff unless rollback flag explicitly documented

These are implement discipline items — plan already directionally correct.

---

## Architecture / security

- Studio-only read paths; no new public endpoints
- No weakening of Firestore rules
- Merge attribution is display-only; no lifecycle authority from audit feed

---

## Scope discipline

- No WS3 merge changes
- No production promotion
- Optional uploads/favorites dashboards correctly deferred

---

## Verdict

**approved_with_changes** — Plan may proceed to owner approval gate. Implementation remains **blocked** until owner explicitly approves the plan.

---

## Owner action

Reply **APPROVE WS4 PLAN** (with any decisions on `[NEEDS OWNER DECISION]` items) to authorize Implement phase.
