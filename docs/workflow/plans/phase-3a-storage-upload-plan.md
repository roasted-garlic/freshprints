# Phase 3A-3 Plan — Firebase Storage Upload (Single PNG)

## Purpose

This document plans **Phase 3A-3** of the single-PNG import foundation: uploading a validated original PNG to Firebase Storage using the canonical design asset path contract from Phase 2A.

Phase 3A-3 completes the **storage layer** of the import pipeline. Firestore catalog record creation is tightly coupled in the end-to-end flow and is documented here for orchestration clarity; per `docs/plans/phase-3a-kickoff.md`, Firestore create may land as **3A-4** immediately after upload is verified, using the same orchestration service.

**Parent plans:**

* `docs/plans/import-pipeline-plan.md`
* `docs/plans/phase-3a-kickoff.md`

**Prerequisites (complete):**

* Phase 3A-1 — Preload / IPC hardening (`window.freshPrints.imports`)
* Phase 3A-2 — Single PNG selection + validation (main process)

**Status:** Phase 3A-3 implemented (Storage upload); Phase 3A-4 implemented (Firestore create); Phase 3B next

---

## Goal

After Phase 3A-3 (+ coordinated 3A-4), staff with `importDesigns` permission can:

1. Select one PNG file
2. Validate it in the main process
3. Generate a `designId` before upload
4. Upload the original to Firebase Storage at the canonical path
5. Create a Firestore design record via `designService.createDesign` (3A-4)
6. See import result on the Imports page (success, warnings, errors)

Phase 3A-3 **does not** implement batch import, ZIP, folder scan, thumbnails, previews, or AI.

---

## Locked decisions (from Phase 3A kickoff)

| Decision | Value |
| --- | --- |
| Minimum DPI target | 300 (warnings only in 3A) |
| Missing DPI | Warning only — import may continue |
| DPI below 300 | Warning only — import may continue |
| Design status on create | `imported` |
| Thumbnail / preview | Not uploaded in 3A; `thumbnailPath: ""` |
| Upload client | Firebase Storage SDK in **renderer** (authenticated staff) |
| File reads | **Main process** only (IPC) |
| Catalog writes | `designService.createDesign` in **renderer** |

---

# 1. Storage Path Strategy

## 1.1 Canonical path format

Path helpers live in:

```txt
src/renderer/src/features/designs/constants/designStoragePaths.ts
```

| Asset | Firestore / catalog path | Example |
| --- | --- | --- |
| Original PNG | `/originals/{designId}.png` | `/originals/Kx7b2mN9pQ1r.png` |

Rules:

* `designId` is the Firestore document ID (auto-generated Firestore-style ID).
* Extension is always `.png` for originals in Phase 3A.
* Path must pass `isCanonicalDesignStoragePath(path, "originals")` in `designService`.
* Firestore stores the **path string**, not a download URL (`docs/FIREBASE.md`).

## 1.2 Firebase Storage `ref()` mapping

Firestore/catalog paths use a leading slash:

```txt
/originals/{designId}.png
```

Firebase Storage `ref()` paths typically omit the leading slash:

```ts
// Catalog / Firestore value
const originalPath = getOriginalStoragePath(designId);
// → "/originals/abc123.png"

// Firebase Storage ref (implementation detail in upload service)
const storageRefPath = originalPath.replace(/^\//, "");
// → "originals/abc123.png"
```

The upload service must write to the object that corresponds to the canonical path stored in `design.originalPath`.

## 1.3 designId generation (before upload)

`designId` **must** be generated before Storage upload so the object key is known upfront.

Use existing API:

```ts
const designId = designService.generateDesignId();
```

Implementation notes:

* `generateDesignId()` returns a new Firestore document ID without writing a document (`doc(collection).id`).
* The same `designId` is used for:
  * Storage object key: `originals/{designId}.png`
  * Firestore document ID when calling `createDesign({ id: designId, ... })`
* `originalPath` passed to `createDesign` must be `getOriginalStoragePath(designId)` and must match the uploaded object.

## 1.4 Mapping to `design.originalPath`

On successful import (3A-4):

