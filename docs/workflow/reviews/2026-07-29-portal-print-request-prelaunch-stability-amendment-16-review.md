# Portal Print Request Pre-Launch Stability — Amendment 16 Formal Review

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, Section 34 / Amendment 16  
**Reviewer:** independent Formal Review  
**Verdict:** `APPROVED_WITH_CHANGES`

## Independent evidence reviewed

This review did not defer to Amendment 15 or its reviews. It independently inspected:

- owner QA v17 evidence: `request_write (permission-denied)`;
- current `firestore.rules`, including `isStaff`, print-request schema/assignment/origin predicates,
  and `/printRequests/{printRequestId}` update authorization;
- `printRequestService.markPrintRequestCompletedForShowReconciliation`;
- `printRequestCompletionDiagnostics`;
- shared `PrintRequest`/queue-tab types;
- Studio queue-tab list/count query architecture;
- `backfillPrintRequestQueueTab` and `onPrintRequestQueueTabInputsWritten`;
- `queuePortalPrintRequestToShow`;
- architecture/data-model/decision documentation; and
- current Firebase Rules test organization.

No application code, Rules, Plan, deployment, or production state was changed by this review.

## Findings confirmed

### The completion payload and Rules path are accurately stated

The production service performs one `updateDoc` with exactly:

```text
status: "completed"
updatedBy: caller.id
updatedAt: serverTimestamp()
```

It performs Studio permission gating and undefined-field validation first. Because Firestore Rules
evaluate `request.resource.data` as the complete post-update document, the three-field patch still
must satisfy the whole-document `printRequestRequiredFieldsValid()` predicate.

The current whole-document `hasOnly` list omits `queueTab`. `queueTab` is an optional current-schema
field in the shared type, is queried by Studio, and is maintained by backend backfill/trigger code.
Therefore the Plan correctly treats `queueTab` as a strong hypothesis and correctly withholds
permission to edit Rules until a failing-before emulator A/B proves the exact predicate.

The proposed enum is accurate: `working | queued | printing | printed`. It must remain optional for
pre-backfill documents and immutable to client writes; Admin SDK maintenance is unaffected by
Firestore Rules.

### Sequencing, privacy, and deployment gates are sound

The required sequence is correct:

1. independent Formal Review;
2. failing-before emulator proof;
3. narrow evidence-selected correction;
4. focused/full verification;
5. independent Implementation Review 18;
6. explicit `APPROVE DEV RULES DEPLOY` checkpoint if Rules changed;
7. dev-only Rules deployment and verification before owner QA.

No automatic deployment, combined deployment, migration, Function change, queued goal, production
action, or production release is authorized. The diagnostic categories are structural and
sanitized; no raw IDs, customer values, document bodies, credentials, or tokens may be logged.

## Binding change 1 — the emulator matrix must isolate a second current-schema allowlist mismatch

Current source contains another material allowlist mismatch not named in Section 34:

- shared `PrintRequest` includes optional `showQueueBiddingAcknowledgment`;
- `queuePortalPrintRequestToShow` writes that field to the request using Admin SDK when a Portal
  request is queued to a show;
- the permanent data model and ADR decision record it as current architecture; and
- `printRequestRequiredFieldsValid().keys().hasOnly(...)` omits it.

`printRequestCompletionDiagnostics.KNOWN_FIELDS` also omits both `queueTab` and
`showQueueBiddingAcknowledgment`, so both current fields are presently reported as legacy extras.

The initial A/B proposed by Section 34.3—remove only `queueTab`—may remain denied when the otherwise
live-shaped fixture contains the binding acknowledgment. That would not disprove the allowlist
diagnosis; it would prove two independent current-schema omissions.

Before any Rules mutation, the failing-before matrix must use one common otherwise-valid request and
test at least:

| Fixture | `queueTab` | `showQueueBiddingAcknowledgment` | Expected under current Rules |
|---|---:|---:|---|
| legacy/minimal control | absent | absent | completion allowed |
| queue-tab isolation | present and valid | absent | completion denied |
| acknowledgment isolation | absent | present and valid | completion denied |
| live Portal-queued shape | present and valid | present and valid | completion denied |

