# Import Pipeline Plan (Phase 3)

## Goal

Build the **desktop import pipeline** that moves DTF-ready PNG artwork from local sources (individual files, folders, ZIP archives) through validation, derivative generation, Firebase Storage upload, and Firestore catalog record creation.

Phase 3 automates what Phase 2C allowed staff to do manually (metadata-only records). Phase 3 **creates real assets** and populates the existing `designs` catalog contract defined in Phase 2A.

Phase 3 does **not** implement AI enrichment (Phase 7), show queue integration (Phase 6), or customer website access.

---

## Platform Context

Fresh Prints end-to-end workflow (from `docs/plans/design-library-plan.md`):

```txt
1. Import source files          ← Phase 3
      individual PNG
      folders
      ZIP archives
           ↓
2. Processing pipeline          ← Phase 3 (validation, thumbnails, uploads)
      discover PNG
      validate type / readability / dimensions / DPI
      reject low-quality files
           ↓
3. AI enrichment                ← Phase 7 (deferred)
      vision, naming, tags, category suggestions
           ↓
4. Design Library / Catalog     ← Phase 2 (complete)
      browse, search, manual edit, archive
```

**Prerequisites (satisfied):**

* Phase 2A — `designService`, `categoryService`, types, Firestore rules, indexes, storage path helpers
* Phase 2B — Design Library browse UI at `#/designs`
* Phase 2C — Manual CRUD, category management, metadata-only records, signoff complete

**Primary UI entry:** `#/imports` (`ImportsPage` — currently `ComingSoonPage`; permission `importDesigns`).

---

## What Belongs in Phase 3

| Area | Phase 3 scope |
| --- | --- |
| Electron filesystem access (scoped IPC) | Native dialogs, safe reads, ZIP extract, folder scan |
| PNG discovery | Recursive folder scan; ZIP contents scan |
| File validation | PNG type, readability, dimensions, DPI |
| Rejected file reporting | Per-import results; no silent failures |
| Thumbnail + preview generation | WebP derivatives per `designStoragePaths.ts` |
| Firebase Storage uploads | `/originals/`, `/thumbnails/`, `/previews/` |
| Firestore design creation | Via existing `designService.createDesign` |
| Batch import orchestration | Queue with concurrency limits and progress |
| Imports page UI | Replace placeholder; job progress and results |
| Progress + error UX | Per-file and job-level states |

---

## What Is Explicitly Deferred

| Deferred capability | Target phase |
| --- | --- |
| AI vision, naming, categorization, tagging | Phase 7 |
| AI Review page workflows | Phase 7 |
| Duplicate detection (AI-assisted) | Phase 7 |
| Show queue item creation from import | Phase 6 |
| Customer uploads / website import | Customer website milestone |
| JPG / JPEG / WEBP source import | Phase 3+ (PNG only in initial Phase 3) |
| Cloud Functions for import orchestration | Only if client-side limits require it |
| Permanent delete of rejected imports | Not planned |
| Import resume across app restarts (persistent job store) | Optional late Phase 3C / follow-up |
| Pensacola / gang sheet export | Later production workflow |

---

## Relationship to Roadmap Phases

```txt
Phase 2   Design Library catalog layer     ✅ Complete (2A + 2B + 2C)
Phase 3   Import System                    ← This plan
Phase 4   Search And Organization
Phase 6   Show Queue System
Phase 7   AI Features
```

### Development sub-phases

| Sub-phase | Focus | Exit signal |
| --- | --- | --- |
| **Phase 3A** | Electron IPC foundation, single-PNG import, validation stub, Storage upload, Firestore create | Staff can import one PNG end-to-end |
| **Phase 3B** | Folder scan, ZIP extract, batch queue, progress UI, rejected-file reporting | Staff can import folder/ZIP with visible results |
| **Phase 3C** | Thumbnail/preview generation, DPI rules hardened, performance tuning, polish | Import matches WORKFLOWS.md quality bar; Design Library shows real thumbnails |

Implement **3A → 3B → 3C** in order. Do not start ZIP work before single-file path is stable.

