# Fresh Prints Workflows

## Purpose

This document defines the operational workflows used throughout the Fresh Prints platform.

This document is the source of truth for:

* Fresh Prints Studio Workspaces (Imports, AI Review, Design Library)
* Design Import Workflow
* ZIP Processing Workflow
* AI Review Workflow
* Print Request Workflow
* Print Run Workflow
* Custom Request Workflow (future)
* Design Lifecycle Workflow (catalog only)
* Manual Design Catalog Workflow (Phase 2C)
* Pensacola Production File Export Workflow
* Download Workflow
* Team User Management Workflow

All workflows should follow these standards.

---

# Workflow Philosophy

## Workflows Must Be Predictable

Every workflow should:

* Follow a defined sequence
* Be repeatable
* Be recoverable
* Be auditable

Users should always know:

* Current status
* Next step
* Failure state

---

## Workflows Must Be Recoverable

A failed workflow should never require:

* Re-uploading everything
* Rebuilding records manually
* Database cleanup

Whenever possible:

Resume from last successful step.

---

## Workflows Must Be Observable

Every major workflow should expose:

* Status
* Progress
* Errors
* Completion

Users should never be left guessing.

---

# Team User Management Workflow

Phase 1 desktop user management follows a directory + modal workflow.

```txt
Users page
   ↓
Search / filter loaded team users (client-side)
   ↓
Add user modal → createTeamUser callable → invitation email
   ↓
Edit user modal → updateTeamUser callable → Auth disabled + Firestore isActive (+ role)
```

Rules:

* Owners see owner, admin, and helper accounts.
* Admins see admin and helper accounts only.
* Helpers and customers do not access the Users page.
* Owners can create admin/helper accounts and edit admin/helper role or status.
* Admins can create helpers and edit helper status only.
* Deactivating a user requires confirmation in the edit modal.
* Status changes must keep Firebase Auth `disabled` and Firestore `users/{uid}.isActive` synchronized through Cloud Functions.

---

# Design Library Workflow (approved catalog)

Purpose:

Browse, search, and maintain the **approved design catalog** only.

**Target state:** Phase 4 cleanup (`docs/workflow/plans/phase-4-catalog-cleanup-plan.md`).

---

## Workflow

```txt
Open Design Library
   ↓
Default: status == ready (catalog-approved)
   ↓
Search / filter (category, tags, archived toggle)
   ↓
Browse thumbnails → Design details → Edit metadata (staff)
   ↓
Archive / restore (staff)
```

---

## Design Library IS

* Approved catalog browsing (`status: ready` by default)
* Search (title, description, tags)
* Category filter
* Tag filter (multi-select modal — Phase 4B or cleanup stretch)
* Archived visibility toggle (`includeArchived`)
* Metadata editing, thumbnails, design details
* Pagination and URL persistence (`category`, `tag`, `search`, `includeArchived`)

## Design Library IS NOT

* Import queue → **Imports page**
* AI review queue → **AI Review page**
* Production queue → **Print Runs** (Phase 7)
* Customer / custom request queue → **Custom Requests** (Phase 9)

Rejected and pending-import designs do not appear in default library browse.

---

# Manual Design Catalog Workflow (Phase 2C)

Phase 2C originally let staff create catalog records manually during development testing. After Phase 3C, **new designs originate from the import pipeline** — manual create UI was removed from the Design Library. Staff still edit, archive, restore, and manage categories for existing records.

```txt
Design Library page
   ↓
Search / filter approved catalog (title, description, tags client-side; category, tag server-side; archived toggle; URL params; load more pagination)
   ↓
Design details modal → Edit modal → designService.updateDesign → reload list
   ↓
Design details modal → Archive confirm → designService.archiveDesign (captures previousStatus, archivedAt, archivedBy; status: archived) → reload list
   ↓
Categories (header) → category management modal → categoryService create/edit/archive → reload categories + designs
   ↓
Tags (filter dock) → tag management modal → catalogTagService create/edit/archive/bulk import → reload tag metadata
```

Import pipeline (Phase 3A–3C) creates designs via `designService.createDesign` during upload orchestration — not through the Design Library UI. **After realignment (2026-06-24):** new imports route staff to **AI Review**, not Design Library.

Rules:

* Design Library default browse shows **catalog-approved** designs (`status: ready`, `aiReviewStatus: approved`).
* Operational status filters (`imported`, `processing`, `rejected`) and AI review filters belong on the **AI Review** page (Phase 5), not Design Library.
* All staff (`owner`, `admin`, `helper`) may edit and archive catalog designs.
* Only `owner` and `admin` may create, edit, or archive categories.
* Owner Category Management also supports bulk JSON import for categories using strict `{ "name", "description" }` objects only.
* Only `owner` and `admin` may create, edit, or archive approved tags.
* Owner Tag Management supports bulk JSON import for tags using strict `{ "name", "aliases", "preferredWhen" }` objects only.
* Helpers may view the approved tag library but cannot manage tag documents or approve suggested-new-tags.
* Helpers may view categories and assign an existing active category when editing a design.
* Tags are normalized (lowercase, deduped) before save.
* Approved tags are global. They are not owned by categories, and category documents do not contain tag lists or `categoryHints`.
* Optional fields are omitted from Firestore documents when empty.
* Active category ordering is service-owned through `Category.sortOrder` and persists contiguously as `0...n-1`.
* Creating an active category appends it to the end of the active list automatically.
* Manual category order edits and drag reorder both normalize the full active list atomically so collisions and gaps do not persist.
* Archiving a design sets `status: "archived"` and stores `previousStatus`, `archivedAt`, and `archivedBy`; archiving a category sets `isActive: false` and reindexes the remaining active categories contiguously.
* Staff browse the approved catalog by default (`status: ready`). The Design Library **Archived catalog** toggle switches to archived-only view (`status: archived`, URL `archived=true`).
* Staff view archived categories via **Archived** inside the category management modal, then **Back** to return to active categories.
* Restore uses `designService.restoreDesign` (restores `previousStatus`, clears archive metadata) and `categoryService.restoreCategory` (`isActive: true`, restored category appended to the end of the active list before any later manual reorder). Legacy archived designs without `previousStatus` fall back to `imported`. Permanent delete is not implemented.
* Edit Design shows status read-only. Metadata edits on archived designs do not restore them.
* After mutations, the design list and category pickers refresh while preserving the current search/filter state when reasonable.

---

# Design Lifecycle Workflow (catalog only)

Every design follows a **catalog** lifecycle. Production state (`queued`, `printed`, `done`) belongs on **Print Request Items** and **Print Run Items** — never on the design document.

```txt
Imported
   ↓
Processing (transient — derivatives, future AI job)
   ↓
Ready (catalog-approved)
   ↓
Archived
```

Rejected designs:

```txt
Imported
   ↓
Processing (optional)
   ↓
Rejected
   ↓
Archived (optional)
```

**AI Review path (Phase 5):**

```txt
Imported (aiReviewStatus: pending)
   ↓
AI enrichment + staff review
   ↓
Approved → Ready (catalog)
   or
Rejected
```

Status values must match `DATA_MODEL.md`.

**Removed from design lifecycle:** `queued`, `printed` — deprecated on design documents (Phase 3D Step 6). Production workflow uses print request items and print run items (Phases 6–7).

Import, AI review, and archive transitions are implemented or planned per phase. Queue and print transitions on designs are **forbidden**.

---

# Single PNG Import Workflow (Phase 3A)

