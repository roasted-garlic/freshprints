# Implementation Review: Portal admin daily Show Queue

| Field | Value |
|---|---|
| Date | 2026-09-09 |
| Managed goal | `portal-admin-daily-show-queue` |
| Plan | `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-review.md` — `approved_with_changes` |
| ADR | `docs/project/DECISIONS.md` — ADR-FP-187 |
| Implementation status | Corrective complete locally; existing DEV Function remains deployed; awaiting Owner DEV re-QA |
| Production | Not touched |

## Conformance

1. **Plan conformance:** Implemented the selected callable boundary, isolated Portal admin route and
   shell, `America/Chicago` operational-day helper, minimal DTO, bounded reads, privacy contract,
   read-only mobile UI, and required focused tests. No scope expansion occurred.
2. **Formal Review conformance:** Preserved two applications, customer-shell isolation, helper and
   customer denial, unchanged Rules, no public DTO reuse, actual Studio queue membership, and no
   Portal production controls.
3. **Timezone owner decision:** `America/Chicago` is recorded as the canonical IANA timezone. The
   server computes `[dayStart, nextDayStart)` with DST-safe calendar boundaries.
4. **ADR:** ADR-FP-187 in `docs/project/DECISIONS.md`.

## Source implementation

5. **Portal auth:** `PortalAuthBootstrapStatus` now includes `portal-admin`; active owner/admin
   sessions stop after authoritative `users/{uid}` resolution and do not load/subscribe a customer
   document. Profile subscriptions invalidate admin access on role or active-state changes.
6. **Admin route/shell:** `/admin/show-queue` is under `(admin)` with `PortalAdminAuthGate` and
   `PortalAdminShell`; the normal `PortalAppShell` and customer providers are not mounted.
7. **Shared DTO:** `packages/shared/src/types/portal/getPortalAdminDailyShowQueue.types.ts`
   contains operational-day metadata, totals, show lifecycle/totals, request groups, and item rows;
   identifiers and private metadata are excluded.
8. **Function:** `functions/src/getPortalAdminDailyShowQueue.ts` exports
   `getPortalAdminDailyShowQueue` and composes `upcomingShows`, chunked `showAllocations`, and
   batched `printRequests` reads through the Admin SDK.
9. **Authorization:** Firebase auth is required; the callable fresh-loads the caller profile and
   allows only active owner/admin. Helper, customer, anonymous, and inactive callers are denied.
   Input must be exactly `{}`.
10. **Privacy:** DTO contains no show/allocation/request/customer/design/upload IDs, lineage IDs,
    email, filename, artwork, Storage path/URL, notes, payment, auth metadata, or arbitrary docs.
    Upload-backed rows display `Customer upload`; customer identity is one derived label only.
11. **Queue membership:** Timestamp range is the `America/Chicago` operational day; `whatnot` is
    included, `dev_fixture` only on `fresh-prints-dev`, and `staff_gang_sheet` is excluded. Existing
    lifecycle/archive behavior is surfaced without changing Studio semantics.
12. **Multiple shows:** Same-day shows are independently rendered and schedule-sorted with a stable
    server-side document-ID tiebreaker.
13. **Canceled/split/requeue/move:** All allocation rows remain in the DTO; canceled rows are
    visually distinct history and excluded from active-work totals; split rows remain separate;
    origin is reduced to standard/requeued/moved.
14. **Missing request:** Allocation history remains; request snapshot name is used, kind is unknown,
    and customer identity is omitted.
15. **Read/query shape:** One profile read, one day-bounded show query, `in` allocation chunks of
    30, and batched request `getAll` reads. No customer/design/upload/item hydration, listener,
    polling, persistent cache, or overlapping refresh requests.
16. **UI:** Mobile-first cards show operational date/timezone, generated time, statuses, quantities,
    customer/internal/unknown labels, dimensions, size, canceled history, loading/error/retry,
    no-show/no-current-allocation states, and manual Refresh. No mutation or production controls.

## Regression and validation evidence

17. **Customer Portal regression evidence:** Existing auth bootstrap/auth utility suites passed;
    direct customer admin access is gated without logout, and structural contracts prove the admin
    layout omits customer providers. Full browser/E2E regression was not available in repository
    tooling.
18. **Tests:**
    - `npx tsx --test $(Portal/auth/admin focused files)` — **41/41 passed**.
    - `npx tsx --test $(Functions/shared focused files)` — **13/13 passed**.
    - Coverage includes owner/admin/helper/customer/inactive authorization, malformed input, DTO
      privacy, multiple shows, DEV fixtures, staff-sheet exclusion, missing requests, canceled and
      requeued rows, and normal/spring/fall `America/Chicago` boundaries.