---

# 1. Import Workflow

## 1.1 Unified pipeline (all sources)

Every import source converges on the same per-file pipeline:

```txt
User selects source (file | folder | ZIP)
        ↓
Main: resolve source → list candidate PNG paths
        ↓
For each candidate (batch queue):
        ↓
  Main: read bytes + probe metadata (dimensions, DPI)
        ↓
  Validate (type, size, dimensions, DPI)
        ↓
  ┌─ FAIL → record rejection (no Storage write, no design doc)
  └─ PASS → generate designId
              ↓
            Generate thumbnail + preview (Phase 3C; stub/placeholder in 3A)
              ↓
            Upload original + derivatives to Storage
              ↓
            designService.createDesign({ ... })
              ↓
            status: imported → processing → ready
              ↓
            (Future) enqueue AI job — Phase 7 hook only in Phase 3
        ↓
Import job complete → show summary (imported / rejected / skipped)
        ↓
Design Library refresh (existing hooks)
```

## 1.2 Individual PNG files

**UX:**

* Imports page → **Import files** (or drag-drop zone in 3B+)
* Native multi-select file dialog filtered to `.png`
* Each selected file enters the per-file pipeline independently

**Rules:**

* Staff only (`importDesigns` permission)
* Max file size enforced before read (configurable constant)
* Original filename preserved in import metadata for default title fallback; not trusted for type detection

## 1.3 Folders

**UX:**

* Imports page → **Import folder**
* Native directory picker
* Recursive scan for `*.png` (case-insensitive extension match)

**Rules:**

* Ignore non-PNG files silently in discovery phase (count as **skipped**, not rejected)
* Optional max depth and max file count per job (configurable)
* Do not follow symlinks outside selected folder (security)
* Flatten is **not** required — store relative path only in import job metadata for operator context; catalog title still derived from filename unless AI overrides later

## 1.4 ZIP files

**UX:**

* Imports page → **Import ZIP**
* Native file dialog filtered to `.zip`
* Extract → discover PNGs → same per-file pipeline

**Rules:**

* ZIP must be readable and under configured size limit
* Extract to app-managed temp directory (see §3)
* After job completes or fails, temp extraction directory is deleted
* Non-PNG entries are **skipped** (logged in job summary), not rejected

## 1.5 Design status transitions (import path)

Align with `docs/DATA_MODEL.md` and `docs/WORKFLOWS.md`:

```txt
imported      → record created, assets uploading or just uploaded
processing    → derivatives / post-upload steps running (optional in 3A)
ready         → catalog-visible default (thumbnail present, validation passed)
rejected      → NOT used for failed imports (no design document)
archived      → manual staff action only (Phase 2C)
```

**Phase 3 default for successful imports:** create with `status: "imported"`, transition to `ready` when thumbnail upload completes (3C). In 3A, may go directly to `ready` after original upload if thumbnails are deferred.

**Title fallback:** sanitized filename without extension until AI (Phase 7) or staff edit.

---

# 2. Electron File System Access

## 2.1 Current state

* Electron entry: `electron/main.ts`, preload: `electron/preload.ts`
* `contextIsolation: true`, `nodeIntegration: false` (correct per `docs/SECURITY.md`)
* **Gap:** preload currently exposes raw `ipcRenderer` — must be replaced with a narrow `window.freshPrints` API before import ships

## 2.2 Target architecture

```txt
Renderer (Imports UI + import hooks)
        ↓
window.freshPrints.import.*  (preload bridge)
        ↓
ipcMain handlers (electron/main/ipc/ or electron/ipc/)
        ↓
Main services (electron/main/services/)
        fs, path, zlib/unzip, image probe
```

**Forbidden:**

* Renderer direct `fs` access
* Unrestricted path strings from renderer executed without validation
* Raw `window.ipcRenderer` in production import flows

## 2.3 Preload API surface (planned)

Namespace: `window.freshPrints.import`

