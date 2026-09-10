# Implementation Review — User Info Print Request Lifecycle Activity Ordering

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Review status: **Implementation complete; authorized DEV backend and Rules corrective deployments complete; stop before Owner DEV re-QA/backfill**

## Implemented scope

* Added shared lifecycle event and mirror types.
* Added the exact reviewed server triggers:
  `onPrintRequestLifecycleRequestWritten` on `printRequests/{printRequestId}` and
  `onPrintRequestLifecycleAllocationWritten` on `showAllocations/{allocationId}`.
* Added immutable, deterministic `printRequestLifecycleEvents` evidence, monotonic mirror advancement,
  show-title/schedule snapshots, allocation lineage, and Admin-only writes.
* Added Studio service reads, Firestore collection source, Rules read boundary, and composite-index
  source definitions.
* Updated Studio User Info card summaries, compatibility ordering fallback, date+time Created and
  Last Updated metadata, newest-first detail rendering, and forward/reconstructed history merge.
  Displayed Last Updated and summary ordering use the same lifecycle timestamp.
* Added an explicit disabled indexed-reader gate and a DEV-only, dry-run-default mirror backfill
  runner. Neither indexed activation nor backfill execution occurred.
* Added ADR and architecture/security documentation updates.

## DEV deployment evidence

The owner-authorized DEV backend deployment completed successfully. Exactly the two reviewed
Functions, Firestore Rules, and Firestore indexes were deployed to `fresh-prints-dev`; no other
Function, Storage Rules, hosting, production, data mutation, backfill, reader activation,
commit, or push action occurred. The complete command output and re-checked metadata are recorded
in `2026-09-09-user-info-print-request-lifecycle-activity-ordering-dev-deployment.md`.

The Functions are ACTIVE Gen 2 `nodejs20` services in `us-central1` on latest traffic, with
revisions `onprintrequestlifecyclerequestwritten-00001-cid` and
`onprintrequestlifecycleallocationwritten-00001-zat`. The Rules release is
`3c7788f8-c023-44cb-8b75-6e9cd9f137df` (Rules corrective follow-up; prior backend release was
`1cdf293c-18c7-41b9-a5d4-0595936c0150`). The two lifecycle indexes are present and were
`CREATING` at verification; the indexed reader remains disabled pending the separately authorized
DEV mirror backfill.

## Owner UI follow-up

The Details modal activity list is intentionally newest-to-oldest. The builder reverses the
occurrence-time comparator and same-timestamp lifecycle precedence while retaining a stable ID
tie-break; the focused lifecycle test asserts the visible order.

## Owner permission follow-up

The deployed lifecycle mirror exposed a Rules compatibility gap: staff re-activation of an edited
request was denied because the full `printRequests` after-image now contains
`lastLifecycleActivityAt`, `lastLifecycleActivityEventId`, and `lastLifecycleActivityPrecedence`.
The local Rules corrective allows and validates those fields while enforcing that client staff
updates cannot change them. The exact allocation re-add sequence passes the Rules regression and
the full Rules suite is 170/170. The owner-authorized Rules-only deployment released
`3c7788f8-c023-44cb-8b75-6e9cd9f137df`; Owner DEV re-QA is now required for live verification.

## Verification

See `2026-09-09-user-info-print-request-lifecycle-activity-ordering-test-report.md`.
Focused tests (20/20), Functions build, targeted lint, index JSON parsing, diff hygiene, and the
full Firestore Rules suite passed. Rules validation was **170/170 across 22 suites** under
shell-local Microsoft OpenJDK 25.0.4.1 and Firebase CLI 15.26.0. The Studio typecheck retains
unrelated baseline failures.

## Explicit non-actions

This implementation review does not authorize or claim:

* historical mirror backfill execution;
* indexed-reader activation;
* Studio publish or Portal deployment;
* commit or push.

Next required marker:

`[NEEDS OWNER DEV RE-QA: PRINT REQUEST LIFECYCLE HISTORY CORRECTIVE]`
