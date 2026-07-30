# Portal Print Request Pre-Launch Stability — Amendment 8 Test Report

- **Date:** 2026-07-28
- **Scope:** Plan Section 26 / Amendment 8
- **Deployment:** none

## Rules evidence

The exact legacy-compatible Finish fixture first ran against the pre-correction Rules. Result:
**exit 1; 17 tests; 16 pass; 1 fail**. The sole failure was the expected active-owner
one-show/two-allocation Finish batch with preserved legacy show/allocation fields.

After the narrow Finish branch, `npm run test:rules` passed: **exit 0; 34 tests; 34 pass; 0 fail**
under Temurin Java 21.0.11. Coverage retains Amendment 7 Start and adds active owner/admin/helper
Finish, customer/inactive denial, unrelated/legacy mutation denial, caller-identity denial, and
invalid-transition denial. The final additions independently exercise a non-finishable source
status plus missing and wrong-typed `completedAt`/`updatedAt` fields.

## Focused behavior verification

Focused Amendment 8 and ADR-FP-122 tests cover personal usage, bounded polling, single-flight and
stale request handling, sanitized diagnostics, authoritative transaction eligibility, and capacity
boundaries. The latest targeted Amendment 8 rerun passed **21 tests; 21 pass; 0 fail; exit 0**,
including controlled-time waiting → printing → completed polling, hidden stop/resume, focus
coalescing, composed request-switch/unmount stale-result rejection, selected Show A/Show B
isolation, optimistic-success application exactly once, failure cleanup, reopen from refreshed
server state, and the Start/Pause/Resume/Finish committed/post-commit phase matrix.

## Builds and static analysis

| Command | Result |
|---|---:|
| `npx tsc -v` | TypeScript 5.9.3 |
| Portal typecheck | exit 0 |
| Portal build | exit 0 |
| Functions regression build | exit 0 |
| Changed-file ESLint | exit 0 after correction; no errors; one pre-existing hook warning |
| `git diff --check` | exit 0 |
| Studio build | exit 2; unrelated existing errors |
| Repository lint | exit 1; 42 findings (32 errors, 10 warnings) |

Studio failures are in existing settings, staff-inbox, users, assisted-creation, and other baseline
areas. The reported `UpcomingShowsPage.tsx:118` error is outside Amendment 8 changed lines.
Repository-lint errors do not occur on Amendment 8 changed lines. No check was weakened.

## Behavioral conclusions

- Start/Pause/Resume service promises now resolve directly after their write commits. Finish returns
  a non-throwing reconciliation result after commit; request-level failures are shown separately and
  can be retried by their exact failed request IDs without rerunning the show/allocation mutation or
  expanding to other completed requests on the show.
- Selected-show validation reports missing field names; mapper-invalid allocations remain outside
  writes and operation rows.
- Start/Pause/Resume/Finish each have action-specific, phase-specific sanitized manifests and
  Firebase error codes on rejected writes.
- Portal uses its request-scoped callable at a visible/nonterminal 5–10-second interval, coalesces
  overlapping triggers, rejects stale results, and invalidates on request change/unmount.
- Personal usage uses existing `customerAllocatedQuantity` and the loaded limit, remains selected-
  show scoped, and adds only the successful pending quantity during the existing animation.
- No Function, Firestore listener, broad query, N+1 read, or deployment was added.

## Gate

Independent Implementation Review is required. Because Rules changed, successful review must stop
at a new exact `APPROVE DEV RULES DEPLOY` checkpoint. Owner QA remains paused.
