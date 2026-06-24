# Phase 3B Implementation Plan — Batch Import Sources

## Document status

| Field | Value |
| --- | --- |
| **Phase** | 3B — Batch sources (folder + ZIP + multi-select) |
| **Status** | Approved for implementation |
| **Prerequisite** | Phase 3A complete (`docs/reviews/phase-3a-final-signoff.md`) |
| **Parent plan** | `docs/plans/import-pipeline-plan.md` |
| **Plan review** | `docs/reviews/phase-3b-plan-review.md` (modifications applied 2026-06-20) |
| **Out of scope (3C)** | Thumbnail/preview generation, strict DPI rejection, `ready` status transition, resumable uploads, per-file retry |

**Goal:** Staff with `importDesigns` permission can import many PNGs from **multiple file selection**, **folder scan**, or **ZIP extraction** with visible progress, per-file outcomes, and an accurate batch summary — reusing the Phase 3A single-file upload + Firestore create pipeline.

---

## 1. Scope

### 1.1 In scope

| Capability | Description |
| --- | --- |
| **Multiple PNG selection** | Native multi-select file dialog; all selected `.png` files enter one batch job |
| **Folder import** | User selects a root folder; main process recursively discovers `.png` files |
| **ZIP import** | User selects one `.zip`; main process extracts PNG candidates to a managed temp directory |
| **Batch processing** | Process discovered candidates through validate → upload → Firestore create |
| **Progress tracking** | Overall job progress, current file, success/failure/skipped/rejected counts |
| **Batch reporting** | Final summary with per-file rows and aggregate counts |

### 1.2 Explicit exclusions (defer to 3C / Phase 7)

* Thumbnail and preview WebP generation
* Strict DPI / dimension **rejection** (3A warns only; 3B continues warning, does not hard-reject unless business confirms before 3C)
* AI naming, tagging, categorization
* Customer website import
* Cloud Functions orchestration
* Persisting import jobs across app restarts
* `importBatchId` on Firestore `Design` documents (job context stays in UI/session only)
* Export/copy rejection report (optional 3C polish)
* Per-file retry for failed uploads or Firestore creates (3C)

### 1.3 Success criteria

* Staff can start a batch from files, folder, or ZIP on the Imports page
* Mixed non-PNG content in folders/ZIPs is **skipped** (counted, not errored)
* Invalid PNG candidates are **rejected** with reason codes (no Storage/Firestore writes)
* Valid PNGs create `status: "imported"` designs via `designService.createDesign`
* Partial batch success is supported and reported accurately
* Cancel stops further work without corrupting completed imports
* Malicious ZIP paths (Zip Slip) are blocked safely

### 1.4 Phase 3A foundation to reuse (do not reimplement)

| Asset | Location |
| --- | --- |
| Preload namespace | `window.freshPrints.imports` (`electron/preload.ts`) |
| IPC allowlist pattern | `electron/ipc/import/importIpcChannels.ts` |
| Shared DTOs | `shared/types/import/importIpc.types.ts` |
| Session path registry | `electron/ipc/import/importFileSession.ts` (single-file; keep) |
| Dialog + batch session registry | `electron/ipc/import/importDialogRegistry.ts`, `importBatchSession.ts` (new) |
| PNG validation | `electron/ipc/import/pngValidator.ts` (**already exists from 3A** — extend, do not rebuild) |
| Byte read | `electron/ipc/import/readSelectedPngFileBytes.ts` (extend for batch-session paths) |
| Upload + create + rollback | `importOrchestrationService.uploadValidatedPng` |
| Storage paths | `features/designs/constants/designStoragePaths.ts` |
| Validation constants | `shared/constants/importValidation.constants.ts` |

---

## 2. Architecture

### 2.1 Layer responsibilities

