# Dry-run Gate: Production Algolia Gate C reconcile

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | Owner **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`** |
| Project | **`fresh-prints-prod`** |
| Callable | `reconcilePortalCatalogAlgoliaIndex` |
| Payload | `{ "dryRun": true }` |
| Index (expected) | `portal_catalog_ready_prod` |
| Phase | **OWNER CLI — invoke path corrected after BLOCKED** |
| Checkpoint | `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-checkpoint.md` |
| Corrective | `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-dry-run-invoke-corrective.md` |

---

## Preflight (reconfirmed at authorize)

| Check | Result |
|-------|--------|
| Trio ACTIVE | Yes (Gate B) |
| Params | `ALGOLIA_APP_ID=Z1FVCM5QUX`; `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod` |
| Portal enable | **OFF** |
| Mutation on dry-run | **None** (no clear / no saveObjects) |

---

## Owner attempt status

| Step | Result |
|------|--------|
| Agent `node …` | **HOOK-BLOCKED** |
| Owner first run | **BLOCKED** pre-callable: `Failed to determine service account` / `metadata` ENOTFOUND |
| Index / Firestore | **Unchanged** |
| Corrective | Script + docs updated: user ADC + `serviceAccountId` (no SA key download) |

---

## Exact owner PowerShell (dry-run only)

```powershell
cd C:\coding\fresh-prints

# If ADC missing/expired (OAuth user login — NOT a service-account private key download):
gcloud auth login
gcloud auth application-default login --project fresh-prints-prod
gcloud auth application-default set-quota-project fresh-prints-prod

# Dry-run only — do not pass --apply
node tmp-prod-algolia-reconcile.mjs
```

Expect:

```json
{
  "mode": "dry-run",
  "data": { "dryRun": true, "scanned": N, "upserted": M, "cleared": false }
}
```

---

## Reply format

**`PROD ALGOLIA RECONCILE DRY-RUN: PASS`**

plus `scanned` / `upserted` (and JSON if convenient).

Then next phrase: **`APPROVE PROD ALGOLIA RECONCILE APPLY`**

---

## Explicitly forbidden this phrase

- `{ dryRun: false }` / `--apply`
- Portal enable
- Secrets / SA private keys in chat
- Downloading service-account JSON keys
