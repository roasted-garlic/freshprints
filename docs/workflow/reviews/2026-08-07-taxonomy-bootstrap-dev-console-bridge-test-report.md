# Test Report — Taxonomy bootstrap Studio Dev Console bridge

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **passed** |
| Scope | Studio `window.freshPrintsDev.rebuildTaxonomyMaterialization` bridge only |

## Commands

```bash
npx tsx --test \
  apps/studio/src/renderer/src/features/designs/services/taxonomyMaterializationBootstrapAdminService.test.ts \
  apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.test.ts
npx tsc --noEmit -p apps/studio
npx eslint <bridge files> --max-warnings 0
git diff --check -- <bridge files>
```

## Results

| Check | Result |
|-------|--------|
| Targeted tests | **8/8 pass** (6 new + 2 Algolia sibling) |
| Studio `tsc` | **pass** |
| ESLint | **pass** |
| `git diff --check` | **pass** (CRLF warning only) |

## Confirmations

- NO callable invocation
- NO Firebase mutation
- NO deploy