Desktop staff import one PNG at a time through the Imports page.

## Current implemented steps

```txt
Select PNG (Electron file picker)
    ↓
Validate PNG (main process: extension, magic bytes, dimensions, DPI warnings)
    ↓
Show local preview (main process: resized data URL via safe IPC)
    ↓
User clicks Upload PNG
    ↓
Upload original to Firebase Storage (/originals/{designId}.png)
    ↓
Create Firestore design record (designService.createDesign, status: imported)
    ↓
Design appears in AI Review queue (Phase 5) — not Design Library default browse
```

Imports completion links to **AI Review** (`/ai-review`).

If Firestore create fails after a successful Storage upload, orchestration deletes the uploaded original. If cleanup delete fails, the UI shows a warning and logs the failure without crashing.

Phase 3A-2 validation warnings (missing DPI metadata) are informational when print-size assessment passes.

**Phase 3D Step 3 (import wiring):** Main-process PNG validation runs pixel-based print-size assessment. Imports persist `printWidthInches`, `printHeightInches`, `effectiveDpi`, `metadataDpiX`/`metadataDpiY`, and related fields via `designService.createDesign`. Original PNG bytes are not rewritten.

**Phase 3D Step 3 correction (acceptance tiers, updated 2026-06-24):** Rejection applies only when **effective DPI at import-normalized print size is < 72** (minimum accepted floor). Assets with max width below 3.5″ at 300 DPI normalize at **72 DPI** on import so `effectiveDpi` reflects quality (typically 72, tier **Terrible**). Import warnings map to effective DPI tiers: Optimal (≥ 300), Good (≥ 250), Bad (≥ 200), Terrible (≥ 72). Design Library cards show color-coded resolution pills from persisted `effectiveDpi`.

**Phase 3D Step 4 (Edit Design print size):** Staff edit production print dimensions from the Edit Design modal. Pixel dimensions remain read-only. Effective DPI is derived live from pixels ÷ print size and persisted on save with `printSizeSource: "staff_edited"`. Original PNGs and derivatives are not regenerated. Effective DPI quality tiers are informational only and do not block save.

**Phase 3D Step 5 (AI review foundation):** `aiReviewStatus` tracks review outcome separately from operational `status`. Imports remain `status: imported` with `aiReviewed: false`. `designAiReviewService` exposes `markAiReviewPending`, `markAiReviewApproved`, `markAiReviewRejected`, and `markAiReviewNeedsReview` for future automation and staff override — no provider calls, no queue processing, and no automatic `ready` transitions in this step.

**Phase 3D Step 6 (catalog status cleanup):** `queued` and `printed` are deprecated on design documents. Design status is workflow-controlled (import, AI Review approve/reject, archive, restore) — not editable from Edit Design. Imports persist `status: imported`, `aiReviewStatus: pending`, `aiReviewed: false`. `catalogApprovalService` coordinates approval (`ready` + `aiReviewStatus: approved`) and rejection (`rejected` + `aiReviewStatus: rejected`) — owner/admin only; no UI buttons yet. Production workflow will use `showQueueItems` in Phase 6.

**Phase 3D Step 2A (session cleanup):** **Cancel Upload** clears renderer state and releases main-process session locks. Single-file sessions call `clear-single-png-import` IPC; batch sessions call `finish-batch-job` (and `cancel-batch-job` during discovery). After a successful import completes, the opposite workflow is available without canceling first.

The preview uses a session-validated file path only. The renderer never receives arbitrary filesystem access.

---

# Derivative Processing Workflow (Phase 3C — foundation)

Phase 3C adds thumbnail and preview WebP generation after Phase 3A/3B import. Storage upload (Step 5) and status lifecycle services (Step 6) are implemented; import orchestration wiring follows in Step 7+.

## Locked status lifecycle

```txt
imported → processing → ready
```

| Status | Meaning |
| --- | --- |
| `imported` | Original in Storage; Firestore record created; derivatives not complete |
| `processing` | Derivative uploads and Firestore path updates in progress |
| `ready` | Thumbnail and preview uploaded; canonical paths set; library presentation complete |

On derivative failure, the design remains `imported` with the original retained.

## Status lifecycle service (Step 6 — implemented)

`designReadyService` (`features/designs/services/designReadyService.ts`) provides:

* `markDesignProcessing(caller, designId)` — `imported` → `processing`
* `markDesignDerivativesComplete(caller, designId, paths)` — validates canonical paths; sets `thumbnailPath` / `previewPath`; keeps `status: imported`
* `markDesignReady(caller, designId, paths)` — **future** post-AI-review transition to `status: ready` (not used in Phase 3C import)

Path validation uses `shared/constants/design/designStoragePaths.ts`. Firestore updates delegate to `designService.updateDesign` (audit fields preserved).

## Batch derivative orchestration (Step 8 — implemented)

Batch import uses the same corrected derivative pipeline as single PNG import:

```txt
read PNG bytes (batch session, includeDerivatives: true)
    ↓
upload original → createDesign (imported)
    ↓
markDesignProcessing → upload derivatives → markDesignDerivativesComplete
    ↓
status remains imported; paths populated on pipeline success
```

`importBatchOrchestrationService` reports per-file `importSuccess`, `pipelineSuccess`, and derivative outcome fields. Batch summary includes derivative complete / failed counts and **Skipped by user** for manually excluded validated files.

Before upload, staff can exclude individual validated files from the batch in the discovery UI. Excluded files are not uploaded and do not create Storage or Firestore records.

Single PNG import (Step 7 — implemented):

```txt
read PNG bytes (main, session-gated, includeDerivatives: true)
    ↓
upload original → createDesign (imported)
    ↓
markDesignProcessing
    ↓
upload thumbnail + preview WebP
    ↓
markDesignDerivativesComplete → paths saved, status imported
```

On derivative failure after create: original and Firestore record retained; status reverts to `imported`; uploaded derivatives deleted (best-effort); UI reports partial success.

Constants: `shared/constants/import/derivativeGeneration.constants.ts`

## Design Library URL resolution (Step 9 — implemented)

Firestore stores canonical Storage **catalog paths** (`thumbnailPath`, `previewPath`), not download URLs. The Design Library resolves paths at display time.

`designDerivativeUrlService` (`features/designs/services/designDerivativeUrlService.ts`):

* `getThumbnailUrl(design)` — resolves `thumbnailPath`
* `getPreviewUrl(design)` — resolves `previewPath`
* `getDownloadUrlForCatalogPath(catalogPath)` — shared resolver

Behavior:

* Missing or blank path → `null` (placeholder UI)
* Missing Storage object or Firebase error → `null` (logged, no UI throw)
* In-memory path → URL cache for the session; concurrent requests for the same path are deduplicated

`useDesignDerivativeUrl(catalogPath)` coordinates hook state: `loading`, `resolved`, `unavailable`.

UI:

* `DesignCard` — thumbnail from `thumbnailPath`
* `DesignDetailsModal` — preview from `previewPath`
* Placeholders retained when derivatives are unavailable

Imported designs with populated paths display images while `status` remains `imported`. No Firebase deploy required for this step.

## Design Library rendering polish (Step 10 — implemented)

Step 10 polishes derivative display without changing import or status business rules.

`DesignThumbnailPanel` (`features/designs/components/DesignThumbnailPanel.tsx`):