| Field | Source |
| --- | --- |
| `id` | Pre-generated `designId` |
| `originalPath` | `getOriginalStoragePath(designId)` — set **after** upload succeeds |
| `thumbnailPath` | `""` |
| `previewPath` | omitted |
| `status` | `"imported"` |

`designService.validateOptionalOriginalPath` enforces:

* Path matches `/originals/{designId}.png`
* Path contains the same `designId` as the record

**Never** create a Firestore design with an `originalPath` pointing at a file that was not uploaded.

## 1.5 Phase 3A upload scope

Phase 3A-3 uploads **original PNG only**.

Deferred to Phase 3C:

* `/thumbnails/{designId}.webp`
* `/previews/{designId}.webp`

---

# 2. Storage Rules

## 2.1 Current state

* No `storage.rules` file exists in the repo yet (`docs/reviews/phase-2a-signoff.md`).
* `docs/setup/firebase-storage-setup.md` recommends deny-all rules until upload workflows exist.
* Phase 3A-3 **must** add `storage.rules` to the repo and deploy before upload verification.

## 2.2 Who can upload originals

| Role | Upload `/originals/{designId}.png` |
| --- | --- |
| `owner` | Yes |
| `admin` | Yes |
| `helper` | Yes |
| `customer` | No |
| Unauthenticated | No |

Rules should mirror Firestore `isStaff()` from `firestore.rules`:

```js
function isStaff() {
  return isSignedIn()
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isActive == true
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ["owner", "admin", "helper"];
}
```

## 2.3 Who can read originals

| Role | Read `/originals/` |
| --- | --- |
| Staff (`owner`, `admin`, `helper`) | Yes |
| `customer` | **No** |
| Unauthenticated | **No** |

Per `docs/SECURITY.md`: customers must never access originals.

Phase 3A: staff-only read on `/originals/**`.

Future: `/thumbnails/` may become customer-readable in a later phase; not in 3A-3 scope.

## 2.4 Who can delete originals

| Role | Delete `/originals/` |
| --- | --- |
| Staff | Yes (for cleanup / admin workflows) |
| Customer | No |
| Unauthenticated | No |

Phase 3A-3 uses delete only for **orphan cleanup** after failed Firestore create (see §4). No user-facing delete UI in 3A.

Restrict deletes to staff and canonical path patterns:

```txt
/originals/{designId}.png
```

## 2.5 File size limits

Align Storage rules with application constant:

```txt
shared/constants/importValidation.constants.ts
MAX_SINGLE_PNG_SIZE_BYTES = 50 * 1024 * 1024  // 50 MB
```

Storage rule should reject writes over 50 MB:

```js
request.resource.size < 50 * 1024 * 1024
```

Application validates size in main process **before** read/upload (defense in depth).

## 2.6 Content type checks

Storage rules should require:

```js
request.resource.contentType == "image/png"
```

Application upload must set metadata:

```ts
contentType: "image/png"
```

## 2.7 Staff-only access summary

```txt
/originals/**     → staff read + write (+ staff delete for cleanup)
/thumbnails/**    → staff write in 3C; deny customer read in 3A-3 scaffold
/previews/**      → staff write in 3C; deny customer read in 3A-3 scaffold
/customer-uploads/** → deny all in 3A-3 (future customer milestone)
default           → deny all
```

## 2.8 Recommended `storage.rules` scaffold (to add in 3A-3)

```txt
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() {
      return request.auth != null;
    }

    function callerUser() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data;
    }

    function isStaff() {
      return isSignedIn()
        && callerUser().isActive == true
        && callerUser().role in ["owner", "admin", "helper"];
    }

    function isCanonicalOriginal() {
      return resource == null
        ? request.resource.name.matches('originals/[A-Za-z0-9_-]+\\.png')
        : resource.name.matches('originals/[A-Za-z0-9_-]+\\.png');
    }

    match /originals/{designId}.png {
      allow read: if isStaff();
      allow create, update: if isStaff()
        && isCanonicalOriginal()
        && request.resource.size < 50 * 1024 * 1024
        && request.resource.contentType == "image/png";
      allow delete: if isStaff() && isCanonicalOriginal();
    }

    match /thumbnails/{designId}.webp {
      allow read, write: if isStaff();
    }

    match /previews/{designId}.webp {
      allow read, write: if isStaff();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy via Firebase CLI before 3A-3 verification. Update `docs/setup/firebase-storage-setup.md` with staff rules section.

---

# 3. Upload Flow

## 3.1 End-to-end sequence (single PNG)

```txt
User clicks "Select PNG" on Imports page
        ↓
