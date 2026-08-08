# Implementation Review: Portal Discover / View All complete pagination (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent Implementation Review) |
| Plan | `docs/workflow/plans/2026-08-08-portal-discover-view-all-complete-pagination-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-plan-review.md` |
| Test report | `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-test-report.md` |
| Diff scope | `useCatalogDesigns.ts` + `useCatalogDesigns.test.ts` only |
| Verdict | **approved** |

---

## Summary

Implementation fixes badge authority and incomplete-paging reconciliation in the ordinary Firestore path of `useCatalogDesigns`, matching Formal Review binding changes. Page size stays 40; Load more preserved; no Algolia/Home/`catalogService` membership-cap changes. Automated verification passed (37 focused tests, typecheck, lint, build, diff-check).

---

## Binding Formal Review checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Aggregate count is badge authority when resolved | **pass** — `resolveOrdinaryMatchingCount` |
| 2 | Always attempt `countReadyDesigns` after first page (incl. `!hasMore`) | **pass** |
| 3 | If total > loaded && !hasMore → restore cursor / Load more | **pass** — `reconcilePagingWithAggregateCount` (+ load-more path) |
| 4 | No page-size raise / Algolia / Home / 500-cap expand | **pass** |
| 5 | Three automated cases (+ extended A–K) | **pass** |
| 6 | No production deploy | **pass** |

---

## Diff review (required probes)

| Probe | Finding |
|-------|---------|
| 1. Badge still using loaded length | **Cleared** — no `setServerTotalCount(firstPage.designs.length)`; incomplete paging returns `null` until aggregate resolves or fully hydrated |
| 2. Count/list membership mismatch | **Pass** — count uses same `serverListQuery` / `buildDesignFilterConstraints` path via `countReadyDesigns(serverListQuery)` |
| 3. Stale count races on filter change | **Pass** — effect resets designs/cursor/countAuthority; generation guard on async count |
| 4. Duplicate / unnecessary counts | **Pass** — one count (+ one retry on failure) per ordinary hydrate |
| 5. Cursor corruption | **Pass** — restore uses `getDesignSortValue` + last design id; Load more still spreads `serverListQuery` |
| 6. Duplicate / skipped designs | **Pass** — `appendCatalogDesignPageWithoutDuplicates` |
| 7. Metric-sort regressions | **Pass** — `catalogService` untouched; Stage 1b-C suites green |
| 8. Unbounded reads | **Pass** — page size 40 + aggregate + Load more only |
| 9. Accidental Algolia changes | **Pass** — managed path unchanged |
| 10. Home rail changes | **Pass** — `useCatalogHomeDesigns` unchanged |
| 11. Unrelated Portal mods | **Pass** — hook + tests only |

---

## Count failure contract (documented)

1. Retry aggregate once.
2. On failure: `countAuthority = failed`; **do not** set badge to page length.
3. While incomplete: `isHydrating` → UI “Counting designs…” (existing copy); Load more remains cursor-driven.
4. When fully hydrated after paging: badge = loaded membership (honest).

---

## Residual

- `CLIENT_SORT_MEMBERSHIP_CAP = 500` unchanged (metric repair ceiling; not NTW 40-vs-45 cause).
- Production App Hosting rollout **not** performed.

---

## Verdict

**approved** — ready for Owner QA after a separate production promotion / App Hosting phrase.
