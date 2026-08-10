# Corrective: Gate C Algolia reconcile dry-run invoke path (ADC + serviceAccountId)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Trigger | Owner `PROD ALGOLIA RECONCILE DRY-RUN: BLOCKED` |
| Failure | `FirebaseAuthError: Failed to determine service account` / `getaddrinfo ENOTFOUND metadata` **before** callable |
| Mutation | **None** (failed pre-callable) |
| Fix | User ADC + `serviceAccountId` impersonated signBlob — **no SA private key download** |

---

## Root cause

1. `applicationDefault()` with no usable ADC falls through to GCE metadata (`metadata` ENOTFOUND on Windows).
2. Even with user ADC from `gcloud auth application-default login`, `createCustomToken` requires a **service account identity**. User OAuth ADC alone cannot sign custom tokens unless Admin SDK is given `serviceAccountId` so it uses IAM **signBlob** (needs `roles/iam.serviceAccountTokenCreator` on that SA — already granted to owner `freshprintsofpcola@gmail.com` on `firebase-adminsdk-fbsvc@fresh-prints-prod.iam.gserviceaccount.com`).

This is **not** the same as downloading a service-account JSON key.

---

## Corrected auth path

1. `gcloud auth application-default login` → user OAuth ADC file (local gcloud ADC; not an SA key)
2. Admin `initializeApp({ credential: applicationDefault(), serviceAccountId: firebase-adminsdk-… })`
3. `createCustomToken(OWNER_UID)` via IAM signBlob
4. Client `signInWithCustomToken` → `reconcilePortalCatalogAlgoliaIndex({ dryRun: true })`

Script updated: `tmp-prod-algolia-reconcile.mjs` (untracked; do not commit).

---

## Exact owner PowerShell — dry-run only

```powershell
cd C:\coding\fresh-prints

# If ADC missing / expired (OAuth login — does NOT download an SA private key):
gcloud auth login
gcloud auth application-default login --project fresh-prints-prod
gcloud auth application-default set-quota-project fresh-prints-prod

# Dry-run only (do not pass --apply; script refuses --apply without ALLOW_PROD_ALGOLIA_RECONCILE_APPLY=1)
node tmp-prod-algolia-reconcile.mjs
```

Expect JSON with `mode: "dry-run"` and `data: { dryRun: true, scanned, upserted, cleared: false }`.

Reply: **`PROD ALGOLIA RECONCILE DRY-RUN: PASS`** (+ scanned/upserted).

---

## Boundaries unchanged

- `{ dryRun: true }` only on this pass
- No `--apply`
- Portal Algolia OFF
- No secret values in chat/docs
- No unrelated production mutation
