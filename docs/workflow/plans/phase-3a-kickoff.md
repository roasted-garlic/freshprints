# Phase 3A Kickoff — Single PNG Import Foundation

## Purpose

This document **locks implementation decisions** for Phase 3A before any import code is written.

Phase 3A proves the end-to-end architecture for importing **one PNG file** from the desktop app through Electron IPC, Firebase Storage, and Firestore — using the existing `designService.createDesign` contract from Phase 2A.

**Parent plan:** `docs/plans/import-pipeline-plan.md`  
**Prerequisites:** Phase 2A, 2B, and 2C complete (`docs/reviews/phase-2c-signoff.md`)

**Kickoff date:** 2026-06-20  
**Status:** Phase 3A-1 complete; Phase 3A-2 complete; Phase 3A-3 complete (Storage upload); Phase 3A-4 (Firestore create) next

---

## Goal

Staff with `importDesigns` permission can:

1. Select a single local PNG file
2. See validation results (including DPI warnings)
3. Upload the original to Firebase Storage
4. Create a Firestore design record with `status: "imported"`
5. View the import result on the Imports page

Phase 3A does **not** deliver batch import, ZIP, folder scan, thumbnails, strict DPI rejection, or AI features.

---

# Locked Decisions

## 1. Minimum DPI

| Decision | Value |
| --- | --- |
| **Target threshold** | **300 DPI** |

**Phase 3A behavior:**

* 300 DPI is the **documented production target** for DTF-ready artwork.
* Phase 3A does **not reject** files for DPI reasons (see §2).
* When DPI metadata is present and **below 300**, record a **warning** in the import result (not a hard failure).
* **Strict DPI rejection** (including missing metadata policy) is deferred to **Phase 3C**.

**Constant location (at implementation):**

```txt
features/imports/constants/importValidation.constants.ts
```

Proposed constant name: `IMPORT_MIN_DPI = 300`.

---

## 2. Missing DPI Metadata

| Decision | Phase 3A |
| --- | --- |
| **Reject missing DPI?** | **No** |
| **Behavior** | **Warning only** |
| **Where stored** | Import result object (in-memory) |
| **Strict rejection** | **Phase 3C** |

When the PNG `pHYs` chunk is absent or DPI cannot be derived:

* Import may **continue** if all other Phase 3A validation passes.
* Import result must include a warning, e.g.:

```txt
code: DPI_METADATA_MISSING
message: DPI metadata is missing. Target minimum is 300 DPI. Strict validation will apply in a future release.
```

When DPI is present but `< 300`:

* Import may **continue** in Phase 3A.
* Import result must include a warning, e.g.:

```txt
code: DPI_BELOW_TARGET
message: Image DPI (240) is below the 300 DPI target.
details: { dpi: 240 }
```

**Phase 3C** will enforce hard rejection per `docs/WORKFLOWS.md` quality bar.

---

## 3. Initial Design Status

| Decision | Value |
| --- | --- |
| **Status on successful import** | **`imported`** |

Imported designs **must** be created with:

```ts
status: "imported"
```

**Rationale:**

* Aligns with `docs/DATA_MODEL.md` lifecycle: `imported → processing → ready`.
* Phase 3A uploads only the original; designs are not yet `ready` for full catalog presentation (no thumbnail in 3A).
* `designService.createDesign` defaults to `ready` when `status` is omitted — import code **must pass `status: "imported"` explicitly**.

**Phase 3C** will transition to `ready` after thumbnail/preview upload.

---

## 4. Thumbnail and Preview Generation

| Decision | Phase 3A |
| --- | --- |
| **Generate thumbnails** | **No** |
| **Generate previews** | **No** |
| **Upload** | **Original PNG only** |
| **Deferred to** | **Phase 3C** |

**Firestore fields on create:**

| Field | Phase 3A value |
| --- | --- |
| `originalPath` | `getOriginalStoragePath(designId)` — populated after upload |
| `thumbnailPath` | `""` (empty string; allowed by `designService`) |
| `previewPath` | omitted / undefined |

**UI expectation:**

