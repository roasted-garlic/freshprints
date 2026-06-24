# Fresh Prints Workflows

## Purpose

This document defines the operational workflows used throughout the Fresh Prints platform.

This document is the source of truth for:

* Design Import Workflow
* ZIP Processing Workflow
* AI Processing Workflow
* Customer Request Workflow
* Show Queue Workflow
* Design Lifecycle Workflow
* Manual Design Catalog Workflow (Phase 2C)
* Pensacola Production Workflow
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

# Manual Design Catalog Workflow (Phase 2C)

Phase 2C originally let staff create catalog records manually during development testing. After Phase 3C, **new designs originate from the import pipeline** — manual create UI was removed from the Design Library. Staff still edit, archive, restore, and manage categories for existing records.

```txt
Design Library page
   ↓
Search / filter designs (client-side search + Firestore list query)
   ↓
Design details modal → Edit modal → designService.updateDesign → reload list
   ↓
Design details modal → Archive confirm → designService.archiveDesign (captures previousStatus, archivedAt, archivedBy; status: archived) → reload list
   ↓
Categories (header) → category management modal → categoryService create/edit/archive → reload categories + designs
```

Import pipeline (Phase 3A–3C) creates designs via `designService.createDesign` during upload orchestration — not through the Design Library UI.

Rules:

* All staff (`owner`, `admin`, `helper`) may edit and archive designs.
* Only `owner` and `admin` may create, edit, or archive categories.
* Helpers may view categories and assign an existing active category when editing a design.
* Tags are normalized (lowercase, deduped) before save.
* Optional fields are omitted from Firestore documents when empty.
* Archiving a design sets `status: "archived"` and stores `previousStatus`, `archivedAt`, and `archivedBy`; archiving a category sets `isActive: false`.
* Staff view archived designs via the Design Library **Status** filter (`Archived`).
* Staff view archived categories via **Archived** inside the category management modal, then **Back** to return to active categories.
* Restore uses `designService.restoreDesign` (restores `previousStatus`, clears archive metadata) and `categoryService.restoreCategory` (`isActive: true`). Legacy archived designs without `previousStatus` fall back to `imported`, or `ready` when `aiReviewed` is true. Permanent delete is not implemented.
* After mutations, the design list and category pickers refresh while preserving the current search/filter state when reasonable.

---

# Design Lifecycle Workflow

Every design follows a lifecycle.

```txt
Imported
   ↓
Processing
   ↓
Ready
   ↓
Queued
   ↓
Printed
   ↓
Archived
```

Rejected designs follow:

```txt
Imported
   ↓
Processing
   ↓
Rejected
```

Status values must match DATA_MODEL.md.

Phase 2C adds a manual entry path for testing:

```txt
Manual create (staff)
   ↓
Ready (default)
   ↓
Archived (manual archive action)
```

Import, processing, queue, and print transitions remain deferred to later phases.

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
Design appears in Design Library (filter by Imported status)
```

If Firestore create fails after a successful Storage upload, orchestration deletes the uploaded original. If cleanup delete fails, the UI shows a warning and logs the failure without crashing.

Phase 3A-2 validation warnings (missing DPI metadata) are informational when print-size assessment passes.

**Phase 3D Step 3 (import wiring):** Main-process PNG validation runs pixel-based print-size assessment. Imports persist `printWidthInches`, `printHeightInches`, `effectiveDpi`, `metadataDpiX`/`metadataDpiY`, and related fields via `designService.createDesign`. Original PNG bytes are not rewritten.

**Phase 3D Step 3 correction (acceptance tiers):** Rejection applies only below **3.5″** width at 300 DPI. Images between 3.5″ and 8″ import as **small-format** with a stronger warning (patches, pocket prints, logos). Images between 8″ and 10″ import with a standard apparel warning. Images ≥ 10″ import without size warnings. Upscaling is not implemented in this step.

**Phase 3D Step 4 (Edit Design print size):** Staff edit production print dimensions from the Edit Design modal. Pixel dimensions remain read-only. Effective DPI is derived live from pixels ÷ print size and persisted on save with `printSizeSource: "staff_edited"`. Original PNGs and derivatives are not regenerated. Effective DPI quality tiers are informational only and do not block save.

**Phase 3D Step 5 (AI review foundation):** `aiReviewStatus` tracks review outcome separately from operational `status`. Imports remain `status: imported` with `aiReviewed: false`. `designAiReviewService` exposes `markAiReviewPending`, `markAiReviewApproved`, `markAiReviewRejected`, and `markAiReviewNeedsReview` for future automation and staff override — no provider calls, no queue processing, and no automatic `ready` transitions in this step.

**Phase 3D Step 6 (catalog status cleanup):** `queued` and `printed` are deprecated on design documents. Design Library filters and Edit Design status dropdowns use catalog statuses only. Imports persist `status: imported`, `aiReviewStatus: pending`, `aiReviewed: false`. `catalogApprovalService` coordinates approval (`ready` + `aiReviewStatus: approved`) and rejection (`rejected` + `aiReviewStatus: rejected`) — owner/admin only; no UI buttons yet. Production workflow will use `showQueueItems` in Phase 6.

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

* Edit Design — system fields read-only; status editable by owner/admin only (`permissionService.canEditDesignStatus`)
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

# Batch Folder Import Workflow (Phase 3B — folder discovery)

Desktop staff can select a folder in one batch session. The main process recursively scans for `.png` files, validates each candidate, and emits progress events. The renderer supplies only `jobId` and `sourceType` when starting discovery — the folder path is read from `importBatchSession` at picker time.

## Implemented steps (Phase 3B Step 4)

```txt
Select folder (Electron directory picker)
    ↓
