# Review: Hide Add to Show for archived / converted print requests

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-08-hide-add-to-show-for-archived-converted-requests-plan.md |
| Verdict | **approved_with_changes** (amended: also hide Working queue badge when archived — approved) |

---

## Summary

Narrow corrective: archived and converted-to-internal print requests must not be allocatable. Plan correctly identifies both a missing UI gate on Studio Print Requests detail and a missing service reject in `allocatePrintRequestItem`. Shared helper + UI hide + service enforce is the right layered fix.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Hide/gate allocation only; no convert/archive redesign |
| Architecture alignment | pass | Shared rule; UI + service |
| Security impact addressed | pass | Fail closed at service |
| Data Model impact addressed | pass | Existing fields only |
| Backend impact addressed | pass | Studio client service; no Functions required for this path |
| Test strategy adequate | pass | Shared unit + UI/manual |
| Human checkpoints identified | pass | Brief DEV UI check |
| Roadmap alignment | pass | Bugfix / UX correctness |
| Documentation plan | pass | Workflow artifacts; no product doc churn required |
| No silent scope expansion | pass | Parked export goal left untouched |

---

## Architecture Review

**Findings:**
- Reusing `printRequestConversion` adjacency or a tiny shared util keeps the rule out of the page component.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Client hide alone is insufficient; plan includes service reject.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for DEV; production Studio publish remains a separate owner step if/when releasing

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Confirm `allocatePrintRequestItem` is the Studio Add to Show write path (verified in planning investigation).

**Required changes:**
- [x] None

---

## Required Changes Before Implement

- None (original scope)

---

## Approved With Changes (if applicable)

Prefer **hide** CTA over disabled for archived/converted.

**2026-09-08 amendment (owner):** After Add-to-Show gate PASS, also hide the derived queue-state badge (**Working**) when `status === "archived"`. Treat as in-scope corrective under the same goal; no separate managed goal.