19. **Portal typecheck:** `npm run typecheck --workspace @fresh-prints/portal` — **PASS**.
20. **Functions build:** `npm --prefix functions run build` — **PASS**.
21. **Portal build:** `npm run build --workspace @fresh-prints/portal` — **BLOCKED by known baseline/environment issue**:
    Next.js fails with `EPERM: operation not permitted, open apps/portal/.next/trace` on Windows.
22. **Diff check:** `git diff --check` — **PASS**.

## Change inventory and release boundary

23. **Firestore Rules changed:** NO.
24. **Storage Rules changed:** NO.
25. **Indexes changed:** NO.
26. **New dependencies:** NO.
27. **Migration/backfill:** NO.
28. **Provider calls:** 0.
29. **Production touched:** NO.
30. **DEV deployment performed:** NO.
31. **Exact proposed DEV Function deployment:**
    `firebase deploy --only functions:getPortalAdminDailyShowQueue --project fresh-prints-dev`
    This command was not executed. No DEV App Hosting or Rules/index deployment is proposed.

## Owner DEV QA checklist

After the separate DEV authorization and Function deployment, owner QA should verify:

- Active owner and admin sign in directly to `/admin/show-queue` and see only the daily read-only queue.
- Helper is rejected/signs out and direct callable access is denied.
- Customer direct access shows Access Denied without logout; Discover, catalog, requests, uploads,
  account, Current Request, Assisted Creation, Add to Request, and Add to Show remain functional.
- Guest access uses `/login?returnTo=/admin/show-queue`; only owner/admin returns to the queue.
- No customer shell/nav/drawer/providers or production controls appear in the admin route.
- Multiple shows, no-show day, zero-current-allocation show, canceled history, split rows,
  requeued/moved labels, quantities, dimensions, and mobile layout render correctly.
- Role/inactive profile changes remove admin access; Refresh never overlaps requests.

## Rollback and remaining risks

The callable is read-only and has no migration. Roll back by reverting the isolated Portal auth/route
slice and the prior Portal build if needed; the unused callable may remain until a separately reviewed
cleanup. Remaining risks are the known Windows Next trace build limitation, the pre-existing Studio
comment/code discrepancy about non-archived shows (intentionally preserved), and the need for Owner
DEV re-QA after the Portal corrective.

## Owner DEV QA failure and Portal-only corrective addendum

The first Owner DEV QA result is preserved as **FAIL**. The owner reported that the authenticated
admin shell rendered at `http://localhost:3100/admin/show-queue`, but the queue remained forever in
`Refreshing…` / `Loading today’s queue…` instead of rendering data, an empty state, or a retryable
error.

The available DEV logs mechanically show authenticated callable requests for
`getPortalAdminDailyShowQueue` returning HTTP 200 in approximately 0.3–1.3 seconds. This rules out
an indefinitely pending callable, server-side query hang, missing return, or Function timeout as
the cause. The hook\'s `mountedRef` was initialized to `true` but its mount effect only set it to
`false` during cleanup. A React development remount/Strict Mode cleanup therefore left the live
instance permanently unmounted; its settled `.then`, `.catch`, and `.finally` callbacks skipped
`setData`, `setError`, and `setIsLoading(false)`.

The narrow corrective re-arms the mount guard during every effect setup and extracts the existing
load lifecycle into `portalAdminShowQueueLoad.ts`. The controller still preserves the
Component → Hook → Service → Firebase Callable architecture, invokes once per load, coalesces
duplicates, and clears state on success, empty results, and failure. No authorization model, DTO,
timezone, queue semantics, Rules, indexes, Function source, or shared source changed. No Function
redeployment is required; local Portal restart is sufficient for Owner DEV re-QA.

Corrective regression coverage: the Portal/admin/auth focused run passed **48/48**, including
mount cleanup/setup re-arming, successful data, empty data, callable rejection, refresh success,
refresh failure, and duplicate refresh coalescing. Portal typecheck and targeted ESLint passed.
The Portal production build again reproduced the known Windows
`EPERM: operation not permitted, open apps/portal/.next/trace` baseline failure.

## Corrective checkpoint

- Owner DEV QA result: **FAIL** (preserved; not overwritten).
- Portal source changed: YES — lifecycle guard/controller only.
- Function source changed: NO.
- Shared source changed: NO.
- Function redeployment required: NO.
- Production, Rules, Storage Rules, indexes, migrations/backfills, commit, and push: NO.

## Next checkpoint

`[NEEDS OWNER DEV RE-QA: PORTAL ADMIN DAILY SHOW QUEUE]`