```txt
┌─────────────────────────────────────────────────────────────────┐
│ Renderer (React)                                                │
│  ImportsPage, ImportBatchPanel, ImportFileResultList            │
│  useBatchImport (hook) — job UI state, cancel, progress merge   │
│  importBatchOrchestrationService — upload queue, Firestore      │
│  importOrchestrationService — per-file uploadValidatedPng       │
│  importDesktopService — typed preload wrapper                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ window.freshPrints.imports
┌───────────────────────────▼─────────────────────────────────────┐
│ Preload                                                         │
│  invoke: new batch discovery/cancel channels                    │
│  on/off: progress + complete event subscriptions (allowlisted)  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ipcMain / webContents.send
┌───────────────────────────▼─────────────────────────────────────┐
│ Main process                                                    │
│  importIpcHandlers — validate inputs, route to services         │
│  importBatchSession — job-scoped path allowlist                 │
│  importJobRunner — orchestrate discovery + validation loop      │
│  folderScanner, zipExtractor, tempDirectoryService              │
│  pngValidator (extend existing 3A module)                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Main process responsibilities

| Responsibility | Owner |
| --- | --- |
| Native dialogs (multi-file, folder, ZIP) | `electron/ipc/import/select*.ts` handlers |
| Recursive folder walk | `electron/services/import/folderScanner.ts` |
| ZIP extraction with Zip Slip protection | `electron/services/import/zipExtractor.ts` |
| Temp directory create/delete | `electron/services/import/tempDirectoryService.ts` |
| PNG magic-byte + dimension/DPI probe | `electron/services/import/pngValidator.ts` |
| Job-scoped path registration | `electron/ipc/import/importBatchSession.ts` |
| Discovery + per-file validation loop | `electron/services/import/importJobRunner.ts` |
| Emit discovery/validation progress events | `importJobRunner` via `webContents.send` |
| Honor cancel flag between files | `importJobRunner` |
| **Never** Firebase, Firestore, or React | — |

### 2.3 Preload responsibilities

| Responsibility | Owner |
| --- | --- |
| Expose only allowlisted `invoke` channels | `electron/preload.ts` |
| Expose `onBatchImportProgress` / `onBatchDiscoveryComplete` / `onBatchJobError` with channel validation | `electron/preload.ts` |
| Expose `finishBatchJob(jobId)` invoke wrapper | `electron/preload.ts` |
| Return `ImportIpcResult<T>` for all invoke methods | Match 3A contract |
| Unsubscribe helpers (`removeListener`) to avoid leaks | Preload API |
| **Never** expose `fs`, `path`, raw `ipcRenderer`, or arbitrary channel strings from renderer | — |

### 2.4 Renderer responsibilities

| Responsibility | Owner |
| --- | --- |
| Imports page layout and batch UX | `features/imports/pages/ImportsPage.tsx` |
| Source action buttons | `ImportSourceActions.tsx` |
| Progress bar, counts, file table | `ImportBatchProgressPanel.tsx`, `ImportFileResultList.tsx` |
| Coordinate discovery IPC → upload queue | `importBatchOrchestrationService.ts` |
| Per-file upload + `createDesign` | `importOrchestrationService` (refactored shared helper) |
| Firebase Storage upload | `importUploadService.ts` |
| Permission gate (`canImportDesigns`) | Existing `permissionService` + route guard |
| **Never** direct filesystem, ZIP, or folder access | — |

### 2.5 Service boundaries

| Service | Layer | Does | Does not |
| --- | --- | --- | --- |
| `folderScanner` | Main | Walk tree, apply ignore rules, return candidates | Validate PNG structure |
| `zipExtractor` | Main | Extract `.png` entries to temp root | Upload or create designs |
| `importJobRunner` | Main | Discover, validate, register paths, emit progress | Call Firebase |
| `importBatchOrchestrationService` | Renderer | Run upload queue with concurrency; build batch report | Read ZIP or scan folders |
| `importOrchestrationService` | Renderer | Single-file upload + create + rollback | Batch discovery |
| `importDesktopService` | Renderer | Preload IPC wrapper | Business rules |
| `importUploadService` | Renderer | Storage put/delete | Firestore |
| `designService` | Renderer | `generateDesignId`, `createDesign` | Local files |

### 2.6 Hook boundaries

| Hook | Owns | Delegates to |
| --- | --- | --- |
| `useSinglePngImport` | Single-file validate → preview → upload UX (unchanged) | `importOrchestrationService`, `importDesktopService` |
| `useBatchImport` (new) | Batch job state machine, progress merge, cancel `AbortSignal`, final summary | `importBatchOrchestrationService`, `importDesktopService` |

**Hook rules (per `docs/AI_RULES.md`):**

* `useBatchImport` coordinates state and subscriptions; it does not contain ZIP logic or Firebase calls directly
* Progress from main (discovery/validation) and renderer (upload/create) merge into one `BatchImportJobState` in the hook

### 2.7 Session mutual exclusion (locked)

Phase 3B uses **mutual exclusion** between single-file and batch import sessions. This is the simpler, safer approach — no unified registry refactor required.

| Rule | Enforcement |
| --- | --- |
| Batch job `running` | Block all single-file actions (`select-single-png`, validate, preview, upload) |
| Single-file session active | Block batch source pickers and `start-batch-discovery` |
| `read-selected-png-bytes` | Allow if **single-file session validated** OR **batch session validated for `jobId`** |

**Single-file session active** means `importFileSession` has a registered path and the user has not cleared the result.

**Batch job `running`** means state between `start-batch-discovery` accepted and `finish-batch-job` completed (includes discovery, validation, upload, and Firestore create).

UI: disable the inactive section's controls with a short message (e.g. "Finish or cancel the batch import first").

Main process: IPC handlers return `ImportIpcResult` failure with `INVALID_INPUT` when the wrong session mode is active.

### 2.8 Dialog-origin path registration (locked)

Per `docs/SECURITY.md` — never trust renderer-supplied paths.

All filesystem paths must be registered in the **main process** when the native dialog returns:

| Dialog | Registration action |
| --- | --- |
| `select-multiple-png` | Register each selected file path in `importDialogRegistry` |
| `select-import-folder` | Register `folderPath` root in `importDialogRegistry` |
| `select-import-zip` | Register `zipFilePath` in `importDialogRegistry` |

`start-batch-discovery` validates that any paths in the request match the dialog registry for the calling `webContents`. Reject arbitrary or stale paths with `INVALID_INPUT`.

The renderer may cache paths for UI display only; the main process is authoritative.

### 2.9 Target folder structure

```txt
electron/
├── ipc/import/
│   ├── importIpcChannels.ts          (extend allowlist)
│   ├── importIpcHandlers.ts          (register new handlers)
│   ├── importFileSession.ts          (keep for 3A single-file)
│   ├── importDialogRegistry.ts       (new — dialog-origin paths)
│   ├── importBatchSession.ts         (new — job-scoped validated paths)
│   ├── selectMultiplePngFiles.ts
│   ├── selectImportFolder.ts
│   ├── selectImportZipFile.ts
│   ├── cancelBatchImportJob.ts
│   └── finishBatchImportJob.ts
└── services/import/
    ├── importJobRunner.ts
    ├── folderScanner.ts
    ├── zipExtractor.ts
    └── tempDirectoryService.ts
    (pngValidator.ts remains in electron/ipc/import/ — extend in place)

src/renderer/src/features/imports/
├── components/
│   ├── ImportSourceActions.tsx
│   ├── ImportBatchProgressPanel.tsx
│   ├── ImportFileResultList.tsx
│   └── ImportBatchSummary.tsx
├── hooks/
│   ├── useSinglePngImport.ts         (unchanged behavior)
│   └── useBatchImport.ts
├── services/
│   ├── importBatchOrchestrationService.ts
│   ├── importOrchestrationService.ts (extract shared per-file fn)
│   └── importDesktopService.ts       (extend)
├── types/
│   └── batchImport.types.ts
└── constants/
    └── batchImport.constants.ts      (renderer display; mirror shared limits)

shared/
├── constants/import/
│   └── batchImportLimits.constants.ts
└── types/import/
    ├── importIpc.types.ts            (extend)
    └── batchImport.types.ts          (shared job DTOs)
