# DEV Deploy Checkpoint (final): Studio Delete First-Action Latency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` |
| Status | **AWAITING OWNER AUTHORIZATION** |
| Project | `fresh-prints-dev` only |
| Production | **NOT AUTHORIZED** |

---

## Deploy matrix

| Surface | Change? |
|---------|---------|
| Functions | **YES** — existing callables only (warmup branches + query parallelization). **No new Function names.** |
| Studio | Restart required |
| Firestore Rules | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |
| Runtime config | **NO** |
| Production | **NO** |

---

## Exact Functions deploy list

```text
previewPrintRequestDeletion
deleteEligiblePrintRequest
archivePrintRequest
previewUpcomingShowDeletion
deleteEligibleUpcomingShow
previewCustomerUploadDeletion
deleteEligibleCustomerUpload
deleteEligibleUnapprovedDesign
purgeArchivedDesignAssets
previewHardDeleteCustomerAccount
hardDeleteCustomerAccount
```

Suggested command:

```bash
firebase deploy --only functions:previewPrintRequestDeletion,functions:deleteEligiblePrintRequest,functions:archivePrintRequest,functions:previewUpcomingShowDeletion,functions:deleteEligibleUpcomingShow,functions:previewCustomerUploadDeletion,functions:deleteEligibleCustomerUpload,functions:deleteEligibleUnapprovedDesign,functions:purgeArchivedDesignAssets,functions:previewHardDeleteCustomerAccount,functions:hardDeleteCustomerAccount --project fresh-prints-dev
```

---

## Owner idle warmup count

| Role | Idle warms |
|------|------------|
| Owner | **≤6** |
| Admin | **1** (`previewCustomerUploadDeletion` only) |
| Helper | **0** |

Plus dialog-open mutate/purge warms when a delete/purge dialog opens.
