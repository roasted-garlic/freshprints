# Plan: Catalog display background + ready-approval ordering

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Goal | `catalog-display-background-and-ready-ordering` |
| Branch | `fix/post-launch-catalog-and-processing-stability` @ `120337a` |
| PR | #40 open/unmerged |
| Deploy/migration | **None** |

## 1. Exact paths

| Area | Path |
|---|---|
| Studio Details modal | `apps/studio/.../designs/components/DesignDetailsModal.tsx` |
| Thumbnail / lightbox | `DesignThumbnailPanel.tsx`, `DesignPreviewLightbox.tsx` (already accept `artworkBackgroundHex`) |
| Card (reference) | `DesignCard.tsx` (already passes hex) |
| Shared mat helper | `packages/shared/.../artworkBackground.constants.ts` — `resolveArtworkBackgroundHex` |
| Studio ready order | `designLibraryFilters.ts` (`readyAt`), `designService.ts` (orderBy + completeness guard) |
| Portal list | `apps/portal/.../catalogService.ts`, `useCatalogDesigns.ts`, `catalog.types.ts` |
| Generated search | `portalCatalogAssetService.ts` `listMatchingDesigns` |

## 2. Artwork helper reuse

Reuse `resolveArtworkBackgroundHex` (already inside thumbnail/lightbox). Pass `design.artworkBackgroundHex` into Details thumbnail + lightbox — same as `DesignCard`. No new field, PNG, Storage, Firestore, or callable.

## 3. Studio ordering

**Already correct:** default `DESIGN_LIBRARY_DEFAULT_SORT_FIELD = "readyAt"`; server `orderBy(readyAt desc, __name__ desc)`; completeness + index fallbacks. **Do not rewrite.** Add/confirm focused tests only.

## 4. Portal Library paths

| Path | Source | Ordering action |
|---|---|---|
| Default browse | Firestore `listReadyDesignsPageWithSortFallback` | Default `sortField` → **`readyAt`** (indexes already in `firestore.indexes.json`) |
| Category / single-tag | Same | Same `readyAt` orderBy |
| Discover `new` | Firestore + `createdAfterMs` | Keep **`createdAt`** (time-window filter) |
| Discover popular / liked / recent | Metric fields | Unchanged |
| Text search / multi-tag | Generated `listMatchingDesigns` | Cards have `readyAtMs`; **ID lists still publisher `createdAt` order** — **do not** page-local re-sort; **no publisher change this task** → document follow-up |
| Pagination cursor | `getDesignSortValue` | Align with `readyAt` field when sorting by `readyAt` |
| Legacy missing `readyAt` | Completeness guard (mirror Studio) | Fall back to `createdAt` when count > ordered page |

## 5. Implementation steps

1. Wire `artworkBackgroundHex={design.artworkBackgroundHex}` on Details thumbnail + lightbox.
2. Add `readyAt` to `CatalogDesignSortField`; default browse → `readyAt`; `getDesignSortValue('readyAt')` = `readyAtMs ?? createdAtMs`.
3. Completeness + index fallback for Portal `readyAt` (like Studio).
4. Keep discover `new` / metrics / `createdAfterMs` on `createdAt`.
5. Focused tests; no Functions/Rules/index deploy; no Amendment 9 / Phase 1B.

## 6. Focused tests

- Studio Details wiring (thumbnail + lightbox props; download path untouched).
- Studio readyAt order / completeness (existing suites + minimal assert).
- Portal default/category/tag `orderBy readyAt`; cursor; fallback; re-approve sort semantics via `getDesignSortValue`.

## 7. Deploy / migration

**Not required.** No Rules, indexes deploy, Functions, backfill, or production action.