```

---

## 3. IPC Design

### 3.1 Design principles

1. **Invoke for commands** — selection, start discovery, cancel, finish job, byte read (existing)
2. **Push events for progress** — main → renderer via `webContents.send` on allowlisted channels
3. **Structured results** — all invoke handlers return `ImportIpcResult<T>`; events carry typed payloads
4. **Dialog-origin paths** — folder, ZIP, and multi-select paths registered in main at picker time; `start-batch-discovery` rejects unregistered paths
5. **Session-scoped paths** — byte read accepts single-file session validated paths OR batch session validated paths for active `jobId`
6. **Session mutual exclusion** — single-file and batch modes cannot run concurrently (Section 2.7)
7. **No large buffers in progress events** — progress carries metadata only; bytes read via existing `read-selected-png-bytes`

### 3.2 New invoke channels

| Channel | Purpose |
| --- | --- |
| `fresh-prints:import:select-multiple-png` | Multi-select PNG dialog; registers each path in `importDialogRegistry` |
| `fresh-prints:import:select-import-folder` | Directory picker; registers `folderPath` in `importDialogRegistry` |
| `fresh-prints:import:select-import-zip` | ZIP file picker; registers `zipFilePath` in `importDialogRegistry` |
| `fresh-prints:import:start-batch-discovery` | Begin discovery + validation; paths must match `importDialogRegistry` |
| `fresh-prints:import:cancel-batch-job` | Set cancel flag for `jobId` |
| `fresh-prints:import:finish-batch-job` | Renderer signals upload + Firestore create complete; main deletes ZIP temp dir and clears `importBatchSession` |

**`finish-batch-job` cleanup responsibilities:**

* Delete `{temp}/fresh-prints-imports/{jobId}/` when the job used ZIP extraction
* Clear `importBatchSession` entries for `jobId`
* Release batch job lock (allows single-file import again)
* Must be invoked on **all** exit paths: success, cancel, fatal upload abandonment, and best-effort on window close

**Retained from 3A:**

| Channel | Batch usage |
| --- | --- |
| `fresh-prints:import:read-selected-png-bytes` | Per validated file during upload; path must pass unified session gate (Section 2.7) |
| `fresh-prints:import:validate-selected-png` | Single-file only; blocked while batch job running |

**Unchanged for single-file flow:**

| Channel | Notes |
| --- | --- |
| `fresh-prints:import:select-single-png` | Keep 3A UX section on Imports page |
| `fresh-prints:import:get-selected-png-preview` | Single-file preview only |

### 3.3 Push event channels (main → renderer)

| Channel | When fired |
| --- | --- |
| `fresh-prints:import:batch-progress` | During discovery, validation, and optionally mirrored upload progress |
| `fresh-prints:import:batch-discovery-complete` | Discovery + validation finished; includes file manifest |
| `fresh-prints:import:batch-job-error` | Fatal job error (corrupt ZIP, scan failure) |

Preload wraps these with:

```ts
onBatchImportProgress(callback): () => void
onBatchDiscoveryComplete(callback): () => void
onBatchJobError(callback): () => void
```

Push event channels must be added to the allowlist in `importIpcChannels.ts` (mirror invoke allowlist pattern with `isAllowedImportEventChannel`).

### 3.4 Request / response DTOs

#### `SelectMultiplePngFilesResult`

```ts
interface SelectMultiplePngFilesResult {
  canceled: boolean;
  files?: SelectedPngFile[];
}
```

#### `SelectImportFolderResult`

```ts
interface SelectImportFolderResult {
  canceled: boolean;
  folderPath?: string;
  folderName?: string;
}
```

#### `SelectImportZipFileResult`

```ts
interface SelectImportZipFileResult {
  canceled: boolean;
  file?: {
    filePath: string;
    fileName: string;
    fileSizeBytes: number;
  };
}
```

#### `StartBatchDiscoveryRequest`

```ts
type BatchImportSourceType = "multiple-png" | "folder" | "zip";

interface StartBatchDiscoveryRequest {
  jobId: string;               // returned by batch picker in main process
  sourceType: BatchImportSourceType;
}
```

Handler validates `jobId` + `sourceType` against the main-process session registry. Selected paths are read from the session in main — not accepted from the renderer.

#### `StartBatchDiscoveryResult`

```ts
interface StartBatchDiscoveryResult {
  jobId: string;
  accepted: boolean;           // false if limits exceeded upfront
  message?: string;
}
```

Discovery runs asynchronously after `accepted: true`; completion arrives on `batch-discovery-complete`.

#### `BatchDiscoveryCompleteEvent`

```ts
interface BatchDiscoveryCompleteEvent {
  jobId: string;
  canceled: boolean;
  truncated: boolean;            // true if MAX_BATCH_FILES cap hit
  summary: {
    discovered: number;
    skipped: number;
    rejected: number;
    validated: number;
  };
  files: BatchImportFileManifestEntry[];
}

interface BatchImportFileManifestEntry {
  filePath: string;              // absolute; registered in batch session
  displayName: string;           // fileName or zip-relative path for UI
  relativePath?: string;
  fileSizeBytes: number;
  outcome: "validated" | "rejected" | "skipped";
  validation?: ValidateSelectedPngFileResult;
  rejection?: ImportFileRejection;
  skipReason?: string;
}
```

#### `ImportFileRejection`

```ts
interface ImportFileRejection {
  reasonCode:
    | "INVALID_PNG"
    | "FILE_TOO_LARGE"
    | "FILE_NOT_FOUND"
    | "READ_ERROR"
    | "DPI_TOO_LOW"              // reserved for 3C hard reject
    | "DIMENSION_OUT_OF_BOUNDS"; // reserved for 3C
  message: string;
  details?: { width?: number; height?: number; dpi?: number };
}
```

#### `CancelBatchImportJobRequest`

```ts
interface CancelBatchImportJobRequest {
  jobId: string;
}
```

#### `FinishBatchImportJobRequest`

```ts
interface FinishBatchImportJobRequest {
  jobId: string;
}
```

#### `FinishBatchImportJobResult`

```ts
interface FinishBatchImportJobResult {
  jobId: string;
  tempDirDeleted: boolean;
  sessionCleared: boolean;
}
```

#### `BatchImportProgressEvent`

```ts
type BatchImportPhase =
  | "discovering"
  | "validating"
  | "uploading"
  | "creating"
  | "complete";