* Design Library cards may show a placeholder when `thumbnailPath` is empty (existing Phase 2B behavior).
* Imports page shows success based on original upload + Firestore create, not thumbnail presence.

---

## 5. Image Processing Dependency

| Decision | Phase 3A |
| --- | --- |
| **Add `sharp`** | **No** |
| **Approval** | Deferred until **Phase 3C** thumbnail/preview work |

**Phase 3A metadata approach:**

* Read file in **main process** only.
* Validate PNG magic bytes.
* Parse **IHDR** (width/height) and **pHYs** (DPI) from PNG chunk structure using minimal byte parsing — no new image-processing dependency.
* If chunk parsing fails for dimensions, surface a validation **error** (file unreadable as PNG).

Dependency review per `docs/AI_RULES.md` and `docs/CODING_STANDARDS.md` is required before adding `sharp` in Phase 3C.

---

## 6. Import Job Persistence

| Decision | Phase 3A |
| --- | --- |
| **Persist jobs across app restarts** | **No** |
| **Job state** | **In-memory only** (renderer hook + ephemeral IPC session) |
| **Firestore `importJobs` collection** | **Not in Phase 3A** |
| **Future** | Persistent import history may be added in Phase 3B/3C or later |

Closing or reloading the app clears import results. Phase 3A treats each import as a single synchronous user action with a local result object.

---

## 7. Preload / IPC Hardening

| Decision | Requirement |
| --- | --- |
| **First implementation step** | Replace broad preload IPC exposure |
| **Expose** | Only scoped import APIs needed for Phase 3A |
| **Do not expose** | Raw `window.ipcRenderer` |

### Current state (must change)

`electron/preload.ts` exposes unrestricted `ipcRenderer.on`, `off`, `send`, and `invoke` — violates `docs/SECURITY.md` Preload Security guidance.

### Target state

```ts
window.freshPrints.import.selectPngFile()
window.freshPrints.import.readPngForImport(absolutePath)  // or equivalent validated read
```

**Rules:**

* IPC channel names live in an allowlisted constants module (e.g. `electron/ipc/import/importIpcChannels.ts`).
* Main handlers validate every payload shape and path origin (user-selected dialog path only).
* No arbitrary path execution from renderer-supplied strings.
* Pattern per `docs/SECURITY.md`: **Validate → Authorize → Execute**.

**Phase 3A is blocked** on any import filesystem work until preload hardening lands.

---

## 8. Phase 3A Scope

### In scope

| Capability | Notes |
| --- | --- |
| Select **single** PNG file | Native file dialog via main process |
| Validate file extension | `.png` (case-insensitive) |
| Validate PNG magic bytes | `89 50 4E 47 0D 0A 1A 0A` |
| Read basic metadata | Width, height from IHDR; DPI from pHYs when present |
| Warn if DPI missing | Warning in import result; import continues |
| Warn if DPI below 300 | Warning in import result; import continues |
| Upload original PNG | Firebase Storage via renderer SDK |
| Create Firestore design | `designService.createDesign` with pre-generated `designId` |
| Show import result | Replace `ComingSoonPage` on Imports page |

### Out of scope

| Capability | Deferred to |
| --- | --- |
| ZIP import | Phase 3B |
| Folder scanning | Phase 3B |
| Batch / multi-file import | Phase 3B |
| DPI **rejection** (hard fail) | Phase 3C |
| Missing DPI **rejection** | Phase 3C |
| Thumbnail generation | Phase 3C |
| Preview generation | Phase 3C |
| `sharp` dependency | Phase 3C |
| AI naming | Phase 7 |
| AI categorization | Phase 7 |
| Show queue integration | Phase 6 |
| Customer access / uploads | Customer website milestone |
| Drag-and-drop | Optional Phase 3B+ |
| Import job persistence | Later |
| Storage orphan cleanup automation | Phase 3C polish (manual cleanup acceptable in 3A dev) |

### Permissions

* UI: `permissionService` / `ProtectedRoute` with `importDesigns` (already wired on `#/imports`).
* Service: `designService.createDesign` requires `canCreateDesigns` — staff roles that can import must retain create permission (current behavior).

---

# Architecture Alignment