Main registers folderPath in batch session (jobId returned to renderer)
    ↓
startBatchDiscovery({ jobId, sourceType: "folder" })
    ↓
Main reads folderPath from batch session (not from renderer)
    ↓
Recursive scan (PNG-only, ignore non-PNG, skip symlinks)
    ↓
For each PNG: validatePngFile (extension, size, magic bytes, dimensions, DPI warnings)
    ↓
batch-progress events (discovering → validating → complete)
    ↓
batch-discovery-complete (manifest + rejections + counts + truncated flag)
```

### Scan rules

* Non-PNG files are ignored (not counted as rejections)
* Symlinks are not followed
* Ignored directory names: `.git`, `node_modules`, `$RECYCLE.BIN`, `System Volume Information`
* Limits: `MAX_FOLDER_DEPTH` (12), `MAX_FOLDER_SCAN_ENTRIES` (10,000), `MAX_BATCH_FILES` (100)
* When a limit is exceeded, discovery stops gracefully with `truncated: true`

### Cancellation

`cancelBatchJob` during folder scan or validation sets a cancel flag. The runner stops at the next checkpoint, emits `batch-discovery-complete` with `canceled: true`, and clears the session.

Upload, Firestore create, and ZIP extraction are **not** implemented in this step.

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
Select ZIP (Electron file picker, 200 MB cap)
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
* Limits: `MAX_ZIP_SIZE_BYTES` (200 MB), `MAX_EXTRACTED_BYTES` (500 MB), `MAX_ZIP_ENTRIES` (500), `MAX_ZIP_COMPRESSION_RATIO` (100:1), `MAX_BATCH_FILES` (100)
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
* Completed summary with Design Library link (`status=imported`)
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

# AI Processing Workflow

Purpose:

Automatically enrich imported designs.

---

## Workflow

```txt
Design Imported
     ↓
AI Title Generation
     ↓
AI Description Generation
     ↓
AI Tag Generation
     ↓
AI Category Suggestion
     ↓
Duplicate Detection
     ↓
Review Required
```

---

## AI Rules

AI should suggest.

AI should not automatically publish.

Human review remains required.

---

## AI Metadata

Store separately from human data.

Do not overwrite human-reviewed fields.

---

## AI Review Workflow

```txt
AI Generated
     ↓
Admin Reviews
     ↓
Approve
     ↓
Save
```

or

```txt
AI Generated
     ↓
Admin Edits
     ↓
Save
```

---

# Customer Request Workflow

Purpose:

Allow customers to request designs.

---

## Request Types

### Description Request

Customer submits:

```txt
Text Description
```

Example:

```txt
Funny Jeep Duck Design
```

---

### Upload Request

Customer submits:

```txt
Image Upload
```

---

## Workflow

```txt
Customer Submission
        ↓
Submitted
        ↓
Reviewing
        ↓
Approved / Rejected
        ↓
Fulfilled
```

---

## Submitted

Request enters:

```txt
submitted
```

status.

---

## Reviewing

Admin or helper reviews request.

Status:

```txt
reviewing
```

---

## Approved

Request is approved.

Status:

```txt
approved
```

---

## Rejected

Request is rejected.

Status:

```txt
rejected
```

Optional review notes should be recorded.

---

## Fulfilled

Request becomes a completed design.

Status:

```txt
fulfilled
```

---

# Design Review Workflow

Purpose:

Review imported designs.

---

## Workflow

```txt
Ready
   ↓
Review
   ↓
Approve
```

or

```txt
Ready
   ↓
Review
   ↓
Reject
```

---

## Review Tasks

Reviewer may:

* Rename
* Re-tag
* Re-categorize
* Reject
* Queue

---

# Show Queue Workflow

Purpose:

Prepare inventory for upcoming Whatnot shows.

---

## Workflow

```txt
Select Design
      ↓
Assign Customer
      ↓
Add To Queue
      ↓
Queue Review
      ↓
Production
```

---

## Queue Creation

Admin creates:

```txt
Show Queue
```

Example:

```txt
Tuesday Night Whatnot Show
```

---

## Queue Item Creation

Each design becomes:

```txt
Show Queue Item
```

---

## Queue Item Data

Queue item may contain:

* Design
* Customer Name
* Notes
* Status
* Position

---

## Queue Status Flow

```txt
Draft
   ↓
Active
   ↓
Completed
   ↓
Archived
```

---

# Customer To Queue Workflow

Purpose:

Connect customer requests to production.

---

## Workflow

```txt
Customer Request
        ↓
Approved
        ↓
Design Created
        ↓
Added To Queue
        ↓
Printed
```

---

# Pensacola Production Workflow

Purpose:

Prepare files for gang sheet building.

---

## Workflow

```txt
Queue Selected
      ↓
Download Originals
      ↓
Save To Folder
      ↓
Gang Sheet Software
      ↓
Print
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

## Search Inputs

Support:

* Title
* Tags
* Category
* Customer
* Status
* Date

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
