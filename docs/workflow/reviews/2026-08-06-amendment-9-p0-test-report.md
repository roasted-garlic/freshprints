# Amendment 9 P0 Test Report

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Scope | Amendment 9 P0 |

## Commands run

| Command | Result |
|---|---|
| `npx tsx --test` focused P0 + Amendment 7 / Processing suites | **44/44 pass** (re-run after helper extract) |
| Full `apps/studio/.../ai-review/**/*.test.ts` | **158/158 pass** (earlier full suite); focused re-run green |
| `npx tsc --noEmit` in `apps/studio` | **exit 0** |
| `npx vite build` in `apps/studio` (renderer + main + preload) | **exit 0** |
| ESLint on touched AI Review files | **exit 0** |
| `git diff --check` on AI Review paths | **exit 0** |

## P0 budget fixture (spy-based)

`simulateLocalNeedsReviewApprovals(45 ids)` via real `reconcileSuccessfulInboxManualAction`:

| Metric | Result |
|---:|---:|
| `listReloadCallCount` | **0** |
| `countRefreshCallCount` | **0** |
| `applyPatchCount` | **45** |
| `needsReviewDeltaSum` | **−45** |
| Final selection | **none** |
| Triangular contrast | 990 docs avoided |

## Mandatory budgets

| Metric | Acceptance | Status |
|---|---:|---|
| Successful post-approval list docs | 0 | Met (0 reload spies) |
| Successful per-action counts | 0 | Met |
| Recovery list reload | ≤1 / failure | Met (`recoverFailedInboxManualAction`) |
| Recovery counts | ≤3 / failure | Met (one `onQueueChanged`) |

Authority `getDoc` counts unchanged (P1 out of scope) — not a fail criterion.
