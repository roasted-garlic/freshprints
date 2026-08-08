# Plan: Stage 1b-C generated fallback narrowed facet parity

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective follow-up) |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Related | Stage 1b-C Algolia fix; owner A/B with kill switch OFF |

---

## Goal

Tags-modal narrowed facet counts must reflect active catalog constraints (`q` + tag AND + category) on **both**:

- Algolia ON (`NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`) — already corrected
- Algolia OFF (generated fallback) — currently broken; must reach parity

Kill switch must not restore knowingly broken Tags-modal behavior during Stage 1b transition.

---

## Background / Investigation

Owner A/B (Algolia OFF, Portal restarted):

1. `q=jerk` → exactly 1 design (`I Jerk It Every Chance I Get Fishing`)
2. Open Tags → still shows global-looking counts (fishing 6, funny 32, …)

**Root cause (generated path):**

1. `catalogService.listNarrowedApprovedTags` forwards `search`/`categoryId` **only** on Algolia path; generated call is `listNarrowedTagFacets(selectedTags)` only.
2. `portalCatalogAssetService.listNarrowedTagFacets` returns **global** `listTagFacets()` when `selectedTags` is empty — so search-only never narrows.
3. Even with tags selected, generated narrowing never intersects search shards or category ID lists (unlike `listMatchingDesigns`).

Classification: **product/fallback parity defect** (pre-existing generated behavior), not Algolia-only.

Modal plumbing from prior Stage 1b-C fix already passes `catalogSearchQuery` + `categoryId` — generated backend must honor them.

---

## Scope

### In Scope

- Generated `listNarrowedTagFacets` + `catalogService` forwarding
- Reuse same constraint sources as `listMatchingDesigns` (search shards, tag ID lists, category ID list)
- Card-bucket co-occurrence via existing `computeNarrowedTagFacets` / `intersectDesignIdLists`
- Discriminating automated tests (search-only narrows; counts ≠ global)
- Containment / wiring assertions for both paths

### Out of Scope

- Publisher retirement / generated asset deletion (not Stage 4)
- Algolia schema / Functions
- Firestore browse changes
- Production / PR #40 merge / Stage 5/6

---

## Affected Areas

### Files

- `apps/portal/features/catalog/services/portalCatalogAssetService.ts`
- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/services/portalCatalogAssetService.test.ts` (and/or new parity test)
- Docs: plan/review/test/impl-review + workflow state

### Architecture / Security / Data / Backend

- Portal-only; no deploy; no secrets; no schema

### UI

- Same Tags modal; counts correct on kill-switch OFF

---

## Approach

1. Extend generated `listNarrowedTagFacets(selectedTags, { search?, categoryId? })`.
2. Build candidate ID lists identically to `listMatchingDesigns` (tags + category + tokenized search shards).
3. Global facets **only** when search, tags, and category are all empty.
4. Intersect candidates → load cards for matching IDs → `computeNarrowedTagFacets` (works with empty selected tags over a non-empty match set).
5. Forward options from `catalogService` on the generated branch.
6. Discriminating tests: `q=jerk`-style fixture → funny count 1 ≠ global 32; assert catalogService forwards options on both paths.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Generated narrowed-facet discriminating tests | yes |
| Prior Algolia narrowed-facet tests still pass | yes |
| Containment / catalog tests as needed | yes |
| Portal `tsc` | yes |
| eslint touched files | yes |
| `git diff --check` | yes |

Manual: owner A/B ON and OFF after restart.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Extra shard/bucket fetches | Same assets as search already uses; cache shared |
| Empty search tokens | Treat as no search constraint |
| Missing shard | Empty match set → empty/minimal facet list (same as search) |

Rollback: revert Portal commits; kill switch still available.

---

## Open Questions

None blocking.