| Method | Purpose |
| --- | --- |
| `selectPngFiles()` | Open multi-select PNG dialog; returns safe metadata `{ absolutePath, name, size }[]` |
| `selectFolder()` | Open directory dialog; returns `{ absolutePath }` |
| `selectZipFile()` | Open ZIP dialog; returns `{ absolutePath, name, size }` |
| `startImportJob(options)` | Begin job; returns `jobId` |
| `cancelImportJob(jobId)` | Cancel in-flight job |
| `onImportProgress(callback)` | Subscribe to `{ jobId, phase, fileIndex, fileTotal, fileName, status }` |
| `onImportComplete(callback)` | Subscribe to final job summary |

Exact signatures live in shared types under `shared/types/import/` (planned).

## 2.4 Path handling rules

* Main process resolves and normalizes paths
* Reject paths outside allowed roots (user-selected dialog paths + temp extract dir only)
* Never echo full local paths in customer-facing surfaces; staff import UI may show filename only
* Temp directories under `app.getPath('temp')/fresh-prints-imports/{jobId}/`

---

# 3. ZIP Extraction Strategy

## 3.1 Library choice

Use a maintained ZIP library in the **main process** (evaluate at implementation time: `yauzl`, `unzipper`, or `adm-zip`).

**Requirements:**

* Streaming extraction preferred for large archives
* Explicit entry-by-entry path validation (Zip Slip prevention)

## 3.2 Extraction flow

```txt
Validate ZIP size + magic bytes
        ↓
Create temp dir: {userData}/temp/fresh-prints-imports/{jobId}/
        ↓
For each ZIP entry:
        normalize entry path
        reject if absolute or contains ".."
        reject if escapes temp root after path.resolve
        extract only if entry ends with .png (case-insensitive)
        ↓
Collect list of extracted PNG absolute paths
        ↓
Feed into batch queue (§8)
        ↓
finally: recursive delete temp dir
```

## 3.3 Limits

| Limit | Purpose |
| --- | --- |
| Max ZIP file size | Prevent disk exhaustion |
| Max extracted file count | Prevent zip bombs |
| Max uncompressed ratio | Optional; detect suspicious archives |
| Max single extracted PNG size | Same as direct file import |

---

# 4. Folder Scanning Strategy

## 4.1 Scan algorithm (main process)

```txt
validate folder path (user-selected root only)
        ↓
walk directory (breadth-first or depth-first)
        ↓
for each entry:
        if directory → recurse (depth < MAX_DEPTH)
        if file → if .png → add to candidate list
        else → skip (increment skipped count)
        ↓
return candidates[] with { absolutePath, relativePath, fileName, size }
```

## 4.2 Rules

* Do not scan `node_modules`, `.git`, or hidden system folders (configurable ignore list)
* Cap total candidates per job; surface "truncated" warning in UI if cap hit
* Sort candidates deterministically (relative path ascending) for reproducible batch order

---

# 5. PNG Discovery

## 5.1 Discovery vs validation

| Stage | Responsibility |
| --- | --- |
| **Discovery** | Find paths that look like PNG candidates by extension and location |
| **Validation** | Prove file is readable PNG, extract dimensions/DPI, enforce business rules |

Discovery never creates design documents.

## 5.2 PNG identification

1. Extension `.png` (case-insensitive)
2. Magic bytes `89 50 4E 47 0D 0A 1A 0A` on read
3. Decode via image library (see §6) for structure validation

Reject executables, archives masquerading as PNG, and corrupt files at validation — not discovery.

## 5.3 Default title derivation

```txt
filename = basename(path, ".png")
title = sanitize(filename)  // trim, collapse whitespace, max 200 chars
```

Reuse `designService` title validation on create.

---

# 6. DPI Validation

## 6.1 Requirements (from `docs/WORKFLOWS.md`)

Validate:

* File type
* Image readability
* Dimensions (width / height in pixels)
* DPI

Failures must be reported; do not silently ignore.

## 6.2 DPI extraction

* Read PNG `pHYs` chunk for pixels-per-meter → convert to DPI
* If DPI metadata absent: treat as **unknown** — policy decision required at implementation (recommended: **reject** for DTF production imports with message "DPI metadata missing", configurable override for dev)

