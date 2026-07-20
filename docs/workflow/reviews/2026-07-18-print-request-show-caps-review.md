# Review: Print request & show design caps + Studio Settings

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-print-request-show-caps-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly expands Backlog #3 to **both** caps with Studio Settings, Chicago day keys for Cap A, and a non-bypassable library-add callable. Scope is bounded to `fresh-prints-dev`, defaults 25/15 are explicit, and security (deny client create of `printRequestItems`) is called out. Approved with small implement-time clarifications below — no plan rewrite required.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Both caps + Settings + Portal UX + soft deploy |
| Architecture alignment | pass | Callable for creates; client updates stay for qty |
| Security impact addressed | pass | Rules close customer create; Admin charge docs |
| Data Model impact addressed | pass | Additive settings + rate-limit collection |
| Backend impact addressed | pass | Callables listed; Cap B on queue path |
| Test strategy adequate | pass | Unit tests for day-key + charge/reject required |
| Human checkpoints identified | pass | Manual QA; soft deploy; no production |
| Roadmap alignment | pass | #3 expanded; #2 Done |
| Documentation plan | pass | BACKEND, DATA_MODEL, SECURITY, DECISIONS, ROADMAP |
| No silent scope expansion | pass | Upload quotas / staff creates out of scope |

---

## Architecture Review

**Findings:**
- Moving catalog **new line** to a callable matches architecture (services/Functions own limits).
- Quantity increment remaining client-side is acceptable and correctly excluded from Cap A.
- Shared pure helpers keep Studio/Portal/Functions aligned.

**Required changes:**
- [x] None blocking

---

## Security Review

**Findings:**
- Closing customer `create` on `printRequestItems` is required; without it Cap A is bypassable.
- Settings writes must remain owner-only via callable (mirror upload quotas).
- Cap B query must use `customerId` from trusted request doc / portal customer, not client-supplied.

**Required changes:**
- [x] None blocking

**Human approval needed before production:**
- [x] None this phase (dev only). Production later needs separate approval.

---

## Data Model Review

**Findings:**
- `settings/printRequestLimits` and daily limit collection are additive.
- Cap B should sum **active** allocations only (exclude canceled); document which statuses count.

**Required changes:**
- [ ] Implement: explicitly list Cap B included statuses (e.g. queued/printing/printed — exclude canceled). Prefer matching whatever still occupies show capacity for that customer.

---

## Backend Review

**Findings:**
- Wire Cap A into all four create paths; Cap B only on queue callable is correct.
- Composite index on `showAllocations` (`upcomingShowId` + `customerId`) likely needed — verify before deploy.
- Prefer charging Cap A inside the same transaction as item create where feasible.

**Required changes:**
- [ ] Implement: add/confirm Firestore index if Cap B query requires it.
- [ ] Implement: UI strings must not use em dashes (plan already notes).

---

## Testing Review

**Findings:**
- Unit tests for Chicago day key (including a DST-adjacent fixture if practical), Cap A reject-at-limit, Cap B reject when existing+new exceeds.
- Manual QA covers remaining copy and both error paths.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ROADMAP #3, BACKEND, DATA_MODEL, SECURITY, short ADR are appropriate.
- Note Cap A uses **Chicago** while upload quotas use **UTC** to avoid operator confusion.

---

## Required Changes (if approved_with_changes)

1. Document Cap B allocation statuses included in the sum (exclude canceled).
2. Confirm/add Firestore composite index for Cap B query before soft deploy.
3. No em dashes in any new Portal/Studio UI copy.

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Product decision (both caps, defaults, Chicago day) is locked. Security path for library add is correct. Remaining items are implement-time details, not plan blockers → **approved_with_changes**.

---

## Next Step

Implement approved scope with the three implement-time notes above; then automated tests; soft deploy `fresh-prints-dev`; manual QA checkpoint.
