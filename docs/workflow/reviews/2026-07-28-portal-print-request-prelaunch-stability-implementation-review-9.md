# Portal Print Request Pre-Launch Stability — Implementation Review 9

- **Date:** 2026-07-28
- **Reviewer:** Independent FreshForge Implementation Review Agent
- **Scope:** Plan Section 26 / Amendment 8 only
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
- **Formal Review:** `docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-8-review.md`
- **Test Report:** `docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-8-test-report.md`
- **Deployment performed:** none

## Verdict

**`APPROVED`**

## Final remediation re-review — 2026-07-28

### Authoritative final verdict

**`APPROVED`**

All prior blocking findings are resolved. The sections below retain the earlier rejected verdicts
and findings as review history; they are superseded by this final re-review.

### Final findings

1. **Timer action phases and post-commit semantics pass.**
   `startShowPrinting`, `pauseShowPrinting`, and `resumeShowPrinting` resolve immediately after
   their mutation commits. Finish resolves after its non-throwing `Promise.allSettled`
   reconciliation result and performs no post-commit show read. `useShowProductionTimer` uses the
   shared `classifyCommittedShowTimerPhase` boundary so a later `onShowUpdated` failure is reported
   as committed refresh failure, never mutation failure. The executable matrix covers all four
   actions' committed versus post-commit-refresh classification and Finish partial reconciliation.
   Source inspection confirms mutation rejection remains isolated in the action-promise catch.
2. **Reconciliation and retry scope pass.**
   Finish derives an exact deduplicated affected-request set, maps settled failures back to
   `failedRequestIds`, and returns only failed IDs for retry. The hook retains that exact opaque
   scope; `retryShowCompletionReconciliation` accepts only those IDs, deduplicates them, and returns
   only the still-failing subset. It no longer scans a show or expands to unrelated previously
   printed requests. IDs are not rendered or emitted in diagnostics.
3. **All four action manifests pass.**
   Start, Pause, Resume, and Finish have explicit `actionName` and `phase`, bounded operation rows,
   path templates, field-name allowlists, current/proposed states, and Firebase error codes on
   mutation rejection. Pause/Resume now use their existing single selected-show read as a raw
   diagnosed read and include `parserStatus`, `missingRequiredFields`, and `legacyExtraFields`
   without adding a read. Detailed manifests remain development-only and contain no document
   bodies, field values, customer identity, request content, credentials, or tokens.
4. **Portal polling architecture and lifecycle proof pass.**
   The hook uses `PortalProgressPollingController` with the request-generation/single-flight
   `PortalProgressRequestGate`. Controlled-scheduler tests compose both across an in-flight focus
   refresh, request invalidation, hidden/unmount stop, stale old-result rejection, and resumed new
   request. The existing tests also prove bounded 5–10 second waiting → printing → terminal
   scheduling and one active timer. No Firestore listener, broad scan, all-show poll, or customer
   elapsed polling mechanism was introduced.
5. **Personal show usage passes.**
   `resolveSelectedPortalPersonalShowUsage` is the modal's selected-show authority and is keyed by
   selected show ID. Tests cover 0/25, 22/25, 25/25, successful +3 optimism, independent Show A/B
   values, failed-submit cleanup/reopen authority, and copy distinct from show-wide capacity.
   Optimism is stored per show and cleared on failure/close. Existing ADR-FP-122 exact-25,
   over-cap, same-request, and exhausted-copy regressions remain intact.
6. **Finish Rules and least privilege pass.**
   Failing-before evidence remains 16/17 with only the exact legacy Finish fixture denied.
   Passing-after evidence is now 34/34 under Temurin Java 21. The rule requires active staff,
   `pending|queued|in_progress -> done`, caller-matching `completedBy`/`updatedBy`, timestamp
   `completedAt`/`updatedAt`, and exactly the five timer-owned changed keys. The ordinary
   full-schema branch explicitly excludes Finish. Tests cover current/legacy staff success,
   customer/inactive denial, unrelated and legacy mutation denial, invalid source/destination,
   mismatched identities, and missing/wrong-typed timestamps.