## Layer responsibilities

```txt
ImportsPage (component)
        ↓
useImportPng / useImportJob (hook — in-memory state)
        ↓
importOrchestrationService + importUploadService (renderer services)
        ↓
window.freshPrints.import.* (preload)
        ↓
import IPC handlers + png validation (electron/main)
        ↓
designService.createDesign + Firebase Storage SDK (renderer)
```

**Forbidden:**

* Filesystem access in React components
* Firebase calls in Electron main process
* Business logic in `App.tsx`
* Raw `ipcRenderer` in renderer

## Storage path contract

Unchanged from Phase 2A (`features/designs/constants/designStoragePaths.ts`):

```txt
/originals/{designId}.png
```

Flow:

```txt
designService.generateDesignId()
        ↓
getOriginalStoragePath(designId)
        ↓
Upload to Storage
        ↓
designService.createDesign({ id: designId, status: "imported", originalPath, ... })
```

Per `docs/FIREBASE.md`, Firestore record creation follows successful Storage upload.

## Title default

Sanitized filename without extension (same rule as parent import plan). No AI naming in Phase 3A.

## Design record fields (successful import)

| Field | Value |
| --- | --- |
| `id` | Pre-generated via `generateDesignId()` |
| `title` | Sanitized basename |
| `status` | `"imported"` |
| `originalPath` | Canonical path after upload |
| `thumbnailPath` | `""` |
| `previewPath` | omitted |
| `width`, `height` | From IHDR when parsed |
| `dpi` | From pHYs when present; omit if missing |
| `tags` | `[]` |
| `uploadedBy` | Set by service from caller |
| `queueCount` | `0` |
| `aiProcessed` | `false` |
| `aiReviewed` | `false` |

---

# Import Result Model (Phase 3A)

In-memory only. Proposed shape:

```ts
type ImportOutcome = "success" | "validation_error" | "upload_error" | "create_error";

interface ImportWarning {
  code: "DPI_METADATA_MISSING" | "DPI_BELOW_TARGET";
  message: string;
  details?: { dpi?: number };
}

interface SinglePngImportResult {
  outcome: ImportOutcome;
  fileName: string;
  designId?: string;
  warnings: ImportWarning[];
  errorMessage?: string;
}
```

Warnings are **always** included in the result object when applicable, even on `success`.

---

# Risks and Mitigations

## 1. Preload security

| Risk | Broad `ipcRenderer` allows arbitrary IPC channels if renderer is compromised or misused. |
| --- | --- |
| **Severity** | **High** |
| **Mitigation** | Implement 3A-1 first: `window.freshPrints.import` with allowlisted channels only; remove raw exposure; validate all handler inputs in main. |
| **Verification** | Grep renderer for `ipcRenderer` / `window.ipcRenderer` — zero matches after 3A-1. |

## 2. Orphan Storage files

| Risk | Original uploads to `/originals/{designId}.png` without a matching Firestore document. |
| --- | --- |
| **Severity** | **High** |
| **Mitigation** | Order: upload → `createDesign`. On `createDesign` failure, surface clear error; document manual/dev cleanup for orphan `designId` paths. Phase 3C adds automated cleanup. |
| **Verification** | Test: force Firestore rules failure after upload; confirm UI shows `create_error` and staff knows file may exist in Storage. |

## 3. Large PNG files

| Risk | Reading entire file into memory via IPC causes OOM or UI stalls. |
| --- | --- |
| **Severity** | **Medium** |
| **Mitigation** | Enforce `MAX_PNG_FILE_BYTES` before read (main process); reject oversize files with validation error; single-file scope limits blast radius. |
| **Verification** | Test with file at limit and over limit; confirm rejection before upload. |

## 4. Failed Firestore create after upload

| Risk | Storage object exists; catalog has no design — inconsistent state. |
| --- | --- |
| **Severity** | **High** |
| **Mitigation** | Do not mark import `success` until `createDesign` resolves; show `create_error` with `designId` for support; defer automatic Storage delete to Phase 3C. |
| **Verification** | Simulated Firestore failure after upload shows correct outcome and message. |

## 5. Firebase Storage rules

