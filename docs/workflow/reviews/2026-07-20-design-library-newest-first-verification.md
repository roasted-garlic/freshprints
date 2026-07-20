# Verification note: Small Managed #6 — Design library newest first

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | **Done** (already implemented; owner covered already) |
| Related plan | docs/workflow/plans/2026-07-18-catalog-stable-studio-newest-sort-plan.md |
| Related test report | docs/workflow/reviews/2026-07-18-catalog-stable-studio-newest-sort-test-report.md |

---

## Verdict

**YES — Portal default/library browse is already Studio-newest first** (`createdAt` desc). Marked Small Managed **#6 Done** with owner **PASS** (covered already). No new implementation.

---

## Code evidence

| Location | Behavior |
|----------|----------|
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` — `sortFieldForDiscovery` | Default / browse-all / filters → `'createdAt'`. Explicit comment: do not use `updatedAt` (request/favorite counters would reshuffle). |
| Same file — metric modes | `popular` → `requestCount`; `mostLiked` → `favoriteCount`; `recent` → `lastRequestedAt`; `new` → `createdAt`. |
| `apps/portal/features/catalog/services/catalogService.ts` — `resolveSortField` / `buildDesignListConstraints` | Default `createdAt`; `orderBy(sortField, 'desc')` + `__name__` desc. |
| `apps/portal/features/catalog/types/catalog.types.ts` | Documents default browse = `createdAt` (Studio-newest). |
| `docs/architecture/ARCHITECTURE.md` | Default library / non-metric browse = `createdAt` descending (2026-07-18). |

Category/tag filters still go through `useCatalogDesigns` → same default `createdAt` sort (newest first even when filtered).

---

## Out of scope / not claimed

Studio Electron Design Library (`designService` default `sortField ?? "updatedAt"`) was **out of scope** of the 2026-07-18 Portal catalog-stable plan. Not required to close #6 per owner “covered already” (Portal intent). Optional future item if staff library should also prefer `createdAt`.

---

## Owner

2026-07-20 — Check if already implemented; if so record **PASS**. Confirmed implemented → **PASS** / **Done**.
