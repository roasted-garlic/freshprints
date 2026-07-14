# Review: Fix Print Requests Add-to-Show selection bounce

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-13-print-request-add-to-show-selection-bounce-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow UI bug: post–Add to Show selection/tab sync races leave Queued with an empty detail. Plan correctly follows the selected/URL-linked request to its derived tab, uses silent reloads, and amends ADR-FP-052 UX without backend or data-model changes. Safe to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Print Requests selection/nav only |
| Architecture alignment | pass | Page + optional shared util |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Unit + manual Studio |
| Human checkpoints identified | pass | Manual Studio PASS/FAIL |
| Roadmap alignment | pass | Bugfix |
| Documentation plan | pass | WORKFLOWS / ADR note |
| No silent scope expansion | pass | Import AI goal parked |

---

## Architecture Review

**Findings:**
- Stay in Print Requests page; no layer violations.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- None.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Required Changes Before Implementation
- [x] None

---

## Verdict

**approved** — proceed to implement.