* Fixed `aspect-ratio: 4 / 3` container — no layout shift during URL resolution or image load
* Loading — compact `LoadingSpinner` with `aria-busy` during Storage URL resolution
* Unavailable — icon + label when path missing, Storage object missing, or image `onError`
* Resolved — `object-fit: contain` for library cards and detail previews (full artwork, no crop)
* Design Details preview — click-to-open lightbox using resolved preview URL only
* Card thumbnails are `decorative` inside the design card button (accessible name comes from title)
* Details preview uses meaningful `alt` text and `role="img"` when unavailable

Cache behavior unchanged from Step 9: one `getDownloadURL` per catalog path per renderer session; `designDerivativeUrlService.clearCache()` for testing.

### Post–Step 10 QA cleanup

* Edit Design — system fields read-only; status read-only badge (workflow actions only)
* Desktop text inputs — safe right-click context menu (Cut, Copy, Paste, Select all) in main process
* Manual **Add design** UI removed — designs originate from import pipeline

Manual QA gate (T1, T7, T11) must pass before final Phase 3C signoff. See `docs/workflow/reviews/phase-3c-signoff.md` (supersedes `phase-3c-signoff-draft.md`).

---

# Batch PNG Import Workflow (Phase 3B — multiple-png discovery)

Desktop staff can select multiple PNG files in one batch session. Discovery and validation run in the **main process** using paths stored in `importBatchSession` at picker time. The renderer supplies only `jobId` and `sourceType` when starting discovery.

## Implemented steps (Phase 3B Step 3)

```txt
Select multiple PNGs (Electron file picker)
    ↓
Main registers paths in batch session (jobId returned to renderer)
    ↓
startBatchDiscovery({ jobId, sourceType: "multiple-png" })
    ↓
Main reads paths from batch session (not from renderer)
    ↓
For each file: validatePngFile (extension, size, magic bytes, dimensions, DPI warnings)
    ↓
batch-progress events (discovering → validating → complete)
    ↓
batch-discovery-complete (manifest + rejections + counts)
```

Valid files are added to the manifest with `outcome: "validated"`. Invalid files are added with `outcome: "rejected"` and a rejection reason code. DPI warnings do not block validation in Phase 3B.

Upload, Firestore create, and ZIP extraction are **not** implemented in this step.

## Cancellation

`cancelBatchJob` during discovery sets a cancel flag. The runner stops before the next file, emits `batch-discovery-complete` with `canceled: true`, and clears the session.

---

# Batch Folder Import Workflow (Phase 3B — folder discovery; nested ZIP enhancement)

Desktop staff can select a folder in one batch session. The main process recursively scans for loose `.png` files **and** `.zip` archives, extracts PNGs from each ZIP (including nested ZIP-in-ZIP up to depth 3), validates candidates, and emits progress events. The renderer supplies only `jobId` and `sourceType` when starting discovery — the folder path is read from `importBatchSession` at picker time.

## Implemented steps

```txt
Select folder (Electron directory picker)
    ↓
Main registers folderPath in batch session (jobId returned to renderer)
    ↓
startBatchDiscovery({ jobId, sourceType: "folder" })
    ↓
Recursive scan (loose PNGs + ZIP paths; ignore other file types)
    ↓
For each ZIP: extract PNGs to job temp dir (zip-slip safe, nested ZIP depth ≤ 3)
    ↓
For each PNG candidate: validatePngFile
    ↓
batch-discovery-complete (manifest + folderDiscovery summary)
```

### Scan rules

* Non-PNG / non-ZIP files are ignored (not counted as rejections)
* Symlinks are not followed
* Ignored directory names: `.git`, `node_modules`, `$RECYCLE.BIN`, `System Volume Information`
* Limits: `MAX_FOLDER_DEPTH` (12), `MAX_FOLDER_SCAN_ENTRIES` (10,000), `MAX_BATCH_FILES` (**500**), `MAX_FOLDER_ZIPS` (50), `MAX_NESTED_ZIP_DEPTH` (3)
* ZIPs over `MAX_ZIP_SIZE_BYTES` are skipped (counted in `folderDiscovery.zipsSkipped`)
* Nested ZIPs beyond depth N increment `folderDiscovery.nestedZipsNotOpened`
* Per-ZIP extraction failures skip that archive and continue the folder job

### Discovery summary (`folderDiscovery` + `summary`)

| Field | Meaning |
|-------|---------|
| `summary.discovered` | PNGs **seen** in folder tree + ZIP entry scans (can exceed batch cap) |
| `summary.processed` | PNGs actually validated + rejected in this job |
| `summary.skippedByLimit` | `discovered − processed` — PNGs not imported this batch |
| `summary.validated` / `rejected` | Subset of processed |
| `folderDiscovery.zipsSkippedByLimit` | ZIPs not opened because `MAX_BATCH_FILES` was full |
| `folderDiscovery.zipsSkippedOther` | ZIPs skipped for size, `MAX_FOLDER_ZIPS`, or extraction error |

**Design library note:** `designService.DEFAULT_LIST_LIMIT` remains **100** for list queries. Imports above 100 designs per batch are supported; the library may require pagination/load-more to see all rows until a future pagination phase.

### Discovery summary (`folderDiscovery`) — ZIP breakdown

| Field | Meaning |
|-------|---------|
| `loosePngsFound` | PNG files found directly in the folder tree |
| `zipsFound` | `.zip` archives discovered in the tree |
| `zipsProcessed` | ZIPs successfully opened for PNG extraction |
| `zipsSkipped` | Total ZIPs not opened (all reasons) |
| `zipsSkippedByLimit` | ZIPs not opened because `MAX_BATCH_FILES` was full |
| `zipsSkippedOther` | ZIPs skipped for size, `MAX_FOLDER_ZIPS`, or extraction error |
| `nestedZipsNotOpened` | Nested ZIP entries beyond `MAX_NESTED_ZIP_DEPTH` |

### Cancellation

`cancelBatchJob` during folder scan, ZIP extraction, or validation sets a cancel flag. The runner stops at the next checkpoint, emits `batch-discovery-complete` with `canceled: true`, and clears the session.

---

# Batch Import Temp Directories (Phase 3B — Step 5)

ZIP extraction (Step 6) will extract PNG candidates into managed per-job temp directories under the OS temp folder:

```txt
{osTemp}/fresh-prints-imports/{jobId}/
```

## Implemented in Step 5

* `tempDirectoryService` creates and deletes per-job temp directories in the main process only
* Folder and multiple-PNG jobs do **not** create temp directories
* `finishBatchJob({ jobId })` deletes the job temp directory when it exists and returns `tempDirDeleted: true`; otherwise `tempDirDeleted: false`
* Stale temp directory cleanup helper exists for future startup housekeeping (not run automatically yet)
* Temp paths are not exposed to the renderer

ZIP extraction, upload, and Firestore create are **not** implemented beyond discovery in this step.

---

# Batch ZIP Import Workflow (Phase 3B — ZIP discovery)

Desktop staff can select a ZIP archive in one batch session. The main process creates a per-job temp directory, extracts PNG candidates safely, validates each file, and emits discovery events. The renderer supplies only `jobId` and `sourceType` when starting discovery — the ZIP path is read from `importBatchSession` at picker time.

## Implemented steps (Phase 3B Step 6)

