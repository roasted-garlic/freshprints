# Implementation Review: Stage 1b-C Algolia narrowed facet counts

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Implementation Review Agent (independent) |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-algolia-narrowed-facets-plan.md` |
| Plan Review | **approved** |
| Verdict | **APPROVED** |

---

## Summary

Portal-only fix correctly threads catalog `q`, selected-tag AND, and category into Algolia facet queries, and the Tags modal now requests narrowed facets whenever any of those constraints is active. Discriminating tests fail the pre-fix `query: ''` behavior. No Functions deploy required. Safe for owner re-QA.

---

## Root cause (confirmed in review)

| Letter | Finding |
|--------|---------|
| A | Partial — modal used global list when tags empty even with search |
| **B** | **Yes** — catalog `q` / category never passed into facet call |
| **C** | **Yes** — `listNarrowedTagFacets` hard-coded `query: ''`, no category `filters` |
| D | No — UI correctly prefers `narrowedTags` when loading path is engaged |
| E | N/A |

Classification: **state plumbing + query construction** (not rendering cache).

---

## Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| Narrowed counts use active q/tags/category | pass | `buildPortalAlgoliaFacetSearchParams` + modal props |
| Global counts correct when unfiltered | pass | no constraints → `listTagFacets` / `approvedTags` |
| Selected tags not incorrectly self-filtered out | pass | AND facetFilters on `tagIds`; facets on `tagFacetKeys` |
| True AND remains | pass | unchanged `buildTagAndFilters` |
| Zero-use omit remains | pass | `count <= 0` skipped |
| No generated facet fallback on Algolia path | pass | still routes via Algolia when configured |
| No full-catalog hydrate | pass | `hitsPerPage: 0` facets only |
| No search regression in service | pass | `listMatchingDesigns` untouched aside from shared helpers |
| No Stage 4/5/6 creep | pass | publisher / generated retained |
| Kill switch intact | pass | `isPortalAlgoliaCatalogConfigured` unchanged |

---

## Files reviewed

- `portalAlgoliaCatalogSearchService.ts`
- `catalogService.ts` (`listNarrowedApprovedTags` options)
- `CatalogTagFilterModal.tsx`
- `CatalogPageContent.tsx`
- `portalAlgoliaCatalogSearchService.narrowedFacets.test.ts`
- containment test update

---

## Test evidence (this session)

| Check | Result |
|-------|--------|
| Focused + containment + useCatalogDesigns | **22 pass / 0 fail** |
| `npx tsc --noEmit -p apps/portal` | **exit 0** |
| eslint (touched files) | **exit 0** |
| `git diff --check` | **exit 0** |

---

## Deploy

**Not required** — Portal-only. No Functions / Rules / secrets change.

---

## Required changes

None.

## Advisory

- Restart Portal after pull so HMR picks up modal/service changes.
- Owner re-QA must re-check the exact failing case (`q=stupid` + funny + quote).

---

## Verdict

**APPROVED** — STOP for owner re-QA. Do not mark Stage 1b-C PASS until owner confirms narrowed counts.
