# Formal Review: Studio staff show-capacity allocation override

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-15-studio-staff-show-capacity-allocation-override-plan.md` |
| Managed goal | `studio-staff-show-capacity-allocation-override` |
| Verdict | **approved_with_changes** |

---

## Summary

Investigation correctly identifies the live staff path as `allocateStudioPrintRequestToShow`, proves Portal is separate, documents dormant/unwired `overrideCapacity` comments, and correctly keeps `maxQuantityOverridden` out of scope. Over-capacity UI helpers already exist. Verdict is **approved_with_changes**: binding constraints below; **do not implement** until the owner explicitly accepts this Formal Review and authorizes Implement → Test.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Capacity-only Studio override; Portal unchanged |
| Architecture alignment | pass | Callable is authoritative; UI confirms then passes flag |
| Security impact addressed | pass | Staff-only callable; no Portal override |
| Data model impact addressed | pass | Prefer max unchanged; optional Admin allocation metadata |
| Backend impact addressed | pass | Narrow flag on existing callable |
| Test strategy adequate | pass | Capacity-only, auth, Portal, ADR-FP-160 |
| Human checkpoints identified | pass | Owner DEV QA; role default noted |
| Roadmap alignment | pass | Show Queue ops refinement |
| Documentation plan | pass | ADR + DATA_MODEL |
| No silent scope expansion | pass | Transfer/move deferred; no generic force |

---

## Architecture Review

**Findings:**

- Split/overflow UI already exists; the missing piece is an explicit over-cap confirmation that calls the trusted path with a flag.
- Dormant `allocatePrintRequestItem.overrideCapacity` must not be treated as done — live path is the callable.

**Required changes:**

- [x] Implement override on **`allocateStudioPrintRequestToShow` only** for v1 (do not revive client `allocatePrintRequestItem` as the primary path).
- [x] When confirming Allocate Anyway for a single-show overage, build a plan that places **all remaining** quantity on that show (consistent with callable’s “full remaining must be assigned” rule), then submit with `overrideShowCapacity: true`.
- [x] Keep split-to-another-show as a non-override alternative when partial fit exists.

---

## Security Review

**Findings:**

- Matching override authority to `assertStaffCaller` is correct and does not broaden permissions.
- Portal spoofing is prevented by leaving `queuePortalPrintRequestToShow` unchanged.

**Required changes:**

- [x] Server must treat only boolean `true` as override; ignore spoofed strings/objects.
- [x] Override must not weaken Past-schedule or terminal production guards (`completed`, `fully_printed`, `archived`, `canceled`).
- [x] With override, allow capacity-driven `"full"` blockReason / productionStatus `"full"` **only** as capacity-operational; never treat terminal statuses as overridable.

**Human approval needed before production:**

- [x] Production Functions/Studio release — separately gated; not authorized by this review.

---

## Data Model Review

**Findings:**

- Leaving `maxTotalQuantity` unchanged is correct and compatible with ADR-FP-160 skip-below-allocated.
- UI already supports allocated &gt; max.

**Required changes:**

- [x] Do **not** write `maxQuantityOverridden: true` on allocation override.
- [x] If audit fields are added on `showAllocations`, keep them optional Admin-only writes; no Rules change required for Admin path. Document in DATA_MODEL.

---

## Backend Review

**Findings:**

- Ceiling check at ~L374–376 is the primary enforcement to gate.
- Eligibility `"full"` must also be override-aware or over-cap from an already-full show remains impossible.

**Required changes:**

- [x] Extract or parameterize eligibility so Portal / non-override Studio paths stay strict.
- [x] On success with override, do not update `maxTotalQuantity`.
- [x] Error without override must remain a clear capacity failure (preserve or improve existing message).

---

## Testing Review

**Findings:**

- Coverage list matches acceptance criteria including ADR-FP-160 coexistence.

**Required changes:**

- [x] Add an explicit unit/contract case: override succeeds when current remaining is 0 (already full) as well as when remaining &gt; 0 but request overflows.
- [x] Add Studio contract that Allocate Anyway sends `overrideShowCapacity: true` and Cancel does not invoke the callable.

---

## Documentation Review

**Findings:**

- ADR + DATA_MODEL note required; clarify distinction from ADR-FP-160 and ADR-FP-159.

---

## Required Changes (approved_with_changes)

1. Live path = callable flag only; do not claim dormant client `overrideCapacity` is complete.
2. Allocate Anyway assigns full remaining to the chosen show + `overrideShowCapacity: true`.
3. Bypass **only** show-capacity ceiling and capacity-operational full; never terminal/Past/other guards.
4. Do not mutate `maxTotalQuantity` or misuse `maxQuantityOverridden`.
5. Tests must cover under-cap, overflow-without-override, overflow-with-override, already-full-with-override, auth, Portal regression, ADR-FP-160 skip.
6. Transfer/move capacity override remains **out of v1** unless owner expands Formal Review.

---

## Blockers

None for Formal Review. **Implementation blocked** until owner acceptance + Implement authorization.

---

## Verdict Rationale

**approved_with_changes** — Plan is accurate and bounded; Required Changes harden capacity-only semantics and UI/callable alignment with existing multi-leg allocation rules.

---

## Next Step

1. Owner accepts Formal Review (or requests Plan revision).
2. Owner authorizes Implement → Test.
3. Then Implement → Test → Owner DEV QA → Signoff.
4. Production remains unauthorized.
