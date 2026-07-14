# Plan: Portal catalog pagination (library + home)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-catalog-pagination-review.md |

---

## Goal

Stop Portal from loading the entire ready catalog on first paint. Library loads a first page and **Load more**; home uses **bounded** discovery slices. Keep category / single-tag (incl. halftone) as Firestore filters where possible. Defer durable image URL caching.

## Background

Owner: small catalogs hide the cost; large catalogs will make first load very slow. Image caching deferred.

Today:

- `catalogService.listReadyDesignsPage` already pages (default 24, cursor, `hasMore`)
- `useCatalogDesigns` calls `listAllReadyDesigns()` (up to **2000**)
- Home rails + library search/tags/discovery all assume a full in-memory list
- Studio already uses **Load more** via `useDesigns`

## Owner decisions (locked)

| Decision | Choice |
|----------|--------|
| Scroll UX | **Load more** button (Studio parity), not infinite scroll |
| Home | Bounded slices — not full catalog |
| Image caching | Deferred |
| Text search (v1) | Filter **loaded** pages client-side; Load more expands the searchable pool; short helper copy |

---

## Scope

### In Scope

1. **Library (`/catalog/library`)**
   - Replace full fetch with paged hook (`hasMore`, `isLoadingMore`, `loadMore`, reset on filter change)
   - Page size **40** (even grid rows for common column counts)
   - Pass **categoryId** and **one tag** (halftone or first selected tag) into Firestore query
   - Additional selected tags: client AND-filter on accumulated pages; keep loading until enough matches or `!hasMore`
   - Text: client filter on accumulated designs; show muted hint when searching with `hasMore`
   - Discovery modes (`new` / `popular` / `recent`): query with appropriate `orderBy` + page; apply mode ranking only as needed for consistency within page (prefer server order)
   - Category dropdown: list **active categories** (no counts from full catalog)
   - Tag modal: use **approved tags** list (`listApprovedTags`) rather than deriving only from loaded designs
   - Prefetch thumbs for **visible / loaded** page only

2. **Home (`/`)**
   - Do **not** call `listAllReadyDesigns`
   - Fetch bounded pools in parallel (e.g. newest ~48, popular ~48, recently requested ~48), dedupe, then reuse existing `rankCatalogDiscoveryDesigns` / `selectTopPopularCategoryRails` / rail limits (12)
   - Prefetch only rail thumbnails (~72 max still OK)

3. **Service / indexes**
   - Extend `CatalogDesignListQuery` with `sortField`: `updatedAt` | `createdAt` | `requestCount` | `lastRequestedAt`
   - Cursor must match sort field
   - Add composite indexes in `firestore.indexes.json` for new sort combos (+ category/tag variants as needed)
   - Keep `listAllReadyDesigns` only if something still needs it; prefer unused or internal-only with clear warning

4. **Docs**
   - Note Portal browse paging behavior in ARCHITECTURE or catalog section if one exists; ROADMAP next-item update at signoff

### Out of Scope

- Image URL / byte caching (A+C)
- Algolia / full-text search backend
- True multi-tag `array-contains-all` (Firestore limitation)
- Exact global “most popular categories” from full catalog (approx via bounded popular pool)
- Studio Design Library changes
- Production index deploy without human if Console action required (document checkpoint)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` → paged hook + home bundle hook
- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/types/catalog.types.ts`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/features/catalog/components/*` (Load more UI; search hint; tag options source)
- `firestore.indexes.json`
- Tests: catalog search helpers; new service/hook tests where practical
- Shared ranking utils: reuse; no API break unless home needs a thin wrapper

### Architecture Impact

- [x] Details: Portal catalog data access stays in services/hooks; UI gets incremental load. Aligns with Studio paging pattern.

### Security Impact

- [x] None (same `status == ready` customer-readable designs; no rule relaxation)

### Data Model Impact

- [x] None (indexes only; no schema field changes)

### Backend Impact

- [x] Details: Firestore composite indexes for new orderBy fields. Deploy indexes before relying on those queries in shared/prod environments.

### UI / UX Impact

- [x] Details: Load more on library; home may show fewer/empty rails until enough data; search may need Load more to find older matches. Manual visual check.

### Migration Impact

- [x] Forward: add indexes; clients using old full-fetch replaced in same release
- [x] Rollback: revert Portal hooks/pages; indexes can remain

---

## Approach

### A. Query layer

1. Extend list query with `sortField` (default `updatedAt`).
2. Build constraints: `status == ready`, optional `categoryId`, optional single `tags` array-contains, `orderBy(sortField)`, `orderBy(__name__)`, cursor `startAfter`, `limit(pageSize+1)`.
3. Map cursor from the active sort field’s millis (+ designId).
4. For `new` discover: `sortField=createdAt` + optional client filter last 7 days on page (or `where createdAt >= cutoff` if index allows).
5. For `popular` / `recent`: `requestCount` / `lastRequestedAt`.

### B. `useCatalogDesigns` → paged

Mirror Studio `useDesigns`:

- State: `designs`, `hasMore`, `nextCursor`, `isLoading`, `isLoadingMore`, `error`
- Reset and refetch when serialized filter key changes (category, primaryTag, sort/discover)
- `loadMoreDesigns()` appends
- Export filtered view helpers that operate on **accumulated** designs

### C. Library UI

- Wire filters into query key
- Render Load more when `hasMore`
- Search hint when `search.trim() && hasMore`
- Multi-tag: primary tag in query; rest client-side

### D. Home bundle

- `catalogService.listHomeDiscoveryPool()` (or hook `useCatalogHomeDesigns`) fetching bounded sorted pages, merge by id
- Existing rail memos unchanged in spirit

### E. Indexes

Add designs indexes (status + sortField + __name__), plus categoryId/tags variants for filtered library sorts used in product paths. Document human deploy for non-emulator.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Catalog search / tag helpers | `npx tsx --test apps/portal/features/catalog/utils/catalogSearch.test.ts` | yes |
| Discovery ranking (unchanged contract) | shared package test if present | yes if touched |
| Unit: page builder / query key if extracted | tsx --test | yes if added |

### Manual

| Check | Required |
|-------|----------|
| Library: first paint shows one page; Load more appends | yes |
| Category + Halftone filters still work | yes |
| Search finds within loaded; Load more expands | yes |
| Home rails populate without full-catalog wait | yes |
| Discover View all / mode URLs still work | yes |

---

## Human Checkpoints Anticipated

- Manual UX PASS on Portal catalog home + library
- Firestore index build in Firebase Console if indexes not auto-ready on target project (dev)

## Risks

| Risk | Mitigation |
|------|------------|
| Multi-tag AND sparse across pages | Primary tag server-side; Load more; document limitation |
| Search misses unloaded designs | Explicit hint + Load more |
| Missing composite index errors | Ship indexes in repo; verify before signoff |
| Home category rails less “globally popular” | Bounded popular pool; note Phase 10 / follow-up |
| Category counts removed | Accept; list all active categories |

## Rollback

Revert Portal catalog hooks/pages to `listAllReadyDesigns`; leave indexes.

## Owner follow-up (2026-07-14)

- Header count must show **exact** matching totals (not `40+`).
- Search and filters must cover the **entire** ready catalog (or entire server-filtered subset), not only the visible page.

**Implementation:** first page paints quickly; remaining matching docs hydrate in the background; search/tags run on the full hydrated set; Load more is client-side windowing (40). Count uses `getCountFromServer` while browsing, then filtered length after hydrate when search/multi-tag need it.