[Main] selectSinglePngFile()
        → metadata: filePath, fileName, fileSizeBytes, extension
        → register path in import file session
        ↓
[Main] validateSelectedPngFile(filePath)
        → width, height, dpiX, dpiY, warnings
        ↓
If validation errors → show error (stop)
If validation warnings → continue (show warnings)
        ↓
[Renderer] designService.generateDesignId() → designId
        ↓
[Renderer] originalPath = getOriginalStoragePath(designId)
        ↓
[Main] readSelectedPngFileBytes(filePath)   ← NEW IPC (3A-3)
        → Uint8Array / ArrayBuffer (session-validated path only)
        ↓
[Renderer] importUploadService.uploadOriginalPng(designId, bytes)
        → Firebase Storage put at originals/{designId}.png
        ↓
[Renderer] designService.createDesign(caller, input)   ← 3A-4
        → status: "imported", originalPath, dimensions, dpi, thumbnailPath: ""
        ↓
[Renderer] show success result + warnings + link to Design Library
```

## 3.2 Ordering invariant

Per `docs/FIREBASE.md` and kickoff:

```txt
Validate → Upload → Create Firestore record
```

Never create Firestore record before upload completes.

Never report import success before `createDesign` resolves (3A-4).

## 3.3 New IPC required (3A-3)

Phase 3A-2 does not expose file bytes to the renderer. Phase 3A-3 adds one allowlisted preload method:

| Method | Purpose |
| --- | --- |
| `readSelectedPngFileBytes(filePath)` | Main reads file; returns bytes for Storage upload |

Security:

* Same session registry as `validateSelectedPngFile` (path must come from latest `selectSinglePngFile`)
* Re-validate size limit before read
* Do not expose directory listing or arbitrary paths
* Add channel constant: `IMPORT_READ_SELECTED_PNG_BYTES`

## 3.4 Title default

Sanitized filename without extension:

```txt
design.title = sanitize(fileName without .png)
```

Reuse validation from `designService` title rules.

## 3.5 DPI on create

| Scenario | `dpi` field on design |
| --- | --- |
| `hasDpiMetadata: true` | Store rounded `dpiX` (or min of dpiX/dpiY — pick one rule and document) |
| Missing DPI | Omit `dpi` or leave undefined |

Warnings remain in import UI result; catalog stores technical metadata when available.

---

# 4. Failure Handling

## 4.1 Upload succeeds, Firestore create fails

| State | Storage | Firestore |
| --- | --- | --- |
| After failure | Object exists at `originals/{designId}.png` | No document |

**User-facing:**

* Outcome: `create_error`
* Message: design could not be saved; include `designId` for support
* Do **not** show overall import success

**Cleanup (3A-3 / 3A-4):**

* Attempt `deleteObject` via storage service for `originals/{designId}.png`
* If cleanup fails, log and surface note: orphan may exist in Storage
* Automated cleanup is required before calling 3A complete; manual console cleanup acceptable for dev if auto-delete not ready

## 4.2 Firestore create succeeds, UI refresh fails

| State | Result |
| --- | --- |
| Data | Design exists in Firestore + Storage |

**User-facing:**

* Show success with `designId` and title from `createDesign` return value
* Do not depend on Design Library list refresh for success confirmation
* Optional "View in library" link may not reflect new item immediately (100-item list limit) — show success anyway

**Mitigation:**

* Return created `Design` from orchestration service
* Imports page stores result locally; library refresh is best-effort

## 4.3 User cancels file picker

| Stage | Behavior |
| --- | --- |
| Dialog canceled | `success: true`, `canceled: true` — no upload, no Firestore |

Show neutral message: "File selection was canceled." (existing 3A-2 behavior)

## 4.4 Network failure

| Failure point | Behavior |
| --- | --- |
| During Storage upload | `upload_error`; no Firestore write |
| During Firestore create | `create_error`; attempt Storage cleanup |
| Intermittent | Show retry-friendly message; do not partial-success |

Use Firebase SDK error codes where possible (`storage/retry-limit-exceeded`, `storage/unauthorized`).

## 4.5 Permission failure

| Layer | Symptom | UX |
| --- | --- | --- |
| UI | User lacks `importDesigns` | Route already gated; no import actions |
| Storage rules | `storage/unauthorized` | "You do not have permission to upload design files." |
| Firestore rules | `permission-denied` on create | "You do not have permission to create design records." |
| `createDesign` service | `canCreateDesigns` false | Service error message |

Staff helpers must retain `createDesigns` + `importDesigns` for import to work.

## 4.6 Orphan Storage cleanup strategy

| Phase | Strategy |
| --- | --- |
| 3A-3 | `importUploadService.deleteOriginalPng(designId)` for cleanup helper |
| On create failure | Orchestration calls delete before returning error |
| On upload failure | No Firestore write; no cleanup needed |
| 3C polish | Retry create without re-upload if object already exists (optional, deferred) |

Idempotency: uploading same `designId` again overwrites object — acceptable for retry UX in later phase.

---

# 5. Renderer vs Main Process Responsibilities

```txt
┌─────────────────────────────────────────────────────────────────┐
│ Renderer                                                         │
│  ImportsPage → useSinglePngImport → importOrchestrationService   │
│    → importDesktopService (IPC: select, validate, read bytes)  │
│    → importUploadService (Firebase Storage SDK)                  │
│    → designService.createDesign (Firestore)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ window.freshPrints.imports (allowlisted)
┌────────────────────────────▼────────────────────────────────────┐
│ Main process                                                     │
│  File picker, path session, PNG validation, file byte read       │
└─────────────────────────────────────────────────────────────────┘
```

| Responsibility | Layer |
| --- | --- |
| Native file picker | Main |
| Path traversal / session validation | Main |
| PNG magic bytes, IHDR, pHYs | Main |
| File size enforcement before read | Main |
| Return file bytes to renderer | Main (IPC) |
| `generateDesignId()` | Renderer (`designService`) |
| Firebase Storage upload | Renderer (`importUploadService`) |
| Firestore `createDesign` | Renderer (`designService`) |
| UI state / progress | Renderer (hook + components) |

**Forbidden:**

* Components calling Firebase Storage or Firestore directly
* Renderer filesystem access
* Main process Firestore / Storage writes
* Raw `ipcRenderer` or arbitrary channels

---

# 6. Required Services and Hooks

## 6.1 `importUploadService`

**Location:** `features/imports/services/importUploadService.ts`

| Method | Purpose |
| --- | --- |
| `uploadOriginalPng(designId, bytes)` | Upload to `originals/{designId}.png`, `contentType: image/png` |
| `deleteOriginalPng(designId)` | Orphan cleanup on create failure |

Uses:

* `storage` from `src/renderer/src/config/firebase.ts`
* `getOriginalStoragePath(designId)` for path mapping
* Firebase `uploadBytes` (resumable upload deferred to 3C if needed)

Does **not** create Firestore records.

## 6.2 `designStorageService` (optional thin wrapper)

**Location:** `features/designs/services/designStorageService.ts` or `features/firebase/services/`

If `importUploadService` would duplicate Firebase Storage boilerplate, extract:

| Method | Purpose |
| --- | --- |
| `putFileAtPath(storagePath, bytes, contentType)` | Generic staff upload helper |
| `deleteAtPath(storagePath)` | Generic delete helper |

Keep path validation at call site using `designStoragePaths` helpers.

**Decision at implementation:** Add wrapper only if reuse is immediate; otherwise keep upload logic in `importUploadService` for minimal scope.

## 6.3 `importOrchestrationService`

**Location:** `features/imports/services/importOrchestrationService.ts`

Coordinates the full pipeline:

```ts
importSinglePng(caller: User): Promise<SinglePngImportResult>
```

Steps:

1. IPC select + validate (or accept pre-validated result from hook)
2. `generateDesignId()`
3. IPC read bytes
4. `importUploadService.uploadOriginalPng`
5. `designService.createDesign` with locked field set (3A-4)
6. Return unified result

## 6.4 `importDesktopService` (extend existing)

Add:

```ts
readSelectedPngFileBytes(filePath: string): Promise<ImportIpcResult<PngFileBytesResult>>
```

## 6.5 `useSinglePngImport`

**Location:** `features/imports/hooks/useSinglePngImport.ts`

Replaces or extends `useSelectAndValidatePng` with phases:

```txt
idle → selecting → validating → uploading → creating → complete
                              ↘ error (any step)
