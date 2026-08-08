# Review: Stage 1b-C Discover View All regressions plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-discover-view-all-regressions-plan.md` |
| Verdict | **approved** |

---

## Summary

Investigation correctly separates Popular blank (`orderBy(requestCount)` omission) from category order (readyAt completeness demoting to createdAt order). Fixes belong in Portal `catalogService` with client-sort using existing sort keys. New This Week guard must remain. Approve implement.

---

## Checklist

| Area | Status |
|------|--------|
| Root causes evidenced | pass |
| Metric ≠ readyAt conversion | pass — plan preserves requestCount sort |
| New This Week protected | pass |
| No migration/Stage 4 | pass |
| Test strategy | pass |

---

## Verdict

**approved**
