# Review: Portal split print request across shows (Cap B + capacity)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-split-print-request-across-shows-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly prioritizes Portal UX (queue up to Cap B/capacity, remainder stays on Current Request) over cloning Studio’s multi-leg flow. Primary acceptance (50 prints / Cap B 25) is explicit. Server-side selections, Cap B, capacity, and draft-until-fully-queued status are the right security and Continuable boundaries.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal-only; no Studio UI; no production |
| Architecture alignment | pass | Callable + shared helpers; UI via modal |
| Security impact addressed | pass | Server validates selections / Cap B / capacity |
| Data model impact addressed | pass | No schema migration; status rule documented |
| Backend impact addressed | pass | queue + list shows; soft deploy |
| Test strategy adequate | pass | Unit + owner manual QA |
| Human checkpoints identified | pass | Manual QA |
| Roadmap alignment | pass | Extends Cap B usability after #3 |
| Documentation plan | pass | BACKEND / DATA_MODEL / DECISIONS / ROADMAP / WORKFLOWS |
| No silent scope expansion | pass | Studio clone explicitly out |

---

## Architecture Review

**Findings:**
- Keeping `draft`/`editing` until fully allocated preserves one Continuable Current Request — matches owner “keep 25 on Current Request.”
- Optional `selections` keeps full-fit path simple.

**Required changes:**
- [ ] None

---

## Security Review

**Findings:**
- Cap B and capacity must re-check in transaction against selection total and already-allocated item qty.
- No staff override on Portal (correct).

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [x] Production deploy (out of scope)

---

## Data Model Review

**Findings:**
- Partial `showAllocations` already supported by model; Portal status rule is the behavioral change.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- `customerAllocatedQuantity` on list shows is needed for honest Cap B UI.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Cap B 50/25 scenario must be in manual QA; capacity-tighter case too.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- ADR should record Portal-first split (not Studio clone) and draft-until-full rule.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Bounded, secure, and aligned with owner clarifications. Approved to implement.

---

## Next Step

Implement approved scope.