7. **Read and deployment boundaries pass.**
   Timer reads remain the existing selected show plus show-scoped allocation reads; Pause/Resume
   replace the previous mapped selected-show read with a raw diagnosed form rather than adding
   reads. Reconciliation remains bounded. No callable, response schema, Function implementation,
   migration, or production surface changed in Amendment 8.

### Verification accepted

- Targeted remediation suite: **21/21 pass**.
- Full Firestore Rules suite: **34/34 pass**, Temurin Java 21.
- Portal build: exit 0.
- Relevant changed-file lint: clean.
- Studio compiler: no Amendment 8 errors; unrelated baseline remains separately documented.
- Prior Portal typecheck, Functions regression build, diff check, and known repository baselines
  remain recorded in the Amendment 8 Test Report.
- No deployment occurred.

### Approved handoff and exact deployment boundary

Implementation Review is satisfied. Because Firestore Rules changed, stop at the required human
checkpoint before exactly:

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

The requested approval phrase must be exactly:

```text
APPROVE DEV RULES DEPLOY
```

This approval does not authorize a Function deployment, broad Firebase deployment, production
deployment, migration, owner QA before the Rules release is verified, signoff, or queued-goal work.

## Remediation re-review — 2026-07-28

### Final verdict

**`REJECTED`**

The remediation materially improves the implementation and closes the original findings concerning
post-commit service reads, UI visibility of reconciliation failure, action naming, basic polling
controller extraction, selected-show personal-use derivation, and the missing Rules assertions.
However, the implementation still does not have the required executable timer phase coverage, the
retry operation does not remain limited to the originally affected request IDs, and the polling
tests still do not exercise generation/visibility/unmount behavior through the integrated
controller boundary. These are approval-gate requirements, not optional test-depth preferences.

No deployment is authorized.

### Remediation accepted

1. `startShowPrinting`, `pauseShowPrinting`, and `resumeShowPrinting` now return immediately after
   their writes resolve. Finish performs no post-commit show read and returns a structured,
   non-throwing reconciliation result. A later `onShowUpdated` failure is handled as
   `post_commit_refresh`, not mutation failure.
2. Finish reconciliation failures are surfaced in `useShowProductionTimer` and
   `UpcomingShowsPage`; the UI exposes **Retry request updates**.
3. All four timer actions now carry explicit action identities and mutation phases. All mutation
   rejection logs include Firebase error code. Detailed manifests remain development-only and
   sanitized.
4. Portal polling now uses `PortalProgressPollingController`, with bounded 5–10 second scheduling,
   and retains `PortalProgressRequestGate` for request-generation and single-flight protection.
5. The modal now uses `resolveSelectedPortalPersonalShowUsage`. Pure tests cover independent Show
   A/B values, show-scoped optimism, failed-submit cleanup/reopen authority, and copy distinction.
6. Rules tests now directly deny a non-finishable source status and missing/wrong-typed
   `completedAt`/`updatedAt`. The reported full Rules suite is 34/34 under Temurin Java 21.
7. The Rules implementation remains least-privilege and keeps the ordinary full-schema path from
   bypassing the narrow Finish transition.

### Remaining blockers

#### R1. No executable timer service/hook phase matrix exists

There is still no test for `useShowProductionTimer` or the timer service action contract. The
upcoming-show test directory contains allocation/list resilience and parser-diagnostic tests, but
no timer action behavior test. Therefore the suite does not mechanically prove:

- commit rejection produces mutation failure;
- a resolved commit followed by `onShowUpdated` rejection produces only a post-commit warning;
- Finish reconciliation failures return partial success and enable retry;
- retry success clears retry state; or
- Start/Pause/Resume/Finish use the expected action-specific contracts.

This was explicitly required by Plan Sections 26.2, 26.3, and 26.6 and Formal Review constraints 1,
3, and 7. Source inspection confirms the new structure is directionally correct, but the mandatory
behavior proof remains absent.