```

Exposes:

| State | Purpose |
| --- | --- |
| `phase` | Current step for UI |
| `isBusy` | Disable actions |
| `warnings` | DPI warnings from validation |
| `error` | Structured error message |
| `result` | Success: `designId`, `title`, `originalPath` |
| `importPng()` | Start full flow |
| `reset()` | Clear result |

Uses `useAuth` for caller; does not call Firebase directly.

## 6.6 Existing services reused

| Service | Use |
| --- | --- |
| `designService.generateDesignId()` | Pre-upload ID |
| `designService.createDesign()` | Catalog record (3A-4) |
| `permissionService` | Already gates route; service checks remain |

---

# 7. UI Updates

## 7.1 Imports page (extend 3A-2 UI)

**Location:** `features/imports/pages/ImportsPage.tsx`

| Element | Behavior |
| --- | --- |
| **Select PNG** | Single button in Single PNG validation card (no header duplicate) |
| **Progress** | Show phase label: Validating… / Uploading… / Creating design… |
| **Success** | Green message; file name, formatted size, dimensions, `designId` |
| **Warnings** | Yellow `auth-message-warning` for DPI warnings (persist on success) |
| **Error** | Red `auth-message-error` with actionable text |
| **View design** | Link/button to `#/designs` (reasonable default; thumbnail may be empty) |