| Risk | No `storage.rules` in repo today (`docs/reviews/phase-2a-signoff.md`); uploads fail with opaque permission errors. |
| --- | --- |
| **Severity** | **High** |
| **Mitigation** | Add and deploy staff-only Storage rules for `/originals/`, `/thumbnails/`, `/previews/` **before 3A-3 verification**; document in `docs/setup/firebase-storage-setup.md`. |
| **Verification** | Authenticated staff user can `put` to `/originals/{designId}.png`; unauthenticated client cannot. |

## 6. File validation accuracy

| Risk | Extension-only checks accept non-PNG files; incorrect IHDR parsing reports wrong dimensions. |
| --- | --- |
| **Severity** | **Medium** |
| **Mitigation** | Require magic bytes; validate chunk structure; fail closed on unreadable PNG; unit-test parser against known-good and corrupt fixtures. |
| **Verification** | `.png` renamed `.txt` rejected; valid PNG passes; truncated file fails with clear message. |

---

# Implementation Sequence

Implement in order. **Do not skip 3A-1.**

---

## 3A-1 — Preload and IPC hardening

**Goal:** Secure Electron bridge before any filesystem import logic.

### Tasks

1. Create `electron/ipc/import/importIpcChannels.ts` — channel name constants.
2. Replace `electron/preload.ts` raw `ipcRenderer` with `contextBridge.exposeInMainWorld("freshPrints", { import: { ... } })`.
3. Add TypeScript declarations for `window.freshPrints` (renderer `global.d.ts` or shared types).
4. Register IPC handlers in `electron/main.ts` (or `electron/ipc/import/importIpcHandlers.ts`).
5. Remove renderer usage of `window.ipcRenderer` if any exists.

### Phase 3A preload API (minimum)

| Method | Returns |
| --- | --- |
| `selectPngFile()` | `{ canceled, file?: { absolutePath, name, size } }` |
| `readPngForImport(absolutePath)` | Validated read result or error (main validates path came from prior dialog session or re-validates path) |

### Exit criteria

- [ ] No raw `ipcRenderer` exposed to renderer
- [ ] IPC channels are allowlisted
- [ ] Handler stubs respond without filesystem side effects (ready for 3A-2)

---

## 3A-2 — Single PNG file selection and validation

**Goal:** Main process selects and validates one PNG; renderer receives structured result.

### Tasks

1. Implement native `dialog.showOpenDialog` — single file, PNG filter.
2. Implement `importValidation.constants.ts` — `IMPORT_MIN_DPI`, `MAX_PNG_FILE_BYTES`, magic bytes.
3. Implement main-process PNG validator: extension, magic bytes, IHDR dimensions, optional pHYs DPI.
4. Map validation failures to `validation_error`; map DPI issues to warnings per §2.
5. Add `features/imports/` scaffold (types, constants, services folder).

### Exit criteria

- [ ] User can select one PNG; invalid files fail before upload
- [ ] Valid PNG returns width/height and dpi when available
- [ ] Missing DPI produces warning, not failure
- [ ] DPI below 300 produces warning, not failure

---

## 3A-3 — Firebase Storage upload

**Goal:** Upload original PNG to canonical path using authenticated renderer SDK.

### Tasks

1. Add `importUploadService.ts` — `uploadOriginalPng(designId, bytes, metadata)`.
2. Use `getOriginalStoragePath(designId)` from existing constants.
3. Set `contentType: image/png`.
4. Add `storage.rules` scaffold + deploy instructions (if not already in repo).
5. Wire orchestration: `generateDesignId()` → read bytes via IPC → upload.

### Exit criteria

- [ ] Staff user can upload to `/originals/{designId}.png`
- [ ] Upload failure surfaces `upload_error` without Firestore write
- [ ] Storage rules deployed and verified in dev Firebase project

---

## 3A-4 — Firestore design creation

**Goal:** Create catalog record via existing service after successful upload.

### Tasks

1. Add `importOrchestrationService.ts` — coordinates read → upload → `createDesign`.
2. Build `CreateDesignInput` with locked fields from §3 and §4.
3. Pass `status: "imported"` explicitly.
4. Pass `id` from `generateDesignId()` used for Storage path.
5. Optionally add `useImportPng` hook wrapping orchestration.

