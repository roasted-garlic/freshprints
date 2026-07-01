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
* **Staff-controlled AI queue** — import does not call OpenAI; Processing tab **Start AI** / **Process image with AI** runs one design at a time; **Auto advance** toggle (session) switches batch vs manual stepping.
* **Processing overrides** — the settings icon beside Auto advance lets staff choose a per-session model and reasoning effort without changing Settings defaults.
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
| Production | OpenAI vision (saved model from `settings/aiEnrichment`; default `gpt-5.4-nano-2026-03-17`) when `OPENAI_API_KEY` is set |

Import completion UI links to **AI Processing** (`/ai-review`). Staff start AI from the Processing tab when ready.

### Vision model selection (2026-06-25)

| Location | Who | Behavior |
|----------|-----|----------|
| **Settings** (`/settings`) | Owner/admin | Default vision model, default reasoning effort, tag exclusions, and one-off AI playground. The AI Processing prompt block is owner-only. |
| **AI Processing** controls | Staff with processing access | Settings icon beside Auto advance applies a Processing-only model/reasoning override; manual processing uses current override/default; Auto advance snapshots it at start |
| **AI Review re-run** | Staff with re-run permission | Sends the design back to Processing for a fresh staff-started AI run |
| Per design | — | `aiSuggestions.model` records model used for that run |

Allowed models (server allowlist): `gpt-5.4-nano-2026-03-17` (default), `gpt-5-nano-2025-08-07`, `gpt-5.4-mini-2026-03-17`. Missing or invalid stored value falls back to default.

Allowed reasoning-effort values: `none`, `minimal`, `low`, `medium`, `high`. Saved default is `medium`; request-path compatibility fallback is `low`.

**Tag exclusions and approved taxonomy context:** Built-in list in code (`BASE_AI_TAG_EXCLUSIONS`) plus optional `additionalTagExclusions` in Settings. The server replaces `{{approved_categories}}` with active category names and descriptions, `{{approved_tags}}` with approved tag names, aliases, and preferred-when guidance, and `{{excluded_tags}}` with the effective exclusion list before the OpenAI call. Tags are filtered again after parsing.

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
* **Sequential direct processing (2026-06-29):** `enqueueAiEnrichment` now runs the existing AI pipeline directly inside the callable with `timeoutSeconds: 180` and `memory: 512MiB`. Client still processes one design at a time. OpenAI calls retry up to 2 times on 429/5xx. Stale active stages (>10 min) may still be restarted via the callable.
* **Prompt contract v17+template (updated 2026-06-30):** OpenAI AI Processing uses the saved Settings prompt template, with `{{approved_categories}}`, `{{approved_tags}}`, and `{{excluded_tags}}` replaced server-side. It requests `description`, one approved `category`, `title`, up to 8 approved tag names, strict visible-text extraction into the description when readable text exists, and optional complete `suggestedNewTags` objects. Stored `aiSuggestions.promptVersion` remains `catalog-enrich-openai-v17`.
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
Open Design Library request-selection mode
     ↓
Select approved catalog designs and quantities
     ↓
Save Print Request Items (design + quantity + size snapshot)
     ↓
Items tracked: pending → printed → done
```

---

## Rules

* Only `status: ready` designs may be added.
* Print Request is not payment, checkout, or shipping.
* Staff may create requests for registered customers, guest customers, or internal lists.
* Owner/admin staff create registered customers from `/users`, then select those existing customers when creating registered customer Print Requests.
* Registered customers created in Phase 6 are `customers` documents with `isGuest: false`; they do not create Firebase Auth users, Portal login, or Studio access.
* Request item status lives on `printRequestItems`, not on design documents.
* Design lifecycle status remains catalog-only; Print Requests must not write `queued`, `printed`, `pending`, or `done` to `designs.status`.
* `requestCount` and `lastRequestedAt` may increment on item add as lightweight request reference metadata. These fields do not imply production status and do not create Phase 10 analytics dashboards.
* Current Phase 6 foundation uses broad reads for request collections; add Firestore indexes when server-side request queries are introduced.

---

# Print Run Workflow (Upcoming Show)

Purpose:

Group print requests for an upcoming live show or batch production run. **Not shipping or fulfillment.**

**Target phase:** Phase 7.

---

## Workflow

```txt
Create Print Run (e.g. Tuesday Night Whatnot Show)
     ↓
Attach Print Requests or individual items
     ↓
Print Run Items track production status
     ↓
Mark items printed / done
     ↓
Export originals for Pensacola gang sheets (optional)
```

---

## Print Run status flow

```txt
Draft → Active → Completed → Archived
```

Production status (`queued`, `in_progress`, `printed`, `done`) lives on **Print Run Items** and **Print Request Items** — not on designs.

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
