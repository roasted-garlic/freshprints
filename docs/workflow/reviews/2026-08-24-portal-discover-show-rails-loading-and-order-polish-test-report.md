# Test Report: Portal Discover Show Rails Loading and Order Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `portal-discover-show-rails-loading-and-order-polish` |
| Test Status | **passed** |
| Plan | docs/workflow/plans/2026-08-24-portal-discover-show-rails-loading-and-order-polish-plan.md |

---

## Automated checks

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Focused unit tests | `npx tsx --test apps/portal/features/show-designs/services/portalShowDiscoveryContent.test.ts apps/portal/features/catalog/pages/CatalogHomePageContent.showRails.test.ts` | 0 | **pass** — 11 tests, 0 failures |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **pass** |
| Lint | `npm run lint` | 0 | **pass** |
| Portal build | `npm run build:portal` | 0 | **pass** (initial attempt failed EPERM on `.next/trace`; succeeded after removing locked trace file) |
| Diff hygiene | `git diff --check` | 0 | **pass** (CRLF warnings only) |

---

## Focused test summary

**portalShowDiscoveryContent.test.ts (5 tests)**

- `designsForShowHomeRailPresentation` reverses copy without mutating source
- Passthrough when `reversePresentationOrder` absent/false
- Independent loader exports
- This Week loader sets `reversePresentationOrder: true` (source containment)
- `loadCatalogShowDesigns` does not apply reversal (source containment)

**CatalogHomePageContent.showRails.test.ts (6 tests)**

- No `isLoading || isShowRailsLoading` combined gate
- Catalog-only `{isLoading ? (` gate
- Localized loading copy for both rails
- Uses `designsForShowHomeRailPresentation` (no in-place `.reverse()`)
- Independent `nextShow` / `thisWeek` hook slots
- Insert after New discovery section preserved

---

## Manual testing

**Status:** **PASS** — owner `OWNER DEV QA: PASS` (2026-08-24)

All 9 approved acceptance scenarios passed at localhost:3100.

---

## Signoff readiness

- Automated: **ready**
- Manual: **PASS**
- Production deploy: **out of scope**
