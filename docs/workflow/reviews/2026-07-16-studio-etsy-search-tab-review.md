# Review: Studio Custom Designs — Etsy search tab + tab order

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-16-studio-etsy-search-tab-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Read-only staff list of `etsyRecommendationRequests` with tab reorder is in scope and matches owner intent. Approving with constraints on rules wording, default tab, and no write/mutation UI.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | |
| Architecture alignment | pass | Client query after staff read |
| Security impact addressed | pass | Read widen; writes denied |
| Data model impact addressed | pass | Docs only |
| Backend impact addressed | pass | Rules only |
| Test strategy adequate | pass | Manual + typecheck; rules deploy gate |
| Human checkpoints identified | pass | Dev rules deploy |
| Roadmap alignment | pass | Was deferred follow-up |
| Documentation plan | pass | |
| No silent scope expansion | pass | |

---

## Required Changes

1. Rules must keep customer own-read and **deny all client writes** unchanged except OR-ing `isStaff()` for read.
2. Default selected tab: **Etsy search**.
3. No approve/complete/cancel actions in this slice — Open Etsy link only.
4. Document that Studio will show permission errors until rules are deployed to the active Firebase project.

---

## Verdict Rationale

Narrow, reversible staff ops UI with explicit security tradeoff. Safe to implement.

---

## Next Step
Implement; then typecheck + manual QA / rules deploy checkpoint.
