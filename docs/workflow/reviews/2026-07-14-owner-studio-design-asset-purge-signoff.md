# Signoff: Owner Studio archive-first design asset purge

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Goal | owner-studio-design-asset-purge |
| Plan | docs/workflow/plans/2026-07-14-owner-studio-design-asset-purge-plan.md |
| Review | docs/workflow/reviews/2026-07-14-owner-studio-design-asset-purge-review.md |
| Test report | docs/workflow/reviews/2026-07-14-owner-studio-design-asset-purge-test-report.md |
| Final status | **approved** |

---

## Summary

Owner can delete large design images only after soft archive, one-by-one or bulk from the Archived library. Callable `purgeArchivedDesignAssets` removes originals + previews, keeps the thumbnail and Firestore design metadata for history, and hides purged designs from Archived browse. ADR-FP-084 (amended with ADR-FP-086 retention context).

---

## Changes Delivered

### Behavior
- Archive-first gate; owner-only single + bulk Delete images
- Bulk typed confirmation `DELETE IMAGES`; max 25 ids
- Active show-queue warn + confirm
- Restore blocked after purge; gang sheet blocks purged originals
- Firestore rules lock purge fields to Admin SDK
- Purged designs excluded from Archived browse; metadata retained for request/queue reference

### Documentation
- ADR-FP-084, DATA_MODEL, SECURITY, BACKEND; related ADR-FP-086 queued follow-ups

---

## Tests

### Automated
| Check | Result |
|-------|--------|
| Shared purge validation unit tests | pass |
| Functions build | pass |
| ESLint (touched Studio files) | pass |

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Archive → Delete images (single/bulk); restore blocked; helper cannot purge | **PASS** | owner (2026-07-14) |

### Deploy (dev)
- `purgeArchivedDesignAssets` + firestore rules → `fresh-prints-dev` (owner)

### Human approvals
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev only |
| Destructive Storage delete | obtained | 2026-07-14 | Manual PASS on real archive deletes |
| Design / UX | obtained | 2026-07-14 | Footer layout; purged not listed on Archived |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Irreversible Storage deletes | high | Archive-first; owner-only; keep thumbnail |
| Full hard-delete / tombstone | n/a | Deferred |
| ADR-FP-086 auto-archive / customer-upload purge | medium | Queued separate phases |

---

## Deferred Items (Roadmap)
- 7-day auto-archive for rejected designs (ADR-FP-086)
- Customer-upload full-size purge after show/idle
- Donation Storage cleanup
- Portal reusable vs past-uploads UI
- Full Firestore design hard-delete

---

## Open Blockers
- [x] None

---

## Verdict

**approved** — owner manual PASS after Function/rules deploy.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] Handoff package — N/A (absent)

**Recommended next action for user:** Pick next goal (e.g. ADR-FP-086 follow-ups, account linking, or production Portal).
