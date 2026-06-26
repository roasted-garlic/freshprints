# Signoff: Batch Import Size Limits

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/batch-import-size-limits-plan.md` |
| Review | `docs/workflow/reviews/batch-import-size-limits-review.md` |
| Test report | `docs/workflow/reviews/batch-import-size-limits-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Raised batch import limits per product decision: **150 MB PNG**, **1 GB ZIP**, **10 GB extracted** (cumulative ZIP extract budget). Centralized user-facing limit messages in `shared/utils/importLimitMessages.ts`. Updated Electron validation, ZIP extraction, folder ZIP skip logic, and `storage.rules` (repo). IPC handlers use `ImportLimitExceededError` instead of fragile `"200 MB"` string matching.

---

## Confirmed Limits

| Constant | Value |
|----------|-------|
| `MAX_SINGLE_PNG_SIZE_BYTES` | 150 MB |
| `MAX_ZIP_SIZE_BYTES` | 1 GB |
| `MAX_EXTRACTED_BYTES` | 10 GB |

Unchanged: `MAX_BATCH_FILES` (100), `MAX_FOLDER_ZIPS` (50), `MAX_NESTED_ZIP_DEPTH` (3).

---

## Changes Delivered

### Files Created

- `shared/utils/formatFileSize.ts`
- `shared/utils/importLimitMessages.ts`
- `shared/errors/importLimitErrors.ts`
- `shared/utils/importLimitMessages.test.ts`
- `shared/constants/storageRulesAlignment.test.ts`

### Files Modified

- `shared/constants/importValidation.constants.ts`
- `shared/constants/import/batchImportLimits.constants.ts`
- `electron/ipc/import/pngValidator.ts`
- `electron/ipc/import/selectImportZipFile.ts`
- `electron/ipc/import/importIpcHandlers.ts`
- `electron/services/import/zipExtractor.ts`
- `electron/services/import/derivativePngValidation.ts`
- `src/renderer/src/shared/utils/formatFileSize.ts` (re-export)
- `storage.rules`
- `docs/standards/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/architecture/FIREBASE.md`, `docs/project/DECISIONS.md` (ADR-FP-010)
- Setup docs: `electron-security-setup.md`, `firebase-storage-setup.md`

---

## Human Approvals

| Approval | Status | Notes |
|----------|--------|-------|
| Limit values (150 / 1 GB / 10 GB) | obtained | 2026-06-24 |
| Production `storage.rules` deploy | **pending** | Required before uploads > 50 MB succeed in Firebase |

---

## Risks

| Item | Severity | Mitigation |
|------|----------|------------|
| Rules lag | High | Deploy `firebase deploy --only storage` before staff use |
| Renderer memory | Medium | ~300 MB peak (2 × 150 MB); documented in WORKFLOWS |
| Large ZIP extract disk | Medium | 10 GB cumulative cap per extract job |

---

## Verdict

**approved_with_notes** — code complete; deploy storage rules and run manual import QA before production reliance.

---

## Recommended Next Action

```bash
firebase deploy --only storage
```

Then restart desktop app and test a folder with ZIPs between 200 MB and 1 GB.
