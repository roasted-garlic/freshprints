# Plan: Catalog/library stable sort — Studio newest first

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-catalog-stable-studio-newest-sort-review.md |

---

## Goal

Stop the Portal Design Library / Discover catalog from reshuffling when customers add designs to a print request (or like them). Default and all non-metric views must stay ordered **most recently added from Studio → oldest**, using a studio-stable timestamp (`createdAt`). Only metric discovery collections may sort by popularity / likes / last-requested.

## Background

Owner report: library/catalog re-sorts in real time as designs are added to a request.

**Root cause (confirmed in code):**

1. Default browse (no `discover=` mode) and category/tag filters use `sortField: 'updatedAt'` (`useCatalogDesigns.sortFieldForDiscovery` default + `catalogService.resolveSortField`).
2. `onPrintRequestItemCreated` increments `requestCount`, sets `lastRequestedAt`, and **also bumps `designs.updatedAt`**.
3. Favoriting updates `favoriteCount` (Most Liked); request adds update `requestCount` / `lastRequestedAt` (Popular / Recently Requested).
4. Any remount, soft-reload, filter remount, or hydrate refetch of the default list therefore pulls recently requested designs to the top because `updatedAt` changed — even though Studio did not re-add the design.

There is no `publishedAt` field; Studio add time is `designs.createdAt`.

## Scope

### In Scope

- Change **default** Portal catalog list sort from `updatedAt` → `createdAt` (desc).
- Keep metric sorts for: Popular (`requestCount`), Most Liked (`favoriteCount`), Recently Requested (`lastRequestedAt`).
- Keep New This Week on `createdAt` (already correct; window filter unchanged).
- Category / tag / search browse (no metric discover mode) → `createdAt` desc.
- Discover home **category rails**: design cards inside rails ordered newest Studio-first (not by `requestCount`). Rail *selection* (which categories appear) may stay popularity-based for discoverability.
- Docs: ARCHITECTURE note on default library sort.
- Soft-reload Portal locally; no production deploy; no Functions deploy.

### Out of Scope

- Stopping `updatedAt` writes in `onPrintRequestItemCreated` (optional follow-up; would need Functions deploy).
- New Firestore indexes (status + createdAt composites already exist).
- Changing Studio Electron catalog ordering.
- Live `onSnapshot` catalog (still one-shot hydrate).

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` — default discovery sort → `createdAt`
- `apps/portal/features/catalog/services/catalogService.ts` — `resolveSortField` default; deprecated `listAllReadyDesigns` path; comments
- `apps/portal/features/catalog/types/catalog.types.ts` — comment on default sort field
- `packages/shared/src/utils/catalogDiscoveryRanking.ts` — newest-first helper; category rail design order
- `packages/shared/src/utils/catalogDiscoveryRanking.test.ts` — cover newest / category rail order
- `docs/architecture/ARCHITECTURE.md` — document default library sort

### Architecture Impact

- [x] Details: Portal catalog default query order key changes from `updatedAt` to `createdAt`. Metric discover modes unchanged.

### Security Impact

- [x] None

### Data Model Impact

- [x] None (read-path sort only; no schema change)

### Backend Impact

- [x] None required for this fix (client query sort). Indexes for `status + createdAt` already present; existing index-not-ready fallback to `updatedAt` remains.

### UI / UX Impact

- [x] Details: Default library and non-metric home category rails show Studio-newest first and stay stable when adding to request. Popular / Most Liked / Recently Requested still reorder by metrics on load/refetch (expected).

### Migration Impact

- [x] None

---

## Approach

1. Default `CatalogDesignSortField` resolution: `createdAt` when unset.
2. `sortFieldForDiscovery(null/undefined)` → `createdAt` (not `updatedAt`).
3. Serialize / fallback comments: default key is `createdAt`; index fallback may still use `updatedAt` when a sort-specific index is building.
4. Add `rankNewestStudioFirst` (createdAtMs desc, id tie-break) in shared ranking util; use it for category rail design lists instead of `rankPopular`.
5. Update unit tests for ranking.
6. Soft-reload Portal; manual re-test steps for owner.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit -p apps/portal` (or package script) | yes |
| Unit tests | shared `catalogDiscoveryRanking` tests | yes |
| Lint | if touched files flagged | no |
| Build | no | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules | no | no |

### Manual

- [ ] Open Browse all / library (no discover mode); note card order.
- [ ] Add several designs to a request; cards must not reshuffle (badges/qty may update).
- [ ] Soft-reload library; order remains Studio-newest first (recently requested designs should not jump to top solely because they were requested).
- [ ] Popular / Most Liked / Recently Requested still metric-ordered.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX verification after soft-reload
- [ ] Production deploy — not in this phase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Legacy designs missing `createdAt` | low | Sort value 0; `__name__` tie-break; rare |
| Index fallback briefly uses `updatedAt` | low | Existing composite createdAt indexes; fallback only when index error |
| Metric rails still move on remount after add | expected | Documented; only metric collections |

---

## Rollback Plan

Revert default `sortField` to `updatedAt` in portal hook/service and category-rail ranking change in shared util.

---

## Documentation Updates Required

- [x] ARCHITECTURE.md — default library sort = createdAt desc
- [ ] Other: workflow plan/review/signoff only

---

## Open Questions

- [x] None — owner rules are explicit

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-catalog-stable-studio-newest-sort-review.md
- Verdict: pending
