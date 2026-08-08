# Test Report — Production Home/Discover population regression (source Implement)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Branch | `fix/prod-home-discover-population` |
| Base production SHA | `1e65a43e131b3b5709a8870b1a24a40f8a004978` |
| Status | **passed** |
| Production defect | **still OPEN** (source only; no App Hosting / index deploy) |

## Commands run

```bash
npx tsx --test \
  apps/portal/features/catalog/services/catalogService.homeDiscoveryPool.test.ts \
  apps/portal/features/catalog/services/catalogService.readyAtOrdering.test.ts \
  apps/portal/features/catalog/services/catalogService.discoverViewAllRepair.test.ts \
  apps/portal/features/catalog/services/catalogService.test.ts \
  packages/shared/src/utils/catalogDiscoveryRanking.test.ts

npm run typecheck --workspace @fresh-prints/portal
npm run build --workspace @fresh-prints/portal
npm run lint
git diff --check
```

## Results

| Check | Result |
|-------|--------|
| Focused unit (home pool + catalogService + ranking) | **54/54 pass** |
| Home pool regression suite alone | **8/8 pass** |
| Portal typecheck | **pass** (exit 0) |
| Portal production build | **pass** (exit 0) |
| Repo lint | **pass** (exit 0) |
| `git diff --check` | **pass** (exit 0) |

## Coverage map (Cases 1–7)

| Case | Covered |
|------|---------|
| 1 Exact prod shape (readyAt index fail + 1 metric + many ready) | yes — fill required; merge >1 |
| 2 Zero metrics | yes |
| 3 Healthy readyAt complete pool | yes — no forced fill |
| 4 Metric ranking preserved after merge | yes — Popular / Most Liked / Recent / New |
| 5 Dedupe first-wins | yes |
| 6 Ready-only / no Algolia / no generated | yes — source contract |
| 7 Non-index failures not treated as index-blocked; early-return removed | yes |

## Notes

- Sufficiency rule: **incomplete relative to ready membership** (capped by `HOME_DISCOVERY_POOL_PAGE_SIZE`), plus fill when preferred `readyAt` is index-unavailable. No magic 8/12/20 threshold.
- `firestore.indexes.json` **not modified** (four readyAt composites already present in source).
