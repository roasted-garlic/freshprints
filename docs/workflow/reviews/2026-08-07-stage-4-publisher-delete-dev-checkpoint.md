# Dev Deploy Checkpoint: Stage 4 publisher Function DELETE

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Approval phrase | **`APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS`** (owner) |
| Project | `fresh-prints-dev` **only** |
| Agent status | Algolia redeployed; owner delete **PASS** — verified absent on `fresh-prints-dev` |
| Owner confirmation | **`STAGE 4 PUBLISHERS DELETED: PASS`** (2026-08-07) |
| Record | `docs/workflow/reviews/2026-08-07-stage-4-publisher-delete-dev-record.md` |

---

## Inventory (pre-delete, agent-confirmed)

Present on `fresh-prints-dev` before this checkpoint:

| Function | Action |
|----------|--------|
| `onCategorySnapshotSourceWritten` | **DELETE** |
| `onTagSnapshotSourceWritten` | **DELETE** |
| `onPortalCatalogSnapshotSourceWritten` | **DELETE** |
| `onPortalCatalogPublicationStateWritten` | **DELETE** |
| `rebuildCatalogSnapshots` | **DELETE** |
| `retryPortalCatalogPublication` | **DELETE** |
| `syncPortalCatalogDesignToAlgolia` | **KEEP** (redeployed this pass) |
| `reconcilePortalCatalogAlgoliaIndex` | **KEEP** (redeployed) |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | **KEEP** (redeployed) |

---

## Completed by agent this pass

Redeploy Algolia (relocated classifier live):

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only functions:syncPortalCatalogDesignToAlgolia,functions:reconcilePortalCatalogAlgoliaIndex,functions:reconcilePortalCatalogAlgoliaIndexScheduled --project fresh-prints-dev
```

Result: **Deploy complete** (exit 0) — all three Successful update.

---

## REQUIRED — owner runs locally (agent hooks block `functions:delete --force`)

From repo root:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase functions:delete `
  onCategorySnapshotSourceWritten `
  onTagSnapshotSourceWritten `
  onPortalCatalogSnapshotSourceWritten `
  onPortalCatalogPublicationStateWritten `
  rebuildCatalogSnapshots `
  retryPortalCatalogPublication `
  --region us-central1 `
  --project fresh-prints-dev `
  --force
```

### Verify

```powershell
firebase functions:list --project fresh-prints-dev
```

Confirm the six names above are **absent**. Confirm the three Algolia Functions remain.

---

## After owner delete succeeds — reply

`STAGE 4 PUBLISHERS DELETED: PASS`

Then owner QA:

1. Algolia ON — search / multi-tag / facets smoke  
2. Edit or approve a ready design — **no** new portal-catalog full-pub spike class  
3. Algolia OFF — Library browse OK; search unavailable; Network zero `generated/portal-catalog/**`

---

## Not authorized

- Stage 5 Storage cleanup  
- Stage 6 / production Function delete  
- PR #40 merge  
- Production deploy  
