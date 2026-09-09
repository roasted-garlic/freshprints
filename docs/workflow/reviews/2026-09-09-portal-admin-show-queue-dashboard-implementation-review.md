# Implementation Review: Portal admin Show Queue dashboard amendment

| Field | Value |
|---|---|
| Date | 2026-09-09 |
| Goal | `portal-admin-daily-show-queue` |
| Plan | `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md` (Amendment) |
| Formal Review Amendment | `docs/workflow/reviews/2026-09-09-portal-admin-show-queue-dashboard-amendment-review.md` |
| Verdict | Implementation complete locally — **STOP before DEV Function deploy** |
| DEV deployment performed | **NO** |
| Production touched | **NO** |
| Commit/push | **NO** |

## Summary

The approved upcoming-show dashboard amendment is implemented locally: admin-composed sidebar,
default next-upcoming selection, Design/Print/PR qty + capacity, PR summaries without inline items,
lazy View Designs modal with 15-minute signed derivative URLs, Option B callables, ADR-FP-187
amended, and focused tests green. A follow-up responsive UI refinement is also local-only: the
mobile drawer is hamburger-controlled, desktop navigation stays expanded, the queue title uses a
compact fluid treatment that keeps the full title readable, the modal is centered at every
breakpoint, and design metadata omits image status. No Functions/Portal/App Hosting deploy, Rules,
indexes, commit, or push occurred.

## Conformance checklist

| # | Item | Result |
|---|---|---|
| 1 | Amendment conformance | YES — Option B dashboard + designs; isolated admin shell |
| 2 | Sidebar implementation | YES — `PortalAdminShowSidebar` |
| 3 | Sidebar reuse strategy | CSS/token reuse of `.portal-sidebar*`; no customer `PortalSidebar` mount |
| 4 | Mobile behavior | Off-canvas drawer, action-cluster hamburger, close-on-select, large taps, themed scrollbar |
| 5 | Upcoming membership | Whatnot + DEV fixture; Upcoming schedule tab; exclude Past/staff |
| 6 | Default selection | First sorted upcoming show |
| 7 | Show ordering | `scheduledStartAt` ASC; missing schedule last; id tie-break |
| 8 | Design Qty | Distinct non-canceled design/upload identities |
| 9 | Print Qty | Non-canceled allocated sum |
| 10 | PR Qty | Distinct PRs with ≥1 non-canceled allocation |
| 11 | Capacity | `assessShowCapacity` + `getShowCapacityPercent`; bar clamps; % truthful |
| 12 | PR summary fields | Name, kind, identity, design/print qty, status summary, View Designs |
| 13 | Modal implementation | `PortalAdminViewDesignsModal` read-only |
| 14 | Catalog thumbnail strategy | Server `thumbnailPath`/`previewPath` → signed URL |
| 15 | Customer-upload preview strategy | Server thumb/preview after linkage → signed URL |
| 16 | Signed URL lifetime | **15 minutes** (`PORTAL_ADMIN_SHOW_QUEUE_IMAGE_TTL_MS`) |
| 17 | Server artwork authorization | Owner/admin + upcoming show + allocation linkage |
| 18 | Identifier strategy | Minimal `showId` / `printRequestId`; no customer/design/upload/allocation ids in DTOs |
| 19 | Dashboard Function export | **`getPortalAdminUpcomingShowQueueDashboard`** |
| 20 | Modal Function export | **`getPortalAdminShowQueueRequestDesigns`** |
| 21 | Initial read shape | Profile → all upcomingShows → selected allocations → batched printRequests |
| 22 | Modal read shape | Profile → show → show allocations filtered to PR → design/upload docs → signed URLs |
| 23 | Refresh behavior | Reloads list + selected (preserves valid selection via `showId`) |
| 24 | Stale selection handling | Invalid show falls back to first; modal cleared on `selectedShowId` change |
| 25 | Loading corrective preserved | YES — `armPortalAdminShowQueueMount` + coalesced refresh |
| 32 | Rules changed | **NO** |
| 33 | Storage Rules changed | **NO** |
| 34 | Indexes changed | **NO** |
| 35 | New dependency | **NO** |
| 36 | Migration/backfill | **NO** |
| 37 | Production touched | **NO** |
| 38 | DEV deployment performed | **NO** |

## Responsive UI refinement (local only)

