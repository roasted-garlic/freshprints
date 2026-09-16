# Test Report: Print Request count parity across Show Queue and summary surfaces

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Goal | `print-request-count-parity-across-show-queue-and-summary-surfaces` |
| Plan | `docs/workflow/plans/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-formal-review.md` |
| Test gate | **Passed with documented repository/tooling limitations** |
| Workflow position | Ready for Owner DEV QA; not signed off |

## Automated results

| Check | Result |
|---|---|
| Focused cross-surface unit/contract suite | **PASS — 171 tests, 0 failures** across 48 subtests. |
| Current parity and cross-surface rerun | **PASS — 115 tests, 0 failures** after the Portal detail canonical-quantity fix and Portal cross-surface contract coverage were added. |
| Portal typecheck | **PASS** — `npx tsc --noEmit -p apps/portal/tsconfig.json` |
| Studio typecheck | **PASS** — `npx tsc --noEmit -p apps/studio/tsconfig.json` |
| Functions typecheck | **PASS** — `npx tsc --noEmit -p functions/tsconfig.json` |
| Changed-file ESLint | **PASS** — ESLint with `--max-warnings 0` over all changed TypeScript/TSX files. |
| Studio build/package | **PASS** — final `npm run build:studio` after the selected-show active-set correction; Vite bundles and Windows installer completed. Existing chunk-size/dynamic-import and signing warnings were non-fatal. |
| Functions build | **PASS** — `npm run build` from `functions/`. The root workspace form was not applicable because `functions/` is not an npm workspace. |
| Portal build | **LIMITED** — an earlier isolated build compiled successfully, then Next page-data collection failed with the existing `PageNotFoundError: Cannot find module for page: /_document`; the final rerun hit Windows `EPERM` while creating the temporary Next trace before completion. A parallel attempt also hit `EPERM` on the user dev server's shared `.next/trace`; temporary config/output were removed and no source/config change was retained. |
| Full repository lint | **LIMITED** — `npm run lint` reports 17 errors and 4 warnings in pre-existing unrelated files, including the existing missing `@next/next/no-img-element` rule, unused compatibility parameters, old regex tests, and an existing control-regex warning. Changed-file lint is clean. |
| Diff hygiene | **PASS** — `git diff --check` clean; only normal Git LF→CRLF warnings are emitted for edited files. |

## Count-parity evidence

`packages/shared/src/utils/printRequestCountParity.fixture.ts` reproduces the bounded production
shape: 20 current request rows, 25 current item quantity, and 19 source-aware logical identities;
34 allocation-history rows, 14 canceled rows totaling 21, 20 current rows totaling 25, 19 current
identities, Regular Full 19, Regular Oversize 6, and `$56` using the repository's default pricing.

The suite covers source precedence and namespacing, duplicate same-artwork rows, malformed fallback
rows, canceled-only groups, split/move/requeue history, multi-show scope, Staff Artwork, Portal
Admin, Staff Inbox, Studio glance/tier/price, Portal request summaries, and customer history cards.

Production evidence was read-only and bounded: `sassymommasam-CR002` resolved to request
`SrfbxvRhr3vS00exO3kN`; no callable, Firestore write, Storage write, backfill, repair, rules/index
change, deploy, or production console action was performed.

## Runtime promotion delta prepared

The implementation changes existing runtime surfaces only:

* Studio: Show Queue row/glance, Staff Inbox mapping/metrics, Add-to-Show request summary, and
  customer Print Request history display.
* Portal: request list/detail card counts, queue-to-show remaining summary, and continuable-request
  picker counts.
* Functions: existing `getPortalAdminUpcomingShowQueueDashboard` metric adapter now carries the
  existing allocation item identity into the shared active summary; callable/DTO shape is unchanged.
* Shared: source-aware item identity, full-request summaries, active allocation summaries, and the
  deterministic production-shaped fixture/tests.

No Firestore or Storage Rules, indexes, schema migration, backfill, data repair, secret, IAM, or
configuration change is included.

## Owner DEV QA disposition

Automated checks are complete, with the Portal build and repository-wide lint limitations recorded
above. At handoff, the local Portal endpoint (`localhost:3100`) and Studio Vite endpoint
(`localhost:5173`) responded with HTTP 200; this confirms local reachability only, not visual or
data QA. The next gate is the Owner DEV QA checklist. Do not mark this goal closed or promote any
runtime until the owner records DEV QA results and separately authorizes the required promotion.
