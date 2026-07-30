# Portal Print Request Pre-Launch Stability — Implementation Review 14

- **Goal:** `portal-print-request-prelaunch-stability`
- **Scope reviewed:** Plan Section 30 / Amendment 12 implementation
- **Reviewer:** independent Implementation Review agent (no prior conversation context; did not
  defer to the Formal Review's or the implementer's narrative — independently re-verified against
  current source and re-ran all commands/tests directly)

## Verdict: APPROVED WITH NOTES → note resolved, now APPROVED

### Verified correct

1. **Reconstruction effect** (`useShowProductionTimer.ts`) — genuinely bounded via
   `upcomingShowService.listShowAllocations` (a single `where("upcomingShowId", "==", ...)` query,
   confirmed not an unbounded scan). Dependency array correctly keyed on primitives
   (`show?.id`/`show?.productionStatus`/`user`), not the whole `show` object, with the required
   eslint-disable justification. Both the `cancelled` flag and `session.isStillAuthoritative()` are
   present and both needed — no gap. The session lock is acquired via `session.acquire()` and always
   released in a `finally` block, so an exception from either service call cannot leave it stuck.
   Never resurrects a resolved show's warning.
2. **Session mutual exclusion** — confirmed real: `ShowProductionRetrySession.acquire()` correctly
   excludes a concurrent user-initiated retry while a reconstruction check holds the lock, verified via
   the new concurrency tests (Tests E/F).
3. **Diagnostic trace log** — fires unconditionally on every `retryReconciliation` activation attempt,
   including all early-return paths, with the required field schema and an explicit
   `no_op_nothing_to_retry` result kind for the zero-retryable-IDs case.
4. **Portal freshness gate** — `hasConfirmedFreshness` starts `false` on every `enabled` transition,
   resets on each new enable/disable, and is set `true` only on a settled successful reload.
   `effectiveFit` correctly requires it before computing a real fit; `canConfirmFull` transitively
   waits via `effectiveFit?.fitsEntirely`; the capacity banner stays hidden until freshness resolves. A
   failed reload leaves `hasConfirmedFreshness` false, but the modal's existing `loadError` messaging
   covers that case — not a silent stuck state.
5. **Process/scope** — no Rules or Function file touched by this amendment; `useQueuePrintRequestToShow`'s
   and `ShowProductionRetrySession`'s existing generation/session guards are both intact and
   unmodified.
6. **Commands** — `npx tsc -v` 5.9.3; Portal typecheck clean; Portal build succeeds (19/19 pages);
   Studio build exit 2, exactly 29 pre-existing errors, none in amendment-touched files; lint 41
   problems (31 errors, 10 warnings), none in amendment-touched files; `git diff --check` clean (only
   LF/CRLF autocrlf warnings).
7. **Tests** — both new test files (23 tests) plus the 9 required regression files (54 tests / 15
   suites) all pass, 0 failures.

### Finding raised and resolved before sign-off

The review found `reconciliationRetryUiState` (the derived three-state value
`"retryable" | "remediation_only" | "none"`) was computed by the hook exactly as Plan Section 30.2
Workstream C specifies, but was **never consumed** by `UpcomingShowsPage.tsx` — the render still
branched on the pre-existing binary `actionWarning`/`canRetryReconciliation` fields. This happened to
produce visually correct output for the remediation-only case by coincidence, but was not the actual
three-state contract the plan calls for, and left `reconciliationRetryUiState` as dead code with no
render-level test coverage.

**Corrected:** `UpcomingShowsPage.tsx`'s render (previously lines 1175-1191) now branches directly on
`productionTimer.reconciliationRetryUiState` — showing nothing when `"none"`, the warning text alone
when `"remediation_only"`, and the warning plus Retry button when `"retryable"`. Re-verified after the
fix: Studio build still exits 2 with the same unchanged 29-error baseline (none in touched files),
lint still exits 1 with the same unchanged 41-problem baseline (none in touched files), and all 77
tests across the 11 directly-relevant files still pass.

## Disposition

**APPROVED.** Amendment 12 is complete: both workstreams (Studio reconciliation retry
persistence/inert-click, Portal historical capacity-banner suppression) are implemented, tested, and
verified against current source with no regression to any prior amendment's behavior. No Rules or
Function deployment is required or was performed — this remains a client-only change.
