# Plan: Raise Batch Import Size Limits

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/batch-import-size-limits-review.md` |

---

## Goal

Increase import size limits consistently across Electron discovery/validation, user-facing error messages, documentation, and Firebase Storage rules so staff can import larger PNGs and ZIP archives without silent skips (folder ZIPs) or upload failures (storage rules rejecting valid app-side accepts).

---

## Background

Staff hit the **200 MB compressed ZIP** cap during real-world batch imports. The **50 MB per-PNG** cap may also be insufficient for high-resolution print assets. Limits are enforced in multiple layers; they must stay aligned (defense in depth).

Previous phase **Folder Batch Import — Nested ZIP Discovery** is DONE. This phase changes **constants and messaging only** — not batch file counts, folder depth, nested ZIP depth, or file types.

---

## Scope

### In Scope

- Update `MAX_SINGLE_PNG_SIZE_BYTES`, `MAX_ZIP_SIZE_BYTES`, `MAX_EXTRACTED_BYTES` in shared constants
- Replace hardcoded `"200 MB"` / `"500 MB"` / raw byte strings in error messages with constant-driven formatting
- Update all enforcement points listed below
- Update `storage.rules` original upload cap to match new PNG limit (code change in repo; **production deploy is a separate human checkpoint**)
- Update docs: `SECURITY.md`, `WORKFLOWS.md`, `FIREBASE.md` (and `BACKEND.md` if it references limits)
- Add/update unit tests for limit enforcement
- Document memory impact of larger PNGs with `UPLOAD_CONCURRENCY = 2`

### Out of Scope

- `MAX_BATCH_FILES` (100), `MAX_FOLDER_ZIPS` (50), `MAX_NESTED_ZIP_DEPTH` (3), `MAX_FOLDER_DEPTH`, `MAX_FOLDER_SCAN_ENTRIES`
- JPG/WebP import support
- Renderer upload concurrency or memory redesign
- Production `firebase deploy --only storage` (human checkpoint)
- Changing derivative WebP cap (10 MB) unless PNG increase forces derivative policy review

---

## Target Limits — **Confirmed (2026-06-24)**

| Constant | Value |
|----------|-------|
| `MAX_SINGLE_PNG_SIZE_BYTES` | **150 MB** |
| `MAX_ZIP_SIZE_BYTES` | **1 GB** |
| `MAX_EXTRACTED_BYTES` | **10 GB** (explicit product cap; extraction streams entry-by-entry) |

Unchanged: `MAX_BATCH_FILES` (100), `MAX_FOLDER_ZIPS` (50), `MAX_NESTED_ZIP_DEPTH` (3).

---

## Target Limits — ~~[NEEDS HUMAN INPUT]~~ (resolved)

## Affected Areas

### Files / Modules (expected)

| Area | Path |
|------|------|
| PNG limit constant | `shared/constants/importValidation.constants.ts` |
| ZIP / extract limits | `shared/constants/import/batchImportLimits.constants.ts` |
| Limit message helpers (new) | `shared/utils/importLimitMessages.ts` (+ tests) |
| Shared file size format (new or move) | `shared/utils/formatFileSize.ts` (move from renderer or duplicate thin wrapper) |
| PNG validation | `electron/ipc/import/pngValidator.ts` |
| PNG preview cap | `electron/ipc/import/getSelectedPngPreview.ts` |
| Derivative validation | `electron/services/import/derivativePngValidation.ts` |
| ZIP picker | `electron/ipc/import/selectImportZipFile.ts` |
| ZIP extraction | `electron/services/import/zipExtractor.ts` |
| Folder ZIP skip | `electron/services/import/folderScanner.ts` |
| IPC error mapping | `electron/ipc/import/importIpcHandlers.ts` (remove fragile `"200 MB"` string match) |
| Storage rules | `storage.rules` |
| Renderer re-export | `src/renderer/src/features/imports/constants/importValidation.constants.ts` |
| Renderer formatFileSize | re-export from `shared/utils/formatFileSize.ts` if moved |
| Tests | `shared/utils/importLimitMessages.test.ts`, `electron/services/import/folderScanner.test.ts` (new), `electron/services/import/zipExtractor.test.ts` (new) or extract testable helpers |
| Docs | `docs/standards/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/architecture/FIREBASE.md` |

### Architecture Impact

- [x] Details: Constants remain single source of truth in `shared/`. Electron and renderer import from shared. `storage.rules` cannot import TS — manual sync with comment + optional consistency test parsing rules file.

### Security Impact

- [x] Details: Defense in depth preserved. ZIP bomb guards (`MAX_EXTRACTED_BYTES`, `MAX_ZIP_COMPRESSION_RATIO`, `MAX_ZIP_ENTRIES`) unchanged in policy, only scaled values. Folder oversized ZIPs remain non-fatal (`zipsSkipped`).

### Data Model Impact

- [ ] None

### Backend Impact

- [x] Details: `storage.rules` original upload size must match `MAX_SINGLE_PNG_SIZE_BYTES`. Deploy to Firebase is out of band.

### UI / UX Impact

- [x] Details: Error messages show human-readable limits from constants (e.g. "exceeds the 500.00 MB import limit"). No layout changes.

### Migration Impact

- [ ] None — no persisted schema changes. Existing stored originals unaffected.

---

## Approach

### 1. Human confirms target MB values

Stop until values recorded in workflow state `Decision Log` and this plan § Target Limits.

### 2. Constants

- Set `MAX_SINGLE_PNG_SIZE_BYTES` in `importValidation.constants.ts`
- Set `MAX_ZIP_SIZE_BYTES` in `batchImportLimits.constants.ts`
- Set `MAX_EXTRACTED_BYTES` either as explicit constant or derived:

```ts
import { MAX_BATCH_FILES } from "./batchImportLimits.constants";
import { MAX_SINGLE_PNG_SIZE_BYTES } from "../importValidation.constants";

