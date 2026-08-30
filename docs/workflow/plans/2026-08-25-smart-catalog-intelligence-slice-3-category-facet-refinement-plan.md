# Plan: Slice 3 Final Refinement — Narrowed Category Selector

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (Slice 3 final refinement) |
| Related | Slice 3 plan/test report; owner PASS WITH ONE FINAL FILTERING REFINEMENT |

---

## Goal

Category selector options reflect designs matching current keyword + Smart Filters (+ other non-category constraints), via Algolia `categoryId` facets that **exclude** the selected category filter so users can switch categories without clearing first.

## Background

Owner Portal/Studio corrective re-QA **PASS**. Smart Filters already narrow by result context (including category). Category list still shows the full active set. Owner wants reciprocal narrowing from Algolia, not a client scan of rendered cards.

**Terminology (owner):** Title and description are permanent core search inputs — not “legacy.” Legacy = old tag / approved-tag infrastructure. Do not de-prioritize title/description in future tag retirement.

## Scope

### In Scope
- Algolia category facet params/service (query + tags + smart filters; **no** selected category in filters)
- Portal category options wired to that distribution
- Index settings: `filterOnly(categoryId)` → `categoryId` so facet values are retrievable (DEV apply)
- Studio managed-search category options via same Algolia facet path (replace card-scan when managed)
- Tests for narrowing / exclude-self / clear / smart-filter↔category reciprocity notes
- Docs bookkeeping; stop for owner re-QA before Slice 3 signoff

### Out of Scope
- Slice 4, production, prompt/v27, tag retirement, backfill, auto-approval
- Separate `description` Algolia attribute (already in `searchText` + title searchable; document permanence)

---

## Affected Areas

- `packages/shared/.../portalCatalogAlgoliaRecord.ts` (attributesForFaceting)
- `apps/portal/.../portalAlgoliaCatalogSearchService.ts` + tests
- Portal category options hook/page wiring
- Studio managed category options + search service
- DEV Algolia index settings apply (not production)

---

## Approach

1. Facetable `categoryId` (drop `filterOnly`)
2. `buildPortalAlgoliaCategoryFacetSearchParams` + `listNarrowedCategoryFacets` (facets: `categoryId` only among category attrs; never objects/concepts/visibleText)
3. Portal: when search/tags/smart active → intersect Firestore categories with facet IDs; always keep “All categories” + currently selected if still a known category; when inactive → full list
4. Studio managed path: same Algolia distribution instead of `buildCategoryFilterOptions` from loaded designs
5. DEV: apply index settings (reconcile settings path or admin setSettings)
6. Tests + typecheck; stop for owner QA

---

## Test Strategy

Automated: category facet params exclude category filter; merge/options helpers; Portal/Studio containment; title/description/legacy search regression where existing tests cover. Manual: owner Portal category narrowing with `nurse` etc.

## Human Checkpoints

Owner re-QA then Slice 3 signoff. No production.
