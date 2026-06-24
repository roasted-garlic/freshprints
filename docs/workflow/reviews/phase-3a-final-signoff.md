# Phase 3A Final Signoff

## Overview

### Purpose of Phase 3A

Phase 3A establishes the **end-to-end single-PNG import foundation** for the Fresh Prints desktop admin app. Staff with `importDesigns` permission can select one local PNG, validate it in the Electron main process, review results and a local preview, explicitly upload the original to Firebase Storage, and create a Firestore catalog record with `status: "imported"` — using the existing Phase 2A design data model and services.

Phase 3A proves the architecture for:

* Secure Electron IPC between renderer and main process
* Main-process filesystem access with session-scoped path validation
* Renderer-side Firebase Storage and Firestore writes through services
* Explicit user-controlled validation vs upload stages
* Orphan Storage cleanup when Firestore create fails
* Design Library visibility for imported records

Phase 3A does **not** deliver batch import, ZIP extraction, folder scanning, thumbnail/preview generation, strict DPI rejection, AI enrichment, or customer catalog access.

**Parent plan:** `docs/plans/import-pipeline-plan.md`  
**Kickoff decisions:** `docs/plans/phase-3a-kickoff.md`  
**Storage upload plan:** `docs/plans/phase-3a-storage-upload-plan.md`  
**Prerequisites:** Phase 2A (data foundation), Phase 2B (Design Library UI), Phase 2C (manual design CRUD)

**Signoff date:** 2026-06-20  
**Reviewer:** AI-assisted architecture review (implementation + documentation alignment)  
**Stakeholder testing status:** Manual verification performed during Phase 3A implementation against live Firebase (desktop app, Imports page, Design Library)

---

### Relationship to Phase 3B

Phase 3B builds **batch import sources** on top of the Phase 3A single-file pipeline:

| Phase 3A (complete) | Phase 3B (next) |
| --- | --- |
| Single PNG file picker | Multiple PNG selection |
| One file per user action | Folder scan (main process) |
| Synchronous per-file flow | ZIP extract + PNG discovery |
| In-memory import result | Batch queue / job runner |
| No progress streaming | IPC progress + batch UI |
| Per-file error in Imports panel | Batch summary, skipped vs rejected reporting |

Phase 3A's `importOrchestrationService`, `designService.createDesign`, Storage path contract, and IPC security model are the **reuse foundation** for 3B. Do not begin 3B until this signoff is recorded.

Per `docs/plans/import-pipeline-plan.md`: implement **3A → 3B → 3C** in order.

---

### Relationship to Future AI Processing

Phase 3A creates designs with:

* `status: "imported"`
* `aiProcessed: false`, `aiReviewed: false`
* Empty `thumbnailPath` / `previewPath` (catalog paths deferred to Phase 3C)
* Title from filename (no AI naming)
* Empty tags and no category assignment

**Phase 7 (AI)** will consume imported catalog records for naming, tagging, categorization, and vision metadata. Phase 3A intentionally leaves designs in `imported` status without AI metadata writes.

Lifecycle alignment (`docs/DATA_MODEL.md`):

```txt
imported → processing → ready → queued → printed → archived
                    ↘ rejected
```

Phase 3C transitions designs toward `ready` after derivatives exist. Phase 7 adds `aiMetadata` and review workflows on top of the catalog foundation Phase 3A populates.

---

## Scope Completed

### Sub-phase summary

| Sub-phase | Deliverable | Status |
| --- | --- | --- |
| **3A-1** | Scoped preload API (`window.freshPrints.imports`), IPC allowlist, raw `ipcRenderer` removed | Complete |
| **3A-2** | PNG selection, validation, DPI warnings, Imports UI, session path registry | Complete |
| **3A-3** | Firebase Storage upload, `storage.rules`, byte-read IPC, validation/upload separation | Complete |
| **3A-4** | Firestore `createDesign` after upload, orphan cleanup, import success UI | Complete |
| **3A UX** | Imported filter routing, Design Details thumbnail placeholder | Complete |

---

### Secure IPC architecture

| Item | Location |
| --- | --- |
| Preload bridge | `electron/preload.ts` — `window.freshPrints.imports`, `window.freshPrints.app` |
| Channel allowlist | `electron/ipc/import/importIpcChannels.ts` |
| Typed IPC contracts | `shared/types/import/importIpc.types.ts` |
| Handlers | `electron/ipc/import/importIpcHandlers.ts` |
| Security documentation | `docs/setup/electron-security-setup.md` |

**Allowlisted import channels:**

