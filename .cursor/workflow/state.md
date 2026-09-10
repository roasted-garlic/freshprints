## FreshForge State

| Field | Value |
|---|---|
| Status | **IDLE — PRINT REQUEST LIFECYCLE ACTIVITY ORDERING COMMITTED/PUSHED (APPROVED_WITH_NOTES)** |
| DONE | yes |
| Signoff Status | `user-info-print-request-lifecycle-activity-ordering` — **approved_with_notes**; Owner DEV QA **PASS** |
| Current Mode | idle |
| Parent program | Customer Identity WS4 corrective |
| Current Goal | `user-info-print-request-lifecycle-activity-ordering` — **CLOSED**; `[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]` |
| Current Phase | Signoff complete; no active managed phase |
| Plan Status | complete — `docs/workflow/plans/2026-09-09-user-info-print-request-lifecycle-activity-ordering-plan.md` |
| Review Status | approved_with_changes — parent lifecycle review; tie-handling correction revalidated |
| Implementation Status | complete — lifecycle events/mirror, accepted Studio re-add corrective, mirror-only trigger corrective, backfill, and indexed reader |
| Test Status | Studio lifecycle/indexed-reader focused 24/24; Functions trigger/backfill/allocation 14/14; latest full Rules 174/174; build/lint pass; Studio typecheck baseline failures documented |
| Human Checkpoint Required | yes |
| Human Checkpoint Reason | No active implementation is running; the owner must select the next managed goal or separately authorize production/publish actions. |
| Environment | Corrective callable + Firestore Rules and lifecycle triggers deployed to `fresh-prints-dev`; Owner DEV QA PASS; mirror APPLY complete; two historical duplicate events safely documented; indexed reader enabled in local Studio source |
| Production | untouched |
| Commit/push | **COMPLETE** — `6bf7a25d` pushed to `origin/development` |
| Last updated | 2026-09-09 |
| Last Completed Step | Owner DEV QA PASS recorded; final `approved_with_notes` signoff created; `6bf7a25d` committed and pushed; FreshForge returned to IDLE |

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
- 2026-09-09 — Owner authorized the exact DEV redeploy. Firebase successfully updated
  `getPortalAdminUpcomingShowQueueDashboard`
  (`getportaladminupcomingshowqueuedashboard-00003-fug`) and
  `getPortalAdminShowQueueRequestDesigns`
  (`getportaladminshowqueuerequestdesigns-00005-fad`) in `fresh-prints-dev/us-central1`.
  Both are ACTIVE on their latest revisions. Exactly two Functions deployed; zero errored or
  aborted. Rules, indexes, hosting, Studio, data, and production were untouched.
- 2026-09-09 — `portal-admin-daily-show-queue` signed off
  **approved_with_notes**. The documented Windows Portal `.next/trace` EPERM build baseline and
  future Node.js 20 runtime migration remain tracked separately.
- 2026-09-09 — Lifecycle-history Plan/Formal Review completed **approved_with_changes**. Current
  card order is raw `printRequests.updatedAt`, not literal show-date sorting; it is unsafe because
  merge and queue-tab/mirror writes are non-lifecycle and some allocation adds need not advance it.
  Studio’s remove-for-Editing path deletes allocation source rows, so source-only reconstruction
  and `customerActivityEvents` (account-only) are insufficient. The approved conditional design is
  immutable server-authored request lifecycle events plus a server-maintained
  `lastLifecycleActivityAt` card mirror, bounded per-logical-id k-way pagination, an additive
  Rules/index/schema change, and a separately authorized non-destructive DEV backfill. No
  implementation, test execution, deployment, backfill, commit, push, publish, or production
  action occurred for this goal.
- 2026-09-09 — Owner authorized implementation of the lifecycle-history corrective, including
  additive schema, two server lifecycle writers, Studio history/card UI, Rules/index source,
  tests, and docs/ADR. DEV deployment, Rules/index deployment, backfill, publish, commit, push,
  and production remain explicitly unauthorized.