```txt
Select ZIP (Electron file picker; cap = `MAX_ZIP_SIZE_BYTES`, currently **2.1 GB** — sized for Google Drive multi-part folder downloads)
    ↓
Main registers zipFilePath in batch session (jobId returned to renderer)
    ↓
startBatchDiscovery({ jobId, sourceType: "zip" })
    ↓
createJobTempDir(jobId)
    ↓
extractZipPngCandidates (Zip Slip protection, locked limits)
    ↓
For each extracted PNG: validatePngFile
    ↓
batch-progress events (discovering → validating → complete)
    ↓
batch-discovery-complete (manifest + rejections + truncated flag)
    ↓
Temp dir retained until finishBatchJob
```

### Extraction rules

* PNG entries only; non-PNG ZIP entries are skipped (not rejections)
* Nested folders supported via preserved `relativePath`
* Symlink entries rejected
* Limits: `MAX_SINGLE_PNG_SIZE_BYTES` (150 MB), `MAX_ZIP_SIZE_BYTES` (2.1 GB), `MAX_EXTRACTED_BYTES` (10 GB), `MAX_ZIP_ENTRIES` (**2000**), `MAX_ZIP_COMPRESSION_RATIO` (100:1), `MAX_BATCH_FILES` (**500**)
* Peak renderer upload memory: `UPLOAD_CONCURRENCY` (2) × max PNG size ≈ **300 MB** in flight
* Fatal extraction errors delete the job temp directory immediately
* Successful or canceled discovery leaves the temp directory on disk for a future upload phase

Upload, Firestore create, and batch UI are **not** implemented in this step.

---

# Batch Import Job Runner (Phase 3B — Step 7)

All batch discovery requests flow through a single main-process orchestrator:

```txt
startBatchDiscovery({ jobId, sourceType })
    ↓
importJobRunner.runBatchImportDiscovery()
    ↓
source-specific discovery (multiple-png | folder | zip)
    ↓
batch-progress + batch-discovery-complete
    or
batch-job-error (fatal only)
```

The renderer does not choose or invoke source-specific discovery modules directly.

## Session lifecycle

```txt
selected → discovering → completed (session remains active until finishBatchJob)
selected → discovering → canceled (session cleared)
selected → discovering → failed (session cleared, batch-job-error emitted)
```

Upload orchestration is implemented in Step 8 below. Batch UI is **not** implemented yet.

---

# Batch Upload Orchestration (Phase 3B — Step 8)

After discovery completes, the renderer runs `importBatchOrchestrationService.runBatchUpload()` with the `batch-discovery-complete` manifest.

## Workflow

```txt
batch-discovery-complete (manifest with validated entries)
    ↓
importBatchOrchestrationService.runBatchUpload()
    ↓
For each validated file (UPLOAD_CONCURRENCY = 2):
    Main: readSelectedPngFileBytes({ jobId, filePath }) — batch-validated path only
    Renderer: importUploadService.uploadOriginalPng
    Renderer: designService.createDesign (status: imported)
    On Firestore failure: delete uploaded Storage object, mark file failed, continue
    ↓
finishBatchJob({ jobId }) — clears session + deletes ZIP temp dir when applicable
    ↓
BatchImportUploadReport (per-file results + summary)
```

## Per-file outcomes

* **success** — Storage upload and Firestore create completed; `designId` and `storagePath` recorded
* **failed** — upload or create failed; optional `cleanupWarning` if Storage rollback failed
* **skipped** — rejected during discovery, canceled before upload, or not validated

One file failure does not stop the batch. Rejected discovery files are reported as skipped.

## Progress

Service-level `onProgress` callbacks report phase (`uploading` | `creating` | `completing` | `complete`), current file name, and running success/failure counts. UI wiring is Step 9.

## Step 9 — Batch import hook (implemented)

`useBatchImport()` coordinates the full batch lifecycle:

```txt
selectMultiplePngs | selectFolder | selectZip
    ↓
startBatchDiscovery
    ↓
onBatchProgress → hook progress state
onBatchDiscoveryComplete → ready-to-upload
    ↓
uploadBatch → importBatchOrchestrationService.runBatchUpload()
    ↓
completed (uploadReport + summary)
```

Hook responsibilities:

* Subscribes to `onBatchProgress`, `onBatchDiscoveryComplete`, `onBatchJobError` with cleanup on unmount
* Maps discovery and upload progress into a shared progress shape
* Calls `finishBatchJob` on cancel, fatal error, discovery cancel, and reset when a session is still active
* Upload success cleanup is handled by `importBatchOrchestrationService` (no duplicate `finishBatchJob`)

Batch UI components are implemented in Step 10.

## Step 10 — Batch import UI (implemented)

`ImportsPage` renders the Phase 3A single PNG section and a Phase 3B `BatchImportPanel` below it.

* Source actions: multiple PNG, folder, ZIP
* Progress panel during selection, discovery, validation, and upload
* Discovery summary with validated/rejected file previews before upload
* Completed summary with AI Review link
* Single PNG and batch flows are mutually exclusive while either is active

---

# ZIP Import Workflow

Purpose:

Import large groups of designs from ZIP files.

---

## Workflow

```txt
Select ZIP
    ↓
Extract ZIP
    ↓
Discover Images
    ↓
Validate Files
    ↓
Generate Thumbnails
    ↓
Upload Files
    ↓
Create Firestore Records
    ↓
Queue AI Processing
    ↓
Ready For Review
```

---

## Step 1

User selects ZIP file.

Requirements:

* ZIP must exist
* ZIP must be readable
* ZIP must be under configured size limits

---

## Step 2

Extract ZIP.

Requirements:

* Extract safely
* Prevent path traversal attacks
* Ignore unsupported files

Supported files:

```txt
PNG
```

Future support may include:

```txt
JPG
JPEG
WEBP
```

---

## Step 3

Discover image files.

Requirements:

* Scan extracted contents
* Ignore folders
* Ignore unsupported files

---

## Step 4

Validate files.

Validation:

* File type
* File extension
* Image readability
* Dimensions
* DPI

Failures should be reported.

Do not silently ignore failures.

---

## Step 5

Generate thumbnails.

Create:

```txt
Thumbnail
Preview
```

Original files should remain unchanged.

---

## Step 6

Upload assets.

Upload:

```txt
Original
Thumbnail
Preview
```

to Firebase Storage.

---

## Step 7

Create Firestore records.

Only create records after successful uploads.

Avoid orphaned metadata.

---

## Step 8

Queue AI processing.

Design enters:

```txt
processing
```

status.

---

## Step 9

Design becomes:

```txt
ready
```

after successful processing.

---

# Fresh Prints Studio Workspaces

Fresh Prints Studio organizes design intake and catalog work into **three independent workspaces**. Each has a single responsibility; overlap is avoided.

| Workspace | Route | Responsibility | Must NOT |
|-----------|-------|----------------|----------|
| **Imports** | `/imports` | Receive PNGs/ZIP/batch; validate; create design records; generate derivatives | Approve catalog; browse approved catalog; trigger AI |
| **AI Processing** | `/ai-review` | Process imported designs through AI metadata review and staff approval | Show approved catalog; search/filter catalog; replace import validation |
| **Design Library** | `/designs` | Approved catalog browse/search/edit (`ready` / archived-only view) | Show imported or rejected designs; import queue |

```txt
Import → AI Processing (staff starts queue) → Approve → Design Library
```

Architecture: `docs/architecture/ARCHITECTURE.md`, ADR-FP-009.

---

# AI Processing Workflow (staff station)

Purpose:

Work station for newly imported designs. AI suggests catalog metadata; staff review and approve before designs appear in Design Library.

**Navigation:** Dedicated **AI Processing** sidebar entry (`/ai-review`). Imports navigate here after successful upload.

