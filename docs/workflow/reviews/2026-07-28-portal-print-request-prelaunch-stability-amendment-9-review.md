# Portal Print Request Pre-Launch Stability — Amendment 9 Formal Review

Date: 2026-07-28  
Plan: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`  
Reviewed scope: Section 27 / Amendment 9 only  
Reviewer role: independent FreshForge Formal Review Agent  
Verdict: **APPROVED_WITH_CHANGES**

## Gate decision

Amendment 9 may proceed to implementation only with every blocking constraint below treated as part
of the approved scope. The amendment is correctly numbered **Amendment 9** and the next independent
implementation review is correctly reserved as **Implementation Review 10**.

The plan is evidence-based and narrow:

- Finish has already committed the atomic show/allocation batch; the remaining warning is a
  downstream, request-scoped reconciliation failure.
- Portal has split mounted authorities: the live-show poll controls live wording while persisted
  request/allocation state controls the rail.
- Git history confirms that `listPortalAllocatableShows` introduced a lower-bounded two-month
  historical window in `36f4531c`, with later calendar inspection work in `60993c1b` and `0317a6d`.
  The current callable still performs that bounded query, but its response filter excludes a
  terminal show scheduled in the future.

No production action, data migration, queued-goal expansion, or Amendment 9 implementation is
authorized by this review.

## Accepted architecture

### A. Finish and reconciliation

The reviewed operation ordering is acceptable:

1. one atomic client batch updates the selected `upcomingShows/{id}` document;
2. the same batch updates mapper-valid, finishable `showAllocations/{id}` documents;
3. only after the batch resolves, deduplicated affected print requests are reconciled separately.

Request documents must remain outside the timer batch. Partial success must remain explicit:
committed timer/allocation work is not rolled back or mislabeled when request reconciliation fails.
The plan correctly makes any print-request Rules compatibility branch conditional on exact
failing-before emulator evidence and forbids a guessed migration or broad Rules relaxation.

### B. Mounted Portal stage

One request-scoped stage authority combining persisted request/allocation state and live show state
is the correct repair. The existing callable poll, gate, and polling controller remain the proper
transport. No Firestore listener, global poll, broad allocation query, second lifecycle field, or
permanent terminal poll is needed.

### C. Historical calendar

Restoring terminal shows from the already-returned bounded query result is the correct scope.
`completed|fully_printed` may be returned for display regardless of whether scheduled time is past,
while `canceled|archived` and `isArchived` remain excluded. Server-side queue eligibility remains
authoritative and terminal entries must carry `isAllocatable: false`.

## Blocking implementation constraints

### 1. Reconciliation must report commitment and retry scope precisely

Each affected request needs a structured, sanitized result with the plan's phase taxonomy. The
contract must distinguish at least:

- no write required because eligibility is already satisfied/not satisfied;
- structurally invalid/remediation-required;
- pre-write read or mapping failure;
- write rejected before commitment;
- write committed;
- post-write read/mapping failure after commitment.

A completion write that resolved must never remain in the retryable ID set merely because a
completion-only read failed afterward. Prefer avoiding that read; otherwise return an explicit
committed marker. Detailed manifests stay development-only and staff UI receives only safe failure
class/count and an actionable remediation category.

The retry scope must contain exactly the failed request IDs from the original Finish result. It must
not be rebuilt from all show allocations. Successful and remediation-required IDs are removed,
`completed|archived` requests never regress, and a second retry after success performs no write.
The in-memory scope must be reset when the selected show/action session changes. Tests must prove an
unrelated already-printed request on the same show is never retried.

### 2. Rules changes require observed-payload proof

Do not modify Firestore Rules unless a failing-before emulator fixture reproduces the exact
request-completion denial and proves that a mapper-compatible preserved legacy field is the sole
cause. If proved, the branch may allow only the observed source-status transition and exact changed
keys, must require active staff, caller identity, and timestamp types, preserve all other fields,
and exclude the transition from the ordinary full-schema branch.

Retain all 34 existing Rules tests. Add independently attributable owner/admin/helper success and
customer, inactive-staff, unrelated-field, identity, timestamp, invalid-transition, and
legacy-field mutation denials. A structurally invalid record is remediation work, not justification
for Rules compatibility.

### 3. Mounted stage needs a per-request monotonic watermark

A pure resolver alone is insufficient if it is recomputed only from whichever stale payload arrives
last. The composed request-detail session must retain the highest stage observed for the current
request using `done > printing > queued`. Reset that watermark only on request identity change.
Neither a stale live success/error nor a lagging persisted snapshot may regress `done` or
`printing`.

The same resolved stage value must drive the top label, status chip, progress rail, and
detail-local terminal presentation in one render. Tab grouping may receive an exact-request patch
or reload, but the mounted detail fix cannot depend on a full-list refresh. Polling must stop on the
effective terminal watermark and invalidate pending generations on request switch, hidden state,
disable, terminal, and unmount.

Behavior tests must execute the composed production boundary with deferred responses and controlled
time: Queued → Printing → Done without remount, chip/rail agreement, stale success and stale error,
terminal non-regression, remount parity, focus/visibility coalescing, single-flight behavior,
request switch, hidden/terminal/unmount cleanup, and absence of a customer elapsed clock. Record
measured developer-test latency and retain the 5–10 second target.

### 4. Historical inspection must not become destination selection

The current picker deliberately calls
`getDefaultShowPickerOptionId(..., allowInspectOnly = true)` and invokes `onSelect` for a closed-only
date or when no selectable option exists. Its slot button also uses `aria-disabled` while still
calling `onSelect`. Amendment 9 must remove that destination-selection behavior for terminal and
historical entries.

Calendar date inspection and allocation destination selection must be separate states:

- a historical-only date can reveal its slots;
- no terminal/historical slot invokes `onSelect`;
- it never becomes the allocation `selectedId`;
- automatic/default selection considers eligible options only;
- historical-only results leave the Add-to-Show destination empty and submission disabled;
- capacity and personal-limit validation are not invoked for a historical entry.

Use native disabled semantics where compatible, or an equivalently tested non-interactive
presentation. Terminal meaning must be visible and programmatically announced without relying on
color. Tests must cover click and keyboard non-selection, historical-only dates, mixed historical
and eligible dates, eligible default preference, and stale-error clearing.

### 5. Bounded server response and deployment selector

The callable must keep the existing lower bound:

`scheduledStartAt >= start of current month minus two months`.

Do not add an all-history query, second show query, N+1 historical usage read, or client-side
eligibility inference. Tests must prove a just-finished future show and bounded past show are
returned disabled; open future remains selectable; cutoff/full retain existing policy; and
canceled, archived, `isArchived`, out-of-window, and unscheduled non-display records remain handled
according to the established contract.

Because restoring the omitted terminal response necessarily changes
`listPortalAllocatableShows`, successful verification and Implementation Review 10 must be followed
by a separate approval checkpoint for exactly:

```text
APPROVE DEV FUNCTION DEPLOY
firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev
```

If and only if the evidence-gated Rules branch is implemented, stop at a second, separate checkpoint:

```text
APPROVE DEV RULES DEPLOY
firebase deploy --only firestore:rules --project fresh-prints-dev
```

The approvals may not be combined. Unchanged Amendment 7/8 Functions or Rules must not be
redeployed.

### 6. Verification and regression evidence

Implementation Review 10 must inspect behavior tests, not rely primarily on source-presence or
regular-expression assertions. It must verify:

- exact Finish manifest and exact failed request phase/field class;
- transient retry, remediation-required non-retry, idempotency, terminal non-regression, and exact
  retry scope;
- one mounted monotonic stage authority and composed lifecycle tests;
- bounded historical response and true non-selection/accessibility;
- preserved personal-use wording and show-scoped authority;
- exact-25 allow, over-25 denial, same-request denial, and existing smoke behavior;
- no migration, production action, or queued customer-upload goal work.

Run the full command matrix in Section 27.5 and report exact exit codes/counts. Non-zero Studio build
or repository lint results must be recorded honestly and intersected with changed lines; known
baselines must not be weakened or silently relabeled.

## Non-blocking observations

- A typed display reason may improve accessibility, but it is not required if
  `productionStatus` plus `isAllocatable` produces unambiguous typed UI behavior. Any response-type
  change must be shared across Function and clients and covered by tests.
- Historical personal usage may continue to use the existing single customer-allocation query. It
  must not cause another query and must not make historical entries eligible.
- Generic incomplete-record warnings remain evidence to classify. They must not be suppressed or
  assumed to explain the one failed request until the per-request manifest proves participation.

## Handoff

Proceed to Amendment 9 implementation within the reviewed scope and constraints above. After
focused and full verification, create **Implementation Review 10** with an independent reviewer.
Do not deploy, begin owner QA, sign off this goal, start queued goals, or take production action
before that review passes and each applicable dev deployment receives its own exact owner approval.
