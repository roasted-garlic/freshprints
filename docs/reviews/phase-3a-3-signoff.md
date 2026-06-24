# Phase 3A-3 Signoff

## Overview

### Purpose of Phase 3A-3

Phase 3A-3 completes the **Firebase Storage upload layer** of the single-PNG import foundation. Staff can select a local PNG, validate it in the Electron main process, review validation results and a local preview, explicitly upload the original to Firebase Storage, and see upload success or failure — without yet creating a Firestore catalog record.

Phase 3A-3 builds on:

* **Phase 3A-1** — Scoped preload API (`window.freshPrints.imports`) and IPC allowlist
* **Phase 3A-2** — PNG selection, validation, DPI warnings, Imports UI shell

**Parent plan:** `docs/plans/import-pipeline-plan.md`  
**Kickoff decisions:** `docs/plans/phase-3a-kickoff.md`  
**Upload plan:** `docs/plans/phase-3a-storage-upload-plan.md`  
**Prerequisites:** Phase 2A data foundation, Phase 2B/2C Design Library UI, Phase 3A-1 and 3A-2 complete

**Signoff date:** 2026-06-20  
**Reviewer:** AI-assisted architecture review (implementation + documentation alignment)  
**Stakeholder testing status:** Manual verification performed during Phase 3A-3 implementation (Imports page, live Firebase project)

---

## Scope Completed

### PNG selection

| Item | Location | Notes |
| --- | --- | --- |
| Native file picker | `electron/ipc/import/selectSinglePngFile.ts` | Electron `dialog.showOpenDialog`; PNG filter only |
| IPC handler | `electron/ipc/import/importIpcHandlers.ts` | `fresh-prints:import:select-single-png` |
| Preload API | `electron/preload.ts` | `window.freshPrints.imports.selectSinglePngFile()` |
| Session registration | `electron/ipc/import/importFileSession.ts` | Selected path registered; prior session cleared |
| Renderer service | `src/renderer/src/features/imports/services/importDesktopService.ts` | Typed wrapper over preload API |

Selection returns metadata only (`filePath`, `fileName`, `fileSizeBytes`, `extension`). No file bytes cross the IPC boundary at selection time.

---

### PNG validation

| Item | Location | Notes |
| --- | --- | --- |
| Validator | `electron/ipc/import/pngValidator.ts` | Extension, file type, size cap, PNG structure |
| Parser | `electron/ipc/import/pngParser.ts` | Magic bytes, IHDR dimensions, chunk walk |
| Constants | `shared/constants/importValidation.constants.ts` | `MIN_DPI = 300`, `MAX_SINGLE_PNG_SIZE_BYTES = 50 MB` |
| IPC handler | `importIpcHandlers.ts` | `fresh-prints:import:validate-selected-png` |
| Path guard | `importPathUtils.ts`, `importFileSession.ts` | Client paths must match picker-registered session |

Validation produces structured results (`ValidateSelectedPngFileResult`) with `valid`, dimensions, file metadata, and warnings. Validation errors are surfaced in the validation UI only.

**UX (post-3A-3 correction):** Validation and upload are **decoupled**. Selecting a PNG validates and shows results; upload occurs only when the user clicks **Upload PNG**.

---

### DPI extraction

| Item | Details |
| --- | --- |
| Source | PNG `pHYs` chunk (unit specifier `1` = meters) |
| Conversion | `pixelsPerUnit * METERS_PER_INCH` (`0.0254`) |
| Warnings | `DPI_METADATA_MISSING` when no DPI present; `DPI_BELOW_TARGET` when either axis &lt; 300 |
| Policy | Warnings only — import is **not blocked** in Phase 3A (per kickoff) |

DPI values are rounded to two decimal places in validation output.

---

### Image preview

| Item | Location | Notes |
| --- | --- | --- |
| Main-process preview | `electron/ipc/import/getSelectedPngPreview.ts` | `nativeImage.createFromPath()`; max width 320px |
| IPC handler | `importIpcHandlers.ts` | `fresh-prints:import:get-selected-png-preview` |
| Requires validation | `importFileSession.ts` | Preview allowed only after path is marked validated |
| UI component | `src/renderer/src/features/imports/components/ImportPngPreview.tsx` | Renders data URL in validation card |
| Result panel | `ImportResultPanel.tsx` | Preview column beside validation details |

Preview generation does **not** call Firebase Storage.

---

