# Portal Print Request Pre-Launch Stability — Implementation Review 17

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, Section 33 / Amendment 15  
**Review type:** independent Implementation Review  
**Initial verdict:** `REJECTED`  
**Final verdict after corrections:** `APPROVED`

## Review scope

This review independently inspected the current Amendment 15 production source, page wiring,
session authority, reconstruction and retry tests, Formal Review conditions, and test report. It did
not defer to Implementation Review 16 or the Amendment 15 Formal Review verdict. The review changed
no application code.

The review confirmed the primary owner-v16 cause: Studio is rendered under React Strict Mode, the
hook retains `ShowProductionRetrySession` in a ref, and the former cleanup-only disposal left that
same ref permanently unmounted after the development setup → cleanup → setup probe. The new
setup-side `markMounted()` transition restores the live session and advances its generation, while
`markUnmounted()` still invalidates an in-flight token on a true final unmount.

The implementation also correctly adds distinct acquisition reasons (`acquired`, `unmounted`,
`show_mismatch`, `phase_busy`), explicit reconstruction and Retry phases, token-authoritative
completion, a shared `canStartRetry(showId)` predicate, synchronous duplicate exclusion, exact-ID
retry scope, and sanitized development diagnostics. Finish honestly remains `timer_action` for the
entire single service promise that encapsulates mutation and committed verification; it does not
claim a fake hook-visible internal timing boundary. No Firebase SDK call moved into the hook or
page.

## Blocking finding 1 — clicking Retry does not visibly enter `Retrying…`

The required explicit-Retry lifecycle says a successful click must immediately render
`Retrying…`. Current source cannot do that:

1. `retryReconciliation` synchronously calls `session.acquireRetry(show.id)`.
2. Successful acquisition changes the authoritative phase from `retry_available` to
   `explicit_retry`.
3. `canStartRetry(show.id)` is therefore immediately false.
4. The hook derives `reconciliationRetryUiState` as `finalizing` whenever failed IDs remain but
   `canStartRetry` is false.
5. `UpcomingShowsPage` renders the Retry button, including its `Retrying…` label, only for the
   `retryable` UI state. For `finalizing`, it removes the button and renders
   `Finalizing request updates…`.

Consequently, after a valid activation the user sees the Finish-verification fallback copy rather
than the required explicit-Retry progress state. The state machine correctly prevents another
acquisition, but the rendering conflates two different busy phases:

- Finish/reconstruction verification still settling; and
- an explicit Retry that has already acquired and invoked the service.

This is a blocking acceptance failure. The UI derivation must treat `explicit_retry` (or
`retryStatus === "retrying"` backed by that authoritative phase) as its own non-interactive progress
state and visibly render `Retrying…`, while retaining `Finalizing request updates…` only for
pre-availability verification/reconstruction. The Retry control must remain disabled or otherwise
non-activatable while the explicit retry is active.

## Blocking finding 2 — the claimed UI and owner-runtime coverage does not exercise production hook/page logic

The focused suite passes, but the key composed files build `RetryHarness` and
`ReconstructionHarness`, manually mirror hook state, manually increment a fake service counter, and
manually derive their own UI state. They do not render or invoke `useShowProductionTimer`, do not
render `UpcomingShowsPage`, and do not call the production `upcomingShowService` through the hook.

That gap is material here: the harness tests pass while missing blocking finding 1. In particular:

- the session-level “owner runtime case” proves only that `acquireRetry()` succeeds after
  `complete(..., true)`; it does not prove the rendered handler records
  `sessionAcquired=true` and invokes the service exactly once;
- `RetryHarness.serviceCallCount` is incremented by the test harness itself;
- `ReconstructionHarness.reconciliationRetryUiState` has only
  `retryable | remediation_only | none`, so it cannot detect the production
  `finalizing`/`Retrying…` rendering defect;
- navigation tests simulate state resets and reconstruction rather than mounting the production
  hook/page, so they do not prove the bounded reconstruction service actually runs through the
  production effect after a Strict Mode remount.

Before owner QA, add the narrowest feasible production-used controller/hook extraction or render
test so that the same code used by the page proves:

1. `renderedRetryableCount=1`, handler entry, `sessionAcquired=true`, and exactly one service
   invocation;
2. same-frame duplicate activation invokes the service once;
3. explicit Retry visibly enters `Retrying…` without exposing an enabled control;
4. rejection releases in `finally` and restores a usable exact retry scope;
5. show switch and true unmount discard settlement without state application; and
6. remount reconstruction invokes the bounded service and yields complete versus genuinely
   unresolved UI consistently.

The production session unit tests remain valuable and should be retained; the mirrored harnesses
are insufficient as the only evidence for hook/page behavior.

## Verified non-blocking findings