## 6.3 Configurable thresholds (constants module)

| Constant | Initial value | Notes |
| --- | --- | --- |
| `MIN_DPI` | `300` | DTF print minimum (adjustable; document in plan constants) |
| `MIN_WIDTH_PX` | TBD | Prevent tiny assets |
| `MIN_HEIGHT_PX` | TBD | Prevent tiny assets |
| `MAX_WIDTH_PX` | TBD | Prevent memory blowups |
| `MAX_HEIGHT_PX` | TBD | Prevent memory blowups |
| `MAX_FILE_BYTES` | TBD | e.g. 50–100 MB per PNG |

Store in `features/imports/constants/importValidation.constants.ts` (renderer-readable) and mirror in main process shared constants under `shared/constants/` if needed.

## 6.4 Validation location

**Main process** runs binary validation (authoritative). Renderer may display results only.

Shared pure validation types:

```txt
shared/types/import/ImportValidationResult.ts
```

---

# 7. Rejected File Handling

## 7.1 Principles

* **No Firebase Storage write** for rejected files
* **No Firestore design document** for rejected files (avoids orphan metadata and empty paths)
* Rejection is recorded in the **import job result**, not the catalog

## 7.2 Rejection record shape (in-memory / job summary)

```ts
interface ImportFileRejection {
  sourcePath: string;       // filename or relative path shown to staff
  reasonCode: string;       // e.g. DPI_TOO_LOW, INVALID_PNG, FILE_TOO_LARGE
  message: string;          // human-readable
  details?: {
    width?: number;
    height?: number;
    dpi?: number;
  };
}
```

## 7.3 UI behavior

* Imports page shows per-file rows: ✅ imported | ⚠️ skipped | ❌ rejected
* Rejected rows show reason message
* Job summary: "12 imported, 3 rejected, 5 skipped"
* Staff can export or copy rejection list (optional 3C polish)

## 7.4 Skipped vs rejected

| Outcome | Meaning |
| --- | --- |
| **Skipped** | Not a PNG candidate (`.txt` in folder, non-PNG in ZIP) |
| **Rejected** | PNG candidate failed validation |

---

# 8. Batch Processing Architecture

## 8.1 Components

| Layer | Location (planned) | Responsibility |
| --- | --- | --- |
| `ImportsPage` | `features/imports/pages/` | UI shell, start/cancel, results |
| `useImportJob` | `features/imports/hooks/` | Job state, subscribe to IPC progress |
| `importOrchestrationService` | `features/imports/services/` | Coordinate upload + `designService.createDesign` in renderer |
| `importUploadService` | `features/imports/services/` | Firebase Storage uploads |
| `ImportJobRunner` | `electron/main/services/` | Filesystem, ZIP, scan, validation, emit progress |
| IPC handlers | `electron/main/ipc/import/` | Bridge |

```txt
Renderer                              Main process
────────                              ────────────
useImportJob
  → importOrchestrationService
      → IPC startImportJob
      → IPC onProgress          ←     ImportJobRunner
      ← file validated bytes            (read, validate)
      → importUploadService             zip/folder scan
      → designService.createDesign
```

## 8.2 Concurrency model

* **Sequential discovery** for ZIP/folder (main process)
* **Limited parallel uploads** in renderer (e.g. 2–3 concurrent Storage uploads) — tunable
* Main process validation: sequential or small pool (2) to cap memory

## 8.3 Job state machine

```txt
idle → selecting → discovering → processing → completing → done
                              ↘ cancelled
                              ↘ failed
```

## 8.4 Idempotency and retries

* Each file gets a fresh `designId` via `designService.generateDesignId()`
* On upload failure after partial writes: attempt Storage cleanup for that `designId` paths; do not create Firestore document
* Retry single file (3C optional): re-queue failed file without re-running entire ZIP

## 8.5 Firestore batch writes

Per `docs/FIREBASE.md`: prefer batch writes when importing many designs. Phase 3 may still create designs one-by-one via `designService.createDesign` for simpler error isolation; evaluate batching in 3C if performance requires it.

