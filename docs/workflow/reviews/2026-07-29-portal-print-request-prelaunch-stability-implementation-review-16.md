# Portal Print Request Pre-Launch Stability — Implementation Review 16

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, Section 32 / Amendment 14  
**Review type:** Independent Implementation Review  
**Verdict:** `APPROVED`

## Final re-review

The initial review returned `REJECTED` on three blocking findings. The implementer corrected all
three within Amendment 14, without application-scope expansion or a new Plan amendment. This final
verdict is based on a fresh source inspection and independent focused test run after those
corrections.

## Independence and scope

This review does not defer to Amendment 14 Formal Review, Implementation Review 15, or the
implementer's test report. It compares the current implementation and tests directly with the Plan,
the Formal Review's blocking conditions, and current production reconciliation code.

Only this review artifact was created. No application code, Firebase configuration, Rules,
Functions, data, deployment, or production action was changed.

## Verified implementation facts

### Firestore read sources

- The immediate Finish first pass still calls
  `markPrintRequestCompletedIfFullyPrinted(caller, printRequestId)` with the default source.
- The request, item, and allocation default paths use `getDoc` / `getDocs`. They do not inspect
  `fromCache` or `hasPendingWrites`.
- The Amendment 14 pass receives only the provisional summary's `failedRequestIds`.
- For each such ID, the request document uses `getDocFromServer`, the request's item query uses
  `getDocsFromServer`, and the allocation query filtered by exact `printRequestId` uses
  `getDocsFromServer`.
- Explicit Retry also calls the same reconciliation with source `"server"`.
- No service-result cache, in-flight read deduplication, global cache clear, listener, polling loop,
  route reload, or broad all-request/all-allocation scan was introduced.
- `ShowProductionRetrySession` continues to guard explicit Retry/reconstruction settlements across
  show switch, timer action, unmount, and generation changes.
- `failed`, `needs_remediation`, and `not_eligible` retain their existing retry contracts:
  transient failures are retryable; remediation and insufficient quantity are not.

The server-only service boundary and bounded exact-request scope are sound in isolation.

## Blocking findings

All findings in this section describe the initially reviewed implementation. They are retained as
review history and are resolved by the final re-review below.

### 1. The implemented candidate gate excludes the production form of the stated timestamp failure

`listShowAllocationsForPrintRequestForReconciliation` catches every
`mapShowAllocationData` rejection and converts it to
`ShowCompletionReconciliationRemediationError`. `reconcileCompletedPrintRequest` therefore returns
`outcome: "needs_remediation"` and `retryEligible: false` for the pending-allocation-timestamp
mapper rejection described in Amendment 13/14.

`verifyFailedReconciliationWithCommittedState` selects only `failedRequestIds`, and
`summarizeShowCompletionReconciliation` intentionally excludes remediation IDs from that set.
Consequently, the exact production mapper rejection named as the cause does **not** enter the new
server-only verification pass.

The new pending-state test does not expose this mismatch. It hand-constructs a provisional
`outcome: "failed"` result. The older Amendment 13 test likewise throws a plain `Error` directly
from a synthetic dependency instead of exercising the production allocation service's conversion
to a remediation error.

This does not prove the owner-observed `need retry` warning came from that mapper path; in fact, that
production path would produce remediation classification rather than a Retry-button classification.
Therefore both the exact live cause and the acceptance criterion that the named pending timestamp
state cannot produce the false warning remain unproven.

Required resolution: trace the actual `failed` phase/code that produced the owner warning, then make
the final bounded verification candidate rule match that evidence without rechecking genuine
malformed remediation records. Add a production-boundary test that uses the real mapper/service
classification rather than a hand-built outcome.

### 2. The Formal Review's real orchestration-boundary test condition is not met

The new test covers the pure merge helper and then uses broad source-text regular expressions to
assert that server API names occur after method names. It does not execute
`markShowPrintingFinished` or the service boundary with controlled Firestore dependencies, and it
does not prove in one orchestration test that:

- the first pass is default-source;
- only its actual retryable failures enter exactly one server pass;
- request, items, and allocations all receive that source in that pass;
- the final `ShowTimerActionResult` replaces the provisional result;
- server-read/write failure remains retryable; and
- no remediation candidate enters verification.

The Formal Review explicitly said pure dependency simulations alone were insufficient. Static regex
matching is weaker still and can pass if unrelated server calls merely appear later in either file.

Required resolution: add a testable production orchestration seam or equivalent service-level test
that executes the real source propagation and final result assembly. Keep the pure helper tests as
supplementary coverage.

### 3. The required diagnostic reports inferred values as observed evidence

