# Plan: Portal home “Most Liked” carousel

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-home-most-liked-carousel-review.md |

---

## Goal

Add a Discover home carousel for **most favorited (liked) designs**, separate from **Popular**. Popular stays print-request based; Most Liked ranks by how many customers favorited the design.

## Background — how Popular works today

| Rail | Sort key | Meaning |
|------|----------|---------|
| **New This Week** | `createdAt` (last 7 days) | Newest ready designs |
| **Popular** | `requestCount` descending | Lifetime times a design was added to a print request (catalog items; Cloud Function `onPrintRequestItemCreated` increments) |
| **Recently Requested** | `lastRequestedAt` | Most recently requested designs |

**Popular is not likes.** It is print-request demand.

Favorites live at `customers/{customerId}/favorites/{designId}` with **no** design-level counter today (ADR-FP-082 deferred `favoriteCount`). Customers cannot query other users’ favorites, so a Most Liked rail needs a **readable aggregate**.

## Scope

### In Scope

1. Amend ADR-FP-082 / add ADR note: allow `favoriteCount` on `designs` for ranking only (not a security boundary)
2. Maintain `favoriteCount` via Cloud Functions on favorite create/delete (Admin SDK increment/decrement, floor at 0)
3. Portal Discover: new rail **Most Liked** (label TBD with owner) using `favoriteCount` ranking among ready designs (same home pool + rail limit 25 as other carousels)
4. Optional library filter/link `discover=mostLiked` if modes are extended cleanly
5. Unit tests for ranking; Functions tests for increment/decrement helpers
6. Docs: DATA_MODEL, DECISIONS, ARCHITECTURE discovery note
7. One-time backfill script or callable (owner/admin, dev) to recount favorites → `favoriteCount` for existing data

### Out of Scope

- Changing Popular / requestCount semantics
- Studio Most Liked UI
- Personal “your likes” rail (that’s My Favorites)
- Owner asset purge (queued separately)

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/` — favorite count triggers (or extend existing patterns)
- `packages/shared/src/utils/catalogDiscoveryRanking.ts` (+ tests)
- Portal home `CatalogHomePageContent.tsx`, discovery types/hooks
- `firestore.indexes.json` if sorting by `status + favoriteCount`
- Docs: DECISIONS, DATA_MODEL, ROADMAP

### Architecture Impact

- [x] Details: Counter denormalized on design; Functions own writes; Portal ranks client-side from ready pool (same pattern as Popular)

### Security Impact

- [x] Details: Customers must **not** be able to arbitrary-write `favoriteCount`. Increment only via Admin SDK in Functions. Firestore rules keep customer design updates restricted (or explicitly deny client favoriteCount changes).

### Data Model Impact

- [x] Details: `designs.favoriteCount: number` (default 0). Migration: backfill + new likes keep in sync.

### Backend Impact

- [x] Details: New Firestore triggers on `customers/{customerId}/favorites/{designId}` create/delete.

### UI / UX Impact

- [x] Details: New carousel on Portal home between/near Popular. Manual PASS.

### Migration Impact

- [x] Forward: deploy Functions; run backfill on **dev**; indexes if needed.
- [x] Rollback: hide rail; leave counter field unused.

---

## Approach

1. Add `favoriteCount` field (number ≥ 0) on design documents.
2. Triggers:
   - onCreate favorite → `FieldValue.increment(1)` on `designs/{designId}`
   - onDelete favorite → `FieldValue.increment(-1)` with guard so count never goes below 0
3. Extend discovery modes: `"mostLiked"` → rank by `favoriteCount` desc (tie-break id).
4. Home rails include Most Liked when any design has `favoriteCount > 0` (or always show empty-skip like others).
5. Backfill: Admin/owner script scans favorites collection group and sets counts (dev first).
6. Document: Popular = requests; Most Liked = favorites.

### Rail placement (proposed)

After **Popular**, before **Recently Requested** (or after New). Owner can adjust in review.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Ranking unit tests for mostLiked | yes |
| Functions unit/helper tests for clamp/increment | yes |
| Portal + functions typecheck/build | yes |

### Manual

| Check | Required |
|-------|----------|
| Favorite a design → count increases; home rail updates after refresh | yes |
| Unfavorite / auto-prune → count decreases | yes |
| Popular rail unchanged in meaning | yes |
| Archive design disappears from Most Liked (ready-only pool) | yes |

---

## Human Checkpoints Anticipated

1. **Approve amending ADR-FP-082** to allow `favoriteCount` maintained by Functions (required to build Most Liked securely).
2. Confirm UI label: **Most Liked** vs **Most Favorited**.
3. Manual home carousel PASS; Functions deploy to **dev**.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Counter drift | Backfill + triggers; optional periodic reconcile later |
| ADR conflict | Explicit amendment in DECISIONS |
| Empty rail early | Hide when all counts are 0 (same as empty Popular) |

## Rollback

Remove rail + stop triggers; counters can remain inert.

## Open Questions

1. Label: **Most Liked** or **Most Favorited**?
2. Confirm OK to add `favoriteCount` via Cloud Functions (amend ADR-FP-082)?
