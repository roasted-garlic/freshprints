# Portal Print Request Pre-Launch Stability — Amendment 14 Formal Review

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, Section 32  
**Review type:** Independent Formal Review  
**Verdict:** `APPROVED_WITH_CHANGES`

## Review independence and scope

This review does not defer to Amendment 13 Formal Review or Implementation Review 15. It compares
Section 32 directly with current Studio source, the installed Firebase SDK declarations, the
FreshForge workflow rules, and the current retry/reconstruction authority.

No application code, Firebase configuration, Rules, Functions, data, or deployment was changed by
this review.

## Verified current behavior

### Read-path matrix

| Phase | Current method | Application cache or in-flight reuse | Firestore source guarantee | Pending-write metadata | Result authority |
|---|---|---|---|---|---|
| Immediate first pass | request `getDoc`; items `getDocs`; allocations `getDocs` | none found on this path | default reads attempt current server data but may return cached data when the server cannot be reached | not inspected | provisional in Amendment 14 |
| Amendment 13 recheck | the same reconciliation method and ordinary reads, called again immediately for first-pass `failed` IDs | none found; a new SDK call is issued | same default-source behavior | not inspected | currently treated as final |
| Route remount reconstruction | `listShowAllocations`, then `retryShowCompletionReconciliation`, which reaches the same ordinary reconciliation reads | no reconciliation-result cache found | same default-source behavior, but later in time | not inspected | protected by `ShowProductionRetrySession` generation/show authority |
| Amendment 14 proposed verification | `waitForPendingWrites`, then server-only request/item/allocation reads | must bypass the ordinary path | `getDocFromServer` / `getDocsFromServer` | server snapshots should report `fromCache: false` and no local pending writes | final for that authoritative Finish/retry session |

Current source proves:

- `markShowPrintingFinished` awaits `batch.commit()` before reconciliation begins.
- Its first pass calls `markPrintRequestCompletedIfFullyPrinted` for the de-duplicated affected
  request IDs.
- Amendment 13 calls that same method once more only for first-pass `failed` IDs.
- Request, item, and allocation reads use ordinary `getDoc`/`getDocs`; no server-only read,
  metadata check, wait fence, service cache, or promise deduplication exists.
- The Amendment 13 first and second passes are sequentially awaited and merged by request ID. There
  is no still-running first-pass promise that can overwrite the second pass inside
  `markShowPrintingFinished`.
- Hook reconstruction and interactive Retry settlements are guarded by
  `ShowProductionRetrySession` show ID and generation tokens. That protection must remain.
- Remediation results are excluded from retry scope, and the three-state UI keeps
  remediation-only outcomes from rendering an enabled Retry button.

### Firebase SDK semantics

The installed SDK declaration documents that:

- `WriteBatch.commit()` resolves once the batch has been successfully written to the backend, and
  the results are reflected in reads after that promise resolves.
- `waitForPendingWrites()` waits for writes already pending when it is called and resolves
  immediately when none remain.
- default `getDoc`/`getDocs` attempt current server data, but may return cached data when the server
  cannot be reached;
- `getDocFromServer`/`getDocsFromServer` require server state and fail if the network is unavailable.

Therefore, the code evidence supports “Amendment 13 did not require authoritative server reads,”
but does **not** by itself prove that the awaited Finish batch was still pending after
`batch.commit()` resolved. A server-only bounded verification is still a valid and narrower way to
make immediate Finish truth equivalent to remount truth; `waitForPendingWrites` is a defensive
client-wide fence, not evidence that the awaited Finish batch lacked backend acknowledgement.

## Required changes before or during implementation

These are blocking implementation conditions under this `APPROVED_WITH_CHANGES` verdict.

### 1. Correct the causal claim and diagnostics interpretation

Amend Section 32.2/32.4 or the implementation/test report so it does not claim that the awaited
Finish batch remains unacknowledged after `batch.commit()` resolves. The proven Amendment 13 gap is
that both passes use the same non-forced default-source API and collect no source metadata. The
precise live cause remains a default-read/cache/timestamp-representation hypothesis until the new
bounded diagnostics capture it.