type BatchImportFileStatus =
  | "pending"
  | "running"
  | "success"
  | "rejected"
  | "failed"
  | "skipped"
  | "cancelled";

interface BatchImportProgressEvent {
  jobId: string;
  phase: BatchImportPhase;
  fileIndex: number;             // 1-based for display
  fileTotal: number;
  currentFileName: string;
  status: BatchImportFileStatus;
  message?: string;
  counts: {
    success: number;
    failed: number;
    rejected: number;
    skipped: number;
  };
}
```

#### `BatchImportFinalReport` (renderer-assembled)

```ts
interface BatchImportFinalReport {
  jobId: string;
  sourceType: BatchImportSourceType;
  startedAt: string;
  completedAt: string;
  canceled: boolean;
  totals: {
    discovered: number;
    imported: number;
    failed: number;
    rejected: number;
    skipped: number;
  };
  files: BatchImportFileResult[];
}

interface BatchImportFileResult {
  displayName: string;
  outcome: "imported" | "failed" | "rejected" | "skipped" | "cancelled";
  designId?: string;
  designTitle?: string;
  message?: string;
  warnings?: ImportPngWarning[];
}
```

### 3.5 Progress event architecture

```txt
Renderer                          Main                         Renderer
───────                          ────                         ────────
generate jobId
startBatchDiscovery ──────────► importJobRunner
                                  scan / extract
onBatchImportProgress ◄──────── emit (discovering)
                                  validate each file
onBatchImportProgress ◄──────── emit (validating)
onBatchDiscoveryComplete ◄────── manifest + session register
importBatchOrchestrationService
  upload queue (2 concurrent)
  emit progress (uploading/creating) locally in hook
  readSelectedPngFileBytes ───► (per file, unified session gate)
  upload + createDesign
finishBatchJob(jobId) ────────► delete ZIP temp dir + clear batch session
final BatchImportFinalReport in UI
```

**Upload progress:** Emitted from renderer (`importBatchOrchestrationService` / `useBatchImport`) because Firebase runs in renderer. Main does not know upload percent. Hook merges main validation progress with renderer upload progress under the same `jobId`.

---

## 4. Folder Import Strategy

### 4.1 Flow

```txt
User selects folder (dialog)
        ↓
register root path in importDialogRegistry
        ↓
start-batch-discovery validates folderPath against registry
        ↓
folderScanner.walk(rootPath)
        ↓
for each file: extension .png → candidate
else → skipped++
        ↓
importJobRunner validates candidates sequentially (or pool of 2)
        ↓
register each validated absolute path in importBatchSession
        ↓
return manifest to renderer
```

### 4.2 Recursive scanning

* **Algorithm:** Depth-first walk with explicit `MAX_FOLDER_DEPTH` (default: **12**)
* **Normalization:** `path.resolve` + `path.normalize` on all entries
* **Root jail:** Every discovered file path must satisfy `filePath.startsWith(normalizedRoot + path.sep)` (Windows: case-insensitive compare)
* **Deterministic order:** Sort candidates by relative path ascending before validation

### 4.3 File discovery rules

| Rule | Behavior |
| --- | --- |
| Extension | `.png` case-insensitive |
| Hidden files | Skip dotfiles (e.g. `.hidden.png` optional — default **include** if extension matches; skip dot-directories) |
| Ignore directories | `.git`, `node_modules`, `$RECYCLE.BIN`, `System Volume Information` |
| Symlinks | Do not follow symlinks that escape root (default: **skip** symlink entries) |
| Non-PNG files | Count as **skipped**, not rejected |

### 4.4 Limits

| Constant | Value | Action when exceeded |
| --- | --- | --- |
| `MAX_BATCH_FILES` | `100` | Stop discovery; set `truncated: true`; validate only first N |
| `MAX_FOLDER_DEPTH` | `12` | Skip deeper directories; increment skip count |
| `MAX_SINGLE_PNG_SIZE_BYTES` | `50 MB` | Reject candidate at validation |
| `MAX_FOLDER_SCAN_ENTRIES` | `10_000` | Abort scan with job error (filesystem bomb guard) |

Store in `shared/constants/import/batchImportLimits.constants.ts`.

### 4.5 Security considerations

* Folder path must be registered in `importDialogRegistry` when `select-import-folder` returns — `start-batch-discovery` rejects unregistered paths
* Never expose full local paths in customer-facing surfaces; staff batch UI shows `displayName` / relative path only
* Scan stays under user-selected root; no access to other drives or profile folders without dialog
* Log `jobId` + relative path in dev; avoid logging full paths in production analytics

---

## 5. ZIP Import Strategy

### 5.1 Extraction location

```txt
{app.getPath("temp")}/fresh-prints-imports/{jobId}/
```

* Created by `tempDirectoryService.createJobTempDir(jobId)`
* Unique per job; never reuse across jobs
* Parent `fresh-prints-imports` directory may be cleaned of stale dirs on app start (optional housekeeping)

### 5.2 Zip Slip protection

For each ZIP entry before write:

1. Reject absolute paths (`/`, `C:\`, leading `\\`)
2. Reject entries containing `..` path segments after normalization
3. `const target = path.resolve(tempRoot, entryName)`
4. Reject unless `target.startsWith(tempRoot + path.sep)` (or equals tempRoot for edge cases)
5. Reject directory entries used for traversal attacks
6. Extract only entries ending in `.png` (case-insensitive); others → skipped

### 5.3 Cleanup strategy (locked)

ZIP temp extraction files **remain on disk** through the renderer upload and Firestore create phases. Cleanup happens only via `finish-batch-job` after the renderer signals completion.

```txt
extract to temp
validate (read from temp paths)
register validated paths in importBatchSession
renderer uploads (reads bytes via IPC from temp paths)
renderer creates Firestore records
renderer calls finishBatchJob(jobId)
main deletes temp dir + clears importBatchSession
```

**Required on all exit paths:**

| Exit path | `finishBatchJob` | Temp delete |
| --- | --- | --- |
| Batch success | Yes | Yes |
| User cancel (after partial upload) | Yes | Yes |
| Fatal discovery error (ZIP corrupt) | N/A — main deletes temp immediately in handler | Yes |
| Window close / app quit | Best-effort invoke or stale-dir cleanup on next start | Yes |

Do **not** delete temp contents after validation and before upload. Folder and multi-select imports do not use temp dirs; only ZIP jobs create `{temp}/fresh-prints-imports/{jobId}/`.

### 5.4 Validation flow

```txt
1. Pre-check ZIP archive size ≤ MAX_ZIP_SIZE_BYTES
2. Verify magic bytes (PK\x03\x04 or empty archive handling)
3. Open streaming reader (prefer yauzl / unzipper — evaluate at implementation)
4. Count entries; abort if > MAX_ZIP_ENTRIES before extracting
5. Extract PNG entries only; track cumulative extracted bytes ≤ MAX_EXTRACTED_BYTES
6. Run validatePngFile (existing pngValidator.ts) on each candidate
7. Non-PNG entries in ZIP → skipped (not extracted when possible)
```

If cumulative extracted size exceeds `MAX_EXTRACTED_BYTES` during extraction, abort with `batch-job-error` (`ZIP_EXTRACTED_SIZE_EXCEEDED`). This is separate from archive size — it prevents ZIP bombs and excessive disk use even when the archive is under `MAX_ZIP_SIZE_BYTES`.

### 5.5 ZIP limits (locked)

| Constant | Value | Purpose |
| --- | --- | --- |
| `MAX_ZIP_SIZE_BYTES` | `200 MB` | Archive file size cap (compressed) |
| `MAX_EXTRACTED_BYTES` | `500 MB` | Cumulative uncompressed bytes during extraction |
| `MAX_ZIP_ENTRIES` | `500` | Entry count cap (zip bomb) |
| `MAX_ZIP_COMPRESSION_RATIO` | `100:1` | Abort suspicious archives during extraction |
| `MAX_BATCH_FILES` | `100` | PNG count cap after extract |

### 5.6 Dependency note

ZIP library required in main process only. Justify in PR: no native browser API; evaluate `yauzl` (streaming) vs `adm-zip` (simpler). Prefer streaming for size safety.

---

## 6. Batch Processing Pipeline

### 6.1 End-to-end pipeline

```txt
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Discovery   │───►│  Validation  │───►│   Upload     │───►│  Firestore   │───►│  Reporting   │
│  (main)      │    │  (main)      │    │  (renderer)  │    │  create      │    │  (renderer)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 6.2 Discovery (main)

