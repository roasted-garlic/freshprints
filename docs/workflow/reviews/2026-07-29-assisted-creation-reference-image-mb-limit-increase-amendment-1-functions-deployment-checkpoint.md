# Human Checkpoint: Scoped Cloud Functions Deployment — Amendment 1 (Stale 15 MB Fix)

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Goal | `assisted-creation-reference-image-mb-limit-increase` (Goal #10), Amendment 1 |
| Amendment Formal Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-review.md` — **approved**, one binding condition (satisfied below) |
| Amendment Implementation Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-implementation-review.md` — **APPROVED** |
| Owner approval | Received 2026-07-29: "Approved — deploy only these two Cloud Functions to fresh-prints-dev for Goal #10." |
| Deployment status | **DEPLOYED** — exit 0, completed 2026-07-30T00:23:55Z |

---

## Deployment Executed

**Pre-deployment re-verification (immediately before deploying):** confirmed `functions/src/assistedCreationRequests.ts`,
`functions/src/lib/assistedCreationReferencePromote.ts`, and
`functions/src/lib/assistedCreationProofPurge.ts` still have zero uncommitted changes (`git status
--short` — no output); confirmed the only two modified shared files
(`assistedCreation.constants.ts`, `assistedCreationValidation.ts`) remained unchanged since this
checkpoint document was first prepared. No new local changes had occurred.

**Commands run, in order:**

```
$ firebase use fresh-prints-dev
Now using project fresh-prints-dev
Exit: 0

$ firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest
=== Deploying to 'fresh-prints-dev'...

i  deploying functions
Running command: npm --prefix "$RESOURCE_DIR" run build
> build
> node -e "require('fs').rmSync('lib',{recursive:true,force:true})" && tsc
+  functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
i  artifactregistry: ensuring required API artifactregistry.googleapis.com is enabled...
!  functions: Runtime Node.js 20 was deprecated on 2026-04-30 and will be decommissioned on
   2026-10-30 [pre-existing platform notice, unrelated to this change]
!  functions: package.json indicates an outdated version of firebase-functions [pre-existing
   platform notice, unrelated to this change]
i  functions: Loading and analyzing source code for codebase default to determine what to deploy
i  functions: Loaded environment variables from .env.fresh-prints-dev.
i  functions: preparing functions directory for uploading...
i  functions: packaged C:\coding\fresh-prints\functions (1.43 MB) for uploading
+  functions: functions source uploaded successfully
i  functions: updating Node.js 20 (2nd Gen) function submitAssistedCreationRequest(us-central1)...
i  functions: updating Node.js 20 (2nd Gen) function customerUpdateAssistedCreationRequest(us-central1)...
+  functions[submitAssistedCreationRequest(us-central1)] Successful update operation.
+  functions[customerUpdateAssistedCreationRequest(us-central1)] Successful update operation.

+  Deploy complete!

Project Console: https://console.firebase.google.com/project/fresh-prints-dev/overview
Exit: 0
```

**Deployment completion timestamp:** 2026-07-30T00:23:55Z (UTC).

**Deployed functions (revisions):**

| Function | Runtime | Region | Result |
|---|---|---|---|
| `submitAssistedCreationRequest` | Node.js 20 (2nd Gen) | `us-central1` | Successful update operation |
| `customerUpdateAssistedCreationRequest` | Node.js 20 (2nd Gen) | `us-central1` | Successful update operation |

The Firebase CLI's default deploy output does not print a numeric revision ID for 2nd-gen Cloud Run
–backed Functions in this summary form; "Successful update operation" per function, combined with
overall exit code 0 and "Deploy complete!", is the CLI's own success confirmation. A specific
revision identifier, if needed for the record, can be retrieved from the Firebase Console (Functions
→ function name → Revisions) or `gcloud run revisions list` — not attempted here since the CLI's
success output is authoritative and sufficient for this workflow.

**Scope confirmation — only these two Cloud Functions were deployed:**
- The command explicitly named `functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest`
  — no other function target was included.
- No Storage Rules were redeployed (already correct and live from the prior checkpoint; the CLI
  output above shows no `storage` deploy step at all — only `functions`).
- No Firestore Rules, indexes, App Hosting, or CORS configuration were deployed.
- Only `fresh-prints-dev` was the active project context for this command (`firebase use
  fresh-prints-dev` immediately preceding it).
- The two pre-existing CLI warnings (Node.js 20 deprecation notice, outdated `firebase-functions`
  package) are platform-level notices unrelated to this change — they appear on every deploy to this
  codebase regardless of what's being deployed, and were not introduced by this goal.

**Production confirmation:** the only Firebase project referenced anywhere in this deployment was
`fresh-prints-dev`. No production project alias, credential, or resource was referenced, deployed
to, or modified.

---

## Pre-Deployment Checkpoint (original request, preserved below for record)

## What this fixes

Owner QA reproduced: a reference image between 15 MB and 40 MB was accepted by the Portal picker but
rejected at Submit with the stale message "Each reference image must be 15 MB or smaller." Root
cause (confirmed, not assumed — see Amendment 1's Plan section and both Reviews): `storage.rules`
was deployed for Goal #10, but the two Cloud Functions callables that also enforce this limit
server-side were never redeployed, so they are still running pre-Goal-#10 compiled code.

**No application source code changes as part of this checkpoint.** The fix is entirely a matter of
deploying already-correct, already-reviewed source that has simply never been pushed to
`fresh-prints-dev`.

---

## Binding condition from the amendment's Formal Review — satisfied

The Formal Review required confirming, before this deploy, that the scoped redeploy carries only
this goal's change and no other unrelated in-flight Functions work. Confirmed:

- `git status --short functions/src/assistedCreationRequests.ts` — **no output** (file has zero
  uncommitted changes; matches the last commit exactly).
- The two target callables' only Goal-#10-relevant transitive imports are
  `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` (Goal #10's 40 MB
  constant change) and `packages/shared/src/utils/assistedCreationValidation.ts` (Goal #10's parser
  change, plus this amendment's new tests, which do not affect the compiled build) — both confirmed
  via `grep "^import"` on the callable file.
- Neither of those two shared files imports anything from `functions/src/` — confirmed via
  `grep "^import"` on both files — so no other modified `functions/src/*.ts` file (there are ~23
  unrelated ones currently dirty in the working tree, from other in-flight goals) is reachable from
  `submitAssistedCreationRequest`/`customerUpdateAssistedCreationRequest`'s dependency graph.
- `functions/src/lib/assistedCreationReferencePromote.ts` and
  `functions/src/lib/assistedCreationProofPurge.ts` (the two other Assisted-Creation-specific
  helpers the callable file imports) both show zero uncommitted changes.

**Conclusion: this scoped deploy will build and push exactly Goal #10's reference-image limit fix —
nothing else.**

---

## Exact deployment command

```bash
firebase use fresh-prints-dev
firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest
```

Both function names confirmed exported from `functions/src/index.ts:47,49` (re-exported from
`./assistedCreationRequests`), which is required for the `--only functions:<name>` syntax to resolve
correctly.

---

## Scope of this deployment

- **Only** these two named Cloud Functions are deployed — no other function, no Firestore Rules, no
  Storage Rules (already correct and live — not touched again), no indexes, no App Hosting.
- **Only** the `fresh-prints-dev` project is targeted.
- **Production is not touched.**
- This deploy will rebuild the Functions bundle from current local source for these two functions
  specifically, which — per the binding-condition confirmation above — contains only Goal #10's
  already-reviewed reference-image validation change.

---

## Verification already completed (before requesting this checkpoint)

| Check | Result |
|---|---|
| `npx tsx --test packages/shared/src/utils/assistedCreationValidation.test.ts` (33 tests, 9 new regression cases) | pass, exit 0 |
| `npx tsx --test apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.test.ts` | pass, exit 0 |
| `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts` | pass, exit 0 |
| `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| `npm run build:portal` | exit 0 |
| `npm run lint` | exit 0 |
| Changed-file lint | exit 0 |
| `git diff --check` | exit 0 |
| `npm run build --prefix functions` (confirms the two callables + their transitive imports compile with the 40 MB constant) | exit 0 (re-run as part of this checkpoint's pre-deploy confirmation — see below) |

---

## Rollback procedure

If the deployed functions need to be reverted: no source change is needed (current source is already
correct) — a rollback would only be relevant if a *future* regression is introduced. In that case,
`git revert` the offending commit and re-run the same scoped deploy command. No data migration is
needed either way — this fix only changes validation logic on write, not any stored data shape.

---

## Confirmation checklist

- [x] Only the two named Assisted Creation callables are included in this deployment.
- [x] Only `fresh-prints-dev` is targeted.
- [x] Binding condition from the amendment's Formal Review satisfied (scoped diff confirmed clean of
  unrelated Functions work).
- [x] Local verification (tests, typecheck, build, lint) all pass.
- [x] Rollback procedure documented, requires no data migration.
- [x] **Owner approval to proceed with this specific deployment** — received 2026-07-29.
- [x] **Deployment executed** — exit 0, both functions "Successful update operation," completed
  2026-07-30T00:23:55Z. See "Deployment Executed" section above for full command output.

---

## After deployment (not part of this checkpoint — for reference only)

Once approved and deployed, a reduced owner re-QA (5 steps, not the full original 8-test checkpoint)
covering only the previously-failing Submit flow is required before Signoff — see
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-qa-checkpoint.md`
for the reduced re-QA steps to be added there.
