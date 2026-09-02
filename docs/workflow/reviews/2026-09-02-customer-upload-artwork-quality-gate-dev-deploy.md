# DEV Deploy Record — Customer Upload Artwork Quality Gate

**Date:** 2026-09-02  
**Goal:** `customer-upload-artwork-quality-gate`  
**Project:** `fresh-prints-dev` only  
**Branch:** `development` (uncommitted working tree)  
**Owner authorization:** DEV deploy approved for Owner QA

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Branch | `development` |
| Goal-scoped Functions diff | `finalizeCustomerUploadZip.ts`, `customerUploadProcessing.ts`, `customerUploadZip.ts` + shared transparency/failure-message utils |
| Storage Rules diff | **Single hunk:** `isValidCustomerUploadSource()` → `image/png` only |
| Unrelated WebP paths preserved | Lines 79, 162–167, 248–250 unchanged (derivatives, assisted creation, catalog assets) |
| Production | **NOT deployed** |

## Functions deploy

**Command:**

```bash
firebase deploy --only functions:finalizeCustomerUpload,functions:finalizeCustomerUploadZip,functions:retryCustomerUploadProcessing --project fresh-prints-dev
```

**Result:** exit **0** — Deploy complete

**Functions updated:**

| Function | Region | Result |
|----------|--------|--------|
| `finalizeCustomerUpload` | us-central1 | Successful update operation |
| `finalizeCustomerUploadZip` | us-central1 | Successful update operation |
| `retryCustomerUploadProcessing` | us-central1 | Successful update operation |

**Not deployed:** Firestore rules, indexes, Hosting, production, other Functions.

## Storage Rules deploy

**Command:**

```bash
firebase deploy --only storage --project fresh-prints-dev
```

**Result:** exit **0** — rules compiled and released

**Scoped change:** `/customer-uploads/{userId}/{uploadId}/source` (via `isValidCustomerUploadSource()`) accepts **`image/png` only**.

## Portal

**Action:** Local dev restart (`npm run dev:portal`) — **not** App Hosting deploy.

**URL:** `http://localhost:3100` → `fresh-prints-dev` backend (existing env).

## Post-deploy status

| Surface | fresh-prints-dev | Production |
|---------|------------------|------------|
| Functions (3 scoped) | ✅ | ❌ |
| Storage rules | ✅ | ❌ |
| Firestore rules | — | ❌ |
| Indexes | — | ❌ |
| Hosting | — | ❌ |

## Next step

Owner DEV QA — reply `PASS`, `PASS WITH NOTES: …`, or `FAIL: …` per human checkpoint in `.cursor/workflow/state.md`.
