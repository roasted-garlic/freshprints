# Plan: Portal design likes / favorites

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-design-likes-favorites-review.md |

---

## Goal

Let Portal customers **like/unlike** catalog designs and browse a personal **Liked** list. Persist likes per customer. Studio unchanged. Do **not** add design-level `favoriteCount` (ADR-FP-070).

## Background

Favorites are documented as Portal backlog (`ARCHITECTURE.md`, DATA_MODEL future list). Owner asked to start this after catalog pagination. Discovery ADR deferred `favoriteCount` on designs.

## Scope

### In Scope

1. **Data:** `customers/{customerId}/favorites/{designId}` docs  
   - Fields: `designId`, `customerId`, `createdAt`, `createdBy` (uid)  
   - Doc id = `designId` (idempotent like/unlike)
2. **Security rules:** customer read/create/delete own favorites only (via `customers/{id}.userId == auth.uid`); staff optional read for support; no client update of arbitrary fields beyond create/delete
3. **Portal service + hook/context:** list favorite ids, toggle like, subscribe or one-shot load + optimistic UI
4. **UI:** heart control on `CatalogSelectionCard` (+ details modal); Liked page `/liked`; nav item **Liked**
5. **Liked page:** show liked designs that are still `ready`; unavailable state for missing/archived
6. **Docs:** DATA_MODEL, SECURITY (rules note), ARCHITECTURE (Favorites out of backlog), DECISIONS ADR, ROADMAP at signoff
7. **Tests:** unit helpers; rules test if project has pattern; manual checkpoint

### Out of Scope

- Design `favoriteCount` / popularity from likes
- Studio UI for favorites
- Guest likes (no Auth customer)
- Shared public collections / social
- Push notifications
- Discover “Liked” rail (can follow; Liked page is enough for v1)

---

## Affected Areas

### Files / Modules (expected)

- `firestore.rules` (+ `firestore.rules.test` if present)
- `docs/architecture/DATA_MODEL.md`, `SECURITY.md`, `ARCHITECTURE.md`, `DECISIONS.md`
- `apps/portal/features/favorites/**` (new feature folder: types, service, context/hook, page components)
- `apps/portal/app/(app)/liked/page.tsx`
- `apps/portal/features/navigation/**` (nav item + icon)
- `apps/portal/features/catalog/components/CatalogSelectionCard.tsx`, details modal
- `apps/portal/styles/catalog.css` (heart control)
- `apps/portal/app/providers.tsx` or app layout (FavoritesProvider inside Auth)

### Architecture Impact

- [x] Details: New Portal feature module; customer subcollection; no Studio.

### Security Impact

- [x] Details: New rules for favorites subcollection; least privilege; customer-only write.

### Data Model Impact

- [x] Details: New subcollection documented; no migration of existing data.

### Backend Impact

- [x] None for Cloud Functions (client Firestore writes under rules). No callables required for v1.

### UI / UX Impact

- [x] Details: Heart on cards/modal; Liked nav + page. Manual visual PASS.

### Migration Impact

- [x] None (additive). Rollback: hide UI + leave empty collection / revert rules.

---

## Approach

### Data & rules

```
customers/{customerId}/favorites/{designId}
  designId: string
  customerId: string
  createdAt: timestamp
  createdBy: string  // auth uid
```

Rules helper: `customerOwnsCustomerDoc(customerId)` → `get(.../customers/$(customerId)).data.userId == request.auth.uid`.

Allow: `isCustomer() && customerOwnsCustomerDoc(customerId)` for read/list/create/delete.  
Create validates designId == doc id, customerId match, createdBy == auth.uid.  
Deny update (delete + recreate only).

### Client

- `favoriteService`: `listFavoriteIds`, `addFavorite`, `removeFavorite`, optional `listenFavoriteIds`
- `FavoritesProvider`: load when `customer` ready; `isLiked(designId)`, `toggleFavorite(design)`
- Toggle stops event propagation on card so it doesn’t open details

### UI

- Heart top-left on image wrap (remove btn stays top-right when selected)
- `/liked` page: AuthGate shell; grid reuse `CatalogSelectionCard` or simpler liked cards with Add + Unlike
- Nav: Heart/bookmark icon between Library and Upload (or after Library)

### Unavailable likes

- For each favorite id, resolve ready catalog design (batch get or filter known designs). Missing → “No longer available” card with Unlike only.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Favorite helper / id mapping unit tests | yes |
| Firestore rules tests if harness exists | yes if present |
| Typecheck / lint touched Portal files | yes |

### Manual

| Check | Required |
|-------|----------|
| Like/unlike on library + home cards | yes |
| Liked page lists likes; unlike removes | yes |
| Archived/unavailable handling | yes if test data |
| Guest/unauth cannot access (AuthGate) | yes |
| Studio unchanged | yes |

---

## Human Checkpoints Anticipated

- Manual UI PASS
- Rules deploy to **dev** before real device test against cloud (emulator may suffice locally)

## Risks

| Risk | Mitigation |
|------|------------|
| Rules not deployed → client permission errors | Document deploy; friendly error |
| Large favorite lists | Cap soft warning later; v1 unbounded but rare |
| Click heart opens details | `stopPropagation` |

## Rollback

Revert Portal feature + rules; docs note.

## Open Questions

- None blocking. Label: **Liked** (nav) vs Favorites — use **Liked** in UI, `favorites` in data/docs.
