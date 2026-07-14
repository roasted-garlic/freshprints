# Plan: Portal catalog image load caching (fresh membership)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-catalog-image-load-caching-review.md |

---

## Goal

Speed up Portal catalog thumbnail/preview loading via smarter **download-URL caching and prefetch**, without preventing customers from seeing a **fresh library membership** whenever designs were added, archived, or removed since their last visit. Cache must not freeze a stale set of designs across visits.

## Background

Roadmap fast-follow after Portal favorites. Today Portal already has an in-memory path → `getDownloadURL` cache (`catalogStorageService`) plus prefetch on home/library. There is no service worker, IndexedDB blob cache, or Next.js `<Image>` optimizer. Catalog membership is Firestore `status == "ready"`.

Owner requirement: caching must not impede catalog updates — each visit should reflect adds/removes.

**Separate goal (not this phase):** Owner-only Studio purge of design Storage files while keeping print-request history — see `docs/workflow/plans/2026-07-14-owner-studio-design-asset-purge-plan.md`.

## Scope

### In Scope

1. Harden Portal `catalogStorageService` URL cache:
   - Version cache keys with design `updatedAtMs` (or equivalent) when resolving thumbs/previews so replaced bytes at the same Storage path do not stick forever in-session
   - Do **not** permanently cache `null` failures (retry later)
   - Expose `clearCache` / `pruneToPaths` for catalog remount
2. On catalog home + library mount: always re-fetch ready designs from Firestore (already true); prune URL cache entries not in the current ready path set after load
3. Optional light persistence: **sessionStorage** only for path+version → download URL (same browser tab session), never IndexedDB/SW blob storage of images, never persist the catalog design list across visits
4. Keep / slightly improve prefetch of visible + near-visible thumbs without blocking UI
5. Unit tests for cache key / prune / null-retry behavior
6. Docs note in ARCHITECTURE or TESTING if behavior is user-visible

### Out of Scope

- Owner design delete / Storage purge (separate plan)
- Studio derivative URL cache changes (unless a tiny shared helper is obviously reusable — prefer Portal-only)
- Service worker / offline PWA image cache
- Changing Firebase Storage Cache-Control headers
- Next.js `next/image` migration
- Design `favoriteCount` or popularity caches

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/services/catalogStorageService.ts` (+ tests)
- `apps/portal/features/catalog/hooks/useCatalogDerivativeUrl.ts`
- `apps/portal/features/catalog/components/CatalogThumbnailPanel.tsx` (pass version if needed)
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`, `CatalogHomePageContent.tsx` (prune after load)
- Docs: brief ARCHITECTURE / ROADMAP note

### Architecture Impact

- [x] Details: Presentation/services only; no new backend. Cache remains client-side URL map, not catalog source of truth.

### Security Impact

- [x] None material — still uses existing Storage rules + `getDownloadURL`. No new public endpoints.

### Data Model Impact

- [x] None — uses existing `updatedAt` / `updatedAtMs` on designs for cache versioning.

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Faster thumb paint; membership still matches Firestore. Manual smoke recommended.

### Migration Impact

- [x] None

---

## Approach

### Freshness rules (non-negotiable)

| Concern | Rule |
|---------|------|
| Which designs appear | Always from live Firestore ready query on visit / remount — **never** restore a saved catalog list from disk |
| Removed / archived | Disappear when Firestore no longer returns them; prune their URL cache entries after load |
| Added designs | Appear after Firestore load; cache miss → fetch URL |
| Same path, new file bytes | Cache key includes `updatedAtMs` (and path) so a new version misses and re-resolves |
| Across browser visits | No persistent image blob cache; optional sessionStorage URL map dies with the tab |

### Implementation steps

1. Change cache map key from `path` alone to `path@version` (`updatedAtMs` or `0` if missing).
2. Update `getThumbnailUrl` / hook / panel to pass `updatedAtMs` from `CatalogDesign`.
3. Stop treating failed lookups as permanent `null` in `resolvedUrlCache` (or TTL / delete on null).
4. After library/home designs settle, call `pruneToPaths(currentPaths)` (keep only keys whose path is still needed).
5. Optional: hydrate/persist URL map in `sessionStorage` keyed by path@version — clear on full document load is automatic for new tabs; do **not** store design ids list.
6. Keep prefetch; ensure it uses versioned keys.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Unit tests: versioned key, prune, null not sticky | yes |
| Portal typecheck / lint touched files | yes |

### Manual

| Check | Required |
|-------|----------|
| Library load feels same or faster; thumbs appear | yes |
| Soft-archive a design in Studio → Portal refresh/visit → gone from library | yes |
| Add/approve new ready design → appears on Portal visit | yes |
| Hard reload does not resurrect archived designs from any cache | yes |

---

## Human Checkpoints Anticipated

- Manual smoke PASS on Portal catalog home + library

---

## Risks

| Risk | Mitigation |
|------|------------|
| sessionStorage grows | Cap entries; prune; path@version only |
| Missing `updatedAtMs` on legacy docs | Version `0`; still path-keyed; acceptable |
| Over-caching nulls hides restored files | Do not stick null |

## Rollback

Revert Portal cache service/hook changes; behavior returns to current memory cache.

## Open Questions

- None blocking. Owner delete is a **separate** managed phase.