| Area | Result |
|---|---|
| Mobile navigation | Hamburger sits beside theme/auth actions; it toggles the off-canvas Shows drawer and scrim. |
| Desktop navigation | Sidebar is always expanded; the generic edge collapse control and persisted admin collapse state are not used. |
| Queue layout | Mobile gutters are explicit; title uses a smaller fluid treatment that shows the full copy; request actions stack for comfortable taps. |
| Design modal | Centered dialog on mobile and desktop with bounded viewport height; modal body keeps a themed scrollbar. |
| Design metadata | Status is removed; rows display origin plus `upload`/`catalog` (for example, `standard · upload`). |

## Performance corrective (local only)

| Symptom | Root cause | Corrective |
|---|---|---|
| View Designs stayed in loading while several previews were resolved | The callable processed each allocation serially: thumbnail document read, Storage existence check, then signed URL before moving to the next row. | Resolve per-allocation artwork with `Promise.all`, run Storage existence/signing together, and reuse thumbnail-path promises for duplicate design/upload IDs. |
| Switching shows felt slow and could lose a fast second selection | Every switch re-called the full dashboard callable, while the coalescing guard returned the first in-flight Promise for a different show. | Ignore stale responses, wait for the active load before starting the requested show, and cache visited show responses for instant revisits. |

The performance corrective changes `getPortalAdminShowQueueRequestDesigns` source and therefore requires
a new owner-authorized DEV Function deployment before the faster modal behavior is present in DEV.
The Portal cache/race corrective is local Portal source. No deployment was performed in this pass.

## Tests and validation

| Check | Command / scope | Result |
|---|---|---|
| Focused unit/contract | metrics, dashboard builder, auth, daily DTO retained, contracts, load lifecycle, auth bootstrap, return URL | **33/33 pass** |
| Responsive admin UI contract/lifecycle | `adminShowQueue.contract.test.ts`, `portalAdminShowQueueLoad.test.ts` | **13/13 pass** |
| Performance contracts | `getPortalAdminUpcomingShowQueueDashboard.contract.test.ts` (designs parallelism) | **3/3 pass** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** |
| Functions build | `npm --prefix functions run build` | **PASS** |
| Targeted ESLint | admin-show-queue + admin app + new Function files | **PASS** (exit 0) |
| Portal build | `npm run build --workspace @fresh-prints/portal` | **FAIL** — known Windows `EPERM apps/portal/.next/trace` baseline |
| `git diff --check` | | **PASS** (CRLF warnings only) |

## Exact DEV Function deployment inventory (not performed)

When authorized:

```bash
firebase deploy --only functions:getPortalAdminUpcomingShowQueueDashboard,functions:getPortalAdminShowQueueRequestDesigns --project fresh-prints-dev
```

Optional later cleanup (separate authorization): retire client/server use of
`getPortalAdminDailyShowQueue` after the dashboard callables are live.

No Rules, Storage Rules, index, Portal App Hosting, Studio, or production deploys.

## Owner DEV QA checklist (after DEV deploy)

1. Owner/admin login → `/admin/show-queue` loads with sidebar + default next show
2. Stats/capacity/PR list match Studio parity expectations for the selected show
3. Switching shows updates dashboard; mobile drawer works
4. View Designs opens, shows thumbs, closes; switching shows clears modal
5. Helper/customer/guest denied
6. Refresh settles; remount/loading regression remains fixed
7. On a phone viewport, the hamburger opens/closes the drawer, page content has side gutters, the full title remains readable at a compact size, and View Designs is centered.
8. No mutation controls; no customer shell/providers

## Rollback

Revert Portal admin feature to prior daily UI and stop calling new exports. Leave/disable new
Functions (read-only). Signed URLs expire in 15 minutes.

## Remaining risks

- Full `upcomingShows` collection read per dashboard call (Studio-parity unbounded); monitor DEV scale
- Signed URL IAM Token Creator must already exist in DEV (assisted-creation precedent)
- Legacy daily Function still exported until cleanup deploy

## Next checkpoint

`[NEEDS OWNER AUTHORIZATION: REDEPLOY PORTAL ADMIN SHOW QUEUE REQUEST DESIGNS FUNCTION PERFORMANCE CORRECTIVE]`

## Owner DEV QA / commit authorization

Owner reported **PASS** and explicitly authorized commit/push on `development`. The local source
is ready for handoff; no Function, Portal App Hosting, Studio, or production deployment was
performed. Signoff remains pending the separately gated Function redeploy.
