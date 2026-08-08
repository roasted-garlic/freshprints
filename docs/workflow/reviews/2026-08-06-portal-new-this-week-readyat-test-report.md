# Test Report: Portal Discover New This Week → `readyAt` (Case D)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Plan | `docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md` |
| Status | **passed_with_notes** (Portal production build blocked by concurrent `dev:portal` lock on `.next`) |

---

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Focused unit | `npx tsx --test packages/shared/src/utils/catalogDiscoveryRanking.test.ts apps/portal/features/catalog/hooks/useCatalogDesigns.test.ts apps/portal/features/catalog/services/catalogService.readyAtOrdering.test.ts apps/portal/features/catalog/hooks/portalCatalogPhase1aContainment.test.ts` | **35/35 pass** |
| Studio ready-order | `npx tsx --test apps/studio/.../readyOrder.test.ts apps/studio/.../readyOrderPagination.test.ts` | **23/23 pass** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **exit 0** |
| Repo lint | `npm run lint` | **exit 0** |
| Diff check | `git diff --check` | **exit 0** |
| Portal build | `npm run build:portal` | **failed_documented** — EPERM / hang on `apps/portal/.next` while `npm run dev:portal` is active (terminal 3). Typecheck green; same environmental flake noted in prior Portal signoffs. |

---

## Coverage notes

- Old import + new `readyAt` qualifies; new import + stale `readyAt` does not.
- Order follows `readyAtMs`, not `createdAtMs`.
- Discover query wiring: `sortField: 'readyAt'` + `readyAfterMs`.
- Metric / ordinary browse paths do not set `readyAfterMs`.
- Completeness/index demotion blocked when `readyAfterMs` is set.

---

## Skipped

- Firestore Rules / index deploy (not required; existing `status + readyAt` composites expected)
- Functions tests (no Functions changes)
