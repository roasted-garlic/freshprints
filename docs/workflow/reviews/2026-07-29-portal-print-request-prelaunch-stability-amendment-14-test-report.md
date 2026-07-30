# Portal Print Request Pre-Launch Stability — Amendment 14 Test Report

- **Date:** 2026-07-29
- **Scope:** Plan Section 32 / final owner-authorized bounded remediation
- **Deployment:** none; Studio client only

## Owner QA recorded

Owner QA v15 returned `FAIL` on Test 1 only: the false Retry warning remained immediately after
Finish. Studio/Portal lifecycle and persisted results were correct, navigation cleared the warning,
and owner Tests 2 and 3 passed.

## Proven Amendment 13 gap

The awaited Finish batch was backend-acknowledged. Amendment 13 nevertheless performed both passes
through the same default-source `getDoc`/`getDocs` reconciliation path, without a forced server source
or snapshot-source evidence. There was no application cache, in-flight deduplication, or stale
first-pass promise. Thus the second pass could repeat the same provisional Firestore representation
and incorrectly treat it as final; route remount later used the same default reads after state had
settled.

## Implementation

- The existing first pass remains unchanged and provisional.
- First-pass `failed` IDs enter one committed verification. Production's exact pending-timestamp
  mapper shape (`allocation_read`, `needs_remediation`, only `updatedAt` missing) also enters because
  the service wraps that mapper rejection as remediation. No other remediation shape enters.
- The verification passes an explicit `"server"` source through service-owned methods:
  `getDocFromServer` for the exact request, `getDocsFromServer` for that request's items, and
  `getDocsFromServer` for allocations filtered by that exact request ID.
- Results replace their provisional counterpart once by request ID. Remediation IDs are never
  candidates. No polling, listener, route reload, global cache clear, or broad collection scan exists.
- Explicit Retry uses the same server-source reconciliation. Its acknowledged completion write is
  the authoritative result, and the existing `ShowProductionRetrySession` continues to discard stale
  settlements after show switch, timer action, unmount, or newer generation.
- Development diagnostics contain only a hashed show ID, counts, source/metadata booleans,
  classifications, and warning state.

## Verification

| Command | Exit | Result |
|---|---:|---|
| `npx tsc -v` | 0 | TypeScript 5.9.3 |
| focused 5-file Finish/retry command | 0 | 34/34 pass |
| final 16-file stability regression command | 0 | 100/100 pass |
| `npx tsc --noEmit -p apps/studio/tsconfig.json --pretty false` | 1 | 29 pre-existing errors; initial run included one changed-line unused variable, then removed |
| `npm run build:studio` | 2 | 29 pre-existing errors; no Amendment 14 file |
| first concurrent Portal typecheck/build attempt | 2 / 1 | `.next` artifact race (`TS6053` / `EPERM`); not described as clean |
| `npm run build:portal` rerun sequentially | 0 | compiled; 19/19 pages |
| `npm run typecheck --workspace @fresh-prints/portal` rerun after build | 0 | pass |
| `npm run lint` | 1 | unchanged 41 findings: 31 errors, 10 warnings |
| changed-file `npx eslint ...` | 0 | no changed-line finding |
| `git diff --check` | 0 | no whitespace error; line-ending advisories only |

Functions and Rules tests were not run because no Function or Rules file changed. No TypeScript or
lint rule was weakened.

## Files changed by Amendment 14

- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/postFinishCommittedVerification.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/postFinishCommittedVerification.test.ts`
- Plan Section 32, Formal Review, this report, state/handoff, and QA checkpoint artifacts

No deployment or production action occurred.

Implementation Review 16 initially rejected three gaps: the production timestamp mapper outcome was
`needs_remediation` rather than `failed`, the orchestration test was too synthetic, and metadata was
inferred. All were corrected within Amendment 14. The production-used seam now verifies the narrowly
identified timestamp-only remediation shape, genuine committed remediation is preserved, real
default-to-server source propagation/final assembly is tested, and unobserved metadata is labeled
`unknown`. The same independent reviewer re-ran 41 focused tests and issued final verdict
`APPROVED`.