| Source | Action |
| --- | --- |
| `multiple-png` | Use paths from multi-select dialog; verify each registered |
| `folder` | `folderScanner.scan(folderPath)` |
| `zip` | `zipExtractor.extract(zipPath, tempDir)` → PNG paths |

Output: raw candidate list with skip counts.

### 6.3 Validation (main)

For each PNG candidate:

1. Check `fileSizeBytes ≤ MAX_SINGLE_PNG_SIZE_BYTES`
2. Verify PNG magic bytes
3. Decode dimensions / DPI via `validatePngFile` in `pngValidator.ts` (existing 3A module)
4. Apply 3A warning rules (DPI missing / below target — warn, do not reject in 3B)
5. Mark path validated in `importBatchSession`
6. Emit `batch-progress` event

Rejected files: no session registration for upload; included in manifest as `rejected`.

### 6.4 Upload (renderer)

`importBatchOrchestrationService.processValidatedFiles`:

```txt
for each manifest entry where outcome === "validated":
  if abortSignal.aborted → mark remaining cancelled, break
  designId = generateDesignId()
  bytes = readSelectedPngFileBytes(filePath)  // IPC
  uploadOriginalPng(designId, bytes)
```

* Concurrency: **2** parallel uploads (configurable `UPLOAD_CONCURRENCY`)
* Use `Promise pool` or semaphore pattern in service
* Each success/failure updates hook state and per-file row

### 6.5 Firestore create (renderer)

Immediately after each successful upload (same as 3A):

```ts
await designService.createDesign(caller, {
  id: designId,
  title: importDesignTitleFromFileName(fileName),
  status: "imported",
  originalPath: uploadResult.originalPath,
  thumbnailPath: "",
  previewPath: "",
  width, height, dpi: resolveImportDpi(validation),
  tags: [],
  // audit fields via service
});
```

On create failure: `deleteOriginalPng(designId)` (existing rollback).

**Do not** batch Firestore writes in 3B — per-file isolation simplifies partial failure handling.

### 6.6 Reporting (renderer)

After queue drains:

* Build `BatchImportFinalReport` from manifest + upload outcomes
* Call `finishBatchJob(jobId)` (ZIP temp cleanup + session release)
* Show `ImportBatchSummary` with totals
* Show `ImportFileResultList` with per-file status icons
* Link to Design Library with `?status=imported` (existing 3A UX)

---

## 7. Progress UI

### 7.1 Components

| Component | Purpose |
| --- | --- |
| `ImportSourceActions` | Buttons: Select PNGs / Import Folder / Import ZIP |
| `ImportBatchProgressPanel` | Overall progress bar, phase label, counts |
| `ImportFileResultList` | Scrollable per-file rows with status badge |
| `ImportBatchSummary` | Post-job totals and primary actions |

Follow `docs/STYLE_GUIDE.md` — theme tokens, shared `Button`, `Badge`, `Card`, light/dark support.

### 7.2 Overall progress

* **Formula:** `completedFiles / fileTotal` where completed = success + failed + rejected + skipped + cancelled
* **Phase label:** Discovering → Validating → Uploading → Complete
* **Indeterminate bar** during discovery until `fileTotal` known

### 7.3 Current file

* Display `currentFileName` from latest progress event
* Subtext: `File 7 of 42`