```txt
fresh-prints:import:select-single-png
fresh-prints:import:validate-selected-png
fresh-prints:import:read-selected-png-bytes
fresh-prints:import:get-selected-png-preview
```

All methods return structured `ImportIpcResult<T>` — handlers do not throw raw errors to the renderer.

---

### PNG file selection

| Item | Location |
| --- | --- |
| Native file picker | `electron/ipc/import/selectSinglePngFile.ts` |
| Session registration | `electron/ipc/import/importFileSession.ts` |
| Renderer wrapper | `src/renderer/src/features/imports/services/importDesktopService.ts` |

Selection returns metadata only. Paths must originate from the picker; client-supplied paths are rejected unless session-registered.

---

### PNG validation

| Item | Location |
| --- | --- |
| Validator | `electron/ipc/import/pngValidator.ts` |
| PNG parser | `electron/ipc/import/pngParser.ts` |
| Path guards | `electron/ipc/import/importPathUtils.ts` |
| Constants | `shared/constants/importValidation.constants.ts` (50 MB max, PNG magic bytes) |

Validation covers extension, file type, size cap, PNG signature, IHDR dimensions, and chunk integrity. Validation errors appear in the validation UI only — no Storage or Firestore calls during validation.

---

### DPI extraction

| Item | Details |
| --- | --- |
| Source | PNG `pHYs` chunk (meters unit) |
| Conversion | `pixelsPerUnit * 0.0254` |
| Warnings | `DPI_METADATA_MISSING`, `DPI_BELOW_TARGET` (threshold 300) |
| Policy | Warnings only — import not blocked in Phase 3A |
| Import persistence | `resolveImportDpi.ts` stores minimum axis DPI on design record when present |

---

### Image preview

| Item | Location |
| --- | --- |
| Main-process preview | `electron/ipc/import/getSelectedPngPreview.ts` (`nativeImage`, max 320px width) |
| UI | `ImportPngPreview.tsx`, `ImportResultPanel.tsx` |

Preview uses session-validated paths only after validation. No Firebase Storage access during preview.

---

### Firebase Storage upload

| Item | Location |
| --- | --- |
| Upload service | `src/renderer/src/features/imports/services/importUploadService.ts` |
| Orchestration | `src/renderer/src/features/imports/services/importOrchestrationService.ts` |
| Path helper | `src/renderer/src/features/designs/constants/designStoragePaths.ts` |
| Storage rules | `storage.rules` |

Canonical path: `/originals/{designId}.png`. Upload requires explicit user click on **Upload PNG** after validation.

---

### Firestore design creation

| Item | Location |
| --- | --- |
| Orchestration | `importOrchestrationService.uploadValidatedPng()` calls `designService.createDesign()` after Storage upload |
| Title helper | `importDesignTitleFromFileName.ts` |
| Hook | `useSinglePngImport.ts` passes authenticated user to orchestration |

**Create payload (import):**

* `status: "imported"`
* `originalPath` from upload
* `width`, `height`, `dpi` from validation
* `thumbnailPath: ""`, empty tags, no `categoryId`
* `id` matches upload `designId`

Success UI appears only after **both** Storage upload and Firestore create succeed.

---

### Imported status routing into Design Library

| Item | Location |
| --- | --- |
| Query param helper | `src/renderer/src/features/designs/constants/designLibraryFilters.ts` |
| Imports success link | `ImportResultPanel.tsx` → `/designs?status=imported` |
| Page filter sync | `DesignLibraryPage.tsx` reads `?status=` via `useSearchParams` |

Sidebar navigation to `/designs` without query param retains default **Ready** filter. Only the post-import **Open Design Library** action pre-selects **Imported**.

---

### Design Library visibility

* Imported designs appear when status filter is **Imported** or **All statuses**
* Default filter remains **Ready** for normal navigation (by design — imported records are pipeline-stage, not production-ready)
* Post-import link resolves visibility without manual filter switching
* `DesignGrid`, `DesignCard`, and `useDesigns` list query by `status` filter

---

### Audit metadata integration

Audit fields flow through existing `designService.createDesign()` — not set by UI or import components:

* `createdBy`, `updatedBy` → `caller.id`
* `uploadedBy` → `caller.id` (import attribution)
* `createdAt`, `updatedAt` → `serverTimestamp()`

Firestore rules enforce immutable `createdBy` / `createdAt` on update and `updatedBy == request.auth.uid` on writes. Types and `DATA_MODEL.md` aligned.

---

### Orphan cleanup strategy

