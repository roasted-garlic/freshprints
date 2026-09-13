# Customer Identity WS1 QA Corrective #2 — DEV Deploy Record

**Date:** 2026-08-28  
**Project:** `fresh-prints-dev`  
**Branch:** `development`  
**Production:** NOT touched  
**Rules / indexes:** NOT deployed  

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Branch `development` | PASS |
| Firebase project `fresh-prints-dev` | PASS (`.firebaserc` default) |
| Functions build | PASS (`npm run build` exit 0) |
| Implementation review approved | PASS — `2026-08-28-customer-identity-ws1-qa-corrective-2-implementation-review.md` |
| Deploy allowlist (4 functions only) | PASS |
| Corrective #2 rules changes | PASS — none in this corrective (local `firestore.rules` / `indexes` uncommitted from prior work; **not deployed**) |
| Index deploy | NOT performed |
| Production | NOT targeted |
| WS2/WS3/WS4 functions | NOT included |

## Deploy command

```bash
firebase deploy --project fresh-prints-dev --only functions:disableCustomerAccount,functions:restoreCustomerAccount,functions:previewHardDeleteCustomerAccount,functions:hardDeleteCustomerAccount
```

**Result:** Deploy complete (exit 0), ~104s.

## Deployed functions (ACTIVE)

| Function | Generation | Region | Runtime | Revision | updateTime (UTC) | State |
|----------|------------|--------|---------|----------|------------------|-------|
| `disableCustomerAccount` | 2 | us-central1 | nodejs20 | `disablecustomeraccount-00002-cup` | 2026-08-28T21:31:16Z | ACTIVE |
| `restoreCustomerAccount` | 2 | us-central1 | nodejs20 | `restorecustomeraccount-00003-nik` | 2026-08-28T21:31:16Z | ACTIVE |
| `previewHardDeleteCustomerAccount` | 2 | us-central1 | nodejs20 | `previewharddeletecustomeraccount-00003-wec` | 2026-08-28T21:31:14Z | ACTIVE |
| `hardDeleteCustomerAccount` | 2 | us-central1 | nodejs20 | `harddeletecustomeraccount-00003-del` | 2026-08-28T21:31:16Z | ACTIVE |

Cloud Run service generations: disable **2**, restore **3**, preview **3**, hard delete **3**.

## Post-deploy runtime verification

### disableCustomerAccount (deployed bundle)

- Owner-only (`loadCallerProfile` + `assertOwnerCaller`)
- Sets `customers.isDisabled`, `disabledAt`, `disabledBy`, optional `disabledReason`
- Sets `users.isActive = false` (does not set `isDeleted`)
- `adminAuth.updateUser(..., { disabled: true })`
- **Fail-closed:** throws `failedPrecondition` if Auth disable fails after Firestore commit
- Username reservation and history unchanged

### restoreCustomerAccount

- Owner-only
- Clears `isDisabled` + disabled metadata
- Sets `users.isActive = true`, `users.isDeleted = false`
- `adminAuth.updateUser(..., { disabled: false })`
- **Fail-closed** on Auth restore failure
- Blocks tombstoned/merged accounts

### previewHardDeleteCustomerAccount — CORS / invoker

**Immediately after deploy:** OPTIONS returned **403** (missing `roles/run.invoker` for `allUsers` on Cloud Run service `previewharddeletecustomeraccount`). Other three callables had `allUsers` invoker; preview did not.

**Remediation (deploy completion):**

```bash
gcloud run services add-iam-policy-binding previewharddeletecustomeraccount \
  --project=fresh-prints-dev --region=us-central1 \
  --member="allUsers" --role="roles/run.invoker"
```

**After IAM fix:**

| Callable | OPTIONS (localhost:5173 origin) |
|----------|----------------------------------|
| `disableCustomerAccount` | **204** |
| `previewHardDeleteCustomerAccount` | **204** (was 403) |
| `hardDeleteCustomerAccount` | **204** |

POST execution requires authenticated Studio owner session — owner re-QA validates end-to-end.

### hardDeleteCustomerAccount

- Owner-only + `assertHardDeleteAllowedProject()` (fresh-prints-dev gate)
- `DELETE CUSTOMER` confirmation phrase
- Preview checksum revalidation via `consumeCustomerIdentityPreview`
- Identity/bootstrap-only deletion path unchanged
- Paired revision deployed with preview (`00003-*`)

## IAM note for future deploys

If `previewHardDeleteCustomerAccount` is redeployed in isolation, verify Cloud Run invoker includes `allUsers` (Firebase callable CORS preflight requirement). Firebase deploy applied invoker automatically to disable/restore/hard-delete but not preview on this deploy.

## Studio / Portal

- **Studio publish:** NOT performed — owner uses local dev build with corrective UI.
- **Portal App Hosting:** NOT deployed.

## Status

**READY FOR OWNER RE-QA**