**Do not** bypass `designService` for catalog writes.

---

# 9. Firebase Storage Upload Strategy

## 9.1 Path contract (unchanged from Phase 2)

From `features/designs/constants/designStoragePaths.ts`:

```txt
/originals/{designId}.png
/thumbnails/{designId}.webp
/previews/{designId}.webp
```

`designId` is generated **before** upload so paths are known upfront.

## 9.2 Upload order

Per `docs/FIREBASE.md`:

```txt
Validate (main)
        ↓
Generate thumbnail + preview (main → buffers)
        ↓
Upload original PNG
        ↓
Upload thumbnail WebP
        ↓
Upload preview WebP
        ↓
Create Firestore record (renderer service)
```

**Phase 3A simplification:** upload original only; empty or placeholder thumbnail until 3C. Update Design Library card to show image when `thumbnailPath` resolves.

## 9.3 Upload client

* Use Firebase Storage SDK in **renderer** with authenticated staff user (existing Firebase app initialization)
* Main process passes `ArrayBuffer` or base64 chunk via IPC — keep per-file size under configured max
* Set correct `contentType`: `image/png`, `image/webp`
* Use resumable upload for files over threshold (optional 3C)

## 9.4 Storage rules

* Deploy staff-only write rules for `/originals/`, `/thumbnails/`, `/previews/` before Phase 3 testing
* Document in `docs/SECURITY.md` during implementation
* Never use Firebase Admin SDK in renderer

## 9.5 Orphan prevention

| Failure point | Action |
| --- | --- |
| Upload fails before Firestore create | Delete partial Storage objects for `designId` if any |
| Firestore create fails after upload | Log error; surface in job results; optional cleanup task (3C) |
| Never | Firestore document without `originalPath` pointing at uploaded object |

---

# 10. Firestore Design Creation Workflow

## 10.1 Service contract

Reuse `designService.createDesign(caller, input)` from Phase 2A.

**Required on successful import:**

| Field | Source |
| --- | --- |
| `id` | Pre-generated `designId` |
| `title` | Sanitized filename (until AI) |
| `status` | `imported` or `ready` per sub-phase |
| `originalPath` | `getOriginalStoragePath(designId)` |
| `thumbnailPath` | `getThumbnailStoragePath(designId)` or `""` in 3A |
| `previewPath` | optional |
| `width`, `height`, `dpi` | From validation probe |
| `tags` | `[]` |
| `uploadedBy` | Current staff uid |
| `queueCount` | `0` |
| `aiProcessed` | `false` |
| `aiReviewed` | `false` |

**Optional:** `description`, `categoryId` — omit until AI or staff assignment.

## 10.2 Status updates after create

Add or reuse service method:

```txt
designService.markDesignReady(designId)
  // or updateDesign({ status: "ready" }) when derivatives complete
```

Keep status transitions in `designService`, not scattered in components.

## 10.3 Category references

* Imports do not auto-assign `categoryId` in Phase 3
* Designs reference categories by `categoryId` only (no denormalized names)
* Staff may assign category later via Phase 2C edit flow

## 10.4 No data model changes required

Phase 3 fits the existing `Design` interface in `docs/DATA_MODEL.md`. Optional future `importBatchId` field is **not** required for Phase 3; track batch context in import job UI state only unless resume-across-sessions is added later.

---

# 11. Progress Tracking

## 11.1 Progress events (IPC → renderer)

```ts
interface ImportProgressEvent {
  jobId: string;
  phase: "discovering" | "validating" | "uploading" | "creating" | "complete";
  fileIndex: number;
  fileTotal: number;
  currentFileName: string;
  status: "pending" | "running" | "success" | "rejected" | "failed" | "skipped";
  message?: string;
}
```

## 11.2 UI components (planned)

| Component | Purpose |
| --- | --- |
| `ImportJobPanel` | Active job progress bar + file list |
| `ImportJobSummary` | Final counts and rejection table |
| `ImportSourceActions` | Buttons: files / folder / ZIP |