- 2026-09-09 — Lifecycle-history corrective implementation and focused tests completed locally.
  The compatibility reader remains enabled while the indexed reader is explicitly disabled pending
  mirror backfill. Implementation Review and test report are recorded. Full Rules tests could not
  start because Java is absent from PATH. No deploy, backfill, publish, commit, push, or production
  action occurred.
- 2026-09-09 — Existing Microsoft OpenJDK 25.0.4.1 was restored in a shell-local `JAVA_HOME`/`PATH`
  only. Exact `npm run test:rules` passed 169/169 across 22 suites (0 failed, exit 0) with Firebase
  CLI 15.26.0. No lifecycle Rules corrective was required; no deploy, backfill, publish, commit,
  push, or production action occurred.
- 2026-09-09 — Owner-authorized DEV deployment completed with the exact lifecycle Function,
  Firestore Rules, and Firestore index allowlist. Both Functions are ACTIVE Gen 2 `nodejs20`
  services in `us-central1` on latest traffic; Rules released as
  `1cdf293c-18c7-41b9-a5d4-0595936c0150`; the two lifecycle indexes are present and were
  `CREATING` at verification. No unrelated Function, Storage Rules, hosting, production,
  backfill (including dry-run), reader activation, commit, or push occurred. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-dev-deployment.md`.
- 2026-09-09 — Owner requested the User Info Print Request Details activity list display
  newest-to-oldest. The local builder comparator and focused expectation were amended; focused
  lifecycle tests remain 20/20 and targeted ESLint passes. No deployment, backfill, reader
  activation, QA/signoff, commit, or push occurred for this UI follow-up.
- 2026-09-09 — Owner reported **Missing or insufficient permissions** when re-adding a request after
  remove-for-editing. Root cause: the deployed `printRequests` Rules rejected the lifecycle mirror
  fields on the status `editing` → `active` after-image. Local Rules allowlist/type validation and
  one affected-keys preservation guard now fix it; the exact show-queue re-add regression and full
  Rules suite pass **170/170**. No Rules deploy yet. Next marker is the filtered DEV Rules deploy
  authorization below.
- 2026-09-09 — Owner authorized the exact DEV Firestore Rules corrective deployment. The Rules-only
  command succeeded against `fresh-prints-dev` with exit code 0 and released
  `projects/fresh-prints-dev/rulesets/3c7788f8-c023-44cb-8b75-6e9cd9f137df` to
  `cloud.firestore`. No Functions, indexes, Storage Rules, backfill, indexed-reader change,
  Portal/Studio publish, production action, commit, or push occurred. Owner DEV re-QA is now
  required.
- 2026-09-09 — Owner DEV re-QA **FAIL** on Studio remove→edit→re-add. Evidence: permission toast on
  Add to Show; button remains until refresh; after refresh `EDITING` + `PARTIALLY QUEUED` (partial
  allocation committed); Portal still in edit mode. Diagnosis: Studio per-item client allocate
  commits `showAllocations` then Rules-gated `printRequests` `editing→active` update; failure after
  first item yields stuck Editing + partial queue + stale UI totals; Portal edit mode is downstream
  of stuck `status: editing` (Portal queue path is Admin SDK and not the same write sequence).
  Corrective plan:
  `docs/workflow/plans/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-plan.md`.
  Formal Review **approved_with_changes** (Approach A hard-pick):
  `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-review.md`.

- 2026-09-09 — Owner authorized implementation of the reviewed Approach A corrective. Phase 0
  realistic post-unqueue Rules fixtures initially exposed the expression-budget gap; a narrow
  `editing → active` status-only fast path was added with lifecycle/parking/bidding/identity
  immutability preserved. The new trusted `allocateStudioPrintRequestToShow` callable atomically
  allocates complete remaining plans (including split legs), recomputes show totals, activates and
  repairs editing rows, clears parking/requeue markers, and recomputes `queueTab`. Studio Add to
  Show now uses the callable and reconciles server state on failure/success. Focused Rules are
  23/23, callable + Portal contracts 9/9, full Rules 174/174, Functions build and targeted lint
  pass. Studio source contracts pass 12/12. Implementation Review and Test Report:
  `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-implementation-review.md`
  and `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-test-report.md`.

- 2026-09-09 — Owner authorized the exact DEV deployment allowlist for the Studio Editing→re-add
  corrective. `allocateStudioPrintRequestToShow` deployed successfully to `fresh-prints-dev` as
  ACTIVE Gen 2 `nodejs20` in `us-central1`, revision
  `allocatestudioprintrequesttoshow-00001-lod`, latest traffic, source hash
  `ef932a1c115c0867c783692dcd4cbb089ac51125`, build
  `d8792439-788f-463b-a1ab-1d42cdf0f65d`. Firestore Rules deployed successfully as ruleset
  `bc9e3e7a-6597-4228-8aa7-e9f006388a26`, replacing `3c7788f8-c023-44cb-8b75-6e9cd9f137df`.
  Exactly one Function and Rules changed; no indexes, Storage Rules, lifecycle redeploy, Portal/
  Studio publish, data repair, backfill, indexed-reader activation, production action, commit, or
  push occurred. Deployment evidence:
  `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-dev-deployment.md`.
  Owner DEV re-QA is now required.
- 2026-09-09 — Owner DEV re-QA returned **PASS** for the deployed Studio Editing→re-add
  corrective. Remove→Editing worked; re-add succeeded without a permissions error; the request did
  not remain `PARTIALLY QUEUED` or `EDITING`; Add to Show availability and Studio reconciliation
  were correct. Corrective QA is accepted, but the parent lifecycle goal is not signed off. No
  backfill, indexed-reader activation, deployment, publish, production action, data repair,
  commit, or push occurred. QA record:
  `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-corrective-dev-qa.md`.
- 2026-09-09 — Owner authorized a DEV lifecycle order-mirror **dry run only**. The original
  backfill script ran twice in dry-run mode against `fresh-prints-dev` (11 requests scanned, 11
  proposed updates, 0 writes; 8/8 reader-eligible coverage). A read-only event audit found 3
  existing forward-backed mirrors at equal timestamps that the original script would rewrite with
  synthetic fallback IDs because it did not inspect lifecycle events. This was a superseded
  **NOT_READY_FOR_DEV_APPLY** result; no APPLY, backfill write, event fabrication, deployment,
  reader activation, publish, production action, commit, or push occurred. The corrective
  revalidation below resolved the blocker. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-dry-run.md`.
