# Portal Print Request Pre-Launch Stability — Amendment 10 Test Report

- **Date:** 2026-07-28 (original implementation); corrected 2026-07-28 after Implementation Review 11
  `REJECTED`
- **Scope:** Plan Section 28 / Amendment 10
- **Deployment:** none; client-only implementation (plus pure/test utility additions)

## Correction pass (this report supersedes the original verification section below it)

Implementation Review 11 rejected the original implementation with four blocking findings: (1) the
retry lifecycle had no synchronous concurrency-safety authority — a pending retry could settle after
a show switch or a new timer action and write its stale result into the wrong context, and rapid
duplicate activation could reach the service twice; (2) a remediation-only retry result was
unconditionally reported as `succeeded`, contradicting the approved structured-outcome contract; (3)
the required composed behavior tests (driving the actual production hook/controller, not isolated
pure helpers) were absent for both the retry lifecycle and historical-show inspection; (4) the legacy
`isSelectable` capability was found still referenced (a stale test file; production code was already
clean).

**Corrections implemented:**

1. A new synchronous, ref-backed session authority,
   `apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.ts`
   (`ShowProductionRetrySession`), is now the sole mechanism deciding whether a retry may start
   (`acquire`) and whether its settlement is still authoritative (`isStillAuthoritative`) — wired into
   `useShowProductionTimer.ts` so `setShowId` runs synchronously in the render body, `markUnmounted`
   runs on cleanup, `beginTimerAction` runs before any state reset in `runAction`, and
   `retryReconciliation`'s settlement is discarded silently whenever the show has switched, a newer
   timer action started, the component unmounted, or a newer retry superseded it.
2. `resolveShowReconciliationRetryOutcome` now returns one atomic decision
   (`status`/`unresolvedRequestIds`/`remediationRequestIds`/`message`/`retryEligible`), and
   `retryReconciliation` derives every piece of retry UI state exclusively from that structured
   outcome — it no longer independently branches on `failedRequestCount`, so a remediation-only
   result (zero failed, one or more remediation) can never be reported as `succeeded`.
3. New composed tests drive the real production primitives end-to-end:
   `showProductionRetrySession.test.ts` (11 cases), `useShowProductionTimer.retry.test.ts` (Tests
   A-J, composing the real `ShowProductionRetrySession` + `resolveShowReconciliationRetryOutcome`),
   and `PortalQueueToShowModal.historicalInspection.test.ts` (10 cases, driving the real
   `resolvePortalShowInspectionActivation`/`canSubmitPortalShowDestination`/
   `canActivateShowPickerOption`).
4. The one remaining trace of `isSelectable` (a stale assertion in
   `packages/show-picker/src/buildShowPickerOptions.test.ts`) is corrected to assert
   `canInspect`/`canAllocate`; confirmed zero references to `isSelectable` remain anywhere in the
   repository.

**Independent Implementation Review 12**
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-12.md`):
**`APPROVED`** — did not defer to Implementation Review 11's prescriptions, independently re-verified
all four findings against current source and by executing every test/build/lint command directly.

## Verification (this correction pass, independently re-run and confirmed twice)

| Command | Result |
|---|---:|
| `npx tsc -v` | 5.9.3 |
| Focused retry/picker/historical-inspection suite (7 files) | exit 0; 44/44 pass |
| Full goal regression suite (13 files spanning all prior amendments) | exit 0; 103/103 pass |
| Portal typecheck | exit 0 |
| Portal build | exit 0; 19/19 pages (prior `EPERM` did not reproduce) |
| Studio build | exit 2; unchanged 29-error baseline, none in touched files |
| Repository lint | exit 1; unchanged 41 findings (31 errors, 10 warnings), none in touched files |
| `git diff --check` | exit 0 |
| Rules suite | not run: Firebase emulator cannot spawn Java (`java ENOENT`) — unchanged from prior pass, no Rules were touched |

No changed-line lint error remains. No TypeScript setting or lint rule was weakened.

## Evidence checkpoint (unchanged from before this correction pass)

The source proves the unresolved write is exactly:

```text
updateDoc printRequests/{printRequestId}
fields: status=completed, updatedBy, updatedAt
```

It does not yet prove whether the live rejection is Rules, a transient Firebase failure, or another
runtime condition. Formal Review prohibits guessing. After Implementation Review 12's approval, the
next owner step is a full client restart followed by one Retry reproduction and the sanitized
`[useShowProductionTimer] request reconciliation retry result` console object. No Firebase deploy is
needed for that evidence pass.

---

## Original verification (superseded by the correction pass above; retained for history)

| Command | Result |
|---|---:|
| `npx tsc -v` | 5.9.3 |
| Focused Amendment 10/regression suite | exit 0; 60/60 pass |
| Portal typecheck | exit 0 |
| Changed-file ESLint | exit 0; one pre-existing `UpcomingShowsPage` hook warning |
| `git diff --check` | exit 0 |
| Portal build | exit 1; `.next/trace` EPERM from active local Portal process |
| Studio build | exit 2; existing 29-error baseline; one changed test typing issue found and fixed |
| Repository lint | exit 1; existing 41 findings (31 errors, 10 warnings) |
| Rules suite | not run: Firebase emulator cannot spawn Java (`java ENOENT`) |