On Firestore create failure after successful Storage upload:

1. `importUploadService.deleteOriginalPng(designId)` attempts rollback
2. UI shows create error (not success)
3. If delete fails: `console.error` + cleanup warning in UI; app does not crash

Documented in `docs/WORKFLOWS.md` and `docs/FIREBASE.md`.

---

### Design Details thumbnail placeholder layout

| Item | Location |
| --- | --- |
| Thumbnail panel component | `DesignThumbnailPanel.tsx` |
| Modal layout | `DesignDetailsModal.tsx` |
| Styles | `src/renderer/src/styles/components/design-library.css` |

Top-right: fixed 4:3 thumbnail container. Empty or non-URL `thumbnailPath` shows Lucide image icon + **Preview Pending**. Status moved to compact badge beneath thumbnail. Structure is reusable for Phase 3C thumbnails and future AI review imagery. No Storage URL fetching in Phase 3A.

---

### Renderer feature structure

```txt
src/renderer/src/features/imports/
├── components/
│   ├── ImportPngPreview.tsx
│   └── ImportResultPanel.tsx
├── constants/
│   └── importValidation.constants.ts
├── hooks/
│   └── useSinglePngImport.ts
├── pages/
│   └── ImportsPage.tsx
├── services/
│   ├── importDesktopService.ts
│   ├── importOrchestrationError.ts
│   ├── importOrchestrationService.ts
│   └── importUploadService.ts
└── utils/
    ├── importDesignTitleFromFileName.ts
    └── resolveImportDpi.ts

electron/ipc/import/
├── importFileSession.ts
├── importIpcChannels.ts
├── importIpcHandlers.ts
├── getSelectedPngPreview.ts
├── pngParser.ts
├── pngValidator.ts
├── readSelectedPngFileBytes.ts
└── selectSinglePngFile.ts
```

---

### Documentation updates

| Document | Updates |
| --- | --- |
| `docs/WORKFLOWS.md` | Single PNG import workflow through Firestore create |
| `docs/FIREBASE.md` | Phase 3A upload + create + cleanup |
| `docs/SECURITY.md` | Storage rules, audit metadata |
| `docs/setup/electron-security-setup.md` | Scoped preload, import IPC table |
| `docs/setup/firebase-storage-setup.md` | Staff `/originals/` rules |
| `docs/plans/phase-3a-storage-upload-plan.md` | 3A-3 / 3A-4 status |

---

## Manual Verification

Verification performed manually via the **Imports** page (`#/imports`) and **Design Library** (`#/designs`) in the desktop app against the live Firebase project.

### Workflow verification

| Step | Action | Expected result | Status |
| --- | --- | --- | --- |
| 1 | **Select PNG** | Native picker opens; PNG filter applied | Verified |
| 2 | **Validate PNG** | Validation card shows file name, size, dimensions, DPI | Verified |
| 3 | **Preview image** | Resized preview appears beside validation details | Verified |
| 4 | **Upload PNG** | Upload only after explicit click; no auto-upload on select | Verified |
| 5 | **Create Firestore design record** | Success shows design ID, storage path, Firestore record created | Verified |
| 6 | **Open Design Library to Imported filter** | Link opens `/designs?status=imported` | Verified |
| 7 | **Design appears in Design Library** | Record visible under **Imported** status filter | Verified |

### Storage verification

| Check | Status |
| --- | --- |
| Object exists at `originals/{designId}.png` after successful import | Verified |
| Content type `image/png` | Verified |
| Object size matches source file | Verified |
| Staff-only access enforced by rules | Verified |

### Firestore verification

| Check | Status |
| --- | --- |
| Document exists at `designs/{designId}` | Verified |
| `status` is `"imported"` | Verified |
| `originalPath` matches Storage path | Verified |
| `uploadedBy` matches importing staff user | Verified |
| `width`, `height` match validation output | Verified |

### Audit field verification

| Field | Status |
| --- | --- |
| `createdBy` present, equals importing user | Verified |
| `updatedBy` present, equals importing user on create | Verified |
| `createdAt` / `updatedAt` present | Verified |
| Fields set by service layer, not UI input | Verified (code review) |

### Failure-path verification

| Scenario | Expected | Status |
| --- | --- | --- |
| Validation failure | Error in validation UI; no Storage/Firestore calls | Verified |
| Storage permission error | Error in upload section only | Verified |
| Firestore create failure after upload | Error UI; Storage rollback attempted | Verified (design) |
| Sidebar → Design Library | Default filter **Ready** unchanged | Verified |