- 2026-09-09 — Owner authorized correction of the DEV mirror backfill tie handling and a second
  dry-run revalidation. The reviewed lifecycle comparator is now shared by the forward writer and
  backfill; the backfill reads forward event evidence, preserves trusted equal-time mirror IDs,
  uses released-for-requeue precedence 50, and writes no lifecycle events. Focused corrective and
  lifecycle tests passed 10/10; Functions build and `git diff --check` passed. Two canonical DEV
  dry-runs exited 0 with 11 inspected, 8 reader-eligible, 8 proposed, 3 unchanged trusted
  mirrors, 0 actual writes, 100% coverage, monotonic preservation PASS, and idempotency PASS.
  Apply readiness is now **READY_FOR_BOUNDED_DEV_APPLY**, but APPLY remains unauthorized and was
  not run. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-dry-run.md`.
- 2026-09-09 — Owner authorized the bounded DEV mirror APPLY. The final pre-apply dry-run remained
  green (11 inspected, 8 proposed, 3 unchanged, 8/8 coverage); APPLY exited 0 and wrote exactly
  the three mirror fields on 8 `printRequests`. The 3 trusted equal-time forward tuples were
  preserved. Post-apply dry-run exited 0 with 0 proposed writes and 8/8 coverage, but read-only
  inspection found 2 lifecycle event documents created during the mirror-only updates for converted
  historical requests. No event repair or rollback was attempted. Reader activation is held pending
  a separately authorized Function corrective. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-apply.md`.