## 7.2 Result component

Extend `ImportValidationResultPanel` or add `ImportUploadResultPanel`:

* Success shows catalog fields + warnings
* Upload phase shows `LoadingSpinner` or inline progress text
* Use `formatFileSize()` for display (no raw bytes)

## 7.3 What not to add in 3A-3

* Batch progress table
* ZIP / folder pickers
* Thumbnail preview from Storage (no thumbnail uploaded yet)
* Design Library grid auto-refresh requirement

---

# 8. Security Concerns

| Concern | Mitigation |
| --- | --- |
| Arbitrary filesystem access | Session registry; only picker-selected paths readable |
| Raw Node APIs in renderer | `nodeIntegration: false`; bytes via IPC only |
| Public Storage reads | Rules deny unauthenticated access; `/originals/` staff-only |
| Customer access to originals | Rules + no customer role write paths |
| Path traversal | Reject `..`, null bytes; normalize paths in main |
| Oversized files | Main validation + Storage rules size cap |
| Wrong content type | Rules require `image/png`; app sets contentType |
| IPC channel abuse | Allowlisted `window.freshPrints.imports` only |
| Secrets in Electron | No Firebase Admin SDK in desktop app |
| Orphan originals | Cleanup on create failure; staff-only delete rule |

---

# 9. Testing Checklist

## 9.1 Prerequisites

- [ ] `storage.rules` deployed to dev Firebase project
- [ ] Staff test user signed in (`owner`, `admin`, or `helper`)
- [ ] `importDesigns` + `createDesigns` permissions confirmed

## 9.2 Functional tests

| Test | Expected |
| --- | --- |
| **Valid PNG upload** | Object at `originals/{designId}.png`; Firestore doc `status: imported`; `originalPath` matches |
| **Missing DPI warning upload** | Import succeeds; warning shown; design created without `dpi` or with omitted dpi |
| **Low DPI warning upload** | Import succeeds; warning shown; design created with dpi value |
| **Non-PNG rejection** | Fails at validation; no Storage write; no Firestore doc |
| **Cancel file picker** | Neutral cancel message; no upload |
| **Storage permission denied** | Upload error; no Firestore doc (test with wrong role or broken rules) |
| **Firestore create failure cleanup** | Upload occurs; create fails; Storage object deleted (or cleanup attempted + error shown) |

