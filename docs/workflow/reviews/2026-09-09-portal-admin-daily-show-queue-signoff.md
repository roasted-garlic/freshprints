# Signoff: Portal admin daily Show Queue

| Field | Value |
|-------|-------|
| Date | 2026-09-09 |
| Signoff by | Codex / FreshForge Signoff |
| Managed goal | `portal-admin-daily-show-queue` |
| Plan | `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md` |
| Reviews | `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-review.md`; `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-amendment-review.md`; `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-implementation-review.md` |
| Final status | **approved_with_notes** |

---

## Summary

Delivered and owner-QA-approved a read-only, mobile-first Portal admin Show Queue dashboard at
`/admin/show-queue`. It is isolated from the customer Portal shell, keeps production controls in
Studio, defaults to the next upcoming show, summarizes the selected show's capacity and Print
Requests, and lazy-loads authorized design previews only when staff opens **View Designs**.

The final authorized DEV deployment updated exactly the two reviewed callables:
`getPortalAdminUpcomingShowQueueDashboard` and
`getPortalAdminShowQueueRequestDesigns`. Both are ACTIVE in `fresh-prints-dev/us-central1`
and route all traffic to their latest revisions.

## Changes Delivered

### Behavior

- Active owners and admins can use the isolated Portal Show Queue dashboard; helpers, customers,
  guests, inactive users, customer providers, and mutation controls remain excluded.
- Upcoming-show selection, capacity/Design Qty/Print Qty/PR Qty metrics, request summaries,
  responsive sidebar/drawer, and bounded load/refresh lifecycle are delivered.
- The lazy designs modal uses server-authorized, short-lived derivative URLs and never exposes
  original artwork or Storage paths.
- The designs callable resolves independent artwork previews concurrently, de-duplicates
  per-request thumbnail-path work, and the Portal hook coalesces loads, ignores stale selections,
  and caches visited shows.

### Documentation and architecture

- ADR-FP-187 and the architecture, backend, data-model, security, testing, and deployment
  documentation were amended with the read-only Portal-admin boundary.
- The prior daily callable remains exported as a compatibility surface; retiring it is a
  separately authorized cleanup, not part of this signoff.

## Tests

### Automated

- Focused Portal/auth/admin tests: **33/33 PASS**.
- Responsive admin UI contract and lifecycle tests: **13/13 PASS**.
- Designs performance contract tests: **3/3 PASS**.
- Portal typecheck: **PASS**.
- Functions build: **PASS**, including the deploy predeploy build.
- Targeted ESLint: **PASS**.
- `git diff --check`: **PASS** before the approved source commit.

### Manual and deployed verification

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA for final dashboard source | PASS | Owner |
| Authorized DEV deployment allowlist | PASS — exactly 2 Functions deployed, 0 errored, 0 aborted | Owner authorization + Firebase CLI |
| Deployed function state | PASS — both targets ACTIVE in `fresh-prints-dev/us-central1` | Firebase CLI |

## Deployment record

| Function | Revision | State / traffic |
|----------|----------|-----------------|
| `getPortalAdminUpcomingShowQueueDashboard` | `getportaladminupcomingshowqueuedashboard-00003-fug` | ACTIVE / latest revision traffic |
| `getPortalAdminShowQueueRequestDesigns` | `getportaladminshowqueuerequestdesigns-00005-fad` | ACTIVE / latest revision traffic |

The source was deployed from clean `development` at `e6e08281`; the reviewed feature commit
`908d9123` is an ancestor. No Firestore Rules, Storage Rules, indexes, migrations/backfills,
Portal App Hosting, Studio publish, data, roles, secrets, or production surface was changed.

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | obtained | 2026-09-09 | PASS for the final dashboard source |
| DEV Function deployment | obtained | 2026-09-09 | Exact two-callable allowlist only |
| Production deploy | not required / not authorized | — | Production untouched |
| Rules, index, migration, or secret change | not required | — | None made |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Portal production build hits the documented Windows `.next/trace` EPERM baseline | Low | Portal typecheck, focused tests, lint, and Functions build passed; investigate separately from this goal. |
| Node.js 20 runtime deprecation warning from Firebase CLI | Medium, future | Upgrade Functions runtime in a separately planned compatibility phase before the announced 2026-10-30 decommission date. |
| Upcoming-show metadata discovery follows existing Studio's unbounded Upcoming semantics | Low | Keep the selected-show details bounded; monitor scale before considering a new read model. |

## Deferred Items

- Retire the unused `getPortalAdminDailyShowQueue` callable only under a separately reviewed
  cleanup authorization.
- Portal App Hosting / Studio publish and any production promotion remain separately gated.

## Open Blockers

- [x] None for this managed goal.

## Verdict

**approved_with_notes.** The owner accepted the final DEV dashboard source; focused automated
coverage, typecheck, Functions build, and deployment verification passed. The only recorded test
exception is the pre-existing Windows Portal build EPERM baseline, which does not affect this
Functions-only DEV deployment.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with the completed signoff.
- [x] `ROADMAP.md` updated.
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated.
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated.
- [x] Relevant handoff documentation refreshed.

**Recommended next action:** begin the already requested
`user-info-print-request-lifecycle-activity-ordering` Plan → Formal Review-only managed phase.