**Queue tabs:** **Processing**, **Needs Review**, **Rejected** — these represent the processing flow, not catalog search.

**No search or filters on this page.** Search, category filters, and sort belong in **Design Library** only. Queue order is tab-specific (see below).

**Approval actions:** Approve & Next, Reject & Next (always advances to next item), Previous/Next, keyboard shortcuts (A/R/J/K).

**Workspace layout (Phase 5A polish):** Right panel is a vertical processing workstation — large image preview, Processing Status pipeline, AI Suggestions (5B-ready placeholders), Final Catalog Information form, then actions. Search and filtering remain in Design Library only.

---

## Workflow

```txt
Import completes (status: imported, aiReviewStatus: pending)
     ↓
Derivatives complete — design waits on Processing tab ("Waiting for AI")
     ↓
Staff starts AI (Start AI with auto advance, or Process image with AI one at a time)
     ↓
Sequential enqueue → Cloud Function pipeline (maxInstances: 1)
     ↓
AI completes → Needs Review tab (aiReviewStatus: needs_review)
     ↓
Staff reviews in Approval Mode, corrects metadata
     ↓
Approve → catalogApprovalService → status: ready, aiReviewStatus: approved
     ↓
Design appears in Design Library
```

Rejection path:

```txt
Staff rejects → status: rejected, aiReviewStatus: rejected
     ↓
Rejected tab (audit, re-open)
     ↓
Design never appears in Design Library browse
```

---

## AI Processing IS

* Processing station for all post-import designs
* Queue tabs: Processing, Needs Review, Rejected
* AI-generated title, description, category, tags (Phase 5B+)
* Staff review workspace with catalog metadata form
* Staff corrections before approval (temporary form state)
* Approve / reject actions (always advance to next item after approve or reject)
* Tab-specific queue order (no search, category, or sort controls)

## AI Processing IS NOT

* Approved catalog browse, search, or filtering (Design Library)
* Import validation or file upload (Imports workspace)
* Production or print run tracking

---

## AI Processing rules

* AI suggests; staff approves. No automatic catalog publish.
* **Staff-controlled AI queue** — import does not call Google AI automatically; Processing tab **Start AI** / **Process image with AI** runs one design at a time; **Auto advance** toggle (session) switches batch vs manual stepping.
* **Processing overrides** — the settings icon beside Auto advance lets staff choose a per-session Gemini model without changing Settings defaults.
* **Re-run AI Suggestions** from Needs Review or Rejected resets the design back to Processing. AI is not re-run in place on review tabs.

### Staff-controlled AI processing (2026-06-29)

| Step | Behavior |
|------|----------|
| Import completes | Derivatives finish; **no** automatic `enqueueAiEnrichment` |
| Processing tab (idle) | `aiReviewStatus: pending`, no `aiProcessingStage` — badge **Waiting for AI** |
| Staff starts AI | `enqueueAiEnrichment` callable runs the pipeline immediately (one design at a time from client orchestrator) |
| Auto advance ON | **Start AI** snapshots the current Processing model/reasoning selection, runs sequential direct processing from selected design; **Pause AI** finishes current job, selects next, stops |
| Auto advance OFF | **Process image with AI** uses the current Processing override or Settings default and advances selection after completion |
| Needs Review | Designs with completed AI output (`aiReviewStatus: needs_review`) — editable form + approve/reject |
| Rejected tab | Read-only suggestions + **Reopen for Review** or **Re-run AI Suggestions** (owner/admin, sends back to Processing) |
| Provider | **Development** heuristic when `OPENAI_API_KEY` is not configured |
| Production | Google AI / Gemini vision (saved model from `settings/aiEnrichment`; default `gemini-2.5-flash-lite`) when `GEMINI_API_KEY` is set |

Import completion UI links to **AI Processing** (`/ai-review`). Staff start AI from the Processing tab when ready.

### Vision model selection (2026-06-25)

| Location | Who | Behavior |
|----------|-----|----------|
| **Settings** (`/settings`) | Owner/admin | Default Gemini vision model, tag exclusions, and one-off AI playground. The AI Processing prompt block is owner-only. |
| **AI Processing** controls | Staff with processing access | Settings icon beside Auto advance applies a Processing-only model/reasoning override; manual processing uses current override/default; Auto advance snapshots it at start |
| **AI Review re-run** | Staff with re-run permission | Sends the design back to Processing for a fresh staff-started AI run |
| Per design | — | `aiSuggestions.model` records model used for that run |

Allowed models (server allowlist): `gpt-5.4-nano-2026-03-17` (default), `gpt-5-nano-2025-08-07`, `gpt-5.4-mini-2026-03-17`. Missing or invalid stored value falls back to default.

Reasoning-effort controls were removed with OpenAI support in ADR-FP-040; Gemini model selection is the remaining AI Processing override.

**Tag exclusions and server-side taxonomy resolution:** Built-in list in code (`BASE_AI_TAG_EXCLUSIONS`) plus optional `additionalTagExclusions` in Settings. The default prompt only requires `{{excluded_tags}}`; legacy owner-edited templates containing approved category/tag placeholders are still substituted for backward compatibility. Approved categories and tags are resolved server-side after the Gemini call, not injected into every default prompt. Tags are filtered again after parsing.

**Needs Review / Rejected re-run:** **Re-run AI Suggestions** does not run AI on the review tab. It calls `resetAiEnrichmentForProcessing`, clears prior AI output, returns the design to Processing (`status: imported`, `aiReviewStatus: pending`), selects the same design there, and waits for staff to start processing.

### Tab-specific workspace (Phase 5B QA)

| Tab | Staff can edit catalog fields | Actions |
|-----|------------------------------|---------|
| Processing | No | **Start AI** / **Stop** (auto advance ON) or **Process image with AI** (OFF); **Retry AI Processing** (selected failed design only); Previous / Next (right-aligned); **Auto advance** toggle + settings icon (second row) |
| Needs Review | Yes (owner/admin) | Approve & Next, Reject & Next; **Re-run AI Suggestions** in AI Suggestions footer, sends back to Processing |
| Rejected | No | Reopen for Review, Re-run AI Suggestions (owner/admin, sends back to Processing); Previous / Next |

### Queue order (client sort after Firestore fetch)

| Tab | Order | Field |
|-----|-------|-------|
| Processing | Oldest first | `createdAt` asc |
| Needs Review | Newest first | `updatedAt` desc |
| Rejected | Newest first | `updatedAt` desc |

Tie-breaker: design `id` ascending.

**Reopen for Review:** `status: imported`, `aiReviewStatus: needs_review`; keeps existing `aiSuggestions` / `aiAnalysis`; does not re-run AI.

**Re-run AI Suggestions:** Callable `resetAiEnrichmentForProcessing`; restores `status: imported`, `aiReviewStatus: pending`, clears prior `aiSuggestions` / `aiAnalysis`, and navigates/selects the design in Processing. Staff starts the next AI run from Processing.

### Pipeline verification logging (Phase 5B)

Structured events use scope `ai-pipeline`:

| Layer | Where to look |
|-------|----------------|
| Desktop (dev only) | DevTools console — `import.derivatives.completed`, `enqueue.callable.completed` |
| Cloud Functions | Firebase Console → Functions → Logs — `enqueue.queued`, `enqueue.completed_direct`, `provider.selected`, `pipeline.completed` / `pipeline.failed` |

Redeploy functions after logging changes. Do not store provider API keys in Firestore or the desktop app.

