# Test Report: Stage 1b-C initial facet count mismatch

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **passed** (automated); owner re-QA pending |

## Live probe (investigation)

`cartoon::cartoon` global facet = 4; `tagIds:cartoon` nbHits = 4; index nbHits = 46.

## Automated

```bash
npx tsx --test \
  apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.initialFacetFreshness.test.ts \
  apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.narrowedFacets.test.ts \
  apps/portal/features/catalog/hooks/portalCatalogStage1bAlgoliaContainment.test.ts \
  apps/portal/features/catalog/hooks/portalCatalogPhase1aContainment.test.ts
# → 21 pass / 0 fail

npx tsc --noEmit -p apps/portal  # 0
eslint touched files             # 0
git diff --check                 # 0
```
