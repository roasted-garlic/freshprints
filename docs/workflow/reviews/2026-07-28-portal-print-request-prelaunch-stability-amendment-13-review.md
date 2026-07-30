# Portal Print Request Pre-Launch Stability — Amendment 13 Formal Review

- **Goal:** `portal-print-request-prelaunch-stability`
- **Scope reviewed:** Plan Section 31 / Amendment 13 (implemented ahead of review during the same
  investigation that established the root cause; reviewed as this workflow's mandatory
  Formal-Review-before-signoff gate)
- **Reviewer:** independent Formal Review agent (no prior conversation context; verified against
  current repository source directly, including reading the already-applied code change with a
  skeptical, not-yet-approved posture)

## Verdict: APPROVED WITH CHANGES → test-coverage gap only, logic approved as implemented

### Root cause — verified real and plausible

Independently confirmed the `serverTimestamp()` read-your-own-write race: `mapFirestoreTimestamp`
returns `undefined` for a still-pending sentinel; `mapShowAllocationData` throws when `updatedAt` is
`undefined`; `listShowAllocationsForPrintRequestForReconciliation`'s catch converts that into a
`ShowCompletionReconciliationRemediationError`, excluding the allocation from the printed-quantity sum
for that one immediate read. `markShowPrintingFinished` commits a batch setting `serverTimestamp()` on
these same allocations and immediately re-reads them via a fresh `getDocs` — there is no Firebase JS
SDK contract guaranteeing a resolved sentinel is visible in the very next standalone read from the same
client after `commit()` resolves (that guarantee only applies within a single transaction, not across
two independent round-trips like this). Plausible and consistent with the reported symptom
(self-heals on navigation/remount, since enough wall-clock time has passed by then).

### Fix scoping and safety — verified correct

- The re-check is scoped to exactly `firstPassSummary.failedRequestIds` — remediation IDs live in a
  separate, never-reassigned binding and are never re-checked, matching the plan's requirement that
  remediation failures (not transient by construction) must never be silently re-tried.
- The merge (`recheckById` Map keyed by `printRequestId`) replaces only the re-checked entries;
  successful and remediation results pass through untouched.
- No double-write hazard: a result is only re-checked if it failed on pass one, so a successful
  first-pass write is never touched again; if a first-pass write actually landed but was misreported as
  failed, the re-check's own status read sees `already_terminal` rather than re-writing.
- A genuine, permanent failure (real permission denial, real malformed document) is not time-dependent
  and fails identically on the re-check — no mechanism found by which this could mask a real defect.

### Latency, scope, and process — pass

The re-check only executes when there's already a failure to investigate — zero added cost on the
happy path. No Rules or Function file touched. `npm run build:studio` re-run independently: exactly 29
pre-existing errors, none in the touched files — unchanged baseline.

### Required before signoff

**Section 31.5's tests are not yet present.** The logic itself requires no further changes, but the
following must be added before this amendment can be signed off as tested:
- A composed test matrix proving: (a) a transient first-pass failure resolves cleanly on re-check with
  no final warning; (b) a genuine first-pass failure remains reported unchanged; (c) a remediation-only
  result is never re-checked; (d) a mixed batch reports only the genuinely-failing ID in the final
  result.
- A test proving the re-check calls `markPrintRequestCompletedIfFullyPrinted` only for the exact
  first-pass-failed IDs.
- A test proving `classifyCommittedShowTimerPhase` reports `"committed"` for a result whose final
  (post-re-check) counts are both zero.
- Confirmation the full regression suite for this goal still passes.

## Disposition

Approved to proceed directly to adding the required 31.5 tests and running the full verification
matrix — no further design change is needed. Implementation Review 15 must independently re-verify both
the fix and the new tests, not defer to this review's approval.