* Failed AI output stays in Processing (`aiReviewStatus: pending`, `aiProcessingStage: failed`) with retry actions. Structured `errorCode` values include `openai_rate_limited`, `openai_server_error`, `openai_timeout`.
* **Sequential direct processing (2026-06-29):** `enqueueAiEnrichment` now runs the existing AI pipeline directly inside the callable with `timeoutSeconds: 180` and `memory: 512MiB`. Client still processes one design at a time. Gemini calls retry up to 2 times on 429/5xx. Stale active stages (>10 min) may still be restarted via the callable.
* **Prompt contract v19 (updated 2026-07-01):** Google AI / Gemini AI Processing uses the saved Settings prompt template with `{{excluded_tags}}` replaced server-side. The default v19 prompt is small and vision-only: it requests `description`, a raw `category` candidate, `title`, up to 8 tag candidates, strict visible-text extraction into the description when readable text exists, and optional complete `suggestedNewTags` objects. Approved tag matching and approved category resolution happen deterministically server-side after the model call. Stored `aiSuggestions.promptVersion` is `catalog-enrich-v19` for Gemini and `catalog-enrich-dev-v19` for the development fallback.
* **Approved tag normalization (2026-06-30):** Cloud Functions normalize AI tag output against approved `tags` documents. Exact approved name/alias matches remain in `aiSuggestions.tags`; unmatched AI tokens and valid AI `suggestedNewTags` become `aiSuggestions.suggestedNewTags` for owner/admin approval in Needs Review. AI does not auto-create approved tag documents.
* No Firestore review drafts — temporary form state until Approve.
* `designAiReviewService` owns review field mutations.
* `catalogApprovalService` promotes approved designs to `status: ready`.
* Design Library never shows imported or rejected designs.

---

# AI Processing Workflow (provider integration)

Purpose:

Enrich imported designs from the staff-controlled AI Processing station. Imports create records and
derivatives; staff starts AI from `/ai-review`.

```txt
Design Imported
     ↓
Derivatives complete
     ↓
Processing tab waits for staff
     ↓
Staff starts AI
     ↓
AI Title / Description / Tags / Category suggestions
     ↓
aiReviewStatus → needs_review
     ↓
Staff review in AI Processing station
```

Human review remains required before catalog approval. AI Processing produces catalog suggestions only; it does not route designs or auto-publish.

---

# Print Request Workflow

Purpose:

Named lists of approved catalog designs for a customer, guest, or internal staff list. **Not an order.**

**Target phase:** Phase 6 — foundation implemented; customer-record bug fix pending QA.

---

## Workflow

```txt
Staff creates a request for a registered customer, guest customer, or internal list
     ↓
Service transaction assigns name (`username-CR001` or `baseName-IR001`)
     ↓
Open Design Library request-selection mode
     ↓
Select approved catalog designs and quantities
     ↓
Print Request Items are created (design + quantity + standard initialized requested size)
     ↓
Adjust quantity and requested size in the request detail item UI; edits autosave
```

---

## Rules

* Only `status: ready` designs may be added.
* Print Request is not payment, checkout, or shipping.
* Staff may create requests for registered customers, guest customers, or internal lists.
* Owner/admin staff create registered customers from `/users`, then select those existing customers when creating registered customer Print Requests.
* Registered customers created in Phase 6 are `customers` documents with `isGuest: false`; they do not create Firebase Auth users, Portal login, or Studio access.
* Customer records require a unique normalized username for new create/edit saves.
* Customer Print Request names use the customer username and a transaction-safe per-customer counter, e.g. `sarahsmith-CR001`; customer request names and sequences are not editable after creation.
* Internal Print Request names use an editable internal base name plus a locked transaction-safe global internal counter, e.g. `whatnot-IR001`; blank internal base names normalize to `internal`.
* Print Requests store explicit origin metadata on `requestOrigin`: `studio_internal` for Studio internal requests, `studio_customer` for staff-created Studio customer requests, and `portal_customer` reserved for future Portal-created customer requests.
* Studio origin badges display `Internal`, `Staff Created`, `Customer Submitted`, or fallback `Legacy`. Existing requests without `requestOrigin` remain readable and use compatibility display rules based on `isInternal` and `customerId`; request names are never parsed to determine origin.
* Internal base-name edits update the generated request-name preview while staff type, but are persisted only when staff manually saves the Request Detail section.
* Existing legacy request names such as `sarahsmith-0001` and `internal-0001` remain readable; no automatic migration or backfill is performed.
* Request status is not editable from the standard Print Request detail page.
* Request item status lives on `printRequestItems`, not on design documents.
* Standard Print Request item UI hides item notes and production status controls; normal quantity/size autosaves preserve hidden values.
* Standard Print Request item sizing is width/height in inches with locked aspect ratio.
* New Print Request items initialize requested size separately from catalog/default design print
  dimensions. If the design/default width is over 10 inches, requested width starts at 10 inches
  when that keeps both sides within 22 inches; if the design/default width is already below
  10 inches, that smaller width is preserved. Height is calculated proportionally from pixel aspect
  ratio, and extreme aspect ratios are initialized to the largest proportional size that keeps both
  requested sides at or below 22 inches.
* Standard Print Request item saves are blocked above 22 inches on either axis or below 72 DPI.
* Requested sizes from 72-299 DPI warn but may be saved; 300+ DPI saves without warning.
* Requested-size DPI feedback is still calculated and displayed when a requested size is over
  22 inches, as long as source pixel dimensions and requested inch dimensions are valid. The
  over-22 Custom Request guidance remains the save-blocking error.
* Print Request item cards show contained thumbnails in the existing item-card footprint. Available
  thumbnails open an enlarged preview lightbox using `previewPath` when present, otherwise
  `thumbnailPath`. Missing or unavailable images keep the fallback thumbnail state and do not open a
  broken preview.
* Catalog design print dimensions and image files are not mutated when a design is added to a
  Print Request or when a request item is resized.
* Same-design items with different requested sizes persist as separate `printRequestItems`.
* Duplicate item creation updates the current request detail list dynamically and creates a separate `printRequestItems` document.
* Item display ordering is stable: `sortOrder` when present, then `createdAt`, then document ID. Existing items without `sortOrder` remain visible.
* Design lifecycle status remains catalog-only; Print Requests must not write `queued`, `printed`, `pending`, or `done` to `designs.status`.
* `requestCount` and `lastRequestedAt` may increment on item add as lightweight request reference metadata. These fields do not imply production status and do not create Phase 10 analytics dashboards.
* Print Request list reads use server-side `updatedAt` ordering and supported single-field filters
  for status, customer, or internal requests.
* Print Request item detail reads and card summaries query `printRequestItems` by `printRequestId`
  instead of scanning all request items. Item detail ordering is applied client-side for legacy
  compatibility. Summaries are loaded for the currently displayed request IDs.
* Customer directory reads are ordered by `displayName` and support the indexed `isGuest` filter path.
* Request naming does not depend on loaded request lists.
* Origin display does not add origin filters, origin indexes, Portal behavior, customer Auth, migrations, or backfills in Phase 6.

---

# Show Queue Workflow (Phase 7 — combined show/print-run entity)

> **Superseded 2026-07-04, corrected 2026-07-05.** An initial revision split this into two workflows —
> Upcoming Shows (schedule) and Print Runs (production) — as separate collections and separate `/show-queue`
> / `/print-runs` pages. Manual QA on 2026-07-05 failed and surfaced the correct business rule: **a
> Whatnot show is the print run.** There is never more than one print run per show, so keeping them
> separate created redundant navigation with no benefit. They are now one combined workflow. See
> `docs/project/DECISIONS.md` ADR-FP-049.

