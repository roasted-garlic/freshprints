# Review: Portal Add-to-Show inspect past / closed days

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-portal-add-to-show-inspect-closed-days-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow UX fix in shared ShowPicker + Portal wiring. Past/cutoff shows stay non-queueable (`isSelectable` / `isAllocatable` gates); calendar becomes inspectable with CLOSED + capacity. No backend or security relaxation.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope | ok | Matches owner request |
| Security | ok | Add button + callable unchanged |
| Architecture | ok | Shared package only |
| Tests | ok | Unit + manual |

## Required changes before implement
- None

## Approval
**approved** — proceed to implement.
