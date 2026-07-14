# Signoff: Portal home Most Liked carousel

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Goal | portal-home-most-liked-carousel |
| Plan | docs/workflow/plans/2026-07-14-portal-home-most-liked-carousel-plan.md |
| Review | docs/workflow/reviews/2026-07-14-portal-home-most-liked-carousel-review.md |
| Test report | docs/workflow/reviews/2026-07-14-portal-home-most-liked-carousel-test-report.md |
| Final status | **approved** |

---

## Summary

Portal Discover home has a **Most Liked** carousel ranked by `designs.favoriteCount`, kept in sync by Cloud Functions on favorite create/delete. **Popular** remains request-count based. ADR-FP-083 amends ADR-FP-082 to allow the denormalized counter for ranking only. No public like count on design details (deferred).

---

## Changes Delivered

### Behavior
- Firestore triggers `onCustomerFavoriteCreated` / `onCustomerFavoriteDeleted` adjust `favoriteCount` (floor 0)
- Portal home **Most Liked** rail + discovery ranking mode `mostLiked`
- Optional backfill script (skipped in test — empty favorites slate)
- Indexes for `favoriteCount` composites

### Documentation Updated
- ADR-FP-083, DATA_MODEL, ARCHITECTURE, SECURITY, ROADMAP

---

## Tests

### Automated
| Check | Result |
|-------|--------|
| Unit (`designFavoriteCount` + `catalogDiscoveryRanking`) | pass (12) |
| Portal typecheck | pass |
| Functions build | pass |

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Most Liked rail + like/unlike ranking; Popular unchanged | **PASS** | owner (2026-07-14) |

### Deploy (dev)
- Functions + firestore indexes → `fresh-prints-dev` (owner)
- Backfill skipped (no favorites; ADC not required)

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev only |
| Design / UX | obtained | 2026-07-14 | Label **Most Liked**; no detail like count |
| Business / policy | obtained | 2026-07-14 | favoriteCount via Functions OK |
| Manual UI | **PASS** | 2026-07-14 | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Orphan HTTPS name collision on first deploy | low | Deleted orphan; Gen2 triggers created |
| Node 20 / firebase-functions deprecation warnings | medium | Separate upgrade phase |
| Production Functions/indexes deploy | medium | Human gate when Portal goes to prod |
| Public like count on details | n/a | Deferred until likes are common |

---

## Deferred Items (Roadmap)
- Like count on design details / cards (optional later)
- Owner-only Studio design asset purge (queued)
- Firebase account linking; Phase 9; production Portal deploy

---

## Open Blockers
- [x] None

---

## Verdict

**approved** — automated checks passed; owner manual PASS on Most Liked vs Popular; dev Functions/indexes deployed.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] Handoff package — N/A (absent)

**Recommended next action for user:** Pick next goal (e.g. queued owner design asset purge, account linking, or production Portal work).
