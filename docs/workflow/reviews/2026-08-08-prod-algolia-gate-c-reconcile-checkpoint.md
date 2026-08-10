# Checkpoint: Production Algolia Gate C — reconcile (PREPARE)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-algolia-gate-c-reconcile` |
| Plan | `docs/workflow/plans/2026-08-08-prod-algolia-gate-c-reconcile-plan.md` |
| Phase | **PREPARE — NO invoke until owner phrases** |
| Project | **`fresh-prints-prod`** |
| Callable | `reconcilePortalCatalogAlgoliaIndex` |
| Prerequisites | Gate B COMPLETE — trio ACTIVE; params `Z1FVCM5QUX` / `portal_catalog_ready_prod` |
| Tip | `92d176c532efdb14b78510ce45b001a18ba87176` (or later with same exports) |

---

## Goal

Dry-run then apply Algolia portal-catalog reconcile against **`portal_catalog_ready_prod`**. Portal managed search stays **OFF**.

---

## Preflight (agent read-only — 2026-08-08)

| Check | Result |
|-------|--------|
| `syncPortalCatalogDesignToAlgolia` | **ACTIVE** |
| `reconcilePortalCatalogAlgoliaIndex` | **ACTIVE** |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | **ACTIVE** |
| Live params | `ALGOLIA_APP_ID=Z1FVCM5QUX`; `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod` |
| Index ≠ `_dev` | **PASS** |
| Portal enable | **OFF** (`apphosting.yaml` / `.env.production.local` have no Algolia enable vars; Function env also shows `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=false`) |
| Studio prod console bridge | **Unavailable** (dev-only) — owner CLI required |
| Agent invoke | Expected **hook-blocked** |

---

## Exact phrases (in order)

1. **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`**
2. Owner invoke `{ dryRun: true }` → **`PROD ALGOLIA RECONCILE DRY-RUN: PASS`** (include `scanned` / `upserted`)
3. **`APPROVE PROD ALGOLIA RECONCILE APPLY`**
4. Owner invoke `{ dryRun: false }` → **`PROD ALGOLIA RECONCILE: COMPLETE`** (include `scanned` / `upserted` / `cleared: true`)

---

## Owner invoke (CLI outside agent)

**Corrected 2026-08-08** after `PROD ALGOLIA RECONCILE DRY-RUN: BLOCKED`
(`Failed to determine service account` / metadata ENOTFOUND — no callable ran).

Use **user** Application Default Credentials + Admin `serviceAccountId` (IAM signBlob).
Do **not** download, create, print, or commit a service-account private key.

Full corrective: `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-dry-run-invoke-corrective.md`

### Exact PowerShell — dry-run

```powershell
cd C:\coding\fresh-prints
gcloud auth application-default login --project fresh-prints-prod
gcloud auth application-default set-quota-project fresh-prints-prod
node tmp-prod-algolia-reconcile.mjs
```

Script: untracked `tmp-prod-algolia-reconcile.mjs` (refuses `--apply` unless `ALLOW_PROD_ALGOLIA_RECONCILE_APPLY=1`).

### Expected dry-run response

| Mode | Shape |
|------|--------|
| Dry-run | `{ dryRun: true, scanned: N, upserted: M, cleared: false }` |

---

## Explicitly forbidden this goal

- `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` / App Hosting Algolia public env
- Search-only key setup (Gate enable)
- Functions redeploy / Rules / Storage / Studio package
- Apply without a recorded dry-run PASS (unless owner explicitly waives in Decision Log)

---

## Confirmations (this prepare pass)

- Plan written; Formal Review pending/complete per workflow
- NO dry-run invoke
- NO apply invoke
- NO Portal enable

**Next:** Formal Review → await **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`**
