# Plan: Stage 1b-C Algolia narrowed facet counts fix

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective) |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Related | Stage 1b Algolia; owner QA `NARROWED FACET COUNTS: FAIL` |

---

## Goal

Fix Portal Tags modal facet counts so they reflect the **current Algolia search/filter context** (free-text `q`, selected tags AND, category when active), not global ready-catalog counts.

---

## Background

Stage 1b-C owner QA:

- Free-text, multi-tag AND, and generated-read-zero on search paths **PASS**
- With `q=stupid` + tags `funny` + `quote`, results correctly narrow, but Tags modal still shows apparently global counts (e.g. funny 32)

Do **not** mark Stage 1b-C PASS until this is fixed and re-QA’d.

---

## Investigation (completed — before implement)

### Global facet request

- `useCatalogTags` → `catalogService.listApprovedTags` → Algolia `listTagFacets()` with `query: ''`, no filters.

### Narrowed facet request (broken)

1. **State plumbing:** `CatalogTagFilterModal` never receives catalog `searchQuery` or `categoryId`. Narrowing runs only when draft **tags** are non-empty (`draftTagsKey`). Search-only / category-only never triggers narrowed facets → shows global `approvedTags`.

2. **Query construction:** `portalAlgoliaCatalogSearchService.listNarrowedTagFacets(selectedTags)` always sends `query: ''` and never applies `categoryId`. Tag AND filters alone are applied; free-text that shrunk the result grid is ignored — so counts stay at tag-AND (or global) scale while the grid shows search∩tags.

3. **Rendering:** Modal correctly prefers `narrowedTags` when `draftTagsKey` is set; not a cache/render-of-global bug once narrowed data is wrong/missing constraints.

**Classification:** **B (filters not passed) + C (query built without `q`/category)** — not A (wrong endpoint only), not D (UI cache of global).

---

## Scope

### In Scope

- Algolia `listTagFacets` / `listNarrowedTagFacets` API
- `catalogService.listNarrowedApprovedTags` options
- `CatalogTagFilterModal` + `CatalogPageContent` plumbing for active `q` / tags / category
- Discriminating automated test (narrowed count ≠ global under constraints)
- Containment / related Portal catalog tests as needed

### Out of Scope

- Provider change; record schema (unless proven necessary — **not**)
- Firestore browse; publisher retirement; generated deletion
- Stage 4/5/6; production; PR #40 merge
- Unrelated Portal UX

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts`
- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/components/CatalogTagFilterModal.tsx`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- New/updated test under `apps/portal/features/catalog/services/`

### Architecture Impact

- [x] Details: Portal service + modal wiring only; Firestore remains SoT; Algolia still search-only key.

### Security Impact

- [x] None (no new secrets; same search-only client)

### Data Model Impact

- [x] None

### Backend Impact

- [x] None — **Portal-only; no Functions deploy**

### UI / UX Impact

- [x] Details: Tags modal counts update with active catalog constraints; selected tags remain selectable; zero-count tags follow existing omit behavior

### Migration Impact

- [x] None

---

## Approach

1. Extend Algolia narrowed facet helper to accept `{ search?, selectedTags?, categoryId? }`; apply `query`, `facetFilters` (tag AND), and `filters` (category) like `listMatchingDesigns`.
2. Fall back to global `listTagFacets` **only** when search, tags, and category are all empty.
3. Extend `catalogService.listNarrowedApprovedTags(selectedTags, options?)` to forward options on Algolia path; generated path remains tag-AND only (transition).
4. Pass `catalogSearchQuery` (debounced/applied `q`) and `categoryId` into `CatalogTagFilterModal`.
5. Modal: call narrowed facets whenever any of search / draft tags / category is active (not tags-only).
6. Add unit test with mocked `searchSingleIndex` proving params include `query` + tag filters and returned counts are the narrowed fixture, not global.
7. Update Stage 1b containment assertions if signatures change.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Discriminating facet test | `npx tsx --test apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService*.test.ts` | yes |
| Containment | Stage 1b Algolia containment test file | yes |
| Related catalog tests | useCatalogDesigns / catalogService as needed | yes |
| Portal typecheck | `npx tsc --noEmit` in portal (or workspace script) | yes |
| Lint | eslint on touched files | yes |
| Diff check | `git diff --check` | yes |

### Manual (owner re-QA — STOP after impl review)

Reduced checklist in review/signoff handoff:

1. Global Tags (no filters) — counts look global
2. One tag → counts update
3. Two tags AND → counts update
4. `q=stupid` + funny + quote → counts match small result context (not funny≈32 global-looking)
5. Network: no `generated/portal-catalog` facet assets on Algolia path
6. Browse / multi-tag AND / free-text still OK

---

## Human Checkpoints

- Owner re-QA after Implementation Review (required)
- No deploy approval needed if Portal-only (expected)

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Selected tags vanish from modal when count 0 | Preserve existing buildApprovedCatalogTagOptions / zero-omit; ensure selected tags still in AND hit facet set |
| Generated path signature drift | Keep tag-only args for asset service; options optional |
| Extra Algolia calls | Same open-modal cadence; debounce already on catalog q |

Rollback: revert Portal commits; kill switch `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` still works.

---

## FreshForge Impact

- Documentation / workflow artifacts only for FreshForge starter surface
- App: Portal catalog Algolia adapter

---

## Open Questions

None blocking — root cause traced in source.
