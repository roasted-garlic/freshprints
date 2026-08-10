# Apply Gate: Production Algolia Gate C reconcile

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Authorization | Owner **`APPROVE PROD ALGOLIA RECONCILE APPLY`** |
| Project | **`fresh-prints-prod`** |
| Callable | `reconcilePortalCatalogAlgoliaIndex` |
| Payload | `{ "dryRun": false }` |
| Index | **`portal_catalog_ready_prod`** (clear + upsert) |
| Dry-run prerequisite | **PASS** — scanned 46 / upserted 46 |
| Dry-run record | `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-dry-run-record.md` |
| Phase | **COMPLETE / PASS** — owner `PROD ALGOLIA RECONCILE: COMPLETE` |
| Portal enable | **OFF** (unchanged this gate) |
| Apply record | `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-reconcile-apply-record.md` |

---

## Agent attempt

| Step | Result |
|------|--------|
| `ALLOW…=1` + `node … --apply` | **HOOK-BLOCKED** — no apply executed |
| Index mutation | **None** by agent |

---

## Behavior

Apply **clears** `portal_catalog_ready_prod` then upserts ready-design records. Portal customers still use Firestore browse while the search flag is OFF.

Expected counts: scanned/upserted ≈ **46** / **46**, `cleared: true`.

---

## Exact owner PowerShell

```powershell
cd C:\coding\fresh-prints

# ADC already working from dry-run; refresh only if needed:
# gcloud auth application-default login --project fresh-prints-prod
# gcloud auth application-default set-quota-project fresh-prints-prod

$env:ALLOW_PROD_ALGOLIA_RECONCILE_APPLY = '1'
node tmp-prod-algolia-reconcile.mjs --apply
```

Expect:

```json
{
  "mode": "apply",
  "data": { "dryRun": false, "scanned": 46, "upserted": 46, "cleared": true }
}
```

(Counts may differ slightly if ready catalog changed since dry-run.)

---

## Reply format

**`PROD ALGOLIA RECONCILE: COMPLETE`**

plus `scanned` / `upserted` / `cleared`.

---

## Explicitly forbidden this phrase

- Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` / App Hosting Algolia env
- Secrets / SA keys in chat
- Broad Functions deploy