| Area | Independent result |
|---|---|
| Strict Mode cause | Proven: cleanup disposed the persistent ref; setup previously did not reactivate it. |
| Setup → cleanup → setup | New `markMounted()` reactivates and invalidates prior generation. |
| True unmount | `markUnmounted()` enters `disposed`; later acquisition returns `unmounted`; old token is stale. |
| Acquisition reasons | Explicit and sanitized: acquired, unmounted, show mismatch, or busy phase. |
| Phase model | Idle, timer action, reconstruction, Retry available, explicit Retry, and disposed are operational. `post_finish_verification` is declared but intentionally not faked because the service owns that internal boundary. |
| Finish timing/release | Entire Finish service lifecycle remains busy under one timer token; release is in hook `finally`. |
| Atomic availability | `complete(token, hasVerifiedRetryableScope)` rejects stale tokens and atomically selects `retry_available` versus `idle`. |
| Shared authority | Page eligibility ultimately derives from the same session `canStartRetry(showId)` predicate used before `acquireRetry`. |
| Duplicate exclusion | Synchronous phase transition allows one acquisition; subsequent acquisition is `phase_busy`. |
| Retry rejection | Production hook retains exact IDs and completes the token in `finally`. |
| Show switch/unmount | Generation/mounted checks reject stale settlement; the session design is correct. |
| Reconstruction scope | Selected show allocations, followed by exact affected request IDs; no all-request/all-allocation scan. |
| Diagnostics | Transition event contains hashed show ID, counts, phases, generation, reasons, and flags; no raw request IDs or customer/document data. |
| Infrastructure | Amendment 15 is Studio-client-only. No new broad listener, poll, Rules/Functions change, migration, deployment, or production action was identified. |

## Independent focused verification

Command:

```text
npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.reconstruction.test.ts
```

Result:

- exit code: `0`
- suites: `3`
- tests: `29`
- passed: `29`
- failed: `0`
- skipped/cancelled/todo: `0`

These results validate the session primitives and the test harnesses. They do not override the two
blocking source-level findings above.

## Gate result

**`REJECTED`**

Do not advance to owner QA yet. Resolve the explicit-Retry progress rendering and replace or
supplement the mirrored-harness evidence with production-used hook/controller/page coverage. Then
rerun the affected and full Amendment 15 regression matrix and return this same Implementation
Review 17 for independent re-review. No deployment is authorized or required.

## Independent re-review after corrections

The implementation was returned for independent re-review after adding the production
`deriveShowReconciliationRetryPresentation` function, wiring its result through
`useShowProductionTimer` to `UpcomingShowsPage`, and adding two session/presentation tests plus one
source-wiring assertion.

### Blocking finding 1 — resolved

The production presentation now distinguishes an active explicit Retry from Finish/reconstruction
settlement:

- `explicit_retry` with a verified retryable count returns `state: "retryable"`,
  `buttonDisabled: true`, and `buttonLabel: "Retrying…"`;
- a retryable count that is not yet acquirable under another phase returns `state: "finalizing"`;
- the hook derives these fields from the session snapshot and shared `canStartRetry`;
- the page consumes the returned disabled and label fields rather than independently recreating the
  state machine.

This preserves duplicate prevention while making the active operation visible. The first blocking
finding is resolved.

### Blocking finding 2 — not resolved

The new “production hook/page wire acquisition to one service invocation and production
presentation” test reads the hook and page as strings and asserts regular-expression ordering and
property names. It does not execute the hook, handler, page, or service. It therefore cannot prove
that the owner runtime path invokes the service once, nor can it observe React state transitions,
Strict Mode effect ordering, navigation reconstruction, rejection release, or stale-settlement
behavior through the production orchestration.

The remaining runtime assertions still execute `RetryHarness` and `ReconstructionHarness`, which
manually reproduce the hook sequence and manually increment their own `serviceCallCount`. This is
the same test-only state machine identified in the initial review. A source regex is useful wiring
lint, but it does not satisfy the explicit Amendment 15 requirement that composed tests drive
production-used hook/controller logic and not a duplicate test-only state machine.

This remains blocking because the exact owner defect existed at the hook/session integration
boundary while the lower-level service and persisted behavior were already correct. The required
regression must execute that boundary. A narrow extraction of the production Retry orchestration
into an exported controller function used by the hook, or an actual hook render test with injected
service authority, would be sufficient. It must prove from executable production logic:

1. one verified ID → handler entered → session acquired → service invoked once;
2. synchronous duplicate activation → still one invocation;
3. active invocation → disabled `Retrying…` presentation;
4. rejection → `finally` release and retry availability;
5. show switch/unmount → stale settlement discarded; and
6. reconstruction after remount actually invokes the bounded service and restores genuine
   unresolved state.

### Re-review verification

Command:

```text
npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.reconstruction.test.ts
```

Result:

- exit code: `0`
- suites: `3`
- tests: `31`
- passed: `31`
- failed: `0`

The reported wider affected suite result of 135/135 does not cure the missing production
integration execution; no failing automated test was found.

### Final re-review verdict