- 2026-09-09 — Owner authorized implementation of the request-trigger mirror-only write corrective.
  The source now uses Firestore-value-aware equality for timestamps and structured values, unions
  before/after keys for deletion detection, and keeps the exact mirror-field exclusion. Focused
  lifecycle/allocation/backfill tests pass 14/14; Functions build, targeted lint, and diff check
  pass. The two unexpected DEV events were inspected read-only and classified
  `SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`; no event repair, backfill APPLY, deployment, reader
  activation, commit, push, or production action occurred. Implementation Review:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-trigger-mirror-only-corrective-implementation-review.md`.
- 2026-09-09 — Owner authorized the exact DEV deployment of the request-trigger mirror-only write
  corrective. `firebase deploy --only functions:onPrintRequestLifecycleRequestWritten --project
  fresh-prints-dev` exited 0 and deployed exactly one Function. Read-only verification found
  `onprintrequestlifecyclerequestwritten-00002-fuy` ACTIVE on 100% latest traffic, runtime
  `nodejs20`, source hash `819989795f36c99f3cb5552cbbc9183b205ab1a9`, source generation
  `1789012937701318`, and Cloud Build `99d7d386-b9a1-4999-8f04-0f5d0abc8adb`. No Rules,
  indexes, Storage Rules, backfill, data repair, reader activation, Portal/Studio publish,
  production action, commit, or push occurred. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-trigger-mirror-only-corrective-dev-deployment.md`.
- 2026-09-09 — Owner authorized the existing DEV indexed-reader gate. The source constant
  `PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED` changed from `false` to `true` in Studio only;
  the compatibility reader and fallback utilities remain intact. Ordering and Details indexes
  were reverified READY, reader-eligible mirror coverage remained 8/8 (100%), and read-only DEV
  indexed request/Details queries returned without missing-index or permission errors, with no
  duplicate request IDs. Focused lifecycle tests passed 24/24; targeted Studio lint and diff
  hygiene passed. Studio typecheck retains documented unrelated baseline failures. No Firebase
  deployment, backfill, data repair, event modification, publish, production action, commit, or
  push occurred. Interactive UI smoke was unavailable because no Browser/Windows Computer Use
  session was connected; Owner DEV QA is required. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-indexed-reader-dev-activation.md`.
- 2026-09-09 — Owner DEV QA returned **PASS** for the indexed lifecycle history reader. The
  owner verified newest-activity card placement, lifecycle-clock timestamps, one logical card per
  request, current versus historical show context, newest→oldest Details, and the accepted
  remove→Editing→re-add flow without a permission error or partial queue. The two historical
  duplicate conversion events remain `SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`; no cleanup is
  required. Final Signoff is **approved_with_notes** and closes the managed goal. Evidence:
  `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-signoff.md`.
- 2026-09-09 — Owner asked (during re-add corrective) to make Studio request design sort order match
  Portal. Repo fact: Portal uses newest-first (`sortPrintRequestItemsNewestFirst`); Studio request
  grids use oldest-first (`sortPrintRequestItemsForDisplay`). Amendment plan drafted (Studio→Portal
  newest-first recommended):
  `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md`.
  Orthogonal to Editing→re-add and backfill tie-handling; do not block the parent backfill review.
  Awaiting owner confirmation of direction, then
  Formal Review → implement.

**Allowed Actions:** Documentation/state maintenance; local tests/builds/lint; read-only inspection;
owner selection of a new managed goal through the normal Plan → Review gates; and separately gated
production/publish planning.

**Forbidden Actions:** Any Firebase/Rules/index/Storage/hosting/Studio/DEV/production deployment;
backfill rerun or event repair; lifecycle mirror/event changes; disabling the accepted indexed
reader; data changes outside local tests; starting another implementation without a new goal;
commit or push for this closed goal; any future commit/push requires a new explicit authorization.
Production remains separately gated.

## Next Required Step

`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`

FreshForge is idle; do not automatically start another goal or production rehearsal.
