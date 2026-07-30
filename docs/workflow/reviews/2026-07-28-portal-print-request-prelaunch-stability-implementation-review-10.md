# Portal Print Request Pre-Launch Stability — Implementation Review 10

- **Date:** 2026-07-28
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
- **Reviewed scope:** Section 27 / Amendment 9 only
- **Reviewer role:** independent FreshForge Implementation Review Agent
- **Verdict:** **APPROVED** (final remediation re-review; supersedes the initial blocked verdict)

## Gate decision

Amendment 9 may not proceed to either dev deployment checkpoint or owner QA. The implementation
contains three blocking contract violations and the test report does not provide the composed
behavior evidence required by Formal Review. No production action or deployment occurred during
this review.

The bounded Function query and display mapping are directionally correct, and the completion-only
request write appropriately avoids a post-write read. Those parts do not offset the blockers below.

## Blocking findings

### 1. Remediation-required request IDs are incorrectly presented and retained as retryable

Plan 27.2 and Formal Review constraint 1 require permanently invalid/remediation-required records
to be removed from the retry scope. The implementation instead builds `failedRequestIds` from both
`failed` and `needs_remediation` outcomes in
`upcomingShowService.ts:1554-1558` and again after retry at `:1594-1598`. The hook then enables the
Retry action and stores that combined set at `useShowProductionTimer.ts:133-138` and `:171-175`.

Consequences:

- an incomplete allocation classified as `needs_remediation` is retried indefinitely;
- staff receives “need retry” wording for a record that cannot be repaired by retry;
- the retained set is not the exact transient failed-ID set required by the reviewed contract.

The pure reconciliation test proves that malformed allocation data becomes `needs_remediation`,
but there is no service/hook boundary test proving that such an ID is excluded from retry. This
must be corrected before review can pass.

### 2. The structured reconciliation manifest is materially incomplete

`ShowCompletionReconciliationResult` in
`showCompletionReconciliation.ts:20-27` contains only request ID, outcome, phase, and a free-form
error message. It does not implement the approved sanitized manifest fields: parser status, exact
missing field names, legacy extra field names, current/proposed status, write-required flag,
Firebase error code, explicit success/failure, commitment, or retry eligibility.

This means the implementation cannot distinguish or evidence:

- mapper/parser failure versus an ordinary read failure;
- a missing operational field versus an observed preserved legacy field;
- transient write rejection versus permanent remediation;
- exact safe staff-facing failure category and exact development-only field class.

The unguarded warning at `upcomingShowService.ts:1560-1571` logs the free-form `errorMessage`,
despite the plan requiring a sanitized development-only detailed manifest. The test report's claim
of “explicit request/item/allocation/write reconciliation phases” is narrower than the required
contract and does not establish the missing diagnostic fields.

### 3. The Firestore Rules change was not authorized by the evidence gate and is broader than the
exact observed transition

Formal Review constraint 2 authorizes a legacy completion Rules branch only after an exact
failing-before emulator fixture proves that a mapper-compatible preserved legacy field is the sole
cause. The test report explicitly states that the Rules emulator did not run because Java is
unavailable and substitutes the owner runtime failure as evidence. That runtime warning did not
identify an exact legacy field or prove it was the sole denial cause. The checked-in
`legacyImportMarker` fixture is therefore hypothetical, not an observed failing-before payload.

Additionally, `staffCanCompleteLegacyPrintRequest()` at `firestore.rules:473-483` permits three
source statuses (`draft`, `active`, and `editing`) rather than the exact observed source status
required by the review. The added tests do not independently cover active owner/admin/helper
success, inactive staff, identity mismatch, timestamp failures, every invalid source transition,
legacy-field removal, and the current full-suite count required by Formal Review.

The Rules change must be reverted unless exact emulator evidence is first obtained. If exact
evidence is obtained, the branch and tests must be narrowed to that observed payload and transition.
A Rules deployment checkpoint is not available while this blocker remains.

