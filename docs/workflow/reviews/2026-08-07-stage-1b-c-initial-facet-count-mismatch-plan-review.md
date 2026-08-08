# Review: Stage 1b-C initial facet count mismatch plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-initial-facet-count-mismatch-plan.md` |
| Verdict | **approved** |

---

## Summary

Live index probe proves Algolia already returns cartoon=4 globally; owner 3→4 on select is explained by mount-cached `useCatalogTags` vs fresh narrowed fetch. Plan to refetch facets on modal open is correct and Portal-only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear | pass | Modal facet freshness |
| Root cause evidenced | pass | Live probe + `useCatalogTags` once-on-mount |
| No unnecessary reindex | pass | Index OK; optional reconcile not required for this bug |
| Test strategy | pass | Discriminating wiring test |
| No Stage 4/5/6 | pass | |

---

## Verdict

**approved**
