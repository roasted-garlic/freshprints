# Test Report — Amendment 8 Phase 1B Stage 1a

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Scope | Firestore-primary `getReadyDesignsByIds`; Firestore-only `listActiveCategories`; remove dead `listDiscoverDesigns` |
| Starting HEAD | `71a4cec` |
| Result | **passed** (focused automated checks) |

## Commands run

```text
npx tsx --test apps/portal/features/catalog/services/catalogService.test.ts
  apps/portal/features/catalog/hooks/portalCatalogPhase1aContainment.test.ts
  apps/portal/features/catalog/services/catalogService.readyAtOrdering.test.ts
  apps/portal/features/catalog/services/portalCatalogAssetService.test.ts
  packages/shared/src/utils/assistedCreationCatalogShareArtworkBackground.test.ts
→ pass (exit 0)

npm run typecheck --workspace @fresh-prints/portal → pass (exit 0)
npm run build --workspace @fresh-prints/portal → pass (exit 0)
npm run lint → pass (exit 0)
git diff --check → pass (CRLF warnings only, no conflict markers)
```

## Coverage vs required focused tests

| Requirement | How covered |
|---|---|
| No generated-card loading in `getReadyDesignsByIds` | Source containment in `catalogService.test.ts` |
| Per-doc FS + cache; not batch `in` / not `listAllReadyDesigns` | Same |
| Request order preserved | `orderReadyDesignsByRequestedIds` unit tests |
| Missing IDs omitted | Same |
| Non-ready via `mapCatalogDesign` + permission-denied → null | Source asserts `mapCatalogDesign` + `permission-denied` |
| Favorites/share/request/Assisted/account use service | Containment test over caller paths |
| Categories FS-only | Source containment |
| Discover uses `listHomeDiscoveryPool`; dead method removed | Containment + asset service assert |
| Search/multi-tag/facets still generated | Containment asserts `listMatchingDesigns` / facets remain |
| readyAt ordinary browse | Existing `catalogService.readyAtOrdering.test.ts` |
| Artwork background helpers | Existing shared Assisted catalog-share artwork tests |

## Not run (out of Stage 1a / no shared helper change requiring)

- Full Studio suite
- Rules suite
- Firebase deploy smoke

## Owner QA

Manual checklist: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-manual-qa.md`