### Exit criteria

- [ ] Successful import creates Firestore document with `status: "imported"`
- [ ] `originalPath` matches uploaded Storage path
- [ ] `thumbnailPath` is `""`
- [ ] `aiProcessed` / `aiReviewed` are `false`
- [ ] Failed create does not report `success`

---

## 3A-5 — Imports page result UI

**Goal:** Replace placeholder with working single-file import UX.

### Tasks

1. Replace `ComingSoonPage` in `ImportsPage.tsx`.
2. Add **Import PNG** primary action (permission-gated).
3. Show loading state during import.
4. Render `SinglePngImportResult`: success, warnings, errors.
5. Link to Design Library on success (optional navigation).
6. Styles per `docs/STYLE_GUIDE.md` — theme tokens, shared `Button`, message classes.

### Exit criteria

- [ ] Imports page no longer shows Coming Soon
- [ ] Success shows design id / title and any DPI warnings
- [ ] Errors show actionable messages
- [ ] Light and dark mode supported

---

## 3A-6 — Verification and cleanup

**Goal:** Confirm Phase 3A meets kickoff decisions and parent plan exit criteria.

### Verification checklist

- [ ] Single PNG import works end-to-end on desktop dev build
- [ ] ZIP / folder / batch controls are **not** present
- [ ] No `sharp` in `package.json`
- [ ] Import state is in-memory only (reload clears result)
- [ ] `status: "imported"` on new records
- [ ] Design Library lists imported design (may lack thumbnail)
- [ ] Phase 2C manual flows still work (no regression)
- [ ] `tsc` and lint pass
- [ ] Update `docs/WORKFLOWS.md` — note Phase 3A single-file scope
- [ ] Create `docs/reviews/phase-3a-signoff.md` after owner verification

### Documentation updates (during 3A-6)

| Document | Update |
| --- | --- |
| `docs/FIREBASE.md` | Phase 3A upload path for originals only |
| `docs/SECURITY.md` | Preload API surface, Storage rules |
| `docs/setup/firebase-storage-setup.md` | Rules deployment steps |

---

# Folder Structure (Phase 3A)

```txt
electron/
├── main.ts                          (register import handlers)
├── preload.ts                       (window.freshPrints.import only)
└── ipc/import/
    ├── importIpcChannels.ts
    ├── importIpcHandlers.ts
    └── pngValidator.ts

src/renderer/src/features/imports/
├── pages/ImportsPage.tsx
├── components/
│   └── ImportResultPanel.tsx        (or equivalent)
├── hooks/
│   └── useImportPng.ts
├── services/
│   ├── importOrchestrationService.ts
│   └── importUploadService.ts
├── types/
│   └── importResult.types.ts
└── constants/
    └── importValidation.constants.ts

storage.rules                          (new — staff write for design paths)
```

Shared IPC DTO types may live under `shared/types/import/` if needed for preload typings.

---

# Phase 3A Exit Criteria (Summary)

- [ ] Preload hardened — no raw `ipcRenderer`
- [ ] Single PNG select → validate → upload → create works
- [ ] DPI missing / below 300 → **warnings only**
- [ ] Design created with `status: "imported"`
- [ ] Original only uploaded; no thumbnails/previews
- [ ] No `sharp` dependency
- [ ] In-memory import result only
- [ ] Storage rules deployed
- [ ] Imports page shows results
- [ ] Out-of-scope features not implemented

---

# What Comes Next

| Milestone | Focus |
| --- | --- |
| **Phase 3B** | Folder scan, ZIP extract, batch queue, multi-file progress |
| **Phase 3C** | `sharp` approval, thumbnails/previews, strict DPI rejection, `ready` transition, performance |

Do not begin Phase 3B until Phase 3A signoff is recorded.

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/CODING_STANDARDS.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, `docs/STYLE_GUIDE.md`, `docs/WORKFLOWS.md`, `docs/plans/import-pipeline-plan.md`, `docs/reviews/phase-2c-signoff.md`*
