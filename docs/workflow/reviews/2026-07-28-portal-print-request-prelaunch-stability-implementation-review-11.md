# Portal Print Request Pre-Launch Stability — Implementation Review 11

- **Goal:** `portal-print-request-prelaunch-stability`
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 28 / Amendment 10
- **Review type:** independent Implementation Review
- **Date:** 2026-07-28
- **Verdict:** **REJECTED**

## Review basis

Reviewed the FreshForge workflow gates, current state, Amendment 10 plan and Formal Review, Amendment
10 test report, the actual working-tree implementation, and the focused Studio/Portal/show-picker
tests. This was a review-only pass; no application code was changed.

The implementation correctly preserves the post-commit service boundary, emits a sanitized
development manifest, blocks a selected Finish when a selected-show allocation cannot be mapped,
keeps the bounded historical Function/query unchanged, and introduces distinct Portal inspection and
destination state. No Function, Rules, production, migration, or queued-goal action occurred.

## Blocking findings

### 1. Retry session invalidation and duplicate-side-effect prevention are not mechanically safe

`useShowProductionTimer` clears React state in an effect when `show.id` changes, but an already
pending retry has no session/generation token or abort guard. Its eventual resolution can therefore
write the prior show's warning, error, retry status, and failed-ID scope back into the newly selected
show. Beginning another timer action has the same stale-completion exposure.

The click guard also relies only on captured React state (`isActionPending`). Two activations before
React commits the pending render can both call
`upcomingShowService.retryShowCompletionReconciliation`, duplicating the request-update side effect.
The Formal Review explicitly requires synchronous repeat-activation exclusion, show/action-session
invalidation, and no duplicate side-effect calls.

This is a correctness issue, not merely missing test evidence. Add a synchronous in-flight/session
authority (for example, refs or a composed controller) and ignore stale settlements after show
switch, action start, unmount, or superseding retry.

### 2. A remediation-only retry is reported internally as succeeded

The pure `resolveShowReconciliationRetryOutcome` correctly classifies remediation-only results as
`failed`, but the production hook does not use that classification when `failedRequestCount === 0`.
It unconditionally calls `setRetryStatus("succeeded")`, even when
`remediationRequestCount > 0`. This contradicts the approved contract that remediation must not be
presented as retry success and that zero unresolved **and zero remediation** is the only success.

Use the structured outcome consistently for every resolved service result and atomically replace the
retry scope/status from that outcome.

### 3. Required composed retry and picker behavior tests are absent

The retry evidence consists of three isolated tests for `resolveShowReconciliationRetryOutcome`.
There is no hook/controller test executing pending-before-settlement, disabled repeat activation,
rejected operation, full/partial failure, exact scope replacement, action/show invalidation, remount
non-resurrection, second retry no-op, or duplicate service-call prevention.

Likewise, Portal historical inspection is tested only through two pure helper cases. There is no
component/controller execution proving pointer and Enter/Space activation, native focusability,
read-only detail rendering, personal-usage rendering, destination/error clearing, zero validation or
submission calls, both direct submit/acknowledgment defenses, or unchanged open-show behavior. The
Formal Review expressly disallowed relying primarily on isolated helpers for these boundaries.

Add executable composed tests around production-used controllers/hooks/components. The reported
60/60 focused pass is truthful as a count, but it does not satisfy the approved behavior matrix.

### 4. The picker contract still retains the overloaded legacy capability

`ShowPickerOption` now exposes `canInspect` and `canAllocate`, but also retains `isSelectable`, and
`ShowPicker` still reads `isSelectable` when classifying closed-only days. The Formal Review required
replacement of the overloaded contract, not coexistence with three potentially divergent
authorities. Remove the legacy field from the production boundary and derive all inspection and
allocation behavior from the two explicit capabilities.

## Non-blocking observations

- Retry service scope is deduplicated and limited to the IDs supplied by the current in-memory
  caller; it invokes only request completion reconciliation and does not rerun the show/allocation
  batch.
- The development manifest is appropriately field-limited: opaque IDs, path template, intended
  field names, structured outcome/phase/code, commitment, retry eligibility, and counts. It does not
  claim the live denial cause is known.
- Selected-Finish invalid allocations are detected before the atomic batch. Warning dedupe is keyed
  by path and normalized field classes and emits field names rather than record values.
- Portal maintains separate `inspectedShowId` and allocation destination state, supplies read-only
  copy for non-allocatable rows, and independently re-resolves the DTO in both submit paths.
- Historical inspection uses the already-returned bounded response. No new listener, per-show read,
  validation call, N+1 read, Function response change, or server eligibility change was found.
- The test report honestly records Portal build `EPERM`, the existing Studio 29-error baseline,
  repository lint baseline, and the unrun Rules suite due to missing Java. Those environmental/
  pre-existing results are not the reason for rejection.
- Previously passing timer lifecycle, mounted Portal terminal progress, personal usage, exact-25,
  show-switching, and bounded-query behavior were not intentionally removed by this amendment.

## Required disposition

Return to scoped implementation under Amendment 10. Correct findings 1, 2, and 4; add the composed
behavior evidence in finding 3; rerun and record the complete verification matrix; then request a new
independent Implementation Review.

The implementation remains client-only at this point. Do not deploy the unchanged Function or
Rules. Do not begin owner QA, signoff, production work, or either queued goal.

## Verdict

**REJECTED.** The implementation contains two retry-lifecycle correctness defects and does not meet
the binding composed-test or picker-contract requirements. Amendment 10 cannot advance to owner
evidence QA until these findings are resolved and independently re-reviewed.
