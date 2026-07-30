# Portal Print Request Pre-Launch Stability — Amendment 10 Formal Review

- **Goal:** `portal-print-request-prelaunch-stability`
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 28
- **Review type:** independent Formal Review
- **Date:** 2026-07-28
- **Verdict:** **APPROVED_WITH_CHANGES**

## Review basis

Reviewed the FreshForge workflow gates, current workflow state, Owner QA v11, Amendment 9 Formal
Review and Implementation Review 9, architecture/backend/data-model documentation, coding/testing/
security standards, ADR-FP-064, ADR-FP-102, and ADR-FP-122, plus the current timer reconciliation,
warning, Portal modal, and shared ShowPicker implementation.

The amendment remains inside the active pre-launch stability goal. It preserves the already-proven
timer, mounted Portal progress, personal-capacity, exact-25, bounded-history, and regression
behaviors. It does not authorize a migration, production action, broad Firebase deploy, or queued
goal.

## Evidence findings

1. The owner-visible retry count is accurately bounded to the post-commit request reconciliation
   phase. The timer show/allocation batch has already committed when this result is produced.
   `retryShowCompletionReconciliation` accepts the stored failed request IDs and does not rerun the
   timer batch.
2. The precise live rejection cause is not yet established. Current structured results can
   distinguish request/item/allocation reads, eligibility, request write, commitment, remediation,
   and retry eligibility, but the current hook reduces repeated result failures to unchanged warning
   copy. A Rules relaxation, compatibility default, or migration would therefore be speculative now.
3. Existing selected-show queries encounter mapper-invalid records at several listener/list paths.
   Some paths currently warn on every emission and some timer paths skip invalid allocations. The
   amendment correctly requires participation-aware classification and deduplication instead of
   blanket suppression.
4. The Portal picker currently uses `ShowPickerOption.isSelectable`, `selectedId`, and native
   `disabled` for both inspection and allocation selection. That prevents pointer/keyboard
   inspection of terminal rows and confirms the amendment's need for two independent states.
5. The existing callable response already contains the bounded safe show/capacity/personal-usage
   fields required for inspection. The lower-bounded Function query need not change, and no
   additional read or validation call is justified.

## Binding review constraints

### 1. Preserve the post-commit boundary

Retry may call only completion reconciliation for the exact unresolved request-ID set captured by
the current Finish/retry session. It must never repeat the show write, allocation writes,
notifications, analytics, item writes, queue-tab writes, or expand by re-querying all requests for
the show. Store IDs only in transient in-memory state and do not render or persist them.

### 2. Make retry outcomes and commitment mechanically unambiguous

The retry controller must consume structured per-request outcomes, not infer success from a resolved
Promise. A resolved result containing failures is `partial_failure` or `failed`; a rejected
operation is `failed`; only zero unresolved retryable IDs is `succeeded`. Remediation-only results
must not be presented as retry success or remain on an enabled retry loop.

Before each attempt, transition synchronously to `retrying`, disable the control, increment the
attempt once, and expose an accessible pending announcement. On completion, atomically replace the
scope with only returned unresolved retry-eligible IDs. Already-terminal requests are successful
no-writes. Once resolved, a second invocation and remount are no-ops and cannot resurrect the
scope. Switching selected show or beginning another timer action invalidates the prior session.

### 3. Evidence must precede any compatibility, Rules, or data correction

Capture the real development retry manifest before choosing a correction. The manifest may include
only action/attempt, opaque operational IDs, path template, intended field names, current/proposed
status, parser and field-name classes, phase, Firebase code, commitment/outcome, retry eligibility,
and counts. It must exclude document bodies and customer/artwork/contact/notes/auth data.

- Do not add a compatibility default unless the missing/legacy field has an established safe
  semantic in the current data model and the mapper path is proven to be the failure.
- Do not change Firestore Rules unless an exact valid three-field request update is proven denied.
  A Rules change requires a failing-before emulator fixture, least-privilege passing-after coverage,
  documentation alignment, independent review, and its own `APPROVE DEV RULES DEPLOY` checkpoint.
- Do not migrate or silently repair records under this amendment.

If locally available evidence can only improve diagnostics and lifecycle presentation, implement
that truthful intermediate state and stop for the live evidence checkpoint; do not claim the
completion failure itself resolved.

### 4. Classify warnings by selected-operation participation