### 4. Polling does not stop on the effective terminal watermark

The mounted ref in `PrintRequestDetailView.tsx:282-296` preserves the maximum observed stage and is
used for the panel rail/chip. However, the hook is enabled for every non-`working` persisted stage
at `:283`. Inside `usePortalShowPrintProgress.ts:113-117`, terminal state is derived only from the
latest live `primaryShow`; the polling decision at `:132-138` never receives the effective mounted
`done` watermark.

Therefore, when persisted state or the mounted watermark is `done` while live data is absent or
stale nonterminal, the detail can continue polling indefinitely. This violates the explicit
“mounted + visible + effective-nonterminal only” and “stop polling on effective terminal
watermark” requirements.

The resolver unit test proves monotonic arithmetic only. Existing gate/controller tests exercise
separate utilities, not the composed production boundary connecting the watermark to hook
enablement. The implementation needs a single composed authority that also controls polling.

### 5. Required composed UI behavior evidence is absent

Formal Review required behavior-level production-boundary tests for:

- Queued → Printing → Done without remount with chip/rail agreement;
- stale success and stale error after request switch;
- effective-terminal polling stop and cleanup;
- historical slot click and keyboard non-selection;
- historical-only destination clearing/submission disable;
- mixed eligible/historical default selection and stale-error clearing;
- no capacity/personal validation for historical rows.

The Amendment 9 additions are pure resolver/view-model tests:

- three stage resolver assertions in `portalPrintProgressStage.test.ts`;
- one terminal option assertion in `buildShowPickerOptions.test.ts:65`;
- two visibility-helper tests in `portalCalendarShowVisibility.test.ts:11-39`.

Native `disabled` on `ShowPicker.tsx:166` and selectable-only defaults at `:353-370` are good source
changes, but no mounted component test executes click/keyboard/default/clear/submission behavior.
Likewise, no test mounts `PrintRequestDetailView` and the polling hook together. The test report
also omits the required measured developer-test latency and the 5–10 second target.

The report must be revised after adding and running the required behavior tests; source inspection
cannot substitute for this binding review condition.

## Accepted implementation details

The following inspected changes conform to the approved direction:

- `markPrintRequestCompletedForShowReconciliation` performs the narrow completion write without a
  post-write read, so a resolved write is not mislabeled by a later mapper failure.
- Terminal request states are checked before writing, preserving idempotency and non-regression in
  the pure reconciliation path.
- The Portal stage resolver uses monotonic precedence `done > printing > queued` and resets its
  ref on request identity change.
- The show picker uses native disabled slot buttons and selectable-only automatic defaults.
- `listPortalAllocatableShows` retains the existing single lower-bounded
  `scheduledStartAt >= start of current month minus two months` query, excludes archived/canceled
  rows before response construction, and performs no second show query.
- A just-finished future terminal show is restored as non-allocatable display data.
- Function and Rules selectors are documented as separate checkpoints; no deployment occurred.

These accepted details should be preserved while addressing the blockers.

## Test and verification assessment

Recorded local results are accepted as reported:

- focused suite: 37/37 pass;
- Portal typecheck: exit 0;
- Functions build: exit 0;
- changed-file ESLint: exit 0;
- `git diff --check`: exit 0;
- Studio typecheck: exit 2 against documented existing baseline;
- Rules emulator: not executed because Java is unavailable.

The limitations are honestly stated, but they are material rather than non-blocking because the
Rules change is evidence-gated and Formal Review explicitly required composed behavior coverage.
The report also does not list the exact focused commands/count attribution, repository lint result,
TypeScript version, or measured polling latency requested by Plan 27.5.

## Required changes before re-review

1. Split transient `failed` IDs from `needs_remediation`; only transient failures may populate the
   Retry action/set. Render a distinct safe remediation category and prove the set shrinks exactly.
2. Implement the approved typed sanitized manifest, including parser/field classes, status/write
   intent, Firebase code, commitment, and retry eligibility. Keep detailed records development-only.