Purpose:

Track each Whatnot show as its own production run: schedule (source of truth: Whatnot), print
capacity, and attached Print Requests, all on one record. Whatnot show dates and times can move, so
shows are matched and updated by stable `whatnotShowId` — **never by date/time**.

**Phase:** 7 — combined model implemented 2026-07-05 (`/show-queue`); live Whatnot sync not yet implemented.

---

## Workflow (current: manual entry)

```txt
Staff pastes a Whatnot live show URL into "Track a Whatnot show"
     ↓
App parses the stable Whatnot show ID from the URL (read-only, not typed manually)
     ↓
Staff confirms/edits title, sets scheduled date and time, optional notes
     ↓
upsertUpcomingShow() matches existing records by source + whatnotShowId
     ↓
Existing match: mutable fields (title, URL, scheduledStartAt) update in place — no duplicate
No match: a new upcomingShows record is created, and appears in the Show Queue list immediately
     ↓
Staff sets an optional max total print quantity (capacity) on the show
     ↓
From a Print Request, staff clicks "Add to Show" to allocate its items to this show
     ↓
Show tracks allocatedQuantity vs maxTotalQuantity; staff can mark it fully printed/completed
     ↓
Overflow beyond capacity: split remaining quantity to another show, or staff danger-override
```

Live Whatnot fetch/parsing (from `https://www.whatnot.com/user/funkyfreshprints/shows`), an hourly
scheduled sync, a manual scrape button, and an auto-update on/off toggle are planned but not
implemented; adding them requires a separate approved implementation phase (parsing method, Functions,
and any secrets are explicit human checkpoints).

A show that disappears upstream should be marked `missing_upstream` rather than deleted, preserving any
attached allocations and planning history.

---

## Adding Print Requests to a show

Primary workflow (from the Print Request page):

```txt
Staff creates/opens a Print Request with items
     ↓
Staff clicks "Add to Show" on the Print Request detail
     ↓
Modal lists shows, grouped by date, with date/time and remaining capacity
     ↓
Staff picks a show
     ↓
Fits within capacity: the modal shows only the plain request summary (e.g. "Request has 2 designs
with a total qty of 100 prints") — no "remaining"/"still need a show" wording, since nothing has
been split yet — and the footer's normal "Add to show" button attaches the whole request directly
     ↓
Exceeds capacity: staff see a warning explaining both available paths ("Only 25 of 50 prints can be
added to this show. You can choose which prints to add here and place the rest on another show, or
select a different show for the full request.") with no mention of override — the override checkbox
right below already explains that option — inside a single bordered decision callout, and either:
  - click "Choose designs for this show" (full-width within the callout) to open the visual
    `SplitDesignPickerModal`, which shows each remaining design as a card with a full uncropped
    thumbnail, requested quantity (plus "already assigned" once a prior split leg has touched that
    item), and a styled quantity input labeled "Add to this show," plus a live running total ("Selected
    for this show," "Available on this show," "Remaining for another show"); confirming stages that
    quantity as one leg and returns to the show-selection step for whatever's left (repeatable until
    fully allocated), or
  - pick a different show from the list above instead — nothing here forces staff to split, or
  - confirm a danger override to force the full remaining quantity onto this show anyway
```

The Add to Show modal (`modal-panel-lg`) and the split design picker are both wide enough to
comfortably show several show options, capacity information, and the visual picker at once; show
options in the date-grouped picker render as compact list rows (date/time and capacity, not a title)
rather than tall square cards.

Secondary workflow (from the Show Queue detail page): staff click **`+ Add Print Request`** to attach
an existing request to the currently open show, using the same picker/split flow with the show locked
to the one already open. This is a convenience path; the primary entry point is the Print Request page.

"Remaining"/"still need a show" wording (and the secondary "Add remaining N prints to this show"
button) only appears once staff have actually committed at least one show leg in the current session
— see `shared/utils/printRequestSplitAllocation.ts`'s `shouldShowRemainingWording()`. Before that, the
whole request is still just the whole request; showing split-flow language before any split has
happened was confusing and has been removed. Canceling the visual picker never commits anything — its
quantities are local component state until staff click its confirm button.

Removing a Print Request from a show requires a two-step confirm (Remove, then Cancel/Confirm),
matching the existing Print Request item removal pattern. Confirming calls
`removeShowAllocationsForRequest()`, which deletes every allocation belonging to that request from
that show in one operation and then recomputes the show's `allocatedQuantity` from what remains
(`recalculateShowAllocatedQuantity()`) — it never subtracts a remembered total, so the show's capacity
display cannot drift out of sync with its actual allocation records. If the show was only over capacity
because of the removed request, the over-capacity state clears immediately. Removal (and any other
allocation edit) is blocked once the show's `productionStatus` is `printing`, `fully_printed`,
`completed`, or `archived` — see `shared/utils/showQueueEditability.ts`'s `canRemoveRequestFromShow()`;
beyond that point an admin correction path is required.

## Show Queue capacity defaults

Staff can set a default max quantity for newly created shows via the settings cog next to `Add show`.
The default applies only when a new show is created — existing shows are never retroactively changed
— and any individual show's capacity can still be overridden afterward via `Set max quantity`.

## Capacity progress and status pill

Show Detail's Capacity card and every show option card in Add to Show / the split picker's show list
render a green/yellow/red progress bar (`shared/utils/showCapacityDisplay.ts`'s
`getCapacityFillLevel()`: green under 70% used, yellow 70–89%, red 90% or over, including any
over-capacity overflow past 100%) plus clear "N of M used" / "N spots left" text
(`formatCapacityUsedLabel()`/`formatSpotsRemainingLabel()`) — replacing the old ambiguous "N remaining
of M" / "N / M left" wording.

The status pill (`getDerivedShowStatusDisplay()`) checks production lifecycle first — `PRINTING`,
`FULLY PRINTED`, `COMPLETED`, `ARCHIVED`, `CANCELED` always win — and only derives `FULL` / `OVER MAX`
/ `OPEN` from live capacity when `productionStatus` is still `open`. This derived state is never
written back to `productionStatus` (the enum's existing `full` value is intentionally left unused by
this display logic), so a show correctly shows `FULL` the instant `allocatedQuantity` reaches
`maxTotalQuantity` — no code needs to run to "mark" it full, and no existing show needs a data change,
migration, or delete/re-add to display correctly after a refresh. When a show is full or over capacity,
its whole card/section (sidebar show card, Show Detail capacity card, Add to Show option card) gets a
warning or danger-tinted background/border in addition to the pill and bar, so staff don't have to read
capacity numbers carefully to notice.

## Splitting a Print Request across shows

The same `printRequestItemId` may have multiple `showAllocations` records across different shows when
a request's quantity does not fit into a single show's remaining capacity. For example, a quantity-204
request can split 200 allocated to Show A and 4 allocated to Show B. Staff choose exactly which
designs/quantities go to each show through `SplitDesignPickerModal`'s visual, thumbnail-based picker
(`shared/utils/printRequestSplitAllocation.ts` tracks remaining quantity per item across the session,
plus `calculateSplitSelectionTotal()` and `clampSplitItemQuantity()` for the picker's live totals and
per-design quantity validation); nothing is auto-split without staff control. Splitting never mutates
`printRequestItems`, `printRequests`, `designs`, or any image/thumbnail/preview file — see
`shared/utils/showCapacity.ts`'s `planAllocationSplit()`.

