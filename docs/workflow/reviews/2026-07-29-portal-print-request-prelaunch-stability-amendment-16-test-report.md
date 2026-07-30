# Portal Print Request Pre-Launch Stability — Amendment 16 Test Report

**Scope:** confirmed `printRequests/{id}` completion authorization denial  
**Deployment:** not performed; Rules checkpoint required

## Root cause

The Studio completion service already sent exactly `status: completed`, authenticated `updatedBy`,
and `serverTimestamp()` `updatedAt`. Firestore nevertheless evaluates the entire post-merge request
through `printRequestRequiredFieldsValid().keys().hasOnly(...)`.

That current-schema allowlist omitted two fields written by existing backend architecture:

- `queueTab`
- `showQueueBiddingAcknowledgment`

The same two fields were incorrectly classified as legacy extras by completion diagnostics.

## Failing-before proof

With checked-in pre-correction Rules, one otherwise-identical active Portal request produced:

| Fixture | Result |
|---|---|
| neither current field | allowed |
| `queueTab` only | denied |
| acknowledgment only | denied |
| both/live Portal shape | denied |

Command: portable Temurin JDK 21 plus
`npx firebase emulators:exec --only firestore "npx tsx --test tests/firebase/printRequestCompletion.rules.test.ts"`

Exit `0`; 4/4 assertions passed. The three denials were expected assertions and prove each omitted
field independently caused the current whole-document predicate to reject the exact completion
patch.

## Correction

- Rules recognize only the two proven current optional fields and validate their exact enums/nested
  shape.
- Completion is a named `active|editing -> completed` branch with affected keys limited to
  `status|updatedBy|updatedAt`.
- The general staff branch explicitly excludes transitions into `completed` and completed
  regressions except the established forward archive path.
- Current server-maintained fields cannot be changed by the client completion patch.
- Assignment, origin, ownership, timestamps, active staff, authenticated `updatedBy`, and unknown
  legacy-field restrictions remain.
- Production uses a tested exact three-field payload builder.
- Sanitized diagnostics recognize and structurally classify both current fields without values.

## Verification

| Command | Exit | Result |
|---|---:|---|
| `java -version` (portable Temurin) | 0 | OpenJDK 21.0.9 LTS |
| passing-after narrow emulator | 0 | 14/14 groups pass |
| `npm run test:rules` | 0 | 48/48 pass |
| focused service/diagnostic/reconciliation/controller tests | 0 | 61/61 pass |
| full affected Studio production/reconciliation suite | 0 | 143/143 pass across 20 files |
| `npx tsc -v` | 0 | TypeScript 5.9.3 |
| Portal typecheck | 0 | pass |
| Portal build | 0 | 19/19 pages; non-fatal stale webpack cache restore warnings |
| Studio build | 2 | 29 pre-existing TypeScript errors; zero changed-file errors |
| repository lint | 1 | unchanged 41 findings: 31 errors, 10 warnings |
| changed-file ESLint | 0 | no findings |
| `git diff --check` | 0 | no whitespace error; line-ending advisories only |

The emulator emits expected permission-denied diagnostics for negative assertions; all Rules tests
complete successfully. No Function build was required because no Function changed.

## Files changed

- `firestore.rules`
- `tests/firebase/printRequestCompletion.rules.test.ts`
- `package.json`
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionPayload.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionPayload.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionDiagnostics.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionDiagnostics.test.ts`
- Amendment 16 Plan/review/test/state/handoff artifacts

No deployment, migration, Function change, queued-goal action, or production action occurred.

Independent Implementation Review 18 verdict: `APPROVED_WITH_CHANGES`. Its initial requests for
explicit invalid-status and `createdAt` mutation denials were added; the final review reports no
blocking findings. The required next gate is `APPROVE DEV RULES DEPLOY`.

The owner subsequently reported the dev Rules deployment already complete and prohibited
redeployment. Owner exit/output/ruleset ID are `[NEEDS OWNER CONFIRMATION]`. Codex's read-only
deployed/local comparison exited `2` because Application Default Credentials were unavailable; no
deploy or credential mutation was attempted. QA v18 was reopened.
