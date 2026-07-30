# Human Checkpoint: Dev Storage Rules Deployment — Reference-Image MB Limit Increase

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Goal | `assisted-creation-reference-image-mb-limit-increase` (Goal #10) |
| Implementation Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md` — **APPROVED** |
| Deployment-scope audit | Verdict A — safe to deploy the current file (unrelated content confirmed already-deployed, signed-off Wave C generated-catalog rules) |
| Owner approval | Received 2026-07-29: "Approved — deploy storage.rules to fresh-prints-dev for Goal #10." |
| Deployment status | **DEPLOYED** — `firebase deploy --only storage`, exit 0, 2026-07-29T22:22:31Z |

---

## Deployment Executed — 2026-07-29

**Pre-deployment verification (re-run immediately before deploying):**

| Check | Result |
|---|---|
| `git --no-pager diff -- storage.rules` matches the audited/approved diff exactly | confirmed — no changes since the deployment-scope audit |
| Active Firebase project | `fresh-prints-dev` (confirmed via `firebase use fresh-prints-dev`, exit 0) |
| `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts` | exit 0, 5/5 pass, including the Rules-to-constant drift test |
| `git diff --check` | exit 0 |
| `request.resource.size <= 40 * 1024 * 1024` present in `isValidAssistedCreationImage()` | confirmed (line 151) |
| Abandoned print-request paths (`generated/studio-print-requests`, `generated/portal-print-requests`) absent | confirmed (zero matches) |
| All 4 generated-catalog rule blocks present (`catalog-reference/ai`, `/manifest.json`, `/client`, `portal-catalog`) | confirmed |
| Assisted Creation ownership/path functions (`isOwnerOrAdmin`, `isStaff`/`isCustomer` path checks, `assisted-creation/{userId}/pending|references|proofs|final` match blocks) | confirmed unchanged — only the one byte-limit line differs from the pre-Goal-#10 baseline |
| `isValidAssistedCreationProof()` (25 MB, staff proof uploads) | confirmed unchanged |

**Local `storage.rules` SHA-256 (before deployment):**
`e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730`

**Commands run, in order:**

```
$ firebase use fresh-prints-dev
Now using project fresh-prints-dev
Exit: 0

$ firebase deploy --only storage
=== Deploying to 'fresh-prints-dev'...

i  deploying storage
i  storage: ensuring required API firebasestorage.googleapis.com is enabled...
i  firebase.storage: checking storage.rules for compilation errors...
+  firebase.storage: rules file storage.rules compiled successfully
i  storage: uploading rules storage.rules...
+  storage: released rules storage.rules to firebase.storage

+  Deploy complete!

Project Console: https://console.firebase.google.com/project/fresh-prints-dev/overview
Exit: 0
```

**Deployment timestamp:** 2026-07-29T22:22:31Z (UTC, recorded immediately after the deploy command
returned).

**Local `storage.rules` SHA-256 (immediately after deployment):**
`e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730` — **identical to the
pre-deployment hash**, confirming the file was not modified by the deploy command and the deployed
content matches exactly what was reviewed and approved.

**Ruleset version/release identifier:** the Firebase CLI output for `firebase deploy --only storage`
did not print an explicit ruleset ID/version hash in this run (this is normal CLI behavior for
Storage Rules deploys — unlike some other resource types, the CLI's default output does not always
surface a release identifier). The CLI's own compilation and release confirmation
("rules file storage.rules compiled successfully" / "released rules storage.rules to
firebase.storage") together with exit code 0 is the deployment-success evidence. If a specific
ruleset ID is required for the record, it can be retrieved via `gcloud storage buckets get-iam-policy`
or the Firebase Console's Storage → Rules → history view — not attempted here since the CLI's own
success confirmation is authoritative and sufficient for this workflow.

**Scope confirmation — only Storage Rules were deployed:**
- No `functions` deploy target was included in the command (`--only storage` excludes all other
  resource types).
- No Firestore Rules, Firestore indexes, App Hosting, or CORS configuration were deployed.
- No other Firebase project was touched — `firebase use fresh-prints-dev` was the only project
  context active for this command.
- `git status` confirms no file other than the already-reviewed `storage.rules` diff was touched by
  this session; pre-existing uncommitted changes to `functions/src/*.ts` and other files (from
  unrelated in-flight goals) remain exactly as they were — `firebase deploy --only storage` cannot
  and did not deploy Functions source regardless of what sits in the local working tree.

**Production confirmation:** the only Firebase project referenced anywhere in this deployment was
`fresh-prints-dev`. No production project alias, credential, or resource was referenced, deployed
to, or modified.

---

## Pre-Deployment Checkpoint (original request, preserved below for record)

## What changed in `storage.rules`

One function, `isValidAssistedCreationImage()` (used by the Assisted Creation `pending/` reference
upload path only):

```diff
 function isValidAssistedCreationImage() {
-  return request.resource.size < 15 * 1024 * 1024
+  return request.resource.size <= 40 * 1024 * 1024
     && request.resource.contentType in ["image/jpeg", "image/png", "image/webp"];
 }
```

Two changes in one line:
1. **Byte ceiling**: 15 MB → 40 MB (owner-selected value).
2. **Boundary operator**: `<` (exclusive — a file exactly at the old limit was rejected) → `<=`
   (inclusive — a file exactly at the new limit is accepted). This corrects a pre-existing
   inconsistency between Storage Rules and the TypeScript validators (which always used `>` /
   accept-at-limit). No other Storage Rules function, path, or permission was touched.

No other `storage.rules` content in this goal's diff. (The repository's current `storage.rules` also
contains unrelated pre-existing changes from other in-flight goals — see "Scope of this deployment"
below.)

---

## Exact deployment command

Per `docs/standards/DEPLOYMENT.md`:

```bash
firebase use fresh-prints-dev
firebase deploy --only storage
```

`fresh-prints-dev` is already the default project per `.firebaserc`; the explicit `firebase use` step
is included for safety/visibility.

Dry run (compile-only, no deploy) if you want to verify first without publishing:

```bash
firebase deploy --only storage --dry-run
```

---

## Scope of this deployment

- **Only** `storage.rules` is deployed by `--only storage`. No Cloud Functions, no Firestore Rules,
  no Firestore indexes, no App Hosting, no other resource.
- **Only** the `fresh-prints-dev` project is targeted (`firebase use fresh-prints-dev` first).
- **Production is not touched** by this checkpoint or this command.
- ⚠️ **Important caveat:** the currently-committed `storage.rules` file also contains unrelated,
  pre-existing changes from other in-flight managed goals (a `generated/catalog-reference/...` and
  `generated/portal-catalog/...` block, confirmed via diff inspection to be dirty-worktree content
  this goal did not create and did not modify). **Deploying `storage.rules` as it currently stands
  will publish those unrelated blocks too**, since `firebase deploy --only storage` deploys the whole
  file, not a diff. If those other changes are not yet ready for `fresh-prints-dev`, deploying now
  would publish them prematurely. Recommend confirming with the owner whether those blocks are
  already approved/intended for the current dev environment before running this deploy — or ask
  whether the deploy should wait until those unrelated changes are handled by their own goal.

---

## Local verification already completed (no live/deployed test performed)

| Check | Result |
|---|---|
| `storageRulesAlignment.test.ts` — new test asserting the Rules literal matches `ASSISTED_CREATION_MAX_REFERENCE_BYTES` exactly | pass (5/5 in that file) |
| `git diff --check` | exit 0 |
| Manual re-read of the diff (Implementation Review) | confirmed exactly one function, one line, changed — no unrelated Rules edits by this goal |

No Firebase Rules emulator test exists in this repository for the Assisted Creation Storage paths
specifically (`npm run test:rules` covers Firestore Rules for catalog snapshots, production timer,
and print-request completion only — unrelated paths). No live/emulated Storage Rules test was run for
this specific change; verification is limited to the static text-matching test above plus manual
diff review. If you want an emulator-based Storage Rules test before deploying, that would need to be
scoped as additional work — say so and it can be added before this checkpoint is approved.

---

## Rollback procedure

If the deployed Rules need to be reverted:

1. `git revert` (or manually restore) the one-line change to `isValidAssistedCreationImage()` in
   `storage.rules`, restoring `request.resource.size < 15 * 1024 * 1024`.
2. Re-run `firebase use fresh-prints-dev && firebase deploy --only storage`.
3. No data migration is needed — no reference image was uploaded, moved, or deleted by this goal;
   reverting the Rules only changes what future uploads are accepted, and existing objects (at any
   size, since Storage Rules only gate writes, not reads of already-written objects) are unaffected
   either way.

---

## Confirmation checklist

- [x] Only `storage.rules` (Storage Rules) is included in this deployment — no Functions, Firestore
  Rules, indexes, App Hosting, or production resources.
- [x] Only `fresh-prints-dev` is targeted.
- [x] Local static verification (Rules-to-constant alignment test) passes.
- [x] Rollback procedure is documented and requires no data migration.
- [x] **Owner approval to proceed with this specific deployment** — received 2026-07-29.
- [x] **Owner confirmation on the unrelated pre-existing `storage.rules` content** — resolved via a
  separate deployment-scope audit (Verdict A): the unrelated content is already-deployed, signed-off
  Wave C generated-catalog architecture, safe to republish unchanged.
- [x] **Deployment executed** — `firebase deploy --only storage`, exit 0, 2026-07-29T22:22:31Z. See
  "Deployment Executed" section above for full command output and verification evidence.

---

## After deployment

Once a separately-approved deployment completes, the Plan requires focused owner QA covering:

- One file below 40 MB
- One file at or near exactly 40 MB
- One file above 40 MB (must be rejected)
- Eight files whose total is at or near 320 MB
- A selection above 320 MB (must be rejected client-side before any upload)
- Portal preview of an uploaded reference image
- Studio preview/download of the same
- Submit path (new request)
- Update path (existing request, add/remove/replace references)

Signoff must not proceed before that QA is complete and passes.