**Required correction:** add a hook/service boundary harness with deferred action, refresh, and
reconciliation outcomes. Prove mutation failure versus committed-refresh failure and the complete
Finish retry state transition. Tests may use injected action functions or an extracted controller,
but must execute the contract actually used by the hook.

#### R2. Retry reconciliation expands beyond the originally affected request IDs

`retryShowCompletionReconciliation(caller, upcomingShowId)` reloads every mapper-valid allocation
for the show and retries every request with any `printed`/`done` allocation. This is show-bounded,
but it is not limited to the deduplicated request IDs affected by the Finish batch. It can
reconcile unrelated requests that were already printed earlier on the same show.

Plan Section 26.3 item 6 and Formal Review constraint 7 require the retry path to remain bounded to
the affected request IDs, not merely to the show.

**Required correction:** return/store an opaque retry scope containing only the affected request
IDs, or expose a service retry method that receives that exact deduplicated scope. Do not log or
render the IDs. Add a test proving an unrelated previously printed request on the same show is not
retried.

#### R3. Polling tests still do not execute stale and lifecycle behavior through the integrated controller boundary

`PortalProgressPollingController.test.ts` proves scheduling, manual stop/restart, and a synthetic
coalesced load function. Stale success/error rejection remains tested only on the separate
`PortalProgressRequestGate`; visibility is represented by direct `stop()`/`start()` calls rather
than a visibility transition; request switch and unmount are not exercised through the controller
used by the hook.

The approved requirement was a controller/hook boundary with controlled time and deferred promises,
including stale success and stale error, focus/visibility coalescing, hidden/terminal cleanup,
request-switch invalidation, and unmount cleanup. Having separate unit tests for two primitives
does not prove their composition in `usePortalShowPrintProgress`.

**Required correction:** either extract the composed polling session (controller + gate +
generation/visibility lifecycle) and test it directly, or add a hook harness. Use deferred promises
and a controlled scheduler to prove the full required matrix without remount.

#### R4. Pause/Resume manifests omit parser diagnostics required by the approved manifest contract

Pause and Resume now have action/phase manifests, but their operation rows do not include parser
status, missing-required-field names, or legacy-extra-field names. The service obtains an already
mapped `UpcomingShow`, so those fields cannot be reconstructed from the current object.

Plan Section 26.3 item 1 requires those sanitized diagnostic dimensions for Start, Pause, Resume,
and Finish. Formal Review constraint 3 permits the same fields and requires complete action/phase
identity.

**Required correction:** read/diagnose the selected raw show once in the same existing read path
used for Pause/Resume validation, or explicitly revise the reviewed contract if those diagnostics
are intentionally inapplicable. Do not add an extra read.

### Updated verification assessment

Accepted as reported:

- Rules: 34/34, exit 0, Temurin Java 21.
- Focused remediation tests: 15/15, exit 0.
- Portal build: exit 0.
- Changed-file ESLint: exit 0 with one disclosed unrelated existing warning.
- No deployment.

The focused test count is not sufficient to close R1 or R3 because the required lifecycle
boundaries are not present in the test sources.

### Updated deployment boundary

The exact eventual deployment scope remains:

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Do not request that approval yet. Return to implementation for R1–R4, rerun the focused and full
verification matrix, update the Test Report, and request another independent re-review.

The Rules correction is directionally least-privilege and the Portal implementation preserves the
request-scoped callable architecture, but the implementation does not yet satisfy Amendment 8's
central timer contract or its mandatory executable test boundary. A resolved timer batch can still
be reported as a mutation failure when reconciliation or the post-commit show read fails. The
required retryable partial-success state is not returned to the hook/UI. Start/Pause/Resume also do
not have the required action-specific sanitized manifests. The reported focused test total does not
exercise the hook/controller lifecycle required by the approved Plan.

Do not proceed to the Rules deployment checkpoint until the blocking findings below are corrected,
verified, and independently re-reviewed.

## Blocking findings

### 1. A committed timer mutation is still relabeled as an uncommitted mutation failure

`useShowProductionTimer.runAction` treats the entire service promise as the mutation phase. It sets
`actionError` and logs `phase: "mutation"` whenever that promise rejects. However:

- `startShowPrinting` commits the batch and then returns `getUpcomingShowById(...)`;
- `pauseShowPrinting` and `resumeShowPrinting` write and then return
  `getUpcomingShowById(...)`; and
- `markShowPrintingFinished` commits the batch, awaits request reconciliation, and then returns
  `getUpcomingShowById(...)`.

Consequently, a post-commit `getUpcomingShowById` rejection is still surfaced as mutation failure.
For Finish, an unexpected reconciliation-path rejection before `Promise.allSettled` is constructed
can do the same. This is exactly the pre-Amendment-8 ambiguity that Section 26.3 item 2 and Formal
Review constraints 1 and 7 require the implementation to eliminate.

**Required correction:** make the service/hook contract explicitly represent at least commit,
post-commit read/refresh, and reconciliation outcomes. Commitment may become true only after the
write promise resolves. A later failure must produce a distinct partial-success warning, not
`actionError`. Add executable tests for commit failure, post-commit service-read failure,
`onShowUpdated` failure, and Finish reconciliation failure.

### 2. Finish reconciliation has no surfaced retry path or actionable partial-success result

`markShowPrintingFinished` uses `Promise.allSettled`, counts failures, and emits a console warning,
but it returns no reconciliation outcome. `useShowProductionTimer` therefore cannot surface the
failure, and the staff UI has no retry action. A console-only warning is not the “distinct partial
success” plus preserved retry path required by Plan Section 26.3 item 6 and Formal Review constraint
7.

The reconciliation is correctly bounded to a deduplicated set of affected request IDs and remains
after the atomic timer batch; no request documents were added to that batch. Those portions pass
review.

**Required correction:** return a sanitized reconciliation result (affected/failed counts or
equivalent, without request content/PII), surface it independently of mutation success, and provide
a bounded retry mechanism for only the affected request IDs.

### 3. Required action-specific sanitized manifests are incomplete

Finish has `actionName: "finish"` and `phase: "mutation"`. Start has a manifest but lacks those
fields. Pause and Resume have no operation manifest at all. Hook logging gives the four actions
identities only on failure, not a complete operation manifest.

This fails Plan Section 26.3 item 1 and Formal Review constraint 3, which require Start, Pause,
Resume, and Finish to have explicit action identities/phases and sanitized manifests. Existing
manifest fields are otherwise appropriately sanitized: they contain path templates, operational
document IDs, field names, parser state, statuses, role/active state, and error code, not document
bodies, customer identity, artwork content, tokens, or credentials; detailed manifests remain
development-only.

**Required correction:** use one consistent manifest shape for all four actions, including
`actionName`, phase, operation count/type/path template, changed fields, current/proposed state,
parser state where applicable, and Firebase error code on failure. Keep detailed output
development-only.

### 4. Portal polling verification does not execute the required controller/hook boundary

The implementation uses a request-scoped callable, 5–10 second bounded delays, visibility/focus
triggers, generation invalidation, and a single-flight `PortalProgressRequestGate`. No Firestore
listener, global poll, all-show query, or corpus reload was added.

But the tests cover only:

- pure polling-policy functions; and
- the isolated request gate.

There is no executable hook/controller test with controlled time proving mounted
Queued → Printing → terminal transitions without remount, focus/visibility coalescing through the
actual scheduling boundary, hidden/terminal timer cleanup, request-switch invalidation, unmount
cleanup, or absence of a customer elapsed polling clock. This directly misses Plan Section 26.4,
Section 26.6, and Formal Review constraint 9. The Test Report's claim that the focused suite covers
the complete bounded polling behavior is therefore overstated.

**Required correction:** extract a testable polling controller or add a hook harness and use fake
timers plus deferred promises to execute the real lifecycle boundary. Cover every case named above,
including stale success and stale error after request switch/unmount.

### 5. Personal-use behavior coverage is below the approved boundary

The rendering correctly derives usage from the selected
`PortalAllocatableShow.customerAllocatedQuantity`, uses the loaded limit, clamps remaining, scopes
the optimistic quantity by show ID, clears it on failure/close, and keeps the personal wording
separate from show-wide capacity. It adds no Function, N+1 read, or response type change.