### Secure IPC

| Item | Status |
| --- | --- |
| Raw `ipcRenderer` exposure | Removed (Phase 3A-1) |
| Scoped preload namespace | `window.freshPrints.imports` + `window.freshPrints.app` |
| Channel allowlist | `electron/ipc/import/importIpcChannels.ts` — `isAllowedImportIpcChannel()` |
| Structured responses | `ImportIpcResult<T>` in `shared/types/import/importIpc.types.ts` |
| Path traversal guard | `isUnsafeClientFilePath()` rejects `..`, null bytes, invalid types |
| Byte read gate | `readSelectedPngFileBytes` requires validated session path |

**Allowlisted import channels (Phase 3A-3):**

```txt
fresh-prints:import:select-single-png
fresh-prints:import:validate-selected-png
fresh-prints:import:read-selected-png-bytes
fresh-prints:import:get-selected-png-preview
```

Documentation: `docs/setup/electron-security-setup.md`

---

### Storage upload

| Item | Location | Notes |
| --- | --- | --- |
| Orchestration | `importOrchestrationService.ts` | `generateDesignId()` → read bytes → upload |
| Upload service | `importUploadService.ts` | `uploadBytes()` via Firebase Storage SDK |
| Byte read IPC | `readSelectedPngFileBytes.ts` | Main process reads file after validation |
| Hook | `useSinglePngImport.ts` | `selectAndValidatePng()` then `uploadValidatedPng()` on user action |
| Page | `ImportsPage.tsx` | Select PNG in phase card; Upload PNG below preview in validation card |
| Path helper | `designStoragePaths.ts` | `getOriginalStoragePath(designId)` → `/originals/{designId}.png` |

Upload flow:

```txt
User clicks Upload PNG
  → designService.generateDesignId()
  → IPC readSelectedPngFileBytes(validated path)
  → importUploadService.uploadOriginalPng(designId, bytes)
  → UI shows designId, storage path, success or upload error
```

Storage permission errors appear in the **upload** section only, not during validation.

---

### Storage rules

| Item | Details |
| --- | --- |
| Rules file | `storage.rules` |
| Path match | `/originals/{fileName}` with `fileName.matches('[A-Za-z0-9_-]+\\.png')` |
| Staff gate | Active `owner`, `admin`, or `helper` via Firestore `users/{uid}` lookup |
| Upload constraints | `contentType == "image/png"`, size &lt; 50 MB |
| Default deny | `match /{allPaths=**}` → `allow read, write: if false` |
| Firebase config | `firebase.json` includes storage rules |
| Documentation | `docs/SECURITY.md`, `docs/setup/firebase-storage-setup.md` |

Deploy command:

```bash
firebase deploy --only storage
```

Storage rules were deployed during Phase 3A-3 implementation (syntax corrected from invalid `{designId}.png` path segment to `{fileName}` + regex).

---

### Renderer feature structure

```txt
src/renderer/src/features/imports/
├── components/
│   ├── ImportPngPreview.tsx
│   └── ImportResultPanel.tsx
├── hooks/
│   └── useSinglePngImport.ts
├── pages/
│   └── ImportsPage.tsx
├── services/
│   ├── importDesktopService.ts
│   ├── importOrchestrationService.ts
│   └── importUploadService.ts
└── constants/
    └── importValidation.constants.ts   (re-exports shared constants)
```

---

## Manual Verification Results

Verification was performed manually via the **Imports** page (`#/imports`) in the desktop app against the live Firebase project.

### Validation success

| Check | Result | Evidence |
| --- | --- | --- |
| PNG file picker opens | Pass | Native dialog; PNG filter applied |
| Valid PNG validates | Pass | Validation card shows file name, size, dimensions |
| DPI metadata displayed | Pass | Shows `pHYs` values or "Not present" |
| DPI warnings shown | Pass | Missing/below-300 warnings listed; upload not auto-triggered |
| Invalid file rejected | Pass | Validation error in validation UI; no Storage call |
| Preview rendered | Pass | Resized data URL shown beside validation details |
| Selection cancel handled | Pass | Neutral cancel message; no error state |

### Upload success

| Check | Result | Evidence |
| --- | --- | --- |
| Upload requires explicit click | Pass | No Storage upload until **Upload PNG** clicked |
| Upload progress state | Pass | "Uploading..." phase message during upload |
| Success feedback | Pass | Upload section shows design ID and storage path |
| Upload error isolation | Pass | Storage errors in upload section only |
| Retry after failure | Pass | Validation results retained; user can retry upload |

