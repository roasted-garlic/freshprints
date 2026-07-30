# Portal Print Request Pre-Launch Stability — Implementation Review 12

- **Goal:** `portal-print-request-prelaunch-stability`
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 28 / Amendment 10
- **Prior review:** Implementation Review 11 — **REJECTED** (4 blocking findings)
- **Review type:** independent Implementation Review (correction-pass verification)
- **Date:** 2026-07-28
- **Verdict:** **APPROVED**

## Independence statement

This review read Implementation Review 11 only to identify what the four blocking findings were,
then independently re-derived what "resolved" requires from Section 28 and 28.7 of the plan (not
from Review 11's prescriptive fix suggestions) and verified the current working tree against that
independently-read contract. Every file cited below was opened and read in full by this review, not
summarized from the implementer's own claims. All test commands in the verification matrix were
executed by this review directly; pass/fail counts below are this review's own console output, not
carried over from any prior test report. The picker-button semantics claim was checked against
`ShowPicker.tsx`'s actual JSX, not assumed from the test file's comment.

## Finding-by-finding verification

### Finding 1 — retry concurrency safety: CONFIRMED RESOLVED

`apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.ts` (new,
107 lines) implements `ShowProductionRetrySession` as a plain class with no `useState` — three
private fields (`currentShowId`, `generation`, `isRetryInFlight`) plus `isUnmounted`, all mutated
synchronously:

- `acquire(showId)` (lines 65-79): returns `{ ok: false }` synchronously if unmounted, if `showId`
  doesn't match `currentShowId`, or if `isRetryInFlight` is already `true`; otherwise sets
  `isRetryInFlight = true`, bumps `generation`, and returns a token — all before any `await` could
  occur, since the caller (`retryReconciliation`, `useShowProductionTimer.ts:221`) calls `acquire`
  synchronously at the top of the callback, before the `try`/`await`.
- `setShowId` (lines 30-36), `beginTimerAction` (lines 39-41), and `markUnmounted` (lines 44-47) all
  route through `invalidatePending()` (lines 54-57), which increments `generation` and clears
  `isRetryInFlight`.
- `isStillAuthoritative(showId, token)` (lines 87-93) requires `!isUnmounted && currentShowId ===
  showId && generation === token` — exactly the three invalidation triggers.
- `release(token)` (lines 102-106) only clears `isRetryInFlight` if `generation === token`, i.e. it
  is a no-op if a newer generation has already invalidated the lock (correct — an already-invalidated
  lock was already cleared by `invalidatePending`).

`useShowProductionTimer.ts` wires this in as the sole authority, not decoratively:

- `retrySessionRef` is created once via the `useRef` + lazy-init pattern (lines 53-56), never
  recreated on re-render.
- `retrySessionRef.current.setShowId(show?.id ?? null)` (line 61) is called synchronously in the
  render body, explicitly commented as intentional to beat a same-render in-flight retry (lines
  58-60).
- `markUnmounted()` is called in a cleanup effect with an empty dependency array (lines 63-67).
- `beginTimerAction()` is called at the very top of `runAction`, before any `setState` call (line
  138, ahead of `setIsActionPending(true)` at line 140).
- `retryReconciliation` (lines 212-301): `session.acquire(show.id)` (line 221) returns immediately
  with no state writes if `!acquireResult.ok` (lines 222-224) — a true no-op, confirmed by reading
  that the function returns before any `setRetryStatus`/`setActionError` call.
- After the awaited service call resolves or rejects, `session.isStillAuthoritative(showId, token)`
  gates every settlement branch (line 273 gates the resolved branch's application; the same check is
  inlined identically for the harness's rejected-path handling in the test file and mirrors the
  hook's actual rejected-branch structure) — a failing check calls `session.release(token)` and
  returns without touching any of `retryStatus`/`actionWarning`/`actionError`/
  `canRetryReconciliation`/`failedReconciliationRequestIds`/`isActionPending`.
- `session.release(token)` is called in every exit path of `retryReconciliation`: the stale-settlement
  discard (line 274), the rejected branch (line 284), and the applied-success/failure branch (line
  300).

Both concrete Review 11 scenarios trace cleanly:

- **(a) Show A retry settling after switch to Show B:** `setShowId("show-b")` bumps `generation` via
  `invalidatePending()`. Show A's in-flight token now fails `generation === token`, so
  `isStillAuthoritative("show-a", tokenA)` returns `false` regardless of `currentShowId` (both the
  show-mismatch and generation-mismatch conditions independently fail it). Verified directly by the
  composed test ("Test C", `useShowProductionTimer.retry.test.ts:165-188`), which calls
  `harness.setShowId("show-b")` and mutates local mirror state to a clean baseline **between**
  `beginRetry` and `settleSuccess`, then asserts the stale settlement changes nothing.
- **(b) Two rapid duplicate activations:** the second `session.acquire(showId)` call synchronously
  observes `isRetryInFlight === true` (set by the first call before any `await`) and returns
  `{ ok: false }` — no dependency on `isActionPending` React state anywhere in this path. Verified by
  "Test B" (`useShowProductionTimer.retry.test.ts:151-163`), which calls `beginRetry` twice
  synchronously and asserts `serviceCallCount === 1`.

### Finding 2 — remediation-only reported as success: CONFIRMED RESOLVED

`showReconciliationRetryOutcome.ts:28-33`: `status` is `"succeeded"` only when
`unresolvedRequestIds.length === 0 && remediationCount === 0`; otherwise `"partial_failure"` or
`"failed"`. The function also returns `remediationRequestIds` (line 59), `message` (line 61), and
`retryEligible` (line 63) as one atomic object.

`useShowProductionTimer.ts`'s `retryReconciliation` (lines 288-300) derives `retryStatus`,
`actionWarning`, `actionError`, `canRetryReconciliation`, `failedReconciliationRequestIds`, and
`remediationRequestIds` exclusively from `retryOutcome` — the destructured return of
`resolveShowReconciliationRetryOutcome` — with an explicit comment (lines 288-291) that this must
never re-branch on `failedRequestCount` independently. Grepping this file for
`failedRequestCount`/`remediationRequestCount` (the two field names Review 11 flagged) finds them
only at lines 179-186, inside `runAction`'s handling of the **initial Finish action's** result
(`classifyCommittedShowTimerPhase` branch) — this sets the *first* warning/`canRetryReconciliation`
state from the show-completion result before any retry has been attempted, which is a legitimate,
separate code path (the initial post-Finish diagnostic display), not a bypass of the retry
settlement's structured outcome. No branch inside `retryReconciliation` reads
`result.failedRequestCount` or `result.remediationRequestCount` directly; it only ever reads
`retryOutcome.*`. Confirmed by direct grep of the file (only 4 matches total, all accounted for
above) and by reading lines 212-301 in full.

### Finding 3 — composed tests: CONFIRMED RESOLVED

`showProductionRetrySession.test.ts` (new, 101 lines) drives the actual class through 11 cases
covering acquire/release/generation/unmount/cross-show rejection — all calls are against the
imported `ShowProductionRetrySession`, no reimplementation.

`useShowProductionTimer.retry.test.ts` (new, 323 lines) is the critical file. Its `RetryHarness`
class (lines 50-133) imports and calls the actual `ShowProductionRetrySession` (line 51,
`new ShowProductionRetrySession()`) and the actual `resolveShowReconciliationRetryOutcome` (line 106)
— not reimplementations — composed into a `beginRetry`/`settleSuccess`/`settleRejected` sequence that
mirrors `retryReconciliation`'s real acquire → mutate-pending-state → await → isStillAuthoritative →
apply-or-discard → release sequence line for line. Critically, **Test C** (lines 165-188) and
**Test D** (lines 190-206) call `harness.setShowId(...)` / `harness.beginTimerAction()` *between*
`beginRetry` (which calls `session.acquire`) and the deferred `settlement.settleSuccess(...)` call —
this is a genuine timing proof of invalidation, not an isolated assertion on an already-known
outcome, since the harness holds the acquired token and closure across the intervening
mutation and only evaluates `isStillAuthoritative` at the point of settlement. This directly
addresses Review 11's specific concern that the old suite "re-tested the pure functions in
isolation." Tests A/B/E/F/G/H/I/J round out pending-state, duplicate-activation, unmount,
full-success/no-op-retry, partial-failure exact-ID retention, remediation-non-success, rejected-call
scope retention, and non-resurrection-after-reselect — matching the plan's 28.6 behavior-matrix list
for retry.

`PortalQueueToShowModal.historicalInspection.test.ts` (new, 271 lines) imports and calls
`resolvePortalShowInspectionActivation` and `canSubmitPortalShowDestination` from
`portalHistoricalShowInspection.ts` (line 24-27) and `canActivateShowPickerOption` from
`@fresh-prints/show-picker` (line 28) — confirmed this export genuinely exists at
`packages/show-picker/src/index.ts:6` (`export { canActivateShowPickerOption, ... } from
"./resolveShowPickerSelection"`) and is implemented at
`packages/show-picker/src/resolveShowPickerSelection.ts:19-21` as
`return option.canInspect !== false;` — a real, independently-defined predicate, not one added
solely to satisfy the test import (it is also called from production code, see Finding 4 below).
The `ModalInspectionHarness` (lines 67-134) mirrors the modal's `onInspect`/`onSelect`/
`handleRequestAddToShow`/`handleConfirmAcknowledgment` wiring and its test cases cover: pointer
activation clearing destination/error/pending-allocation state with zero validation/submission calls
(lines 137-151); keyboard-equivalent activation, with the file's own justification checked against
`ShowPicker.tsx` (see below) rather than merely asserted (lines 154-181); read-only rendering data
availability with no new read (lines 184-195); both direct-submit and acknowledgment-submit defenses
rejecting a historical/full destination locally with zero queue-service calls (lines 198-241);
unchanged open-show regression (lines 244-254); and full-future-show non-allocatable behavior (lines
256-270).

I independently verified the keyboard-equivalence justification against
`packages/show-picker/src/ShowPicker.tsx` lines 161-172: `ShowTimeSlotOption` renders a native
`<button type="button" disabled={!isInspectable} onClick={() => { if
(canActivateShowPickerOption(option)) onActivate(option); }}>` with no separate `onKeyDown` handler
anywhere in the component — confirming the test's claim that a non-disabled native `<button>`'s
built-in Enter/Space handling dispatches the same `click` event, and therefore the same `onClick`
callback, that a pointer click dispatches. This is a real property of the actual component, not an
assumption asserted only in the test's comment.

### Finding 4 — `isSelectable` removal: CONFIRMED RESOLVED

Repository-wide grep for `isSelectable` across all `.ts`/`.tsx` files (excluding `node_modules`/
`.next`) returned **zero matches**. `packages/show-picker/src/types.ts`'s `ShowPickerOption`
interface (lines 5-36) contains exactly `canInspect: boolean` (line 25) and `canAllocate: boolean`
(line 26) — no `isSelectable` field. `ShowPicker.tsx`'s calendar closed-only-day grouping (line
436-438: `dayHasOnlyClosedShows = day.hasShows && (optionsByDateKey.get(day.dateKey) ?? []).every(
(option) => !option.canAllocate)`) derives exclusively from `canAllocate`.
`buildShowPickerOptions.ts:106-107` sets `canInspect: true` unconditionally and derives
`canAllocate` from `!past && !pastCutoff && selectableByCaller` — no residual dual-authority.

## Verification matrix (executed by this review)

```
npx tsx --test apps/studio/.../showProductionRetrySession.test.ts
              apps/studio/.../showReconciliationRetryOutcome.test.ts
              apps/studio/.../useShowProductionTimer.retry.test.ts
              apps/portal/.../PortalQueueToShowModal.historicalInspection.test.ts
              apps/portal/.../portalHistoricalShowInspection.test.ts
              packages/show-picker/src/buildShowPickerOptions.test.ts
              packages/show-picker/src/resolveShowPickerSelection.test.ts
```
Result: **44/44 tests passed, 0 failed, 0 cancelled, 0 skipped**, 13 suites, duration ~253ms.

Broader regression suite (13 files spanning Portal print-request hooks/components, Studio show
allocations/upcoming shows, shared Firestore subscription, per-show customer cap, Functions queue
callable, queue-to-show hook, and portal show queue fit):
Result: **103/103 tests passed, 0 failed**, 28 suites, duration ~338ms.

```
npx tsc -v
```
`Version 5.9.3`.

```
npm run typecheck --workspace @fresh-prints/portal
```
Exit `0`, no errors.

```
npm run build:portal
```
Exit `0` — full Next.js build succeeded (19/19 static pages generated). Note: Review 11's test
report recorded an `EPERM` on this exact build previously (Windows file-lock artifact); it did not
reproduce here and is a non-blocking environmental observation, not a regression.

```
npm run build:studio
```
Exit non-zero (`tsc` step fails as expected against the documented pre-existing baseline) —
**exactly 29** `error TS` lines, matching the documented baseline count exactly. I grepped this
output for the six pass-touched file basenames (`showProductionRetrySession`,
`useShowProductionTimer`, `showReconciliationRetryOutcome`, `show-picker`,
`PortalQueueToShowModal.historicalInspection`) and confirmed **zero** matches — none of the 29
baseline errors are in any file this pass touched.

```
npm run lint
```
**41 problems (31 errors, 10 warnings)** — matches the documented baseline exactly. All reported
files (`functions/src/ai/prepareAiAnalysisImage.ts`, `functions/src/lib/customerUploadProcessing.ts`,
`functions/src/lib/etsyRecommendationSuggestionValidation.ts`,
`functions/src/lib/etsySuggestionRequestValidation.ts`, `functions/src/lib/portalOgImageCompose.ts`,
`packages/shared/src/utils/portalBiddingAcknowledgmentCopy.ts`) are pre-existing and outside this
pass's touched-file set.

```
git diff --check
```
Exit `0` — no whitespace-error findings (only benign CRLF/LF normalization warnings on unrelated
pre-existing dirty files, not errors).

## Scope-boundary confirmation

`git status --short` shows a large pre-existing dirty working tree (169 files per `git diff --stat`,
matching the conversation's initial `gitStatus` snapshot) spanning many unrelated features/goals —
this predates this pass and was already present when Review 11 ran (Review 11 itself states "No
Function, Rules, production, migration, or queued-goal action occurred" against this same tree).
This review confirmed, via `git status --short` filtered to the exact files this pass's finding-fix
touched, that the pass itself modified/added only:

- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.ts` (modified)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.ts` (new)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts` (new)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryOutcome.ts` (new)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryOutcome.test.ts` (new)
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts` (new)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.historicalInspection.test.ts` (new)
- `apps/portal/features/print-requests/utils/portalHistoricalShowInspection.ts` / `.test.ts` (new)
- `packages/show-picker/src/index.ts`, `resolveShowPickerSelection.ts` / `.test.ts` (new export)

No Function, Rules, `firebase.json`, `storage.rules`, `storage.cors.json`, or migration file was
touched by this correction pass — the modifications visible to those files in the broader
`git diff --stat` are pre-existing, unrelated, already-flagged-as-out-of-scope working-tree state.
This pass remains client-only plus pure/test utility additions, consistent with 28.7's binding
constraints. No queued-goal work (`studio-test-data-print-limit-wipe-audit`,
`preproduction-static-analysis-cleanup`) appears in `git status`. No production action occurred.

## Blocking findings

None.

## Non-blocking notes

- Portal's `EPERM` build failure recorded in the prior test report did not reproduce in this review's
  run; treat as resolved/environmental, not a regression to track.
- The four findings' fixes are additive/new-file-heavy (three new production/test file pairs plus
  one modified hook and one modified picker export surface) rather than edits to the previously
  rejected code in place; this is an acceptable correction shape given the prior implementation's
  gaps were largely absence of mechanism (no session authority, no composed tests, no `canInspect`-
  only contract) rather than a wrong existing mechanism to repair.

## Confidence assessment

This review certifies source-level correctness of the retry-session invalidation logic, the
success/failure/remediation classification contract, the composed test harnesses' fidelity to the
production call sequence, and the complete removal of the `isSelectable` dual authority — all
verified by reading the actual current source and by executing the actual test/build/lint commands
directly.

This review **cannot** certify, from source reading and a Node-based pure-logic test harness alone,
that the retry lifecycle is race-free under **real React scheduling and commit timing** (e.g.
concurrent-mode batching, Strict Mode double-invocation of effects/renders in development, or actual
event-loop interleaving of a real network response with a real user click) — the composed test
harness proves the *decision primitives* (`ShowProductionRetrySession`, the structured outcome
resolver) are invoked in the correct order and produce the correct result under synchronous
manual sequencing, but it does not render `useShowProductionTimer` inside a real React tree or drive
it through actual scheduled renders, per this repository's established no-DOM-rendering testing
convention (`docs/standards/TESTING.md`). Given the hook's own `setShowId` call is explicitly placed
in the render body (not an effect) specifically to close a real timing gap, and the class's public
API is synchronous and side-effect-free apart from its own private fields, the residual risk surface
is narrow, but a live/DOM-driven or manual QA pass remains the only way to fully certify it under
real scheduling.

This review similarly **cannot** certify that real DOM `Enter`/`Space` keydown events actually reach
and activate the rendered `<button>` the way the test's documented reasoning assumes — I confirmed
by reading `ShowTimeSlotOption`'s JSX that it is a native, non-disabled-for-inspectable `<button
type="button">` with no custom `onKeyDown` handler, which is the correct precondition for browser-
native Enter/Space-to-click behavior to apply, and that no separate keyboard code path exists to
diverge from the pointer path. But this is a source-level inference about browser behavior, not an
executed keyboard-event test against a real rendered DOM node in this repository's actual browser/
Electron runtime; a manual or DOM-level QA pass is still the only way to fully certify actual keydown
delivery, focus order, and any intervening event handler (e.g. a parent capturing `keydown`) that
source reading alone cannot rule out with certainty.

## Verdict

**APPROVED.** All four Implementation Review 11 blocking findings are independently confirmed
resolved against current source, by direct execution of the composed tests (44/44 passing) and the
full regression suite (103/103 passing), and against the documented pre-existing TypeScript/lint
baselines (29 errors / 41 problems, unchanged, with zero new findings in any file this pass touched).
Scope remains client-only plus pure/test utility additions; no Function, Rules, production,
migration, or queued-goal action occurred. Amendment 10 may proceed to the next required gate per
Section 28.6/28.7 (reduced owner QA); no further independent Implementation Review is required unless
scope changes.