## 9.3 Security tests

- [ ] Unauthenticated Storage write denied
- [ ] Customer role cannot write to `/originals/` (when customer auth exists)
- [ ] `validateSelectedPngFile` rejects unregistered path
- [ ] `readSelectedPngFileBytes` rejects unregistered path
- [ ] File > 50 MB rejected in app before upload

## 9.4 UI tests

- [ ] Progress phases visible during upload/create
- [ ] Success shows warnings + link to library
- [ ] Errors show without silent failure
- [ ] Light and dark mode readable

## 9.5 Tooling

```bash
npm run lint
npx tsc --noEmit
```

Manual DevTools:

```js
await window.freshPrints.imports.selectSinglePngFile()
await window.freshPrints.imports.validateSelectedPngFile(filePath)
// After 3A-3:
await window.freshPrints.imports.readSelectedPngFileBytes(filePath)
```

---

# Implementation Sequence (3A-3 + 3A-4)

| Step | Deliverable |
| --- | --- |
| **3A-3a** | Add `storage.rules` to repo; deploy; update setup docs |
| **3A-3b** | IPC `readSelectedPngFileBytes` + main handler |
| **3A-3c** | `importUploadService` + optional storage wrapper |
| **3A-3d** | Verify upload in isolation (DevTools or temporary test hook) |
| **3A-4a** | `importOrchestrationService` + `useSinglePngImport` |
| **3A-4b** | `createDesign` integration + orphan cleanup |
| **3A-4c** | Imports page upload progress + success/error UI |

---

# Files to Create or Modify (implementation reference)

```txt
storage.rules                                          (new)
firebase.json                                          (add storage rules if missing)

electron/ipc/import/importIpcChannels.ts               (READ_BYTES channel)
electron/ipc/import/importIpcHandlers.ts               (read bytes handler)
electron/preload.ts                                    (expose read method)
shared/types/import/importIpc.types.ts                 (bytes result type)

features/imports/services/importUploadService.ts       (new)
features/imports/services/importOrchestrationService.ts  (new)
features/imports/services/importDesktopService.ts      (extend)
features/imports/hooks/useSinglePngImport.ts           (new)
features/imports/pages/ImportsPage.tsx                 (upload UI)
features/imports/components/ImportValidationResultPanel.tsx (extend)

docs/setup/firebase-storage-setup.md                   (staff rules)
docs/plans/phase-3a-kickoff.md                         (status update)
```

---

# Exit Criteria (Phase 3A-3)

- [ ] `storage.rules` in repo and deployed
- [ ] Staff can upload one PNG to canonical `originals/{designId}.png`
- [ ] Upload uses renderer Firebase SDK with `image/png` content type
- [ ] File bytes read only via allowlisted IPC
- [ ] Upload failure does not create Firestore record
- [ ] No batch / ZIP / folder / thumbnail scope added

# Exit Criteria (Phase 3A-4 — coordinated)

- [ ] Full flow: select → validate → upload → create → UI success
- [ ] Design created with `status: "imported"` and correct `originalPath`
- [ ] Orphan cleanup on create failure
- [ ] DPI warnings displayed; import still succeeds

---

# Open Decisions (resolve at 3A-3 kickoff)

1. **Single `dpi` field when dpiX ≠ dpiY** — store `dpiX`, min, or average? (Recommend: store `Math.min(dpiX, dpiY)` rounded, document in service.)
2. **Resumable upload** — `uploadBytes` vs `uploadBytesResumable` for 50 MB cap (Recommend: `uploadBytes` for 3A simplicity.)
3. **`designStorageService` wrapper** — add only if needed for reuse (Recommend: defer unless thumbnail upload in 3C needs it.)
4. **`firebase.json` storage rules wiring** — confirm deploy command with project owner.

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/CODING_STANDARDS.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/plans/import-pipeline-plan.md`, `docs/plans/phase-3a-kickoff.md`, `docs/setup/electron-security-setup.md`, `docs/setup/firebase-storage-setup.md`*