**`REJECTED`**

The production rendering defect is corrected, and the session implementation remains sound,
bounded, private, and client-only. Owner QA remains blocked solely on executable production-used
integration coverage for the exact owner runtime path. No deployment is authorized or required.

## Second independent re-review — production controller extraction

The implementation was returned again after extracting
`executeShowReconciliationRetry` into
`utils/showReconciliationRetryController.ts`. The hook now calls this production controller and
supplies `upcomingShowService.retryShowCompletionReconciliation` as its invocation callback.

### Prior executable-coverage blocker — resolved

The new controller is production code used directly by the hook. Its tests execute the real
acquisition, exact request-ID copy, one-call invocation, outcome classification, authority check,
and `finally` completion paths. They independently prove:

- synchronous acquisition occurs before the invocation promise;
- the exact ID scope is passed once;
- a same-frame duplicate returns `acquisition_failed` and cannot invoke twice;
- a rejected invocation restores `retry_available` in `finally`;
- true unmount makes settlement stale and prevents token reactivation; and
- Strict Mode cleanup/setup permits reconstruction to publish retry availability.

Together with the production presentation tests and hook callback wiring, this resolves the prior
test-integrity blocker.

### Remaining blocking finding — explicit Retry release/stale diagnostics are not emitted

Amendment 15 requires the development-only retry-session transition event to report release reason
and stale-settlement discard for the production lifecycle. The controller correctly performs the
release, but it has no transition callback, and the hook does not log a transition after the
controller returns.

Current source supplies `releaseReason` only for `timer_action_finally`. There is no corresponding
transition event for:

- explicit Retry success with scope resolved;
- explicit Retry partial/rejected result with scope retained; or
- an explicit Retry stale settlement after show switch or unmount.

The activation trace reports `resultKind: "stale_discarded"`, but that is a separate event and does
not populate the required retry-session transition fields (`previousPhase`, `nextPhase`,
`releaseReason`, and `staleSettlementDiscarded`). The controller refactor removed the hook-local
`finally` block that previously emitted a retry release transition, without replacing that
diagnostic at the new production ownership boundary.

This is narrow to correct: expose the controller's pre/post-release snapshots or a bounded
`onReleased` callback invoked from `finally`, then have the hook emit the sanitized transition with
the appropriate release reason and stale flag. Do not log raw request IDs or tokens. Add executable
controller tests for resolved, retained/rejected, and stale release notifications.

### Second re-review verification

Command:

```text
npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryController.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.reconstruction.test.ts
```

Result:

- exit code: `0`
- suites: `4`
- tests: `36`
- passed: `36`
- failed: `0`

The reported full affected result is 140/140, changed controller/hook ESLint is exit 0, and Studio
build remains at the documented exit-2 baseline with no controller/hook error. No broad read,
listener, poll, Function/Rules change, deployment, or production action was introduced.

### Second re-review verdict

**`REJECTED`**

The functional and executable-production blockers are resolved. Owner QA remains blocked only on
restoring the explicitly required sanitized release/stale transition diagnostic at the new
controller ownership boundary and covering it with controller tests. No deployment is authorized
or required.

## Final independent re-review — release diagnostics restored

The final correction adds an `onReleased` callback to the production
`executeShowReconciliationRetry` controller. The callback is invoked from the controller's
`finally` block after its token-authoritative `complete()` attempt and reports:

- the pre-release and post-release session snapshots;
- `retry_scope_resolved`, `retry_scope_remains`, or `retry_rejected`; and
- whether the settlement was discarded as stale.

The hook converts that callback into the existing development-only
`[useShowProductionTimer] retry session state transition` event. The event remains sanitized:
hashed show ID, phases, generation, operation kind, retry/remediation counts, `canStartRetry`,
release reason, and stale flag. It contains no raw request IDs, customer data, document contents,
credentials, or tokens.

Executable controller tests now verify the rejected path reports
`explicit_retry → retry_available`, `retry_rejected`, and `stale=false`, and that true-unmount stale
settlement invokes the callback with `stale=true`. This resolves the final blocking finding.

### Final verification

Commands:

```text
npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryController.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.reconstruction.test.ts
npx eslint apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryController.ts apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.ts
```

Results:

- focused suites: exit `0`, 4 suites, 36/36 tests passed;
- changed controller/hook ESLint: exit `0`, no findings.

The previously reported full affected suite remains 140/140. Studio build remains exit `2` at the
documented 29-error baseline with no controller/hook error. No Rules, Functions, migration,
deployment, production action, broad read, listener, or poll was introduced.

### Final verdict

**`APPROVED`**

All initial and subsequent blocking findings are resolved. Amendment 15 is approved to advance to
the minimal owner QA checkpoint. The required next action is a full Studio restart followed by the
bounded Start → Pause → Resume → Finish and, only if a genuine Retry appears, one Retry activation
and navigation-consistency check. No deployment is required or authorized.