Each row must use the same active owner identity and exact three-field completion patch. The
acknowledgment fixture must match the documented nested shape and valid timestamp representation.

Only fields independently proven to cause denial may be added to the Rules schema. If the
acknowledgment is confirmed, the narrow correction must:

- add only that named current field;
- validate its exact nested shape/types (`accepted == true`, timestamp, non-empty actor/version/show
  strings);
- keep it optional for requests that predate the feature; and
- require it unchanged for client updates.

Diagnostics must classify both current fields as known, validate enum/nested shape structurally,
and continue to report truly unknown legacy names without values.

If any control still fails, stop before changing Rules and investigate identity, deployed/local
Rules drift, assignment/origin, timestamps, and other whole-document predicates.

## Binding change 2 — completion hardening must not break unrelated legitimate staff updates

The existing staff update branch is general-purpose. Studio uses it for request-detail edits and
other valid non-completion operations. Section 34.4’s phrase that fixtures “must pass only for the
exact `active|editing` ... to `completed` completion operation” must be scoped to the completion
transition, not interpreted as replacing all staff updates with a completion-only branch.

The correction must preserve existing authorized non-completion behavior while applying a narrow
completion predicate. For a transition whose proposed status is `completed`, Rules must require:

- previous status exactly `active` or `editing`, matching actual reconciliation eligibility;
- affected keys limited to `status`, `updatedBy`, and `updatedAt`;
- authenticated active owner/admin/helper;
- `updatedBy == request.auth.uid`;
- valid server-resolved timestamp;
- immutable creation, assignment, origin, customer/guest, queue-tab, acknowledgment, and all other
  fields; and
- the complete post-merge document passes current-schema validation.

The implementation must explicitly decide and test the non-completion branch so the new completion
predicate cannot be bypassed by the pre-existing broad staff-update expression. Parentheses or
named helper predicates should make branch precedence unambiguous.

At minimum, failing-before/passing-after tests must cover:

- `active -> completed` and `editing -> completed`;
- `draft -> completed`, `completed -> completed`, `archived -> completed`, and invalid statuses;
- completion plus an unrelated field mutation;
- queue-tab and acknowledgment mutation;
- assignment/origin/customer/guest mutation and malformed mixed assignment;
- creation-field mutation, wrong `updatedBy`, invalid timestamp;
- active owner/admin/helper success;
- inactive staff, customer, and signed-out denial;
- optional current fields absent and present;
- an unknown legacy field remaining denied; and
- representative existing non-completion staff detail updates remaining unchanged.

Customer update behavior must remain constrained by its existing editable-status and affected-key
rules. Admin SDK queue-tab/acknowledgment maintenance remains outside client Rules and must not be
reimplemented in Studio.

## Binding change 3 — test the exact deployed-risk boundary before requesting deployment

The Rules report must record the exact failing-before and passing-after emulator outcomes for each
factorial fixture, including which single field changed between paired fixtures. A test that only
asserts a generic permission denial is insufficient.

Service/controller tests must separately prove:

- the client payload remains exactly three fields;
- server timestamp and authenticated UID are used;
- permission denial remains safely classified at `request_write`;
- one explicit Retry invokes once;
- duplicate/stale/show-switch/unmount protection remains;
- exact success clears the retry scope; and
- remediation remains non-actionable.

No Function change is required to validate existing Admin SDK writers. If implementation unexpectedly
changes a Function, it is out of the approved correction and must stop for a separate scope/review
decision.

## Final gate

**Verdict: `APPROVED_WITH_CHANGES`.**

Implementation may begin with the emulator failing-before matrix. Rules may be edited only after
that matrix proves the exact current-schema omissions, and only with the three binding changes above
applied. Implementation Review 18 must independently verify the actual Rules expression, branch
precedence, regression coverage, diagnostics privacy, and test outputs rather than relying on the
implementation narrative.

If `firestore.rules` changes and Review 18 approves, the mandatory next checkpoint remains exactly:

```text
APPROVE DEV RULES DEPLOY
```

No dev or production deployment is approved by this Formal Review.