Follow `docs/STYLE_GUIDE.md` — dense operational layout, theme tokens, shared `Button`, `Badge`, `Card`.

## 11.3 Design Library integration

* On job complete, staff may navigate to Design Library
* Imports page offers **View in library** when job succeeds
* Existing `useDesigns` refresh patterns apply; no special import filter required initially

---

# 12. Error Handling

## 12.1 Error categories

| Category | Example | User-facing behavior |
| --- | --- | --- |
| **Validation** | DPI too low | Per-file rejection row with reason |
| **Filesystem** | ZIP corrupt | Job-level error; nothing imported |
| **Storage** | Upload permission denied | Per-file failure; retry guidance |
| **Firestore** | Rules rejection | Per-file failure; show service message |
| **IPC** | Cancelled | Job cancelled state; partial imports remain |
| **Unexpected** | Decode crash | Per-file failure; log in main process |

## 12.2 Never swallow errors

Align with `docs/CODING_STANDARDS.md` and Phase 2 patterns:

* Hooks expose `error`, `isSubmitting`
* Services throw meaningful `Error` messages
* Components display `auth-message-error` or `ErrorState`

## 12.3 Logging

* Main process: structured console logs with `jobId` + `fileName` (dev)
* Renderer: no logging of full local paths in production analytics
* Future: audit log writes for imports (deferred)

---

# 13. Future AI Integration Points

Phase 3 prepares hooks only — **no AI implementation**.

```txt
designService.createDesign({ status: "imported", aiProcessed: false })
        ↓
[Phase 7] Cloud Function or desktop job reads originalPath
        ↓
[Phase 7] AI proposes title, description, categoryId, tags
        ↓
[Phase 7] AiMetadata written; aiProcessed: true
        ↓
[Phase 7] AI Review page — staff approves
        ↓
designService.updateDesign({ title, tags, categoryId, aiReviewed: true, status: "ready" })
```

**Phase 3 responsibilities for AI readiness:**

* Set `aiProcessed: false`, `aiReviewed: false` on import
* Use canonical `originalPath` so Phase 7 can fetch Storage asset
* Do not overwrite human-edited fields after staff review (Phase 7 rule)
* Route placeholder `#/ai-review` remains until Phase 7

---

# 14. Security Considerations

| Area | Requirement |
| --- | --- |
| **Permissions** | `permissionService.canImportDesigns` in UI; Firestore/Storage rules enforce staff |
| **IPC** | Validate all handler inputs; allowlist channels; no arbitrary path/delete |
| **Zip Slip** | Normalize and jail extract paths to temp root |
| **Path traversal** | Folder walk stays under user-selected root |
| **File size limits** | Enforce on dialog metadata before read |
| **Preload surface** | Replace raw `ipcRenderer` exposure with `window.freshPrints.import` |
| **Secrets** | No service account in Electron app |
| **Customer access** | Storage rules must not expose `/originals/` to customers |
| **Temp cleanup** | Always delete extract temp dirs in `finally` blocks |

Reference: `docs/SECURITY.md` — Upload Validation, Electron Security, IPC Security, Filesystem Security.

---

# 15. Performance Considerations

| Concern | Mitigation |
| --- | --- |
| Memory pressure (large PNGs) | Size limits; stream reads where possible; limit concurrent validations |
| ZIP bombs | Entry count + compression ratio limits |
| UI freeze | All heavy work in main process; progress via IPC |
| Storage upload throughput | Limited parallelism (2–3); resumable uploads in 3C |
| Firestore write rate | Sequential create acceptable for MVP; batch in 3C if needed |
| Design Library grid | Thumbnails reduce load; lazy load images in cards (3C) |
| 100-design list limit | Import may add >100 designs; pagination follow-up from Phase 2B debt |

---

# 16. Development Phases (Detailed)

## Phase 3A — Single-file import foundation

**Goal:** Prove end-to-end path for one PNG with correct architecture layers.

### Deliverables

1. **Electron IPC hardening**
   * Remove or deprecate raw `ipcRenderer` exposure
   * Add `window.freshPrints.import` preload bridge
   * IPC handlers in `electron/main/ipc/import/`