### Firebase Storage object verification

| Check | Result | Notes |
| --- | --- | --- |
| Object created after upload | Pass | Object appears in Firebase Console → Storage |
| Content type | Pass | `image/png` |
| Object size matches source | Pass | Matches validated `fileSizeBytes` |
| Staff-only access | Pass | Non-staff / unauthenticated denied by rules |

### Storage path verification

| Check | Result | Notes |
| --- | --- | --- |
| Canonical path format | Pass | `/originals/{designId}.png` |
| `designId` format | Pass | Generated by `designService.generateDesignId()` |
| Path matches `designStoragePaths` helper | Pass | `getOriginalStoragePath(designId)` |
| Rules accept canonical file name | Pass | Regex `[A-Za-z0-9_-]+\.png` enforced server-side |

**Example verified path pattern:**

```txt
originals/abc123xyz.png
```

(Catalog path stored as `/originals/{designId}.png` in application code.)

---

## Security Review

### Renderer restrictions

| Control | Status |
| --- | --- |
| `nodeIntegration: false` | Enforced (Electron defaults per project setup) |
| `contextIsolation: true` | Enforced |
| No `window.ipcRenderer` | Removed |
| No filesystem APIs in renderer | Filesystem access main-process only |
| No raw file paths from user input | Paths must originate from picker session |
| Firebase Storage via service layer | `importUploadService` — not in components |

### Main-process file access

| Control | Status |
| --- | --- |
| File picker is sole path entry | `registerImportFilePath()` on selection |
| Session-scoped allowlist | One active import path per session |
| Validation required before bytes/preview | `markImportFileValidated()` gate |
| Path normalization | `path.normalize()` on all session checks |
| Unsafe path rejection | `..`, null bytes, non-string input blocked |
| Size limit before read | 50 MB enforced in validator and preview helper |

### IPC allowlist

| Control | Status |
| --- | --- |
| Channel constants centralized | `importIpcChannels.ts` |
| Preload invoke guard | `isAllowedImportIpcChannel()` before `ipcRenderer.invoke` |
| Typed shared contracts | `shared/types/import/importIpc.types.ts` |
| Handlers return structured errors | No raw thrown errors to renderer |
| No ad-hoc channel strings in renderer | Import desktop service uses preload only |

### Storage rule protections

| Control | Status |
| --- | --- |
| Staff role check via Firestore user doc | `isStaff()` in `storage.rules` |
| Active user required | `callerUser().isActive == true` |
| File name regex | Prevents path injection in object key |
| Content type enforcement | `image/png` only on create/update |
| Size cap server-side | 50 MB limit in rules |
| Default deny all other paths | Thumbnails, previews, customer paths blocked |

**Residual security notes (not blockers for 3A-3):**

* Orphan Storage objects possible if upload succeeds but Firestore create fails (Phase 3A-4 must implement cleanup or compensating workflow)
* No server-side import audit log yet (deferred)
* Renderer holds full PNG bytes transiently during upload (acceptable for single-file desktop import)

---

## Technical Debt

The following are **intentionally deferred** and documented in kickoff / parent plans:

| Item | Target | Notes |
| --- | --- | --- |
| Firestore catalog creation after upload | Phase 3A-4 | `designService.createDesign` with `status: "imported"` not wired to import flow |
| Thumbnails / Storage previews | Phase 3C | `/thumbnails/`, `/previews/` paths defined but not uploaded |
| Local preview vs catalog thumbnail | Phase 3C | Imports page uses main-process data URL only |
| ZIP import | Phase 3B | Explicitly out of scope |
| Folder / batch import | Phase 3B | Explicitly out of scope |
| AI enrichment (categorization, tagging, naming) | Phase 7 | No AI metadata writes |
| Strict DPI rejection | Phase 3C | Phase 3A warns only |
| `importJobs` Firestore collection | Phase 3B+ | Session is ephemeral in renderer |
| Storage orphan cleanup helper | Phase 3A-4 | Planned for failed Firestore create |
| Automated import verification harness | Future | Manual Imports page verification only |

### Collateral work completed (supports 3A-4)

Audit metadata (`createdBy`, `updatedBy`) and Firestore rule enforcement were implemented on `designs` and `categories` during Phase 3A collateral work. Phase 3A-4 should use these fields when creating import records via `designService.createDesign`.

