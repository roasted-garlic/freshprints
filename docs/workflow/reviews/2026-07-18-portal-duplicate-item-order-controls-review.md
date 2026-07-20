# Review: Portal duplicate item order + optimistic controls

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-duplicate-item-order-controls-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow bugfix with clear root causes (missing-sortOrder optimistic `0.5` jumps to front; optimistic treated as read-only hides controls). Shared insert-before helper + callable alignment and disabled full chrome are appropriate. No security or production gates beyond existing callable deploy to dev.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Order + optimistic UI only |
| Architecture alignment | pass | Shared util + hook + card + callable |
| Security impact addressed | pass | No auth/rules change |
| Data model impact addressed | pass | Optional sortOrder write/anchor only |
| Backend impact addressed | pass | Dev Functions deploy when callable changes |
| Test strategy adequate | pass | Manual QA primary; light automated |
| Human checkpoints identified | pass | Manual UI after soft-reload |
| Roadmap alignment | pass | Bugfix; parks unrelated #1 QA |
| Documentation plan | pass | Workflow docs only |
| No silent scope expansion | pass | Studio out of scope |

---

## Architecture Review

**Findings:**
- Shared helper avoids client/server drift.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Callable ownership checks unchanged.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev deploy only)

---

## Data Model Review

**Findings:**
- Fractional / anchored sortOrder consistent with existing display-order model.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Sibling reads in transaction required for correct order when anchoring.

**Required changes:**
- [x] None

---

## Required changes before implement
- None

---

## Verdict rationale

Approved for immediate implementation within stated scope.