### 7.4 Success / failure counts

Live counters in progress panel:

| Counter | Source |
| --- | --- |
| Imported (success) | Upload + create succeeded |
| Failed | Upload or Firestore error |
| Rejected | Validation failed (main) |
| Skipped | Non-PNG or scan ignore |

### 7.5 Cancellation strategy

| Stage | Cancel behavior |
| --- | --- |
| Discovery / validation (main) | `cancel-batch-job` sets flag; runner checks between files; emits `canceled: true` on complete |
| Upload queue (renderer) | `AbortController` aborts pending pool; in-flight upload completes or fails naturally |
| After cancel | Show partial summary; do not delete already-created designs |
| Temp ZIP dir | `finishBatchJob` still called to cleanup |

Cancel button visible only while job `running`; disabled when idle/complete.

### 7.6 Single-file vs batch UX on Imports page

Retain Phase 3A single-PNG section (validate → preview → upload). Add separate **Batch import** section below with source actions and batch panels.

**Mutual exclusion (Section 2.7):** While a batch job is `running`, disable single-file controls. While a single-file result is active (path registered, not cleared), disable batch source actions. `useSinglePngImport` and `useBatchImport` remain separate hooks; the Imports page coordinates disabled state.

---

## 8. Failure Handling

### 8.1 Per-file failures

| Failure | Outcome | Storage | Firestore |
| --- | --- | --- | --- |
| Validation fail | `rejected` row | None | None |
| Read bytes fail | `failed` | None | None |
| Upload fail | `failed` | Partial → delete if `designId` allocated | None |
| Create fail | `failed` | Rollback delete (3A pattern) | None |
| User cancel mid-file | `cancelled` | Same as upload fail if upload started | None |

### 8.2 Partial batch failures

* Job completes with `imported > 0` and `failed > 0` — show **partial success** banner
* No automatic rollback of successful imports
* Staff can open Design Library to see imported records

### 8.3 Storage cleanup

| Scenario | Action |
| --- | --- |
| Upload started, create fails | `importUploadService.deleteOriginalPng(designId)` |
| Upload fails mid-transfer | No object committed → no delete |
| Cancel during upload | Complete in-flight; rollback if create not reached and object exists |
| Batch end | No bulk Storage sweep (orphans from failed rollback surface `cleanupWarning` per file) |

### 8.4 Firestore cleanup

* **Never** create document without successful upload
* **Never** auto-delete Firestore docs on batch cancel
* Failed creates already handled by 3A rollback

### 8.5 Fatal job errors

| Error | Behavior |
| --- | --- |
| ZIP corrupt | Job-level error; zero imports; main deletes temp immediately |
| ZIP extracted size exceeded | Job-level error; main deletes temp immediately |
| Folder not found | Job-level error |
| Limits exceeded at start | `accepted: false` on invoke; no job started |

### 8.6 Retry strategy (deferred to 3C)

Phase 3B does **not** implement per-file retry. Failed files remain in the batch report with error messages; staff must start a new import for failed files.

Phase 3C may add:

* Retry single failed file from batch summary
* Re-queue without re-running entire ZIP/folder discovery

---

## 9. Performance Limits

### 9.1 Locked constants

All values live in `shared/constants/import/batchImportLimits.constants.ts`.

| Constant | Value | Rationale |
| --- | --- | --- |
| `MAX_BATCH_FILES` | `100` | Aligns with `designService.DEFAULT_LIST_LIMIT`; truncation UX required |
| `MAX_ZIP_SIZE_BYTES` | `200 MB` | Compressed archive size guard |
| `MAX_EXTRACTED_BYTES` | `500 MB` | Cumulative uncompressed extraction cap; ZIP bomb / disk guard (separate from archive size) |
| `MAX_ZIP_ENTRIES` | `500` | Zip bomb entry count guard |
| `MAX_ZIP_COMPRESSION_RATIO` | `100:1` | Suspicious compression detection |
| `MAX_SINGLE_PNG_SIZE_BYTES` | `50 MB` | Matches `storage.rules` and `importValidation.constants.ts` |
| `MAX_FOLDER_SCAN_ENTRIES` | `10,000` | Filesystem scan bomb guard |
| `MAX_FOLDER_DEPTH` | `12` | Deep tree guard |
| `UPLOAD_CONCURRENCY` | `2` | ~100 MB peak renderer memory (2 × 50 MB buffers) |
| `VALIDATION_CONCURRENCY` | `1` | Sequential validation in 3B (raise to 2 in 3C if profiled) |

**ZIP vs folder/multi-select totals:** ZIP import is capped at `MAX_EXTRACTED_BYTES` (500 MB uncompressed). Folder and multi-select paths can reach up to `MAX_BATCH_FILES` × `MAX_SINGLE_PNG_SIZE_BYTES` in theory (100 files); practical totals depend on per-file validation.

### 9.2 Concurrency strategy

```txt
Main:     sequential validation (1 file at a time)
Renderer: parallel uploads (2 at a time)
IPC:      one read-bytes call per file at upload time (not parallelized with same path)
```

### 9.3 Memory considerations

* Do not load entire ZIP into memory — stream extraction
* Byte read returns `Uint8Array` per file — at most `UPLOAD_CONCURRENCY` buffers in flight
* Preview generation for batch: **out of scope** (no per-file preview in 3B table)

### 9.4 UI responsiveness

* All heavy work in main process
* Progress events throttled to max **10/sec** per job if needed
* Virtualize `ImportFileResultList` when row count > 50 (**required** at `MAX_BATCH_FILES = 100`)

---

## 10. Security Review

### 10.1 IPC exposure

| Risk | Mitigation |
| --- | --- |
| Arbitrary path read | `importDialogRegistry` + `importBatchSession` allowlist; unified read-path gate |
| Renderer-supplied paths | Dialog-origin registration; `start-batch-discovery` validates against registry |
| Session mode conflict | Mutual exclusion between single-file and batch (Section 2.7) |
| Channel injection | Preload allowlists invoke + event channels |
| Oversized payloads | Enforce `MAX_SINGLE_PNG_SIZE_BYTES` before read; reject on invoke |
| Job ID guessing | Session scoped to `webContents` id; job owned by creating window |

