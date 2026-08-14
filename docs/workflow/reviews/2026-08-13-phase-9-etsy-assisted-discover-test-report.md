# Test Report: Phase 9 Etsy+Assisted + Discover remediation

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Goal | `phase-9-custom-request-results-and-routing-remediation` |
| Phase | Test (local automated) |
| Status | **passed_with_notes** — automated PASS; manual Portal QA still required |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Focused unit/source tests | `npx tsx --test` on catalog hooks/services + Etsy lifecycle + `catalogDiscoveryRanking.test.ts` + phase1a containment | 0 | **88 pass** |
| Portal typecheck | `npm run typecheck` in `apps/portal` | 0 | PASS |
| Lint (scoped) | `npx eslint` on changed portal TS/TSX files | 0 | PASS |
| Whitespace | `git diff --check` | 0 | PASS |
| Functions build | n/a | — | Functions not changed |

### Focused test paths

- `apps/portal/features/catalog/hooks/useCatalogDesigns.test.ts`
- `apps/portal/features/catalog/hooks/portalCatalogPhase1aContainment.test.ts`
- `apps/portal/features/catalog/services/catalogService.categoryRailHydration.test.ts`
- `apps/portal/features/catalog/services/catalogService.discoverViewAllRepair.test.ts`
- `apps/portal/features/catalog/services/catalogService.homeDiscoveryPool.test.ts`
- `apps/portal/features/catalog/services/catalogService.ntwCountOrder.test.ts`
- `apps/portal/features/catalog/services/catalogService.readyAtOrdering.test.ts`
- `apps/portal/features/etsy-recommendations/utils/etsyResultsLifecycleRemediation.test.ts`
- `packages/shared/src/utils/catalogDiscoveryRanking.test.ts`

---

## Coverage notes

Automated coverage includes source contracts for Etsy complete/cancel wiring, Recent/Most Liked eligibility, rail hydrate bounds, reconcile hasMore for 2-eligible Recent, Popular/NTW ranking units, and containment for Home pool + Algolia path references.

**Manual still required:** live Portal Discover rails vs View All; Recently Requested badge/Load more against real Firestore; Etsy Mark as satisfied / Cancel UX on device.

---

## Skipped / not run

- Full monorepo lint
- E2E
- `npm run test:rules`
- DEV/prod deploys