3. Revert the new print-request Rules compatibility branch unless an exact failing-before emulator
   payload proves it necessary. If proved, narrow it to the observed source state and add the full
   independently attributable least-privilege matrix.
4. Feed the effective mounted terminal stage into polling enablement/termination and behavior-test
   the composed detail boundary.
5. Add mounted ShowPicker/Portal modal behavior tests for true historical non-selection, clearing,
   submission disable, mixed defaults, and validation non-invocation.
6. Rerun the complete Plan 27.5 matrix, record exact commands/exit codes/counts and latency, then
   request a new independent implementation review.

## Deployment disposition

Do not request or execute:

```text
APPROVE DEV FUNCTION DEPLOY
firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev
```

Do not request or execute:

```text
APPROVE DEV RULES DEPLOY
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Both remain blocked pending corrected implementation, verification, and a passing independent
implementation review. The two approvals must remain separate if the Rules change ultimately
survives its evidence gate.

---

## Remediation re-review

- **Re-review date:** 2026-07-28
- **Authoritative final verdict:** **BLOCKED**

The remediation resolves four of the five original finding areas:

1. `summarizeShowCompletionReconciliation` now separates transient `failedRequestIds` from
   non-retryable `remediationRequestIds`. The hook enables Retry only for the transient set and
   renders distinct remediation wording.
2. The hypothetical print-request Rules branch and its speculative tests were reverted. Amendment 9
   now makes no Rules change, so no Amendment 9 Rules checkpoint is authorized or required.
3. `resolvePortalMountedProgressAuthority` now returns the same monotonic stage used by the mounted
   detail and `pollingEnabled: false` for `done`; `PrintRequestDetailView` feeds that value into the
   polling hook before applying live advancement.
4. The shared ShowPicker selection/activation boundary is used by the production component for
   default selection, destination clearing, and guarded slot activation. The added tests cover
   historical-only clearing, mixed eligible preference, activation denial, polling progression,
   effective-terminal stop, stale success/error rejection, single flight, and cleanup.

The updated report records **50/50 passing focused tests in 1,397 ms**, Portal typecheck exit 0,
Functions build exit 0, scoped lint exit 0, diff check exit 0, and the unchanged Studio typecheck
baseline exit 2. Those limitations are now stated honestly.

### Remaining blocker — invalid-record field diagnostics are still discarded

The expanded result type contains the approved manifest field names, but the production error paths
do not populate them when they matter:

- `getPrintRequestForShowReconciliation` computes `missingFields` and `legacyExtraFields`, then calls
  `mapPrintRequestData`. If mapping throws, `runPhase("request_read", ...)` receives only the generic
  exception and returns `parserStatus: "unknown"`, `missingFields: []`, and
  `legacyExtraFields: []`. The precomputed diagnosis is lost.
- `PRINT_REQUEST_MAPPER_REQUIRED_FIELDS` only treats `null|undefined` as missing. A wrong-typed
  required value (for example string `itemCount` or non-timestamp audit data) makes the mapper fail
  while the manifest still cannot identify the invalid field.
- `listShowAllocationsForPrintRequestForReconciliation` catches the allocation mapper error and
  throws `ShowCompletionReconciliationRemediationError` containing only a free-form message.
  `runPhase` deliberately does not expose that message, but it also has no structured field payload,
  so the result again reports empty field arrays.

This does not satisfy Plan 27.2's requirement to record exact missing operational field names or
Formal Review constraint 6's requirement to verify the exact failed request phase/field class. It
also means the next live owner reproduction cannot produce the evidence needed to distinguish a
safe compatibility case from bounded data remediation—the central purpose of Workstream A.

The focused tests assert phase, commitment, and retry eligibility, but do not assert a real
mapper-invalid request/allocation returns its exact structured missing/invalid fields. The test
report's statement that every result includes missing/extra field names describes the shape, not
the actual failure-path content.

### Required final correction

1. Add a structured diagnostic payload to the remediation/error path (or diagnose before mapping)
   that retains exact missing **and invalid-type** operational field names plus safe legacy-extra
   names.
2. Propagate that payload through `runPhase` into
   `ShowCompletionReconciliationResult` without document values, IDs beyond the request identifier,
   or free-form record contents.
3. Add production-boundary tests using genuinely mapper-invalid request and allocation documents,
   asserting the exact phase, parser state, field class, non-retryable remediation disposition, and
   absence from `failedRequestIds`.
4. Rerun the focused/static matrix and request another independent remediation re-review.

### Final deployment disposition

The narrow Function implementation remains directionally acceptable, but the managed Amendment 9
gate is still blocked as a whole. Do not request or execute the
`functions:listPortalAllocatableShows` dev deployment until this remaining Workstream A requirement
is corrected and the implementation review passes. No Rules deployment is part of Amendment 9.

---

## Final remediation re-review

- **Final re-review date:** 2026-07-28
- **Authoritative final verdict:** **APPROVED**

This section supersedes both earlier blocked dispositions in this artifact. The final remaining
diagnostic blocker is resolved.

### Evidence inspected

- `ShowCompletionReconciliationRemediationError` now carries only sanitized
  `missingFields`/`legacyExtraFields`. `runPhase` preserves those arrays, marks the parser
  `incompatible`, classifies the outcome `needs_remediation`, and makes it non-retryable.
- `diagnosePrintRequestForCompletion` validates every mapper-required primitive and Firestore
  timestamp by type, records wrong-typed or absent fields by field name, and sorts legacy-extra field
  names without retaining their values.
- `getPrintRequestForShowReconciliation` runs that production diagnostic before strict mapping and
  throws the typed remediation error with the preserved diagnostics if mapping rejects.
- Allocation reconciliation diagnoses the raw allocation with
  `diagnoseShowAllocationForTimer` before strict mapping, then carries exact missing/invalid and
  legacy-extra field names through mapper failure.
- `withRequestManifest` merges request and later-phase diagnostics without allowing a compatible
  request parser result to overwrite an incompatible allocation result.
- Tests exercise a real wrong-typed `itemCount`, missing `updatedAt`, a legacy-extra field whose
  value is not emitted, request-read propagation, allocation-read propagation, parser state,
  non-retryability, and separation from transient retry IDs.

The focused Amendment 9 suite is now recorded as **55/55 pass in 1,437 ms**. Portal typecheck,
Functions build, scoped changed-file lint, and `git diff --check` pass. Studio typecheck remains the
honestly documented pre-existing exit-2 baseline with no Amendment 9 service/utility intersection.
No Rules emulator is required because the speculative Amendment 9 Rules branch was removed and
Amendment 9 makes no Rules change.

### Final scope conclusion

Implementation now satisfies the reviewed Amendment 9 contract:

- the show/allocation batch remains atomic and request reconciliation remains post-commit;
- results distinguish no-write, remediation, transient failure, and committed write;
- only exact transient IDs remain retryable, terminal requests do not regress, and completion has
  no post-write read;
- the mounted Portal stage is monotonic and the same effective terminal authority stops polling;
- bounded terminal calendar history remains visible while destination selection remains genuinely
  disabled and empty for inspect-only results;
- the existing lower-bounded Function query is preserved;
- no migration, production action, queued-goal work, or Amendment 9 Rules relaxation occurred.

### Deployment disposition

Implementation Review 10 now passes. Proceed only to the separate owner checkpoint for exactly:

```text
APPROVE DEV FUNCTION DEPLOY
firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev
```

Do not deploy before that explicit approval. No Amendment 9 Rules deployment should be requested.
After the narrow dev Function deployment is verified, proceed to the reduced owner QA in Plan
Section 27.5; do not sign off or start queued goals before owner QA passes.