### 10.2 Filesystem access

* All paths from native dialogs only
* Main process normalizes and jails paths
* Folder walk cannot escape root
* ZIP extract cannot escape temp root

### 10.3 Temporary files

* Temp dirs under OS temp with app-specific prefix
* ZIP temp retained until `finish-batch-job` (success, cancel, or upload abandonment)
* Fatal discovery errors delete temp immediately in main
* Stale-dir cleanup on app start (housekeeping for crash leaks)
* Register temp extracted paths only for active job lifetime

### 10.4 Upload protections

* `permissionService.canImportDesigns` in UI
* Firebase Auth required for Storage SDK
* `storage.rules`: staff-only, `image/png`, 50MB limit
* `designService.createDesign` enforces caller permissions and validation
* No service account credentials in Electron app

### 10.5 Pre-implementation security checklist

- [ ] Extend `docs/setup/electron-security-setup.md` with batch channels
- [ ] Extend `docs/SECURITY.md` IPC table
- [ ] Add Zip Slip unit tests in main process
- [ ] Add path jail unit tests for folder scanner
- [ ] Add `importDialogRegistry` rejection tests for unregistered paths
- [ ] Add session mutual exclusion tests

---

## 11. Documentation Updates Required

| Document | Updates |
| --- | --- |
| `docs/WORKFLOWS.md` | Batch import workflow, folder/ZIP paths, skipped vs rejected |
| `docs/FIREBASE.md` | Batch upload sequence; note sequential `createDesign` |
| `docs/SECURITY.md` | New IPC channels, ZIP temp dirs, batch limits |
| `docs/setup/electron-security-setup.md` | Batch preload API, event subscriptions, session model |
| `docs/plans/import-pipeline-plan.md` | Mark 3B deliverables with link to this plan |
| `docs/reviews/phase-3b-signoff.md` | Create after implementation (empty template) |
| `docs/DATA_MODEL.md` | Update only if `importBatchId` approved (default: no change) |

---

## 12. Verification Checklist

### 12.1 Multiple PNG selection

- [ ] Multi-select 5 valid PNGs → 5 designs imported
- [ ] Multi-select including one corrupt PNG → 4 imported, 1 rejected
- [ ] Cancel dialog → no job started
- [ ] Exceed `MAX_BATCH_FILES` → truncation warning

### 12.2 Folder import

- [ ] Folder with PNGs + `.txt` → PNGs imported, txt skipped
- [ ] Nested subfolders discovered
- [ ] Path outside root cannot be accessed via `..` in folder names
- [ ] Ignore `.git` / `node_modules`

### 12.3 ZIP import

- [ ] ZIP with nested PNGs → correct count
- [ ] ZIP with only non-PNG → all skipped, none imported
- [ ] Zip Slip entry (`../../evil.png`) rejected safely
- [ ] Oversize ZIP rejected before extract
- [ ] ZIP exceeding `MAX_EXTRACTED_BYTES` during extraction → job error, temp deleted
- [ ] Temp directory removed after `finishBatchJob`

### 12.4 Batch processing

- [ ] Each imported design has `status: "imported"`, `originalPath`, dimensions
- [ ] `designService.createDesign` used (no direct Firestore writes)
- [ ] Upload concurrency does not corrupt files
- [ ] Partial batch shows correct counts

### 12.5 Progress UI

- [ ] Progress bar advances through phases
- [ ] Current file name updates
- [ ] Success/failed/rejected/skipped counts accurate
- [ ] Cancel stops further imports; partial summary correct
- [ ] Light and dark theme

### 12.6 Failure handling

- [ ] Rejected file → no Storage object, no Firestore doc
- [ ] Firestore fail after upload → Storage rollback, per-file error
- [ ] Fatal ZIP error → job error state, no partial extract leak

### 12.7 Security

- [ ] Unregistered path rejected on `read-selected-png-bytes`
- [ ] `start-batch-discovery` rejects paths not in `importDialogRegistry`
- [ ] Single-file import blocked while batch job running (and vice versa)
- [ ] Non-staff cannot import (UI + rules)
- [ ] No raw `ipcRenderer` exposure

### 12.8 Session and cleanup

- [ ] `finishBatchJob` called on success and cancel
- [ ] Batch session cleared after `finishBatchJob`
- [ ] Fatal ZIP error deletes temp without waiting for renderer

### 12.9 Regression

- [ ] Phase 3A single-PNG flow still works unchanged
- [ ] Design Library `?status=imported` shows new batch imports

---

## 13. Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| **Zip Slip / path traversal** | Arbitrary file write or read | Medium | Entry normalization, temp root jail, security tests |
| **ZIP bomb (extracted size)** | Disk exhaustion from small archive | Medium | `MAX_EXTRACTED_BYTES`, entry count, compression ratio |
| **ZIP bomb (entry count)** | Disk / CPU exhaustion | Medium | `MAX_ZIP_ENTRIES`, `MAX_ZIP_COMPRESSION_RATIO` |
| **Memory pressure** | App crash on large batches | Medium | Upload concurrency cap, size limits, no batch previews |
| **Temp dir leak on crash** | Disk clutter | Low | `finishBatchJob` + stale-dir cleanup on app start |
| **IPC buffer limits** | Large PNG read fails | Medium | 50MB cap aligned with rules; clear error message |
| **Partial orphan Storage** | Cost / clutter | Medium | Reuse 3A rollback; surface cleanup warnings |
| **Import >100 designs** | Library list incomplete | High | Truncate batch at 100; document pagination follow-up |
| **Cancel race** | Duplicate create or orphan | Medium | One `designId` per file; idempotent delete |
| **Windows path casing** | Root jail bypass | Low | Case-insensitive prefix check on win32 |
| **Symlink escape** | Read outside folder | Low | Skip symlinks by default |
| **ZIP lib choice** | Maintenance / CVEs | Low | Prefer maintained streaming lib; pin version |

