# Test Report: Stage 1b-C Algolia narrowed facet counts

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **passed** (automated); owner re-QA pending |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-algolia-narrowed-facets-plan.md` |

## Commands

```bash
npx tsx --test \
  apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.narrowedFacets.test.ts \
  apps/portal/features/catalog/hooks/portalCatalogStage1bAlgoliaContainment.test.ts \
  apps/portal/features/catalog/hooks/portalCatalogPhase1aContainment.test.ts \
  apps/portal/features/catalog/hooks/useCatalogDesigns.test.ts
# → 22 pass / 0 fail

npx tsc --noEmit -p apps/portal
# → exit 0

npx eslint <touched portal catalog files> --max-warnings 0
# → exit 0

git diff --check
# → exit 0
```

## Deploy

None (Portal-only).