The new tests exercise only the pure formatter for 0/25, 22/25, 25/25, and +3. They do not execute
the modal behavior required by Plan Section 26.5/26.6 and Formal Review constraints 10–11:
independent Show A/B values, show-switch stale-result defense, failed-submit rollback, successful
quantity applied exactly once in the component lifecycle, reopen using server authority, and
distinct simultaneous show-wide/personal copy.

**Required correction:** add component/controller-boundary coverage for those cases. Retain the
existing ADR-FP-122 exact-25, over-25, same-request, and exhausted-cap wording regressions.

### 6. Finish Rules denial coverage is incomplete relative to the approved test matrix

The implementation correctly:

- requires active staff through `isStaff()`;
- limits source statuses to `pending|queued|in_progress` and destination to `done`;
- limits affected keys to exactly `status`, `completedAt`, `completedBy`, `updatedBy`, `updatedAt`;
- requires caller identity for both by-fields;
- requires timestamp types;
- explicitly excludes Finish from the ordinary full-schema update path; and
- preserves Amendment 7 Start coverage and legacy fields.

The recorded failing-before result (16/17, exact legacy-compatible Finish batch as the sole failure)
and passing-after Rules result (32/32) establish the compatibility need. However the Finish tests do
not directly cover all Formal Review constraint 6 cases. In particular, there are no explicit
missing/invalid `completedAt` and `updatedAt` cases, nor an explicit invalid source-status Finish
case. Several denial variants are grouped into one test, which makes failures less attributable.

**Required correction:** add direct, independently named assertions for missing and wrong-typed
timestamps and an invalid source status. Preserve current/legacy owner/admin/helper success,
customer/inactive denial, unrelated field addition/change, legacy-field change/removal, invalid
destination, and mismatched identity coverage.

## Non-blocking observations

- The selected show is validated strictly before a write with missing/invalid field names.
  Mapper-invalid allocations are skipped and excluded from operations/totals, and the zero-safe
  allocation case is actionable. Mapper-compatible unknown fields are preserved.
- The implementation leaves the already resilient per-document `listUpcomingShows` behavior alone,
  as required.
- Finish request reconciliation is deduplicated and bounded to affected request IDs.
- ADR-FP-122 authoritative transaction eligibility and exact-25 boundary regressions remain in the
  checkout, and the Functions regression build is recorded as passing. Amendment 8 does not require
  a Function deployment.
- The Test Report honestly records the unrelated Studio build and repository-lint baselines, though
  repository lint is now reported as 42 findings rather than the Plan's historical 41. This is
  acceptable only because changed-file lint passes and the additional finding is demonstrated to
  be outside Amendment 8 changed lines.

## Verification assessment

Accepted evidence:

- TypeScript 5.9.3 recorded.
- Rules failing-before: 17 total, 16 pass, 1 expected legacy Finish denial.
- Rules passing-after: 32/32 under Temurin Java 21.
- Portal typecheck/build, Functions regression build, changed-file lint, and diff check recorded
  exit 0.
- Studio build and repository lint disclosed as existing failures rather than passes.

Not accepted as sufficient for the gate:

- 28 focused tests do not include the required timer service/hook phase matrix, real polling
  lifecycle boundary, or modal personal-use lifecycle.
- The test report's behavioral conclusion that mutation and refresh are distinct is contradicted by
  the current service/hook promise boundary.

## Deployment boundary

No deployment was performed. If the blockers are corrected without changing server callable
surfaces, the only planned deployment selector remains:

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Do not redeploy `queuePortalPrintRequestToShow`, deploy Functions, run a broad Firebase deploy,
start owner QA, sign off, or start queued goals. A new exact `APPROVE DEV RULES DEPLOY` checkpoint
is appropriate only after a passing independent re-review.

## Handoff

Return Amendment 8 to implementation for the six blocking corrections. Update the Test Report with
the expanded executable evidence, then request independent Implementation Review again. No
deployment is authorized by this review.
