# Test Report — Stage 1a Amendment 3 (Portal category availability)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Baseline | `bc893f6` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Plan | `docs/workflow/plans/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-category-availability-plan.md` |
| Signoff | **Not created** (awaiting owner QA) |

## Scope tested

Portal Option A bridge: `listActiveCategories` → Amendment 1 mapper → `selectCustomerVisibleCategories` with `countReadyDesigns({ categoryId }) > 0`; C≤64 fail-closed; in-flight Promise dedupe (clear-by-identity); no module TTL; no Studio copy; no snapshot.

## Commands and results

| Check | Command | Exit |
|-------|---------|------|
| Category availability + in-flight + Amendment 1 + freshness + containment + readyAt | `npx tsx --test` on `catalogService.categoryAvailability.test.ts`, `catalogService.inFlightDedupe.test.ts`, `catalogService.test.ts`, `useCatalogCategories.freshness.test.ts`, `portalCatalogPhase1aContainment.test.ts`, `catalogService.readyAtOrdering.test.ts` | **0** (43 pass) |
| Generated facets / asset paths (untouched contract) | `npx tsx --test apps/portal/features/catalog/services/portalCatalogAssetService.test.ts` | **0** (24 pass) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **0** |
| Portal production build | `npm run build:portal` | **0** |
| Repo lint | `npm run lint` | **0** |
| Diff check | `git diff --check` | **0** |

## Discriminating coverage (vs `bc893f6` all-actives)

- Zero ready count excluded; non-zero included; all actives counted; ordering stable.
- C=64 allowed; C=65 fail-closed; one failed aggregate fails closed.
- Source contract: `countReadyDesigns({ categoryId })`, no hydrate/taxonomy/TTL, in-flight clear-by-identity (not `load.finally` assignment).
- Behavioral in-flight clear pattern test + broken-pattern discriminator.
- Amendment 1 mapper / Stage 1a containment / Amendment 2 freshness asserts remain green.

## Index verification

Existing `designs` composites with equality prefix `categoryId` + `status` present in `firestore.indexes.json`. No index file change. No index deploy.

## Not run / out of scope

- Emulator live aggregate (reuse existing index accepted by Plan).
- Broader Studio / Functions suites (untouched).
- Owner manual QA (separate checklist).
- Signoff.

## Status

**passed** for automated focused verification. Owner re-QA required before Signoff.