The post-Finish diagnostic hard-codes `fromCache: false` and `hasPendingWrites: false`; neither
service returns or inspects snapshot metadata. Although server-only APIs provide a server-source
guarantee, these fields are not captured observations.

`timestampSettled` is also not based on all mapped fields used by the verified candidate. It is
computed over the entire merged result set and becomes false only for
`allocation_read + needs_remediation`. A request/item mapping failure, a failed server read, or a
non-candidate remediation can therefore produce a misleading value.

Required resolution: either return bounded sanitized read evidence from the three server methods, or
label non-observed values as `unknown`/derived in accordance with the approved diagnostic schema.
Compute timestamp settlement from the exact verified candidates and actual mapper outcomes. Do not
claim metadata was inspected when it was not.

## Resolution verification

### Finding 1 — resolved

The production-used candidate selector now includes:

- retryable provisional `failed` IDs; and
- only the narrow timestamp-settlement remediation shape:
  `outcome: "needs_remediation"`, phase `allocation_read`, and sole missing field `updatedAt`.

It does not generally recheck remediation outcomes. A server verification that still returns
malformed committed data remains `needs_remediation`, remains non-retryable, and renders no Retry
button. This preserves genuine remediation while covering the actual
`ShowCompletionReconciliationRemediationError` shape emitted when the allocation mapper rejects an
unresolved `updatedAt`.

The new test invokes `reconcileCompletedPrintRequest` with a real
`ShowCompletionReconciliationRemediationError`, proves the provisional classification is
`needs_remediation`, proves source propagation occurs in the exact order `default` then `server`,
and proves the committed result replaces that provisional result.

### Finding 2 — resolved

`markShowPrintingFinished` now calls the production-used
`reconcileShowCompletionWithCommittedVerification` orchestration seam. That seam:

1. de-duplicates the affected request IDs;
2. executes one default-source provisional pass;
3. derives the exact bounded candidate set;
4. executes one server-source verification pass for that set; and
5. returns the final merged classification used in `ShowTimerActionResult`.

The focused test executes this exact seam with the real reconciliation classifier. The existing
server-boundary assertions supplement that behavioral test by confirming request, item, and
allocation server reads remain owned by services and use `getDocFromServer` /
`getDocsFromServer`.

### Finding 3 — resolved

The diagnostic now reports `fromCache: "unknown"` and `hasPendingWrites: "unknown"` instead of
claiming unobserved snapshot metadata. `timestampSettled` is computed only over the exact candidate
IDs and their final mapped results; a failed verification or remaining `updatedAt` omission cannot
be reported as settled.

The development Retry-result log no longer emits the raw structured result array or raw request IDs.
It retains sanitized counts, status, path template, intended field names, and hashed show identity.

## Non-blocking observations

- Explicit Retry is one server-source reconciliation invocation within the existing stale-protected
  session. A successful completion write is awaited and no post-write default read was added.
- Server-read failures remain `failed` and retryable; remediation remains non-retryable; an
  already-terminal or `not_eligible` request is treated as successful without a Retry control.
- The existing development Retry-result log still includes full structured results, including raw
  request IDs. It predates Amendment 14, but the final privacy pass should sanitize it to hashes and
  counts so the final diagnostic surface consistently follows the stated no-raw-ID policy.
- No Function or Rules file is part of Amendment 14, and no deployment is needed or authorized.
- Queued goals were not touched by this review.

## Independent verification

Command:

```text
npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/postFinishCommittedVerification.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showCompletionReconciliation.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryOutcome.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts
```

Result: exit `0`; 39 tests, 39 passed, 0 failed.

The passing focused tests confirm the isolated helper, outcome contract, and retry-session behavior.
They do not close the blocking production-classification and orchestration gaps above.

Final corrected implementation rerun, using the same command:

Result: exit `0`; 41 tests, 41 passed, 0 failed.

The two added tests cover the production timestamp-remediation classification and committed
remediation preservation. Source inspection confirms the helper is now the path used by
`markShowPrintingFinished`.

## Verdict

`APPROVED`

All initially blocking findings are resolved. The final implementation uses one bounded,
server-backed verification for exact retryable or timestamp-settlement candidates, preserves genuine
retry/remediation/not-eligible outcomes, protects explicit Retry settlements with the existing
session generation, introduces no listener/poll/broad scan, and keeps diagnostics sanitized and
honest about unobserved metadata.

No Function, Rules, migration, deployment, production action, or queued-goal work occurred. Amendment
14 may proceed to the final minimal owner QA checkpoint. Per the owner's final-stop rule, do not
create another amendment if live QA still shows the transient warning while persisted state and
staff/customer workflows remain correct.
