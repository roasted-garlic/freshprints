# Signoff: Show Queue Past-Show Failsafe and Owner Override

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Signoff by | Managing Agent |
| Plan | `docs/workflow/plans/2026-08-27-show-queue-past-show-failsafe-and-owner-override-plan.md` |
| Review | `docs/workflow/reviews/2026-08-27-show-queue-past-show-failsafe-and-owner-override-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-27-show-queue-past-show-failsafe-and-owner-override-implementation-review.md` |
| DEV deploy | `docs/workflow/reviews/2026-08-27-show-queue-past-show-failsafe-dev-deploy.md` |
| Final status | **approved_with_notes** |

---

## Summary

Delivered Show Queue **Needs Attention** remediation (preview/apply callables, staff actions, owner override v1, ADR-FP-149). DEV Functions deploy completed. Owner DEV QA **PASS** on recovery flows, tab navigation, and related Portal loading polish validated in the same session.

---

## Changes Delivered

### Behavior (planned)

- Needs Attention tab and predicates for unresolved past Whatnot shows
- Staff: Close Empty, Mark Fulfilled, Did Not Print / Release
- Owner override picker including Force Completed (audited)
- ADR-FP-071 guard on release paths; ADR-FP-139 auto-finish preserved
- Recovery dialogs with server preview + client fallback; widened modals

### Behavior (session corrective — owner PASS)

- **Studio Show Queue / Internal Sheets tab navigation** — URL-driven list tabs (`?tab=`), single rail pane; fixes flicker and empty Past tab
- **Portal Discover show rails** — shared `listPublicShows` cache; single load for Next Show + This Week rails
- **Portal Shows calendar** — benefits from same public-shows read cache
- **Portal Add to Show modal** — allocatable-shows cache, prefetch on print request detail, calendar visible before allocation limits finish loading

### Documentation

- ADR-FP-149, `DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md` updates (implementation phase)

---

## Tests

### Automated

| Command / suite | Result |
|-----------------|--------|
| Shared `showProductionRecovery` + schedule grouping tests | pass |
| Functions `showProductionRecovery.contract.test` + build | pass |
| Studio recovery contract tests | pass |
| `upcomingShowRoutes.test.ts`, `showQueueStaffGangSheetUi.contract.test.ts` | pass |
| Portal `portalPublicShowsReadCache`, `portalShowDiscoveryContent`, `portalAllocatableShowsReadCache` | pass |
| `PortalQueueToShowModal.capacityFreshness.test.ts` | pass |
| Full Studio `tsc` | pre-existing unrelated failures (documented in implementation review) |

### Manual (owner DEV QA)

| Area | Result | Notes |
|------|--------|-------|
| Needs Attention + recovery actions (DEV) | **PASS** | After recovery callables deploy |
| Show Queue / Internal Sheets tabs | **PASS** | No flicker; empty Past tab sticks |
| Portal Discover rails | **PASS** | Faster; shared show list |
| Portal Shows calendar | **PASS** | Faster on repeat navigation |
| Portal Add to Show calendar modal | **PASS** | Calendar appears sooner; prefetch + split loading |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV Functions deploy (`previewShowProductionRecovery`, `applyShowProductionRecovery`) | obtained | 2026-08-28 | `fresh-prints-dev` only |
| Owner DEV QA | **PASS** | 2026-08-28 | User confirmation in session |
| Production deploy | not required / not performed | | |
| Studio publish | not authorized | | |
| Bulk legacy APPLY | not performed | | Per plan |

---

## Risks & Known Issues

- **Production** recovery callables not deployed; production Studio still needs deploy before live remediation.
- **Portal first-load** `listPortalPublicShows` / `listPortalAllocatableShows` remain heavy on cold callable + backend queries; client caches improve repeat visits only.
- **Add to Show** backend still scans all customer allocations; follow-up optimization possible.
- Studio full typecheck debt unchanged.

---

## Follow-ups (deferred)

- Production deploy of recovery callables + Studio release (human-approved window)
- Optional: batch/lighter Portal allocatable-shows API
- Optional: unify or slim `listPortalPublicShows` backend work

---

| Signoff | `docs/workflow/reviews/2026-08-28-show-queue-past-show-failsafe-and-owner-override-signoff.md` |

### Workflow complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

## Final Status

**approved_with_notes** — Planned failsafe scope complete and owner-validated on DEV. Session Portal/Studio UX fixes included; production promotion remains a separate gated step.
