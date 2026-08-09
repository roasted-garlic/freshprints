# Review: Stage 1b-C Algolia narrowed facet counts plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-algolia-narrowed-facets-plan.md` |
| Verdict | **approved** |

---

## Summary

Investigation correctly classifies the failure as missing catalog `q`/category plumbing into the narrowed facet path plus Algolia facet queries always using `query: ''`. Plan is Portal-only, scoped, and testable with a discriminating mock. Safe to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal facet path only |
| Architecture alignment | pass | Service owns Algolia; modal coordinates |
| Security impact addressed | pass | Search-only key unchanged |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | No Functions deploy |
| Test strategy adequate | pass | Discriminating mock required |
| Human checkpoints identified | pass | Owner re-QA |
| Roadmap alignment | pass | Stage 1b-C corrective |
| Documentation plan | pass | QA checklist + state update |
| No silent scope expansion | pass | No Stage 4/5/6 |

---

## Architecture Review

**Findings:**
- Extending `listNarrowedTagFacets` options to mirror `listMatchingDesigns` filters is the right layer.
- Modal must receive applied catalog `q` and category; tags-only trigger is insufficient.

**Required changes:**
- None beyond plan.

---

## Security Review

**Findings:**
- No admin key / no schema / no Rules change.

---

## Required Changes Before Implement

None.

## Advisory Notes

- Generated transition path may remain tag-AND-only for facets; document in code comment.
- Ensure global path still used when completely unfiltered.
- Do not change Algolia record schema.

---

## Verdict

**approved** — proceed to Implement → Test → Implementation Review → STOP for owner re-QA.
