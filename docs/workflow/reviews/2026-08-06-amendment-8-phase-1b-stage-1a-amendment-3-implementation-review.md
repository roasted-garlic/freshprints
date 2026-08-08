# Implementation Review: Stage 1a Amendment 3 — Portal category availability

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Independent Implementation Reviewer |
| Plan | `docs/workflow/plans/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-category-availability-plan.md` |
| Plan Formal Review | `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-category-availability-plan-review.md` (**APPROVED**, Option A) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Baseline | `bc893f6` |
| Diff reviewed | Final Amendment 3 workspace / commit candidate after in-flight clear fix |
| Mode | Implementation review — no further code changes required |
| Verdict | **APPROVED** |

---

## Summary

Option A is correctly implemented: `listActiveCategories` loads Firestore actives through `mapPortalActiveCategory`, sorts, then `selectCustomerVisibleCategories` keeps only categories with `countReadyDesigns({ categoryId }) > 0`. Cap C≤64 and partial aggregate failures fail closed. Amendment 1 mapper and Amendment 2 focus/visibility freshness are retained. Initial review found a blocking in-flight clear bug (`load.finally` identity mismatch); that is **fixed** and covered by discriminators. No Studio page-local copy, no snapshots, no Firebase infra changes.

---

## Re-review of Blocking Finding (resolved)

**Prior defect:** `listActiveCategoriesInFlight = load.finally(...)` never cleared (identity compare always false) → permanent first-result cache.

**Final wiring:**

```ts
listActiveCategoriesInFlight = load;
void load.finally(() => {
  if (listActiveCategoriesInFlight === load) {
    listActiveCategoriesInFlight = null;
  }
});
return load;
```

**Coverage:**

- Source contract forbids `listActiveCategoriesInFlight = load.finally`.
- `catalogService.inFlightDedupe.test.ts` proves clear-by-identity allows sequential loads; broken pattern retains first settle.

**Status:** Resolved — Amendment 2 freshness path can recount after focus/visibility.

---

## Scope inspected

| Path | Change |
|------|--------|
| `apps/portal/features/catalog/services/catalogService.ts` | Cap, `selectCustomerVisibleCategories`, filtered `listActiveCategories`, in-flight clear-by-identity |
| `apps/portal/features/catalog/hooks/useCatalogCategories.ts` | Contract comments; focus/visibility unchanged |
| `catalogService.categoryAvailability.test.ts` | New availability / fail-closed / source contracts |
| `catalogService.inFlightDedupe.test.ts` | New clear-after-settle discriminator |
| `catalogService.test.ts` / freshness / containment | Updated asserts |
| Stage 1a / Amendment 2 manual QA | Empty-active Portal wording superseded |
| Workflow test report + this review + owner QA checklist | Records |

**Not in diff:** `apps/studio/**` app behavior, `functions/**`, Rules, `firestore.indexes.json`, search/tag facet service bodies.

---

## Owner-brief checklist (16)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Option A per-category `countReadyDesigns({ categoryId }) > 0` | **pass** |
| 2 | No Studio page-local algorithm copy | **pass** |
| 3 | Exact Rules-ready aggregates | **pass** |
| 4 | No design-document hydrate for counts | **pass** |
| 5 | C≤64 fail-closed | **pass** |
| 6 | Partial aggregate fail-closed | **pass** |
| 7 | No all-active / partial fallback | **pass** |
| 8 | Amendment 1 strict mapper intact | **pass** |
| 9 | Amendment 2 freshness; no module TTL | **pass** (after clear fix) |
| 10 | Ordering preserved | **pass** |
| 11 | Search / multi-tag / facets unchanged | **pass** |
| 12 | No generated snapshot reader restored | **pass** |
| 13 | No Function / Rules / Storage / deploy / merge / production | **pass** |
| 14 | Tests discriminate vs `bc893f6` | **pass** |
| 15 | In-flight dedupe only; sequential refetch | **pass** (after clear fix) |
| 16 | Shared Library / Discover / share consumers | **pass** |

---

## Architecture / Security / Data / Backend

- Correct service-layer filter behind `useCatalogCategories`; fail-closed UI clears list on error.
- Guest-aligned `status==ready` counts; no Rules or secrets change.
- No denormalized count field / migration.
- Index file unchanged; existing `categoryId`+`status` composites reused; no deploy.

---

## Testing Review

Focused suite **43/43** pass; asset service **24/24** pass; Portal typecheck/build/lint/`git diff --check` **0**. See Test Report.

Mapper-incomplete ready docs remain the accepted Stage 1a limitation (documented in Plan).

---

## Verdict Rationale

**APPROVED** — Option A matches the approved Plan; blocking in-flight clear defect is corrected and tested; no silent scope expansion; owner re-QA is the remaining gate. **No Signoff** until owner QA passes.

---

## Next Step

1. Commit + push to PR #40 branch (keep unmerged).
2. Owner reduced re-QA: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-manual-qa.md`.
3. Stop for `PASS` / `FAIL: …` / `PASS WITH NOTES: …`.
4. Do not begin Stage 1b; do not deploy.
