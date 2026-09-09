## FreshForge State

| Field | Value |
|---|---|
| Status | **COMMITTED — OWNER DEV FUNCTION REDEPLOY AUTHORIZATION REQUIRED** |
| DONE | no |
| Signoff Status | not started |
| Current Mode | managed-phase |
| Parent program | `portal-admin-daily-show-queue` |
| Current Goal | `portal-admin-daily-show-queue` |
| Current Phase | Dashboard UI/performance corrective implemented + tested locally; STOP before Function redeploy |
| Plan Status | amended — `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md` |
| Review Status | approved_with_changes — dashboard amendment Formal Review |
| Implementation Status | complete locally — dashboard amendment + responsive UI/performance refinement |
| Test Status | focused 33/33; admin UI contract/lifecycle 13/13; designs performance contract 3/3; Portal typecheck PASS; Functions build PASS; targeted lint PASS; Portal build EPERM baseline FAIL |
| Human Checkpoint Required | **yes** |
| Human Checkpoint Reason | `[NEEDS OWNER AUTHORIZATION: REDEPLOY PORTAL ADMIN SHOW QUEUE DASHBOARD + REQUEST DESIGNS FUNCTIONS]` |
| Environment | Local source only; deployed Functions remain unchanged until the new owner checkpoint |
| Production | untouched |
| Commit/push | `908d9123` pushed to `origin/development` |
| Last updated | 2026-09-09 |
| Last Completed Step | Owner DEV QA **PASS** received; `908d9123` committed and pushed; Function redeploy still required |

**Decision Log:**

- 2026-09-09 — Owner asked why customer name was missing under request cards. Cause: dashboard
  returned username-only identity and did not load `customers/{id}` when snapshots lacked
  displayName. Fixed locally to use `formatCustomerIdentityLabel` (Studio pattern) and batch-load
  customer docs. Requires DEV redeploy of `getPortalAdminUpcomingShowQueueDashboard`.
- 2026-09-09 — Owner-requested View Designs polish: catalog label → "Design Library"; Uploaded for
  uploads; Studio artwork backgrounds; prefer preview derivatives for lightbox size; size-tier
  metadata; Designs/Prints pills; remove pending line. Portal + Function source updated locally.
- 2026-09-09 — Owner authorized IMPLEMENT PORTAL ADMIN SHOW QUEUE DASHBOARD AMENDMENT.
  Implemented Option B callables `getPortalAdminUpcomingShowQueueDashboard` and
  `getPortalAdminShowQueueRequestDesigns`, admin sidebar/dashboard/modal UI, metrics helpers,
  ADR-FP-187 amendment, docs updates. Focused tests 33/33; Portal typecheck and Functions build
  passed; Portal Next build reproduced Windows `.next/trace` EPERM baseline. No deploy, Rules,
  indexes, commit, or push. Implementation Review:
  `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-implementation-review.md`.
- 2026-09-09 — Owner-requested responsive UI refinement completed locally: mobile hamburger drawer,
  permanently expanded desktop sidebar, themed sidebar/modal scrollbars, mobile gutters and
  compact responsive queue title, centered design modal, and `origin · upload/catalog` metadata without
  image status. Admin UI contract/lifecycle tests 12/12; Portal typecheck and targeted lint pass;
  Portal build retains the documented Windows `.next/trace` EPERM baseline. No deploy, commit, or
  push. DEV Function authorization checkpoint unchanged.
- 2026-09-09 — Owner-requested performance corrective completed locally. The modal callable now
  resolves independent artwork previews concurrently with per-request thumbnail-path de-duplication;
  the Portal hook waits for in-flight loads, ignores stale selections, and caches visited shows.
  Admin UI contract/lifecycle tests 13/13; designs performance contract 3/3; Portal typecheck,
  Functions build, and targeted lint pass. Because Function source changed, the prior deployment
  authorization is not reused; no deploy, commit, or push.
- 2026-09-09 — Owner DEV QA reported **PASS** and explicitly authorized commit/push. Commit
  `908d9123` (`feat(portal): add admin show queue dashboard`) was pushed to
  `origin/development`; the Function redeploy checkpoint remains separate and unchanged. No
  production action.

**Allowed Actions:** Documentation amendment; await owner DEV Function redeploy authorization.

**Forbidden Actions:** Function/Portal/App Hosting/Studio/DEV/production deploy until authorized;
Rules/index/storage changes; signoff until the redeploy checkpoint is resolved.

## Next Required Step

`[NEEDS OWNER AUTHORIZATION: REDEPLOY PORTAL ADMIN SHOW QUEUE DASHBOARD + REQUEST DESIGNS FUNCTIONS]`

Exact inventory when authorized:

```bash
firebase deploy --only functions:getPortalAdminUpcomingShowQueueDashboard,functions:getPortalAdminShowQueueRequestDesigns --project fresh-prints-dev
```

No Rules, Storage Rules, index, Portal App Hosting, Studio, or production deploys in that gate.
Production remains untouched. Do not sign off this goal yet.