---

## Risks

### Low

| Risk | Justification |
| --- | --- |
| Full PNG bytes in renderer memory during upload | Single-file desktop scope; acceptable for Phase 3A |
| Preview uses main-process `nativeImage` not PNG parser output | Display-only; validation uses separate parser |
| No automated import integration test suite | Manual verification sufficient for 3A-3 gate |
| `importJobs` persistence absent | Aligns with kickoff; one-shot synchronous UX |
| Category modal success message localization | UX polish completed; not import-related |

### Medium

| Risk | Justification |
| --- | --- |
| Orphan Storage objects without Firestore record | Upload succeeds before 3A-4 create; cleanup not yet implemented |
| Upload + create not atomic | Expected; 3A-4 must handle partial failure |
| Thumbnail/previews paths denied in Storage rules | Correct for 3A-3; 3C must extend rules before derivative uploads |
| Helper role can upload originals | By design (`importDesigns` permission); aligns with staff import workflow |

### High

| Risk | Justification |
| --- | --- |
| None identified for Phase 3A-3 scope | Storage rules deployed, IPC hardened, validation/upload separated, staff-only access enforced |

---

## Recommendation

### Approve Phase 3A-3

**Recommendation: Go**

Phase 3A-3 deliverables are implemented, aligned with `docs/plans/phase-3a-kickoff.md` and `docs/plans/phase-3a-storage-upload-plan.md`, and manually verified against live Firebase Storage.

**Reasons:**

1. PNG selection, validation, DPI extraction, and preview work end-to-end in the desktop app.
2. Secure IPC boundary is enforced — scoped preload, allowlisted channels, session-validated paths.
3. Storage upload uses canonical `/originals/{designId}.png` paths and staff-only rules.
4. Validation and upload are correctly separated; no Storage calls during validation.
5. Error handling isolates validation vs upload failures.
6. Architecture respects project layers (main process, preload, services, hooks, components).
7. Documentation updated (`WORKFLOWS.md`, `SECURITY.md`, `FIREBASE.md`, `electron-security-setup.md`).

---

### Proceed to audit metadata implementation

Confirm audit metadata is consistently applied when Phase 3A-4 creates import records:

* `createdBy` / `updatedBy` set via `designService.createDesign` (not UI input)
* Firestore rules enforce immutable `createdBy` / `createdAt` on update
* `uploadedBy` remains the import attribution field (separate from audit metadata per `DATA_MODEL.md`)

Audit field types, services, and Firestore rules are **already in place** for designs and categories. Phase 3A-4 should verify import-time `createDesign` payloads satisfy rule constraints.

---

### Then proceed to Phase 3A-4 (Firestore design creation)

**Next milestone:** Wire `importOrchestrationService` to call `designService.createDesign` after successful Storage upload.

Expected 3A-4 outcomes:

* Firestore `designs/{designId}` document with `status: "imported"`
* `originalPath`, dimensions, DPI warnings persisted in design metadata
* `uploadedBy` set to importing staff user
* Imports page shows catalog record success
* Orphan cleanup on Firestore create failure

Do not begin Phase 3B (batch/ZIP) until Phase 3A-4 signoff is recorded.

---

## Deployment Status

| Asset | Status |
| --- | --- |
| `storage.rules` | Deployed — staff-only `/originals/` with PNG constraints |
| `firebase.json` storage reference | Present |
| Firestore rules (audit metadata) | Implemented — deploy if not already live |
| Cloud Functions | No Phase 3A-3 function changes |
| Electron preload / IPC | Shipped with desktop app build |

```bash
firebase deploy --only storage
firebase deploy --only firestore:rules   # if audit rules not yet deployed
```

---

## Final Signoff

Phase 3A-3 — **Single PNG Firebase Storage Upload** — is **complete and accepted** for the scoped deliverables: secure desktop validation pipeline, explicit user-triggered upload, canonical Storage paths, and staff-protected Storage rules.

**Status:** Approved to proceed to **audit metadata verification on import create**, then **Phase 3A-4 — Firestore design record creation**.

---

*References: `docs/plans/phase-3a-kickoff.md`, `docs/plans/phase-3a-storage-upload-plan.md`, `docs/plans/import-pipeline-plan.md`, `docs/setup/electron-security-setup.md`, `docs/WORKFLOWS.md`, `docs/SECURITY.md`*
