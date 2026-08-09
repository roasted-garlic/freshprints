# Test Report: Stage 1b-C generated narrowed facet parity

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **passed** (automated); owner A/B re-QA pending |

## Commands

```bash
npx tsx --test \
  apps/portal/features/catalog/services/portalCatalogAssetService.test.ts \
  apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.narrowedFacets.test.ts \
  apps/portal/features/catalog/hooks/portalCatalogStage1bAlgoliaContainment.test.ts \
  apps/portal/features/catalog/hooks/portalCatalogPhase1aContainment.test.ts \
  apps/portal/features/catalog/hooks/useCatalogDesigns.test.ts
# → 48 pass / 0 fail

npx tsc --noEmit -p apps/portal   # exit 0
npx eslint <touched> --max-warnings 0   # exit 0
git diff --check   # exit 0
```

## Deploy

None.
