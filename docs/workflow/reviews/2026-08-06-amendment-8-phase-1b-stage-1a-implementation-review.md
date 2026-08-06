# Implementation Review — Amendment 8 Phase 1B Stage 1a

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Plan | Approved Phase 1B revalidation Stage 1a |
| Diff scope | Portal catalogService + portalCatalogAssetService + focused tests + workflow docs |
| Verdict | **APPROVED** |

## Checks

| # | Check | Result |
|---|---|---|
| 1 | Known-ID hydration Firestore-primary | **Pass** — `getReadyDesignsByIds` only uses `loadCatalogDesignByIdCached` + `getDoc` |
| 2 | No hidden generated-card success path | **Pass** — no `portalCatalogAssetService.getDesignsByIds` / flag gate |
| 3 | Reads bounded | **Pass** — one cached getDoc per requested unique ID; no unbounded query |
| 4 | No full-catalog hydrate / N+1 grid | **Pass** — no `listAllReadyDesigns`; grid browse unchanged |
| 5 | Categories Firestore-only | **Pass** — `isActive==true` getDocs; no `loadClientTaxonomy` |
| 6 | Dead Discover removed after caller verify | **Pass** — repo search: only containment tests referenced it; method + parser import removed |
| 7 | Search/multi-tag/facets still generated | **Pass** — `listMatchingDesigns` / `listTagFacets` / `listNarrowedTagFacets` retained |
| 8 | Artwork / readyAt / Favorites / request / Assisted paths | **Pass** — callers still use `getReadyDesignsByIds`; readyAt + artwork tests green |
| 9 | No publisher / Rules / Function / Storage cleanup | **Pass** |
| 10 | No new dependency | **Pass** |

## Notes

- Existing source comment documented that batch `in` is rules-unsafe for mixed ready/non-ready IDs; Stage 1a correctly kept per-doc reads rather than inventing an `in` helper.
- Result ordering now explicitly follows the deduped requested-ID sequence via `orderReadyDesignsByRequestedIds` (improvement over prior generated-then-fallback concat).
- `loadClientTaxonomy` remains on `portalCatalogAssetService` unused by Portal runtime — acceptable until Stage 1b/retirement; not a design-card reader.
- `getDesignsByIds` remains on the asset service for Stage 1b card resolution from search shards.

## Required changes

None.
