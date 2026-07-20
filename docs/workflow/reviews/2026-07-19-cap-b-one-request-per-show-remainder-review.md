# Review: Cap B one request ↔ one show + auto-create remainder

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-b-one-request-per-show-remainder-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Owner decision is clear and correctly supersedes same-request multi-show remainder and remove-first-only. Plan scope is bounded: selections + finalize request 1 + auto-create request 2 + Portal navigation. Raising working-request max from Cap B to Cap A is required for the 50→25 acceptance example and is correctly called out.

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | |
| Architecture alignment | pass | Callable owns atomic split; Portal uses response |
| Security impact addressed | pass | Server validates selections, Cap B, capacity, ownership |
| Data model impact addressed | pass | No new collections; status/one-show rule documented |
| Backend impact addressed | pass | Dev deploy only |
| Test strategy adequate | pass | Pure helper unit test + manual QA |
| Human checkpoints identified | pass | Manual Portal QA |
| Roadmap alignment | pass | Cap B in progress |
| Documentation plan | pass | DATA_MODEL / BACKEND / DECISIONS |
| No silent scope expansion | pass | Studio out of scope |

---

## Architecture Review

**Findings:**
- Creating remainder via Admin SDK in the same transaction as activating R1 preserves ADR-FP-071 (one Continuable) if R1 flips to `active` before R2 create.
- Fail closed when request already has allocations (no second show on same request).

**Required changes:**
- [x] None beyond implement notes below

---

## Security Review

**Findings:**
- Selections must be clamped server-side to remaining qty and fit budget.
- Remainder item create must not call Cap A charge helpers.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [x] None this phase (dev only)

---

## Data Model Review

**Findings:**
- Prefer reduce R1 qty + create R2 items for partial lines; move or recreate for full leftover lines. Do not leave unallocated qty on an `active` request.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Response must include `remainderPrintRequestId` (and remainder qty) when created.
- Deploy only `queuePortalPrintRequestToShow` (and any shared validation bundle) to fresh-prints-dev.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Unit test must assert: 50 choose 25 → queue 25 / remainder 25; request 1 not linked to show B (no second allocation on R1).

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Update Cap B Portal note that previously said “request stays draft until fully allocated.”

---

## Required Changes (if approved_with_changes)

1. Implement working-request max = Cap A in the same phase (not a follow-up) so the 50-print example is reachable in Portal.
2. After successful split, Portal must navigate to remainder request (not stay on half-queued R1).
3. Keep bidding ack required on every queue confirm (including split).

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Approved with the three implement constraints above. Product decision is owner-authoritative; technical approach is sound and reversible on fresh-prints-dev.

---

## Next Step

Implement approved scope.
