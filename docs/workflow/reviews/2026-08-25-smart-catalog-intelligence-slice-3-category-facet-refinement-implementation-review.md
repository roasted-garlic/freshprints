# Implementation Review: Slice 3 Category Facet Refinement

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-3-category-facet-refinement-plan.md` |
| Status | **complete** — awaiting owner re-QA / Slice 3 signoff |

---

## Delivered

1. **Algolia:** `attributesForFaceting` uses retrievable `categoryId` (was `filterOnly(categoryId)`). Applied on **DEV** `portal_catalog_ready_dev` only.
2. **Portal:** `listNarrowedCategoryFacets` + `useNarrowedCatalogCategoryOptions` — Category options narrow by search / tags / Smart Filters; selected category **excluded** from facet constraints.
3. **Studio:** managed-search Category options use the same Algolia facet path (`buildCategoryFilterOptionsFromFacetIds`).
4. **Docs:** DATA_MODEL notes title/description as permanent core search (not legacy tags).

## Tests

| Check | Result |
|-------|--------|
| Shared + Portal + Studio affected unit/containment (60) | **PASS** |
| Portal `tsc --noEmit` | **PASS** |
| Studio `tsc --noEmit` | **PASS** |

## Smoke (DEV)

`nurse` + `facets:['categoryId']` returns category facet distribution after settings apply.

## Not done

- Owner re-QA of Category narrowing
- Slice 3 signoff
- Production Algolia settings (explicit later)
- Slice 4
