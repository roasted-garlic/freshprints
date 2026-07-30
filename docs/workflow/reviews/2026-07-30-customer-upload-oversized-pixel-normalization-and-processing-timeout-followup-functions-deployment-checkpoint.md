# Deployment Checkpoint: Goal #11 Functions Deployment (dev)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (Goal #11) |
| Implementation Review | `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-implementation-review.md` (approved_with_changes, required change applied) |
| Approved by | Owner, explicit instruction, this pass |

---

## Pre-deployment conflict check

Before deploying, traced the full transitive import closure of both target functions
(`finalizeCustomerUpload.ts`, `retryCustomerUploadProcessing.ts`) through
`./lib/customerUploadProcessing.ts`, `./lib/customerUploadValidation.ts`,
`./lib/customerUploadRateLimit.ts`, `./lib/customerUploadStaffAuth.ts`, `./lib/admin.ts`,
`./lib/caller.ts`, `./lib/storageObjectPath.ts`, `./lib/firestoreDocument.ts`,
`./lib/catalogDonationUploader.ts`, `./lib/portalCustomer.ts`, `./lib/errors.ts`,
`./lib/lazySharp.ts`, and the relevant `packages/shared` modules. None of these transitively
import from the extensive set of unrelated pre-existing uncommitted files in `functions/src/`
(`ai/*`, `etsyRecommendation*`, other unrelated callables/utilities present in the working tree
from prior sessions). Both target functions' dependency closure is confined to Goal #11's own
changed files plus long-stable shared infrastructure. **No conflict found** — the deployment
artifact for these two functions reflects only the reviewed Goal #11 implementation.

Note: Firebase's `predeploy` hook (`npm run build`) compiles the entire `functions/src` tree via
`tsc` regardless of which functions are targeted — this is a full-repo typecheck gate, not a
partial one — but `firebase deploy --only functions:<names>` only **updates the named Cloud
Functions** in GCP; other already-deployed functions' live code is unaffected by what else exists
in the local working tree, dirty or not.

---

## Commands Executed

```
firebase use fresh-prints-dev
firebase deploy --only functions:finalizeCustomerUpload,functions:retryCustomerUploadProcessing
```

## Exit Codes

| Command | Exit Code |
|---------|-----------|
| `firebase use fresh-prints-dev` | 0 |
| `firebase deploy --only functions:finalizeCustomerUpload,functions:retryCustomerUploadProcessing` | 0 |

## Firebase Project Targeted

`fresh-prints-dev`

## Functions Successfully Updated

- `finalizeCustomerUpload` — "Successful update operation."
- `retryCustomerUploadProcessing` — "Successful update operation."

## Region, Runtime, Generation

Both functions: **Node.js 20 (2nd Gen)**, region **us-central1**.

(CLI emitted a non-blocking warning that Node.js 20 was deprecated 2026-04-30, decommission
2026-10-30, and that the installed `firebase-functions` package version is outdated — both are
pre-existing environment/dependency notices unrelated to this change, not deployment failures.)

## Scope Confirmation

- Only `finalizeCustomerUpload` and `retryCustomerUploadProcessing` were deployed — confirmed by
  the `--only functions:finalizeCustomerUpload,functions:retryCustomerUploadProcessing` flag and
  the CLI's own per-function "Successful update operation" output naming exactly those two
  functions and no others.
- **Storage Rules**: not deployed (no `--only storage` or bare `firebase deploy` was run).
- **Firestore Rules/indexes**: not deployed.
- **App Hosting**: not deployed.
- **No unrelated Functions** were deployed.
- **No migration or backfill** was run.
- **No Storage objects** were deleted or modified.
- **Production was not touched** — all commands targeted `fresh-prints-dev` exclusively; no
  `firebase use` to a production alias occurred at any point.

## Deployment Timestamp

2026-07-30T02:31:47Z (UTC)

## Deployment-Checkpoint Artifact Path

`docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-functions-deployment-checkpoint.md`
(this file)

---

## Next Step

Owner QA checkpoint (reduced, 12-item) is prepared separately. Do not sign off until owner QA
returns an explicit `PASS` / `PASS WITH NOTES: ...` / `FAIL: ...` result. Do not start Goal #12.