2. **Feature scaffold**
   ```txt
   features/imports/
   ├── components/
   ├── hooks/
   ├── services/
   ├── types/
   ├── constants/
   └── pages/ImportsPage.tsx
   ```

3. **Single PNG flow**
   * File picker → read → validate (basic) → upload original → `createDesign`

4. **Imports page**
   * Replace `ComingSoonPage`
   * Single-job progress UI
   * Error and success states

5. **Storage rules**
   * Staff write access for design asset paths (deploy before QA)

6. **Documentation**
   * Update `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/WORKFLOWS.md` when rules land

### 3A exclusions

* ZIP, folder scan, thumbnails, strict DPI gate (may warn only)

### 3A verification

- [ ] Owner/admin/helper with `importDesigns` can import one PNG
- [ ] Design appears in library with real `originalPath`
- [ ] Failed validation shows error without Firestore/Storage orphans
- [ ] No filesystem access from React components directly

---

## Phase 3B — Batch sources (folder + ZIP)

**Goal:** Import many files from folder and ZIP with visible progress and rejection reporting.

### Deliverables

1. Folder scanner (main process)
2. ZIP extract + PNG discovery (main process)
3. `ImportJobRunner` batch queue with cancel
4. IPC progress streaming
5. Imports UI: job table, per-file status, summary counts
6. Skipped vs rejected distinction
7. Concurrency limits

### 3B verification

- [ ] Import folder with mixed files → PNGs imported, others skipped
- [ ] Import ZIP with nested PNGs → correct count
- [ ] Malicious ZIP path (`../`) rejected safely
- [ ] Cancel mid-job stops further processing
- [ ] Partial success summary accurate

---

## Phase 3C — Derivatives, DPI hardening, polish

**Goal:** Production-quality validation and catalog presentation.

### Deliverables

1. Thumbnail + preview generation (main process — likely `sharp`)
2. Enforce `MIN_DPI` and dimension bounds
3. Upload derivatives; transition status to `ready`
4. Design Library cards show real thumbnails
5. Storage cleanup on partial failure
6. Performance tuning (parallelism, resumable uploads)
7. Optional: retry failed file, copy rejection report

### 3C verification

- [ ] Low-DPI PNG rejected with clear message
- [ ] Valid PNG has thumbnail visible in Design Library
- [ ] Large batch (50+ files) completes without UI lockup
- [ ] Light/dark theme on Imports page
- [ ] No orphan Storage files after forced failure tests

---

# Folder Structure (Planned)

```txt
electron/
├── main.ts
├── preload.ts
├── ipc/
│   └── import/
│       ├── importIpcHandlers.ts
│       └── importIpcChannels.ts
└── services/
    └── import/
        ├── importJobRunner.ts
        ├── folderScanner.ts
        ├── zipExtractor.ts
        ├── pngValidator.ts
        └── tempDirectoryService.ts

src/renderer/src/features/imports/
├── pages/ImportsPage.tsx
├── components/
│   ├── ImportSourceActions.tsx
│   ├── ImportJobPanel.tsx
│   └── ImportFileResultList.tsx
├── hooks/
│   └── useImportJob.ts
├── services/
│   ├── importOrchestrationService.ts
│   └── importUploadService.ts
├── types/
│   └── importJob.types.ts
└── constants/
    └── importValidation.constants.ts

shared/
├── types/import/          (IPC DTOs shared by preload typings)
└── constants/import/      (optional shared limits)
```

---

# Documentation Updates (During Implementation)

| Document | When |
| --- | --- |
| `docs/WORKFLOWS.md` | Import + ZIP sections updated to match implementation |
| `docs/FIREBASE.md` | Storage upload flow, import integration |
| `docs/SECURITY.md` | Storage rules, IPC allowlist, upload limits |
| `docs/DATA_MODEL.md` | Only if new fields (e.g. `importBatchId`) approved |
| `docs/setup/firebase-storage-setup.md` | Storage rules deployment for staff uploads |
| `docs/reviews/phase-3a-signoff.md` | After 3A |