The retained diagnostic must distinguish:

- the provisional read source as `unknown` unless metadata was actually collected;
- the server-only verification as `server`;
- `timestampSettled` based on the mapped fields actually used by reconciliation, not merely inferred
  from `fromCache: false`;
- hashes/counts only. Raw show/request/allocation IDs, bodies, and customer data must not be logged.

### 2. Make the server-read service boundary explicit

Server-only SDK calls must remain in the existing services. Add explicit reconciliation read modes
or dedicated methods for:

- the exact request document;
- that request's item subcollection;
- allocations selected by the exact failed request ID.

The allocation query is bounded by exact candidate request IDs, although it returns all allocations
belonging to each candidate request rather than pre-known allocation document IDs. This matches the
approved quantity calculation and must not expand to all requests, all allocations, all shows, a
listener, route reload, timer, or polling loop.

Server-read failure must remain a retryable failure; it must not be converted to “complete” merely
to hide the warning.

### 3. Define one authoritative post-write result for interactive Retry

Section 32.3 says interactive Retry must verify committed state after its service invocation. The
implementation must make that concrete:

- either perform one final server-only request-state read after an acknowledged completion write;
- or return an explicit acknowledged-write result whose committed meaning is covered by tests and
  use that as the authoritative result.

Do not add an unbounded second lifecycle. The same `ShowProductionRetrySession` token must cover the
retry plus its verification, and a show switch, unmount, timer action, or newer generation must
discard the older settlement.

### 4. Preserve the actual outcome contract

`reconcileCompletedPrintRequest` currently treats:

- request/read/write SDK failures as `failed` and retry-eligible;
- malformed records as `needs_remediation` and not retry-eligible;
- an already completed/archived request as terminal;
- insufficient printed quantity as `not_eligible`, successful reconciliation with no completion
  write, and not retry-eligible.

Implementation and tests must not describe `not_eligible` as retryable unless the plan deliberately
changes that business rule, which Amendment 14 does not authorize. “Genuinely unfinished and
retryable” must mean a committed state for which completion is eligible but its authoritative
read/write could not complete. A genuinely malformed state remains remediation-only. If owner
acceptance instead requires an insufficient-quantity state to show Retry, that is a behavior change
outside this amendment and requires owner clarification before implementation.

### 5. Test the real orchestration boundary

Pure dependency simulations alone are insufficient. Focused tests must prove that:

- the first pass uses ordinary reads;
- only first-pass `failed` IDs enter server-only verification;
- remediation IDs never enter that pass;
- request, item, and allocation verification all use server-only methods;
- server snapshots with settled timestamps clear a provisional false failure;
- a server-read or eligible completion-write failure remains retryable;
- remediation remains non-retryable;
- an older hook/session settlement cannot overwrite verified completion;
- only one bounded verification lifecycle runs for Finish and one for an explicit Retry;
- no listener, polling, global cache clear, or broad collection scan was added.

## Architecture, security, and deployment findings

- The proposed ownership is correct: Firestore source selection belongs in services, not React
  hooks/components.
- No schema, Rules, Function, migration, capacity, historical-show, Portal-progress, timer redesign,
  or production behavior expansion is required.
- Server-only reads use the caller's existing Firestore authorization and must preserve current
  permission checks.
- Sanitized hashes/counts and enumerated classifications satisfy the privacy boundary if the raw
  result objects currently logged in development are not copied into the new diagnostic.
- No deployment is approved or required. Any unexpected Function or Rules change must stop at its
  separate owner approval gate.
- The queued goals remain out of scope.

## Verdict

`APPROVED_WITH_CHANGES`

Amendment 14 may proceed only with all five conditions above applied. The core bounded server-state
verification design is architecture-consistent and does not require deployment, but implementation
must not present `waitForPendingWrites` as proof of a post-`commit()` acknowledgement defect, must
preserve the existing `not_eligible`/retry/remediation distinctions, and must establish one
authoritative stale-protected result for both Finish and explicit Retry.