---

## 14. Recommended Implementation Sequence

Execute in order. Each step should compile and pass existing 3A tests before proceeding.

### Step 1 — Shared types and constants

1. `shared/constants/import/batchImportLimits.constants.ts` (locked values in Section 9.1 / Appendix D)
2. `shared/types/import/batchImport.types.ts`
3. Extend `importIpc.types.ts` and `FreshPrintsImportsApi` (include `finishBatchJob`, dialog pickers, batch discovery)

### Step 2 — Dialog registry and batch session (main)

1. `importDialogRegistry.ts` — register paths at picker time per `webContents`
2. `importBatchSession.ts` — register validated paths per `jobId`, tie to `webContents.id`
3. Extend `validateFilePathInput` / `read-selected-png-bytes` with unified gate: single-file validated OR batch validated
4. Enforce session mutual exclusion in handlers
5. Unit tests for registry, allowlist, and mutual exclusion

### Step 3 — Selection dialogs (main + preload + desktop service)

1. `selectMultiplePngFiles.ts` — register each path in `importDialogRegistry`
2. `selectImportFolder.ts` — register folder root in `importDialogRegistry`
3. `selectImportZipFile.ts` — register ZIP path in `importDialogRegistry`
4. Preload + `importDesktopService` wrappers

### Step 4 — Folder scanner (main) ✅

1. `folderScanner.ts` with ignore list, depth cap, root jail
2. `folderBatchDiscovery.ts` — scan + validate pipeline wired to `start-batch-discovery`
3. Unit tests with fixture directory tree (deferred)

### Step 5 — Temp directory service (main) ✅

1. `tempDirectoryService.ts` — create, delete, stale cleanup
2. `importTempPathSafety.ts` — job ID validation and temp-root jail helpers
3. `finishBatchJob` deletes per-job temp dirs when present

### Step 6 — ZIP extractor (main) ✅

1. Added `yauzl` dependency (streaming extraction in main process)
2. `zipExtractor.ts` with Zip Slip protection and cumulative `MAX_EXTRACTED_BYTES` tracking
3. `zipBatchDiscovery.ts` wired to `start-batch-discovery`
4. Unit tests with malicious ZIP fixtures (deferred)

### Step 7 — Import job runner (main) ✅

1. `importJobRunner.ts` — unified discovery orchestration for all batch source types
2. Centralized fatal error handling, cancellation completion, and session lifecycle transitions
3. Source-specific discovery modules return canceled state; runner owns terminal failure paths

### Step 8 — Batch upload orchestration (renderer) ✅

1. Extracted `importValidatedPngFile(caller, validation, options?)` from `uploadValidatedPng` — shared Phase 3A upload + Firestore create with per-file result (no throw)
2. `importBatchOrchestrationService.ts` — upload queue with `UPLOAD_CONCURRENCY = 2`; calls `finishBatchJob` after queue drains
3. Extended `readSelectedPngFileBytes` IPC to accept batch `{ jobId, filePath }` with validated-path enforcement
4. Wired `finishBatchJob` in `importDesktopService`

### Step 9 — Batch hook (renderer) ✅

1. `useBatchImport.ts` — state machine, event subscriptions, cancel, progress merge
2. `batchImportHook.types.ts` — hook phase, progress, and return types
3. Extended `importDesktopService` with batch IPC and event subscriptions

### Step 10 — UI (renderer) ✅

1. `BatchImportPanel` and child components wired on `ImportsPage`
2. Discovery, ready-to-upload, upload progress, completed, and error states
3. Mutual exclusion between single PNG and batch import flows

### Step 12 — Documentation and signoff

1. Update workflow, security, electron setup docs
2. Manual QA against verification checklist
3. Create `docs/reviews/phase-3b-signoff.md`

### Step 13 — Handoff to 3C

* Thumbnail generation reads `originalPath` from imported designs
* Strict DPI rejection toggled in constants
* Status transition to `ready` after derivatives

---

## Appendix A — Job state machine

```txt
idle
  → selecting        (dialog open)
  → discovering      (startBatchDiscovery accepted)
  → validating       (candidates probed)
  → uploading        (renderer queue)
  → completing       (cleanup IPC)
  → done | cancelled | failed
```

## Appendix B — Alignment with Phase 3A signoff

Phase 3A signoff explicitly lists 3B deliverables: folder scanner, ZIP extract, `ImportJobRunner`, IPC progress, batch UI, skipped vs rejected, concurrency limits. This plan implements those items without altering the 3A single-file contract.

## Appendix C — Remaining open decisions

| Decision | Status | Notes |
| --- | --- | --- |
| Hard DPI reject | **Locked: defer to 3C** | 3B continues 3A warn-only policy |
| Per-file retry | **Locked: defer to 3C** | Failed files require new import in 3B |
| `MAX_EXTRACTED_BYTES` = 500 MB | **Locked for 3B** | Revisit if ops reports legitimate ZIPs blocked; folder import is fallback |
| ZIP library (`yauzl` vs `unzipper`) | Open | Evaluate at Step 6; prefer streaming |
| Design Library pagination | Open (Phase 2B debt) | Batch cap at 100 mitigates; full pagination deferred |

## Appendix D — Locked constants (summary)

```ts
MAX_BATCH_FILES = 100
MAX_ZIP_SIZE_BYTES = 200 * 1024 * 1024        // compressed archive
MAX_EXTRACTED_BYTES = 500 * 1024 * 1024       // cumulative uncompressed during ZIP extract
MAX_ZIP_ENTRIES = 500
MAX_ZIP_COMPRESSION_RATIO = 100               // 100:1
MAX_SINGLE_PNG_SIZE_BYTES = 50 * 1024 * 1024  // existing; matches storage.rules
MAX_FOLDER_SCAN_ENTRIES = 10_000
MAX_FOLDER_DEPTH = 12
UPLOAD_CONCURRENCY = 2
VALIDATION_CONCURRENCY = 1
```

---

*Planning document only. No implementation included. Approved for implementation per `docs/reviews/phase-3b-plan-review.md`.*