---

# Exit Criteria (Phase 3 Complete)

- [ ] Individual PNG, folder, and ZIP import work on desktop
- [ ] DPI and dimension validation enforce configured rules
- [ ] Rejected files reported clearly; no silent failures
- [ ] Thumbnail and preview uploaded; Design Library shows images
- [ ] Firestore records created via `designService` with correct paths
- [ ] Staff-only access enforced in UI and Firebase rules
- [ ] AI integration points documented; no AI code shipped
- [ ] Architecture: main = filesystem; renderer = orchestration + Firebase
- [ ] Phase 3A / 3B / 3C signoffs recorded
- [ ] Manual Phase 2C flows still work (no regression)

---

# Architecture Risks (Pre-Implementation)

Review these **before writing code**. Several are high priority.

## High

| Risk | Description | Mitigation |
| --- | --- | --- |
| **Preload exposes raw `ipcRenderer`** | Current `electron/preload.ts` violates `docs/SECURITY.md` and enables arbitrary IPC if renderer compromised | Block Phase 3A on narrowed `window.freshPrints` API |
| **Orphan Storage objects** | Upload succeeds but Firestore create fails (or vice versa) | Strict ordering; cleanup on failure; idempotent path per `designId` |
| **Zip Slip / path traversal** | Malicious ZIP or paths escape temp dir | Entry path normalization; root jail; security test cases |
| **Memory exhaustion** | Large PNGs or huge batches read fully into memory | File size caps; concurrency limits; stream where possible |

## Medium

| Risk | Description | Mitigation |
| --- | --- | --- |
| **IPC payload size** | Passing large buffers renderer ↔ main | Size limits; consider chunked transfer or main-assisted upload token pattern if limits hit |
| **DPI metadata absent in PNG** | Many exports lack `pHYs` chunk | Explicit policy (reject vs warn); document in validation constants |
| **Storage rules not deployed** | Uploads fail mysteriously in dev | Deploy checklist in 3A; verify in setup docs |
| **`electron/` vs `src/main/` doc drift** | `docs/ARCHITECTURE.md` references `src/main/`; project uses `electron/` | Align docs during 3A; keep new code in `electron/` |
| **Import >100 designs** | `useDesigns` default limit hides records | Pagination or raise limit with cursor — plan before large batch QA |
| **Sequential Firestore creates** | Slow for 500+ file ZIP | Accept for 3B; optimize in 3C if measured |

## Low

| Risk | Description | Mitigation |
| --- | --- | --- |
| **Duplicate filenames in batch** | Different folders, same basename | Allowed; titles may duplicate until staff/AI edits |
| **Title-only collision** | Two imports same filename | Distinct `designId` and paths; catalog titles may match |
| **Phase 3 scope creep into AI** | Pressure to auto-tag on import | Enforce Phase 7 boundary in PR review |
| **Helper import permissions** | All staff can import per current `permissionService` | Confirm business rule; restrict if needed |

## Open decisions (resolve in Phase 3A kickoff)

1. **Exact `MIN_DPI` and dimension limits** — confirm with business (default 300 DPI proposed).
2. **PNG without DPI metadata** — reject or allow with warning?
3. **Status on create** — `imported` vs `ready` in 3A before thumbnails exist.
4. **Image library** — `sharp` in main process (recommended) vs alternative; requires native dependency approval per `docs/AI_RULES.md`.
5. **Storage rules** — confirm whether rules file exists in repo or must be created.
6. **Import job persistence** — in-memory only for Phase 3, or Firestore `importJobs` collection (defer unless required).

---

# Recommendation

**Proceed to Phase 3A implementation** after resolving open decisions above and acknowledging preload hardening as a blocking first task.

Do not implement ZIP, folder batch, or thumbnail generation until Phase 3A single-file import is verified end-to-end against a dev Firebase project with Storage rules deployed.

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/CODING_STANDARDS.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/ROADMAP.md`, `docs/plans/design-library-plan.md`, `docs/reviews/phase-2c-signoff.md`*