export const MAX_EXTRACTED_BYTES = Math.min(
  MAX_BATCH_FILES * MAX_SINGLE_PNG_SIZE_BYTES,
  Math.floor(2.5 * MAX_ZIP_SIZE_BYTES),
);
```

(If human chooses explicit value instead, document rationale in `DECISIONS.md`.)

### 3. Shared limit messaging

Add `shared/utils/importLimitMessages.ts`:

- `formatPngSizeLimitExceededMessage(): string`
- `formatZipSizeLimitExceededMessage(): string`
- `formatZipExtractedSizeLimitExceededMessage(): string`

Use `shared/utils/formatFileSize.ts` (move from renderer) for display. Messages must not hardcode MB strings.

### 4. Replace enforcement message sites

| File | Change |
|------|--------|
| `pngValidator.ts` | Use `formatPngSizeLimitExceededMessage()` |
| `derivativePngValidation.ts` | Same |
| `selectImportZipFile.ts` | Use `formatZipSizeLimitExceededMessage()` |
| `zipExtractor.ts` | ZIP size + extracted size messages from helpers |
| `importIpcHandlers.ts` | Map `FILE_TOO_LARGE` via `ZipExtractionError` code or `ImportLimitError` — not substring `"200 MB"` |

### 5. `storage.rules`

- Update `isValidOriginalUpload()` size check to new byte value
- Add comment: `// Sync with MAX_SINGLE_PNG_SIZE_BYTES in shared/constants/importValidation.constants.ts`

### 6. Documentation

- `SECURITY.md` — original upload cap
- `WORKFLOWS.md` — batch import limit table
- `FIREBASE.md` — storage path size table
- `DECISIONS.md` — ADR entry for new limits and derived `MAX_EXTRACTED_BYTES` formula
- Note peak renderer memory: `UPLOAD_CONCURRENCY × MAX_SINGLE_PNG_SIZE_BYTES`

### 7. Tests

- Unit tests for message helpers (correct limit text for given constants)
- `folderScanner`: ZIP at `MAX_ZIP_SIZE_BYTES + 1` → `zipsSkipped`
- `zipExtractor` or extracted `assertZipArchiveSize`: over cap throws `FILE_TOO_LARGE` with formatted message
- `pngValidator`: over cap throws with formatted message (if test harness allows; else test message helper + stat check helper)
- Optional: test that `storage.rules` contains the same byte literal as `MAX_SINGLE_PNG_SIZE_BYTES`

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` | yes |
| Lint | `npx eslint .` | yes |
| Unit tests | `node --test` on new shared/electron tests (or document TD-002 if loader missing) | yes |
| Build | `npm run build` | no (unless release) |
| Storage rules | Manual / optional parse test | yes (document) |

### Manual

- [ ] Select Images: PNG just under new limit → validates; just over → clear error
- [ ] Select ZIP: archive just under new ZIP limit → discovery; over → picker error
- [ ] Select folder: ZIP over old 200 MB but under new limit → processed (not `zipsSkipped`)
- [ ] Upload PNG near new limit → succeeds **after** storage rules deployed to Firebase
- [ ] Upload without rules deploy → document expected failure (rules lag)

---

## Human Checkpoints Anticipated

- [x] **Business logic decision** — confirm target MB values (blocking)
- [x] **Production deploy** — `firebase deploy --only storage` after rules change (blocking for live uploads)
- [ ] Manual UI/UX review — error message clarity
- [ ] Design approval — N/A
- [ ] Database migration — N/A
- [ ] Auth / external service setup — N/A
- [ ] Secrets / env vars — N/A

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Storage rules lag behind app constants | High | Human deploy checkpoint; docs state both must match |
| Renderer OOM with larger PNGs | Medium | Document `2 × MAX_SINGLE_PNG` peak; keep `UPLOAD_CONCURRENCY = 2`; note in signoff |
| ZIP bomb with higher extract cap | Medium | Keep ratio + entry limits; derived `MAX_EXTRACTED_BYTES` |
| `storage.rules` drift from TS constants | Medium | Comment in rules + optional consistency test |
| Staff confusion during rules/app mismatch | Medium | Deploy storage rules before announcing new limits |

---

## Rollback Plan

- Revert constant values and `storage.rules` in git
- Redeploy previous storage rules to Firebase
- No data migration required

---

## Documentation Updates Required

- [ ] `docs/standards/SECURITY.md`
- [ ] `docs/WORKFLOWS.md`
- [ ] `docs/architecture/FIREBASE.md`
- [ ] `docs/project/DECISIONS.md`
- [ ] `docs/standards/TESTING.md` (if new test files/commands)

---

## Open Questions

- [x] **Blocking:** New per-PNG limit (MB)?
- [x] **Blocking:** New per-ZIP compressed limit (MB)?
- [x] **Blocking:** `MAX_EXTRACTED_BYTES` — derived formula vs explicit value?
- [ ] Confirm derivative WebP 10 MB cap remains adequate for larger source PNGs (non-blocking; Sharp output typically small)

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Application code | shared constants, electron import pipeline, `storage.rules` |
| Documentation | SECURITY, WORKFLOWS, FIREBASE, workflow artifacts |
| Starter Surface | No |

---

## Approval

- Review doc: `docs/workflow/reviews/batch-import-size-limits-review.md`
- Verdict: pending human limit values