## Show production status flow

```txt
Open → Full → Printing → Fully Printed → Completed → Archived (or Canceled)
```

Production status (`pending`, `queued`, `in_progress`, `printed`, `done`, `canceled`) lives on
**Show Allocations** — not on designs, and allocating an item never mutates the source **Print Request
Item**, **Print Request**, or **Design**. A show's own `productionStatus` (open/full/printing/etc.) is
a separate field from its Whatnot schedule/source `status` (scheduled/live/canceled/etc.) — sync health
and production completion are never mixed.

The Show Queue list has **Upcoming** / **Past** tabs, derived purely from `scheduledStartAt` vs. the
current time (`groupShowsByUpcomingPast.ts`'s `getShowScheduleTab()`) — a show moves to Past the moment
its scheduled time passes. This is a display/filter grouping only and never changes `productionStatus`.

## Print Request queued/printed state and lifecycle status

Print Requests do not persist a queue/print status field. `derivePrintRequestQueueState()` computes
`not_queued` / `partially_queued` / `queued` / `partially_printed` / `printed` on the fly from a
request's show allocations, so the badge shown on the Print Requests page is always consistent with
allocation records and never drifts out of sync from a second field.

The Print Requests page groups requests into **Working** / **Queued** / **Printed** tabs, derived the
same way (`shared/utils/printRequestListGrouping.ts`'s `derivePrintRequestListTab()`): a request with
no active allocations is Working, any active allocation makes it Queued, and fully printed/completed
makes it Printed. Selecting a tab and selecting a request are kept in sync
(`shared/utils/printRequestTabSelection.ts`'s `resolveSelectedRequestIdForTab()`): if a selected
request moves out of the active tab (e.g. it was just queued while `Working` was open), the detail
panel falls back to that tab's first request, or shows the empty state if the tab is now empty —
it never keeps showing a request that no longer belongs to the visible tab.

To keep `printRequests.status` itself from misleadingly reading `DRAFT` (or a stale `ACTIVE`) on a
request, `upcomingShowService` drives automatic transitions:

- `draft` → `active` on the request's first show allocation.
- `active` → `editing` once a request loses every one of its active allocations (removed from the
  last show it was queued to) — `editing` means "was queued, now back with staff to revise," and is
  distinct from `draft` ("never queued"). An `editing` request is fully editable again and appears in
  the `Working` tab; adding it to a show again transitions it back to `active` (displayed with the
  derived `Queued` badge), never back to `draft`.
- `active`/`editing` → `completed` once every unit of the request's requested quantity has been
  allocated and printed.

`archived` is never used to mean printed — it remains a separate hide/cleanup action. None of these
transitions write to `designs.status`.

While a request has any active show allocation, its items and detail are read-only on the Print
Requests page; staff must remove it from the show (subject to the removal rule above) before editing.

---

# Custom Request Workflow (future)

Purpose:

Customer-submitted Q&A for custom designs with Etsy referral or in-house design path.

**Target phase:** Phase 9 (Fresh Prints Portal).

---

## Workflow

```txt
Customer completes Q&A form
     ↓
System generates Etsy search URL
     ↓
Customer finds DTF PNG on Etsy OR submits in-house custom request
     ↓
Optional $5–$10 design fee for in-house work (only payment workflow)
     ↓
Staff reviews in-house requests
```

**Not in scope:** Checkout for normal Print Requests; product payment; shipping.

---

# Legacy: Customer Request Workflow (superseded)

> **Superseded 2026-06-24.** The conflated "Customer Request" model mixed catalog print planning with custom design intake. Use **Print Request** (Phase 6) and **Custom Request** (Phase 9) instead. Existing `customerRequests` collection in DATA_MODEL.md maps to Custom Request planning only.

---

# Legacy: Show Queue Workflow (superseded)

> **Superseded 2026-06-24.** Renamed and reframed as **Print Run Workflow**. `showQueues` / `showQueueItems` in DATA_MODEL.md are legacy names for `printRuns` / `printRunItems`.

---

# Design Review Workflow (superseded)

> **Superseded 2026-06-24.** Merged into **AI Review Workflow**. Reviewer actions (rename, re-tag, approve, reject) occur in AI Review — not Design Library.

---

# Customer To Queue Workflow (superseded)

> **Superseded 2026-06-24.** Use Print Request → Print Run flow. Approved custom designs enter import pipeline; print planning uses Print Request Items.

---

# Customer Request Workflow (archived — do not implement as written)

> Historical content removed 2026-06-24. See **Print Request Workflow**, **Custom Request Workflow**, and `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`.

---

# Pensacola Production File Export Workflow

Purpose:

Export original production assets for gang sheet software. **Not shipping or fulfillment.**

---

## Workflow

```txt
Print Run selected
      ↓
Download Originals (from Print Run Items)
      ↓
Save To Local Folder
      ↓
Gang Sheet Software
      ↓
Print (physical production — outside Fresh Prints)
```

---

## Pensacola PC Responsibilities

The Pensacola PC should:

* View queues
* Download originals
* Export production assets

The Pensacola PC is the production machine.

---

## Remote Helper Responsibilities

Remote helpers may:

* Upload designs
* Tag designs
* Categorize designs
* Build queues

Remote helpers do not require access to local Pensacola folders.

---

# Download Workflow

Purpose:

Retrieve original production assets.

---

## Workflow

```txt
Select Queue
      ↓
Get Queue Items
      ↓
Get Storage Paths
      ↓
Download Originals
      ↓
Save To Local Folder
```

---

## Download Requirements

Validate:

* User permissions
* File existence
* Storage path validity

---

# Search Workflow

Purpose:

Locate designs quickly.

---

## Search Inputs (Design Library — catalog)

Support:

* Title
* Description
* Tags
* Category
* Archived visibility

**Moved to AI Review (Phase 5):** operational status, AI review status.

**Moved to Print Requests (Phase 6):** customer-scoped search.

---

## Search Flow

```txt
Search Input
      ↓
Filter Construction
      ↓
Firestore Query
      ↓
Results
```

---

# Bulk Import Workflow

Purpose:

Process large batches efficiently.

---

## Workflow

```txt
ZIP Import
    ↓
Validation
    ↓
Batch Upload
    ↓
Batch Firestore Creation
    ↓
Batch AI Processing
```

---

## Requirements

Use:

* Batch writes
* Progress tracking
* Failure reporting

---

# Audit Workflow

Purpose:

Track critical actions.

---

## Log Events

Examples:

```txt
Design Imported
Design Updated
Queue Created
Queue Modified
Request Approved
Role Changed
```

---

## Audit Flow

```txt
Action Occurs
      ↓
Audit Record Created
      ↓
Stored In Firestore
```

Audit logs should never be editable.

---

# Failure Handling Workflow

Every workflow must support:

```txt
Success
Failure
Recovery
```

---

## Failure Requirements

Capture:

* Error
* Timestamp
* User
* Operation

Display useful messages.

Avoid generic:

```txt
Something went wrong
```

messages.

---

# Workflow Checklist

Before implementing a workflow:

* Statuses defined
* Entry point defined
* Exit point defined
* Failure path defined
* Recovery path defined
* Permissions checked
* Audit logging considered
* User feedback included

Every major feature should map to a documented workflow before implementation.