---

## Security Review

### Context isolation

| Control | Status |
| --- | --- |
| `contextIsolation: true` | Enforced per Electron project setup |
| `nodeIntegration: false` in renderer | Enforced |
| Scoped preload API only | `window.freshPrints` namespaces |

### No renderer filesystem access

| Control | Status |
| --- | --- |
| File picker in main process only | Yes |
| Path session registry | `importFileSession.ts` |
| Byte read gated on validated session path | `readSelectedPngFileBytes`, `getSelectedPngPreview` |
| No `fs` / unrestricted paths in React | Verified |

### Allowlisted IPC

| Control | Status |
| --- | --- |
| Channel constants centralized | `importIpcChannels.ts` |
| Preload invoke guard | `isAllowedImportIpcChannel()` |
| No raw `window.ipcRenderer` | Removed in 3A-1 |
| Structured error responses | `ImportIpcResult<T>` |

### Storage rules

`storage.rules`:

* Staff-only (`owner`, `admin`, `helper`) read/write/delete on `/originals/{fileName}`
* File name regex: `[A-Za-z0-9_-]+\.png`
* `contentType == "image/png"`, size &lt; 50 MB
* Default deny all other paths

Deploy: `firebase deploy --only storage`

### Firestore rules

`firestore.rules`:

* Staff read on `designs`
* Staff create with `designRequiredFieldsValid`, `uploadedBy == auth.uid`, audit field checks
* Immutable `createdBy` / `createdAt` on update
* `updatedBy == request.auth.uid` on update
* Hard delete denied

Deploy: `firebase deploy --only firestore:rules`

### Audit metadata protection

* Services set audit fields; types exclude them from user input
* Rules enforce create/update audit constraints
* `uploadedBy` immutable on design update

---

## Technical Debt

The following are **intentionally deferred** per kickoff and parent import plan:

| Item | Target phase |
| --- | --- |
| Batch / multiple PNG selection | Phase 3B |
| ZIP import and extraction | Phase 3B |
| Folder scan import | Phase 3B |
| Batch progress tracking and cancel | Phase 3B |
| Batch error / rejection reporting | Phase 3B |
| Thumbnail generation | Phase 3C |
| Preview image generation pipeline | Phase 3C |
| Storage URL resolution for catalog thumbnails | Phase 3C |
| Strict DPI rejection | Phase 3C |
| Status transition `imported` → `ready` after derivatives | Phase 3C |
| AI categorization, tagging, naming | Phase 7 |
| Show queue integration (`queueCount` updates) | Phase 6 |
| Customer website catalog access | Future website milestone |
| `importJobs` Firestore collection | Phase 3B+ |
| Automated import integration test harness | Future |
| Resumable / retry upload without re-read | Phase 3C polish |

---

## Risks

### Low

| Risk | Justification |
| --- | --- |
| Full PNG bytes in renderer memory during upload | Single-file desktop scope; acceptable for 3A |
| Design Library default filter hides imported designs | Mitigated by `?status=imported` post-import link |
| Preview panel shows placeholder until 3C | Documented; `DesignThumbnailPanel` ready for URLs |
| No automated import test suite | Manual verification sufficient for 3A gate |
| Legacy designs without audit fields | Service backfill on first update; low volume in dev |

### Medium

| Risk | Justification |
| --- | --- |
| Orphan Storage objects if rollback delete fails | Cleanup warning shown; manual Console cleanup may be needed |
| Upload + create not atomic | By design; orchestration handles compensating delete |
| `importOrchestrationService` sequential per file | Acceptable for 3A; 3B needs job runner |
| Firestore rules must stay deployed in sync with audit fields | Manual create and import share same path — single failure surface |
| HashRouter query params for filter preset | Works for 3A; evaluate state patterns if presets multiply |

### High

| Risk | Justification |
| --- | --- |
| None identified for Phase 3A scope | Architecture, rules, and single-file pipeline align with plans |

---

## Architecture Review

### Layer compliance

```txt
ImportsPage / ImportResultPanel (components)
        ↓
useSinglePngImport (hook)
        ↓
importOrchestrationService / importUploadService / importDesktopService (services)
        ↓
designService.createDesign (feature service)
        ↓
Firebase Storage SDK / Firestore SDK
        ↓
window.freshPrints.imports (preload)
        ↓
Electron main process (picker, validation, bytes, preview)
```

### Confirmations

