# Plan: Phase 4 — Design Library Search & Filter Enhancement

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/phase-4-design-library-search-review.md |

---

## Goal

Advance **Phase 4 — Search and Organization** by enhancing the Design Library so staff can find designs efficiently in growing catalogs: server-backed tag and AI-review filters, pagination beyond the 100-record cap, richer text search, and persistent filter state — without starting customer-request search (Phase 5) or AI semantic search (Phase 7).

## Background

- Phase 2 delivered Design Library foundation (grid, categories, status filter, client title/tag search).
- Phase 3D added `aiReviewStatus` on designs; library filters do not expose it yet.
- `designService.listDesigns` supports `status`, `categoryId`, `tag`, `limitCount` but UI only wires category + status.
- `DEFAULT_LIST_LIMIT = 100` with no cursor pagination.
- Parent references: `docs/project/ROADMAP.md` Phase 4, `docs/workflow/plans/design-library-plan.md` §Search Strategy.

## Scope

### In Scope
- **Tag filter UI** — wire `DesignListQuery.tag` (Firestore `array-contains`); tag picker from known tags or typed exact tag
- **AI review status filter** — `aiReviewStatus` query param + Firestore constraint; filter dropdown in shell header
- **Pagination** — cursor-based load more (`startAfter` + `updatedAt`); extend `useDesigns` / `designService.listDesigns`
- **Search refinement** — include `description` in `filterDesignsBySearch`; debounce optional if needed
- **Filter persistence** — URL query params for category, status, tag, aiReviewStatus (extend existing status param pattern)
- **Clear filters** — reset all filters + search to defaults
- **Composite indexes** — add to `firestore.indexes.json` for new query combinations (document deploy step; no production deploy in this phase)
- **Docs** — update `DATA_MODEL.md` indexes section if needed, `WORKFLOWS.md` search foundation, `ROADMAP.md` Phase 4 progress
- **Tests** — extend unit tests for search/filter helpers where applicable

### Out of Scope
- Customer / request search (Phase 5)
- Date range filters (Phase 4B follow-up)
- Full-text / relevance ranking, AI semantic search
- Global cross-app search (dashboard, queue, etc.)
- Firestore rules changes (read patterns unchanged)
- Customer website catalog

---

## Affected Areas

### Files / Modules (expected)
- `src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
- `src/renderer/src/features/designs/hooks/useDesigns.ts`
- `src/renderer/src/features/designs/services/designService.ts`
- `src/renderer/src/features/designs/types/designQuery.types.ts`
- `src/renderer/src/features/designs/utils/designLibrarySearch.ts`
- `src/renderer/src/features/designs/constants/designLibraryFilters.ts`
- `src/renderer/src/shared/hooks/useShellHeaderConfig.ts` (if filter API extended)
- `firestore.indexes.json`
- `docs/architecture/DATA_MODEL.md`, `docs/WORKFLOWS.md`, `docs/project/ROADMAP.md`

### Architecture Impact
- [x] Details: Extend existing feature service + hook pattern; no new layers

### Security Impact
- [x] None — same `canViewDesigns` gate; Firestore rules unchanged

### Data Model Impact
- [x] None — no new fields; query filters on existing `aiReviewStatus`, `tags`

### Backend Impact
- [x] Details: New Firestore composite indexes only (local file + documented deploy)

### UI / UX Impact
- [x] Design Library header filters, load-more control, empty states for new filter combos

### Migration Impact
- [x] None — designs without `aiReviewStatus` use display fallback; filter treats missing as `pending` client-side OR query only explicit values

---

## Approach

1. **Extend `DesignListQuery`** — add `aiReviewStatus`, `startAfterUpdatedAt` / cursor token
2. **Update `buildDesignListConstraints`** — `where("aiReviewStatus", "==", …)` when set; pagination cursor
3. **Indexes** — add combinations: `aiReviewStatus + status + updatedAt`, `tags + aiReviewStatus + status` as needed per final query matrix
4. **`useDesigns`** — support loadMore, accumulate pages, expose `hasMore` / `isLoadingMore`
5. **Design Library UI** — tag filter dropdown, AI review filter, load more button, clear filters
6. **URL params** — sync filter state with `useSearchParams`
7. **Search util** — search description field
8. **Docs + tests**

### Query matrix (max one array-contains)

| Filters active | Firestore strategy |
|----------------|------------------|
| status + category | existing index |
| status + tag | existing `tags` + `status` index |
| status + aiReviewStatus | new composite index |
| tag + aiReviewStatus + status | new composite if combined server-side |

If Firestore disallows combining tag + aiReviewStatus efficiently, apply aiReviewStatus server-side and tag client-side on page batch (document in plan review).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Typecheck | `npx tsc --noEmit` | yes |
| Unit tests | extend `designLibrarySearch.test.ts` if created | yes |

### Manual
- Filter by tag, status, category, AI review status independently and combined
- Load more when > 100 designs
- URL refresh preserves filters
- Clear filters resets grid
- Regression: design details, edit, archive unchanged

---

## Human Checkpoints Anticipated
- [ ] Manual UI review of filter UX
- [ ] Human approval before **production** Firestore index deploy (if not using emulator)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Index explosion for filter combos | Medium | Limit server filters; client refine for edge combos |
| Missing `aiReviewStatus` on old docs | Low | Client fallback to `pending` for display; filter "pending" includes unset |
| Pagination cursor drift during edits | Low | Order by `updatedAt` desc; document refresh behavior |

---

## Rollback Plan

Revert feature commit; remove new indexes from `firestore.indexes.json` before deploy.

---

## Documentation Updates Required
- [x] `docs/WORKFLOWS.md` — Phase 4 search capabilities
- [x] `docs/architecture/DATA_MODEL.md` — index list if extended
- [x] `docs/project/ROADMAP.md` — Phase 4 in progress

---

## Open Questions
- [x] Date range deferred to Phase 4B
- [x] Customer search deferred to Phase 5

---

## Approval
- Review doc: docs/workflow/reviews/phase-4-design-library-search-review.md
- Verdict: pending
