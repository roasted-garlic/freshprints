# Portal Print Request Pre-Launch Stability — Amendment 15 Test Report

- **Scope:** final owner-reopened retry-session lifecycle correction
- **Deployment:** none; Studio client only

## Root cause

Studio runs under React Strict Mode. The hook's persistent ref session was permanently disposed by
the development setup → cleanup → setup probe because cleanup called `markUnmounted()` and setup
never reactivated it. Thus explicit Retry always returned `unmounted`, matching
`handlerEntered=true`, `sessionAcquired=false`, and `serviceInvoked=false`. Navigation reset
ephemeral warning state, while remount reconstruction could fail for the same reason.

## Correction

- Strict-Mode-safe `markMounted`/`markUnmounted` lifecycle.
- Explicit `idle`, `timer_action`, `post_finish_verification`, `reconstruction`,
  `retry_available`, `explicit_retry`, and `disposed` phases.
- Exact acquisition reasons: acquired, unmounted, show mismatch, or busy phase.
- Finish's entire encapsulated service call remains one honest busy timer-action phase, then
  atomically releases by authoritative token to retry availability only from its final verified
  classification.
- Reconstruction and Retry have distinct tokens/phases and guaranteed `finally` completion.
- Page enabling and `acquireRetry` share `canStartRetry`.
- Busy verified scope renders `Finalizing request updates…`, not an enabled-looking inert control.
- An acquired explicit Retry remains rendered as a disabled `Retrying…` action; it is not
  collapsed into the general finalizing presentation.
- Sanitized transition diagnostics contain hashes/counts/phases only.

## Verification

| Command | Exit | Result |
|---|---:|---|
| focused production controller/session command | 0 | 36/36 pass |
| full affected Studio production/reconciliation regression (19 files) | 0 | 140/140 pass |
| `npx tsc -v` | 0 | 5.9.3 |
| Portal typecheck | 0 | pass |
| Portal build | 0 | 19/19 pages |
| Studio build | 2 | unchanged 29-error baseline; no changed-file error |
| repository lint | 1 | unchanged 41 findings: 31 errors, 10 warnings |
| changed application-file ESLint | 0 | no errors; one pre-existing `UpcomingShowsPage.tsx:605` hook-dependency warning |
| `git diff --check` | 0 | no whitespace error; line-ending advisories only |

One attempted aggregate command exited `1` before executing because it named the obsolete
`services/showCompletionReconciliation.test.ts` path; the repository path is under `utils`.
A separate deliberately broader 27-file Studio diagnostic exited `1` with 199/204 passing:
three pre-existing `printRequestItemSizingAndNaming.test.ts` failures and two pre-existing
`printRequestOversizedSelection.test.ts` failures. None is in the Amendment 15 production or test
surface. The final exact 19-file upcoming-show plus completion-diagnostics regression, including
the production controller test, passed 140/140 with exit `0`.

Implementation Review 17's initial verdict was `REJECTED`: after acquisition, the
`explicit_retry` phase was incorrectly presented as generic finalization, hiding the required
disabled `Retrying…` control, and the tests did not exercise the production presentation. The
first re-review confirmed that rendering correction but remained `REJECTED` because runtime tests
still used a mirrored harness. The explicit Retry lifecycle was therefore extracted into the
production-used `executeShowReconciliationRetry` controller. The hook now invokes that controller,
and executable tests drive its real acquisition, exact one-call service boundary, duplicate
exclusion, rejection/finally release, stale-unmount discard, and Strict-Mode/remount behavior.

No Function, Rules, migration, deployment, or production action occurred.

## Files changed

- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showProductionRetrySession.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryController.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showReconciliationRetryController.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.retry.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.reconstruction.test.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- Plan/review/test/state/handoff/QA artifacts
