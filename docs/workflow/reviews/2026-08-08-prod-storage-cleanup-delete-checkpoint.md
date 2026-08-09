# Checkpoint: PR #40 production Storage cleanup DELETE (PREPARE ONLY)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-storage-cleanup` |
| Phase | **AUTHORIZED — agent APPLY hook-blocked; OWNER CLI REQUIRED** |
| Apply record | `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-apply-record.md` |
| Prerequisites | Implement **APPROVED**; dry-run **PASS** (31557 + 229 objs; 2 FS docs) |
| Dry-run record | `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-dry-run-record.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-delete-checkpoint-review.md` |
| Owner phrase | **`APPROVE PROD STORAGE CLEANUP DELETE`** |

---

## Goal

Authorize irreversible deletion of allowlisted residual generated Storage objects and `snapshotPublicationState` docs on **`fresh-prints-prod`** via the prod-pinned ops script — **without** Algolia, Rules, App Hosting, or Studio work.

---

## Exact APPLY allowlist (unchanged from dry-run)

| Kind | Targets |
|------|---------|
| Storage | `generated/portal-catalog/` · `generated/catalog-reference/` only |
| Firestore | `snapshotPublicationState` only |
| Project | `fresh-prints-prod` |
| Bucket | `fresh-prints-prod.firebasestorage.app` |

Negative roots never targeted: `originals/` `thumbnails/` `previews/` `display/` `customer-uploads/`

---

## Exact command (NOT EXECUTED this prepare pass)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
$env:CONFIRM_PROD_STORAGE_CLEANUP = "1"
$env:APPLY = "1"
# optional if GCS internals: $env:PROD_STORAGE_CLEANUP_CONCURRENCY = "4"
node functions/scripts/prod-generated-asset-cleanup.mjs
```

Safe to re-run until verification reports `fullyClean: true`.

### After success — owner reply

`PROD STORAGE CLEANUP DELETED: PASS`

Agent will then read-only verify empty prefixes + `snapshotPublicationState` count 0 + Portal smoke.

---

## Risks

| Risk | Note |
|------|------|
| Irreversible | Publishers deleted; objects not auto-restored |
| Partial APPLY | Re-run same command; script resumes via re-list |
| Agent hooks | May block APPLY; owner CLI path expected |

---

## Explicitly forbidden

- Stage 5 script against prod
- Paths outside allowlist / broad `gsutil rm`
- Algolia / Rules / App Hosting / Studio
- Combining with other production phrases

---

## Confirmations

- Dry-run **PASS** recorded
- Owner phrase received: `APPROVE PROD STORAGE CLEANUP DELETE`
- Agent APPLY: **HOOK-BLOCKED**
- Owner CLI APPLY: **PASS** (`PROD STORAGE CLEANUP DELETED: PASS`)
- Post-delete verify: **PASS** (`fullyClean`)

**Gate 6 COMPLETE.** Next: `APPROVE PROD STUDIO PACKAGE: PR40 TIP`.
