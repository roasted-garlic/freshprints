# Test report: Catalog/library stable Studio-newest sort

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-catalog-stable-studio-newest-sort-plan.md |
| Status | passed_with_notes |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit | `npx tsx --test packages/shared/src/utils/catalogDiscoveryRanking.test.ts` | 0 | 11 pass / 0 fail |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| Soft-reload | Kill :3100 + `npm run dev:portal` | — | restarted for owner QA |

Skipped: lint (narrow sort change), full build, Functions (no backend deploy).

---

## Manual test checkpoint (owner)

**Feature / area:** Portal Design Library / Discover default sort  
**Why automated tests are insufficient:** Grid stability while adding to request is UX/runtime.  
**Environment:** local Portal http://localhost:3100  
**Prerequisites:** logged-in customer; designs in library

### Steps
1. Open **Browse all** (no discover filter) → **Expected:** cards ordered newest Studio add first.
2. Note first ~8 design titles/order.
3. Add 3–5 designs to a print request (spread across the visible grid) → **Expected:** card order does **not** reshuffle; qty/selected badge may update.
4. Soft refresh the library page → **Expected:** order still Studio-newest; recently requested designs do **not** jump to the top solely because they were requested.
5. Open Popular / Most Liked / Recently Requested → **Expected:** still metric-ordered.

### Pass criteria
- [x] Default library does not reshuffle on Add to Request
- [x] Soft refresh does not promote recently requested designs via `updatedAt`
- [x] Metric collections still sort by metrics

### Owner reply (closeout)

- **PASS** — 2026-07-20 — Owner: covered already (Small Managed #6). Code re-verified; see `docs/workflow/reviews/2026-07-20-design-library-newest-first-verification.md`.