Use one shared diagnostic vocabulary for selected show, selected-show allocation, request, and item
records: missing/invalid required field names, safe legacy extras, parser compatibility,
Finish-required versus display-only fields, and whether the queried record participates in the
selected Finish.

Because the allocation query is already selected-show-scoped, a genuinely invalid allocation
returned by that query cannot be silently skipped if doing so could omit a Finish write or alter
completion math. It must block before the atomic batch with one actionable remediation message.
Invalid records outside the selected operation remain excluded and non-blocking. Compatible legacy
extras must not be labeled malformed.

Deduplication must be scoped to the mounted request/show action session and keyed by document path
plus normalized diagnostic field class. Identical listener emissions log once; a materially changed
diagnostic may log once again. Production-facing copy must remain safe and logs may contain only
opaque IDs and field names.

### 5. Separate inspection, allocation, and visual selection throughout the picker boundary

Replace the overloaded picker contract with explicit typed capabilities (for example `canInspect`
and `canAllocate`) and independent `inspectedId` and allocation-destination state. Do not merely
rename `isSelectable` while retaining `selectedId` as both concepts.

- Open eligible shows: inspectable and allocatable.
- Full, cutoff, bounded past, completed, and fully-printed shows: inspectable but not allocatable.
- Invalid/omitted records: neither.

Activating a non-allocatable row by pointer, Enter, or Space must update inspection details and clear
any stale destination/error/optimistic state. It must never invoke allocation validation or queue
submission. Automatic destination choice considers only `canAllocate` options and must not replace
an intentional historical inspection.

The submit and acknowledgment handlers must independently re-resolve the destination against the
current authoritative show DTO and reject unless `isAllocatable === true`, fit is valid, and all
existing gates pass. UI disabled/absence is not the security boundary; the unchanged callable
transaction remains final authority.

### 6. Preserve accessible read-only inspection

Inspectable rows remain native focusable buttons and therefore must not use native `disabled`.
Communicate selection and non-allocatable state with distinct accessible text/state; do not rely on
color or a `CLOSED` badge alone. Keyboard activation must execute the same inspection path as
pointer activation. The inspection panel must identify that the show is read-only/not available
for adding and expose only already-returned date/time, terminal/status, capacity/totals, and
customer personal usage fields.

### 7. Preserve bounded reads and deployment scope

Do not add a show listener, per-show lookup, validation call, or any N+1 read for historical
inspection. Preserve the existing start-of-current-month-minus-two-months lower-bound query and
current callable response. If neither Function code nor response schema changes, do not redeploy
`listPortalAllocatableShows`. Any actual Function change requires a separately reviewed exact
selector and `APPROVE DEV FUNCTION DEPLOY`; it cannot be bundled with Rules approval.

### 8. Required executable behavior evidence

Tests must execute the composed boundaries used by production code, not rely primarily on
source-presence/regex assertions or isolated formatters.

- Retry controller/hook: pending state before settlement; disabled repeat click; all-success;
  one retained failure; partial/full failure; remediation classification; mapped Firebase code;
  exact-scope replacement; already-terminal success; second retry no-op; action/show switch
  invalidation; remount non-resurrection; no duplicate side-effect calls.
- Warning pipeline: compatible legacy acceptance; selected participating invalid show/allocation
  blocks before batch; unrelated invalid record does not block; identical emission dedupes; changed
  diagnostic can re-emit; sanitized output contains no record values.
- Picker/modal: capability matrix; distinct inspected/destination IDs; pointer and Enter/Space
  inspection; focusability and accessible non-allocation copy; read-only details and personal usage;
  destination/error clearing; no validation/submission call for historical inspection; direct
  submit guard; unchanged open-show allocation and defaulting.
- Regression evidence: Finish/Portal terminal non-regression, ADR-FP-122 cumulative exact-25 and
  same-request defense, personal usage, show switching, and bounded query behavior.

Record exact commands, counts, exit codes, and known baselines for the Plan's complete verification
matrix. Independent Implementation Review 11 must inspect both the implementation and these
behavior tests before any deployment or owner QA.

## Verdict

**APPROVED_WITH_CHANGES.**

Implementation may proceed only with the binding constraints above incorporated into Plan Section
28/current workflow state. The review authorizes scoped implementation and tests, not deployment,
migration, owner QA, production action, signoff, or queued-goal work. If live evidence is required
to select the actual request-completion correction, stop after the diagnostic/lifecycle
implementation and obtain that evidence rather than guessing.
