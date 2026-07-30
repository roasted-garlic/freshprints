# Portal Print Request Pre-Launch Stability — Implementation Review 18

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, Section 34 / Amendment 16  
**Reviewer:** independent Implementation Review 18  
**Final verdict:** `APPROVED_WITH_CHANGES`

## Independence and scope

This review inspected the current implementation and executed its Rules boundary independently. It
did not defer to Amendment 15, Implementation Review 17, the Amendment 16 Formal Review verdict, or
the implementation narrative. No application code, Rules, Plan, test, deployment, or production
state was changed by this reviewer; only this review artifact was created.

Inspected evidence included:

- `firestore.rules`;
- `tests/firebase/printRequestCompletion.rules.test.ts` and the root `test:rules` script;
- the exact completion payload builder, its production service call site, and its unit test;
- completion diagnostics and their tests;
- shared `PrintRequest` types, the Portal queue writer, and the queue-tab maintenance Function;
- the production retry controller/session and related preservation tests;
- the Amendment 16 test report and recorded failing-before factorial results; and
- relevant architecture/data-model documentation.

## Findings

### Root cause and exact production write are proven

`markPrintRequestCompletedForShowReconciliation` calls the production
`buildPrintRequestCompletionPayload(caller.id)` and performs one `updateDoc`. The builder returns
exactly `status: "completed"`, authenticated `updatedBy`, and a Firebase `serverTimestamp()`
sentinel. Its executable unit test verifies the exact key set, UID, sentinel, and absence of
undefined values.

The recorded pre-correction emulator matrix used one otherwise-identical request and reports:

| Current-field shape | Pre-correction result | Current result |
|---|---|---|
| neither field | allowed | allowed |
| `queueTab` only | denied | allowed |
| acknowledgment only | denied | allowed |
| both/live Portal shape | denied | allowed |

This is consistent with the inspected pre-correction diff: both current optional fields were absent
from `printRequestRequiredFieldsValid().keys().hasOnly(...)`. The fields are not speculative.
`queueTab` is maintained by existing Admin SDK Functions, while
`showQueueBiddingAcknowledgment` is written by `queuePortalPrintRequestToShow` with the same nested
shape now validated by Rules.

### The Rules correction is narrow and branch precedence is safe

The whole-document schema adds only the two independently proven current fields. Both remain
optional. `queueTab` is restricted to the four current enum values. The acknowledgment must be a
map containing only its five expected keys, `accepted == true`, a timestamp, and non-empty actor,
version, and show strings.

The named completion branch requires:

- current status exactly `active` or `editing`;
- proposed status exactly `completed`;
- affected keys limited to `status`, `updatedBy`, and `updatedAt`;
- the complete proposed document to pass current schema, assignment, origin, and timestamp checks;
- immutable `createdBy` and `createdAt`; and
- `updatedBy == request.auth.uid` for an authenticated active owner/admin/helper through `isStaff`.

The general staff branch explicitly excludes every proposed `completed` status, so it cannot bypass
the completion predicate. It preserves the established completed-to-archived path and ordinary
non-completion edits. It now also requires `queueTab` and the acknowledgment to remain unchanged,
making these server-maintained fields immutable on all client staff updates, not only completion.
The customer branch remains under its pre-existing editable-status and affected-key restrictions.
There is no broad staff bypass, unknown-field compatibility branch, migration, new read, listener,
or poll.

### Authorization and mutation coverage is sufficient

The passing-after fixture covers both valid source statuses and active owner/admin/helper. It denies
draft/completed/archived and invalid-status completion; customer, signed-out, and inactive staff;
wrong identity and invalid timestamp; unrelated changes; queue-tab and acknowledgment mutation;
ownership, creation timestamp, origin, customer, and guest changes; malformed current-field shapes;
mixed assignment; and unknown legacy fields. It also proves a representative notes edit remains
allowed, a completed regression remains denied, and a general staff queue-tab edit remains denied.

The first review pass found that invalid proposed status and `createdAt` mutation were required by
the Formal Review but not directly exercised. Those assertions were added before this final verdict.
No Rules or application behavior had to change.

### Diagnostics and retry behavior remain safe

Completion diagnostics now recognize both current fields and emit only structural classifications:
`valid`, `invalid`, or `absent`, plus field names for missing/unknown structure. They do not emit
field values, document bodies, raw customer identifiers, acknowledgment contents, credentials, or
tokens.

The production retry controller still acquires synchronously before invoking once, retains
duplicate exclusion, checks show/generation authority before applying results, releases every
acquired path in `finally`, preserves retry availability after a genuine rejection, clears exact
scope on success, and leaves remediation non-actionable. Amendment 16 did not broaden this
controller/session behavior.

## Independent verification

Portable runtime:

```text
JAVA_HOME=C:\Users\Roasted Garlic\.codex\tools\temurin-21\jdk-21.0.9+10
OpenJDK 21.0.9 LTS
DEBUG unset
```

Commands run by this reviewer:

| Command | Exit | Result |
|---|---:|---|
| `npm run test:rules` | 0 | 47/47 passed before the two missing assertions were added |
| `npx firebase emulators:exec --only firestore "npx tsx --test tests/firebase/printRequestCompletion.rules.test.ts"` | 0 | final narrow suite 14/14 passed |

The implementation agent subsequently reran the full Rules command after adding the assertions:
exit `0`, 48/48 passed. Expected `PERMISSION_DENIED` emulator messages correspond to negative
assertions and are not test failures.

The Amendment 16 report also records focused service/diagnostic/reconciliation/controller tests
61/61 and the full affected Studio suite 143/143. Portal typecheck and build exit `0`; Studio build
remains exit `2` with the documented 29-error baseline; repository lint remains exit `1` with 41
baseline findings; changed-file lint and `git diff --check` exit `0`. No non-zero command is treated
as clean.

## Deployment and production boundary

No Function source was changed for Amendment 16. No Function deploy, Rules deploy, migration,
Firebase console action, queued-goal work, or production action occurred. The existing backend
writers were inspected only to establish that the newly recognized fields are current architecture.

## Verdict and required next gate

**`APPROVED_WITH_CHANGES`**

The two blocking test-coverage omissions found during review were corrected and independently
rechecked. No blocking finding remains. Amendment 16 is least-privilege, preserves genuine retry and
general staff behavior, and is ready for the explicit dev Rules deployment checkpoint.

The next owner action must be exactly:

```text
APPROVE DEV RULES DEPLOY
```

That approval authorizes only the documented development Firestore Rules deployment. It does not
authorize production deployment, Function deployment, owner QA, signoff, or queued-goal work.