| Requirement | Status |
| --- | --- |
| Components → Hooks → Services → Firebase | Confirmed |
| No Firebase logic inside components | Confirmed — components render and trigger hook actions only |
| No Firestore/Storage calls in `ImportsPage` / `ImportResultPanel` | Confirmed |
| No filesystem access in renderer | Confirmed |
| `designService.createDesign()` used for catalog writes | Confirmed — no bypass |
| Thin `App.tsx` maintained | Confirmed — providers + routes only (`src/App.tsx`, 19 lines) |
| Import pipeline follows architecture | Confirmed — matches `docs/plans/import-pipeline-plan.md` §8 |
| Shared types in `shared/types/import/` | Confirmed |
| Permission checks in services | `permissionService` + route gate `importDesigns` |

### Forbidden patterns avoided

* Raw `ipcRenderer` in renderer
* Direct Firestore writes from components
* ZIP/batch logic in React components
* Business logic in `App.tsx`

---

## Recommendation

### Approve Phase 3A

**Recommendation: Go**

Phase 3A deliverables are implemented, aligned with `docs/plans/phase-3a-kickoff.md` and `docs/plans/import-pipeline-plan.md`, manually verified against live Firebase, and consistent with project architecture documentation.

**Reasons:**

1. Secure IPC foundation is in place and documented.
2. Single-PNG validation, preview, upload, and Firestore create work end-to-end.
3. Validation and upload are correctly separated with explicit user action.
4. Storage and Firestore rules enforce staff-only access and audit metadata.
5. Orphan cleanup strategy handles partial-failure cases.
6. Imported designs are discoverable in Design Library via query-param routing.
7. Design Details modal is prepared for Phase 3C thumbnails.
8. Architecture layers are respected; `App.tsx` remains thin.

---

### Proceed to Phase 3B

**Recommended next milestone:** Phase 3B — Batch import sources

Per `docs/plans/import-pipeline-plan.md`:

* Multiple PNG selection
* Folder imports (main-process scanner)
* ZIP imports (main-process extract + PNG discovery)
* Batch progress tracking (IPC streaming)
* Batch error reporting (skipped vs rejected, summary counts)
* `ImportJobRunner` and job state machine
* Concurrency limits

Reuse Phase 3A orchestration per file; do not rewrite Storage path contract or bypass `designService`.

Phase 3C (derivatives, strict DPI, thumbnail upload, `ready` transition) follows 3B.

---

## Exit Criteria

### Phase 3A kickoff goals

| Criterion | Met |
| --- | --- |
| Staff can select a single local PNG | Yes |
| Validation results including DPI warnings displayed | Yes |
| Original uploaded to Firebase Storage | Yes |
| Firestore design record with `status: "imported"` | Yes |
| Import result visible on Imports page | Yes |
| No ZIP, folder, batch, thumbnails, or AI in scope | Yes |

### Import pipeline plan — Phase 3A verification checklist

| Criterion | Met |
| --- | --- |
| Single PNG imports end-to-end | Yes |
| Validation errors do not trigger Storage/Firestore | Yes |
| Failed validation shows error without orphans | Yes |
| No filesystem access from React components | Yes |
| Preload hardened (no raw `ipcRenderer`) | Yes |
| Storage rules deployed | Yes (per implementation) |
| `designService.createDesign` used for catalog writes | Yes |

### Signoff decision

**Phase 3A — Single PNG Import Foundation — is accepted and complete.**

Staff can import one PNG at a time through a secure, architecture-compliant pipeline from desktop file selection through Firebase Storage and Firestore catalog creation, with Design Library visibility for imported records.

**Status:** Approved. Proceed to **Phase 3B — Batch import sources (folder + ZIP)**.

---

## Deployment Reference

| Asset | Command |
| --- | --- |
| Storage rules | `firebase deploy --only storage` |
| Firestore rules | `firebase deploy --only firestore:rules` |
| Firestore indexes | No new indexes required for Phase 3A import create |
| Cloud Functions | No Phase 3A function changes |
| Desktop app | Electron build includes preload + main IPC handlers |

---

## Final Signoff

Phase 3A closes the **single-file import foundation** milestone for Fresh Prints. The pipeline is secure, service-layered, rules-backed, and ready for batch expansion in Phase 3B and derivative generation in Phase 3C.

---

*References: `docs/plans/import-pipeline-plan.md`, `docs/plans/phase-3a-kickoff.md`, `docs/plans/phase-3a-storage-upload-plan.md`, `docs/reviews/phase-3a-3-signoff.md`, `docs/WORKFLOWS.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/DATA_MODEL.md`, `docs/ROADMAP.md`*
