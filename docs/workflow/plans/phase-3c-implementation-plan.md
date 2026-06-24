# Phase 3C Implementation Plan — Derivative Asset Generation

## Document status

| Field | Value |
| --- | --- |
| **Phase** | 3C — Thumbnail/preview generation, status lifecycle, Design Library rendering |
| **Status** | Plan modification pass complete — **approved with modifications** (`docs/reviews/phase-3c-plan-review.md`); **no implementation yet** |
| **Prerequisite** | Phase 3A complete (`docs/reviews/phase-3a-final-signoff.md`), Phase 3B complete (`docs/reviews/phase-3b-signoff.md`) |
| **Parent plan** | `docs/plans/import-pipeline-plan.md` |
| **Plan review** | `docs/reviews/phase-3c-plan-review.md` — seven modifications incorporated in this revision |
| **Out of scope** | AI enrichment (Phase 7), queue integration (Phase 6), customer catalog (Phase 6+), per-file retry system (optional polish) |

**Goal:** After Phase 3A/3B import creates `status: "imported"` designs with originals in Storage, Phase 3C generates WebP thumbnail and preview derivatives, uploads them to canonical Storage paths, populates `thumbnailPath` / `previewPath`, transitions eligible designs to `status: "ready"`, and renders real images in the Design Library — without changing the secure import architecture established in 3A/3B.

---

## 1. Executive Summary

Phase 3A and 3B delivered a complete import pipeline for single PNG and batch sources (multiple files, folder, ZIP). Every successful import:

* Uploads the original PNG to `/originals/{designId}.png`
* Creates a Firestore `designs` document via `designService.createDesign`
* Sets `status: "imported"`
* Leaves `thumbnailPath` and `previewPath` empty
* Preserves width, height, and DPI from main-process validation

Phase 3C closes the gap between **imported catalog records** and **production-ready library presentation** defined in `docs/WORKFLOWS.md` and `docs/DATA_MODEL.md`.

Phase 3C will:

1. Generate **thumbnail** and **preview** WebP derivatives from validated PNG bytes
2. Upload derivatives to `/thumbnails/{designId}.webp` and `/previews/{designId}.webp`
3. Update design documents with canonical paths and transition to `status: "ready"` when derivatives succeed
4. Resolve Storage paths to download URLs for Design Library grid and detail views
5. Extend Storage security rules for derivative paths
6. Integrate derivative processing into single-file and batch import orchestration
7. Optionally harden DPI rejection (warn-only today) behind a feature flag
8. Preserve AI-readiness (`aiProcessed: false`, stable `originalPath`)

**Architecture principle:** Derivative **generation** runs in the **Electron main process** (native image library), **inside the existing session-gated read workflow** — one IPC round-trip returns original bytes plus derivative buffers. Derivative **upload** and **Firestore updates** run in the **renderer** through existing service layers. React components never call Firebase or filesystem APIs directly.

**Concurrency principle:** `sharp` decode/encode is limited to **1 concurrent operation** in main (memory protection). Renderer upload concurrency remains **2** (`UPLOAD_CONCURRENCY`).

**Recommended dependency:** `sharp` in main process (requires explicit justification per `docs/AI_RULES.md` before implementation).

---

## 2. Current Architecture Review

### 2.1 Layer model (post Phase 3B)

```txt
┌─────────────────────────────────────────────────────────────────┐
│ Renderer (React)                                                │
│  ImportsPage, BatchImportPanel, ImportResultPanel               │
│  DesignLibraryPage, DesignCard, DesignDetailsModal              │
│  useSinglePngImport, useBatchImport                             │
│  importOrchestrationService, importBatchOrchestrationService    │
│  importUploadService, designService                             │
│  importDesktopService (preload wrapper)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ window.freshPrints.imports
┌───────────────────────────▼─────────────────────────────────────┐
│ Preload — allowlisted invoke + event channels                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ipcMain
┌───────────────────────────▼─────────────────────────────────────┐
│ Main process                                                    │
│  importJobRunner, folderScanner, zipExtractor                   │
│  pngValidator, tempDirectoryService, importBatchSession         │
│  (Phase 3C adds) derivativeGenerator + sharpConcurrencyQueue      │
│  read handler: read bytes → generate derivatives → single IPC   │
└─────────────────────────────────────────────────────────────────┘
                            │
              Firebase Storage / Firestore (renderer SDK)
```

### 2.2 What Phase 3C must not break

| Constraint | Source |
| --- | --- |
| `contextIsolation: true`, no renderer `fs` | `docs/SECURITY.md`, `docs/AI_RULES.md` |
| Firebase calls only in services | `docs/AI_RULES.md` |
| `App.tsx` providers/routes only | `AGENTS.md` |
| IPC allowlist pattern | `electron/ipc/import/importIpcChannels.ts` |
| Catalog writes via `designService` | Phase 2A contract |
| Batch session / path trust model | Phase 3B signoff |
| Single vs batch mutual exclusion | `ImportsPage.tsx` |

### 2.3 Current Storage rules gap

`storage.rules` today allows staff read/write only on `/originals/{designId}.png`. `/thumbnails/` and `/previews/` are **denied by default**. Phase 3C **requires** Storage rule extension and deployment before derivative upload QA.

### 2.4 Current UI gap

| Component | Current behavior |
| --- | --- |
| `DesignCard` | Static placeholder icon — does not read `thumbnailPath` |
| `DesignThumbnailPanel` | Renders only `data:`, `http://`, `https://` URLs — **not** catalog paths like `/thumbnails/{id}.webp` |
| Imports success UI | Based on original upload + Firestore create; no derivative awareness |

Phase 3C must introduce a **Storage URL resolution service** so catalog paths become renderable image URLs.

---

## 3. Existing Import Pipeline Review

### 3.1 Single-file flow (Phase 3A)

```txt
selectSinglePngFile
    ↓
validateSelectedPngFile (main)
    ↓
getSelectedPngPreview (main, local data URL — import UI only)
    ↓
readSelectedPngFileBytes (main — session-gated)
    ↓ returns { bytes, thumbnailBytes, previewBytes } in ONE IPC response
importUploadService.uploadOriginalPng (renderer)
    ↓
designService.createDesign({ status: "imported", thumbnailPath: "", previewPath: "" })
    ↓
importUploadService.uploadThumbnailWebp + uploadPreviewWebp (renderer)
    ↓
designService.markDesignReady (renderer — validated paths → status "ready")
```

**Rollback:** If Firestore create fails after upload, `importUploadService.deleteOriginalPng(designId)`. If derivative upload or `markDesignReady` fails, rollback partial derivatives; original and `imported` record retained.

### 3.2 Batch flow (Phase 3B)

```txt
select source → startBatchDiscovery (main)
    ↓
batch-progress / batch-discovery-complete
    ↓
importBatchOrchestrationService.runBatchUpload (UPLOAD_CONCURRENCY = 2)
    per file: importValidatedPngFile (same as single-file core)
    ↓
finishBatchJob (session + ZIP temp cleanup)
```

### 3.3 Canonical path contract (Phase 2A — unchanged)

From `src/renderer/src/features/designs/constants/designStoragePaths.ts`:

```txt
/originals/{designId}.png
/thumbnails/{designId}.webp
/previews/{designId}.webp
```

`designService` validates canonical paths on create/update via `isCanonicalDesignStoragePath`.

### 3.4 Validation policy today

| Rule | Phase 3A/3B behavior |
| --- | --- |
| PNG magic bytes, dimensions | Enforced (reject) |
| File size ≤ 50 MB | Enforced (reject) |
| DPI below `MIN_DPI` (300) | **Warning only** — does not block import |
| Missing DPI metadata | **Warning only** |

Phase 3C may add **optional strict rejection** without changing default warn-only behavior unless business approves.

### 3.5 Gap vs `docs/WORKFLOWS.md` ideal pipeline

`WORKFLOWS.md` describes generate-then-upload-then-create ordering. Phase 3A/3B intentionally inverted this to ship originals first with empty derivative paths. Phase 3C **extends** the implemented pipeline rather than rewriting it:

```txt
[Implemented 3A/3B]
  upload original → createDesign (imported)

[Phase 3C addition — single IPC round-trip]
  readSelectedPngFileBytes (main):
    read file (session-gated) → generate derivatives (sharp, concurrency 1)
    → return { bytes, thumbnailBytes, previewBytes }
  upload original (renderer) → createDesign (imported)
  → upload derivatives (renderer) → markDesignReady (ready)
```

This avoids re-risking the proven upload/create/rollback path, eliminates double IPC transfer of large PNG buffers, and meets the workflow end state.

---

## 4. Phase 3C Scope

### 4.1 In scope

| # | Capability | Description |
| --- | --- | --- |
| 1 | **Thumbnail generation** | WebP grid thumbnail from PNG source |
| 2 | **Preview generation** | WebP medium-resolution preview from PNG source |
| 3 | **Derivative storage architecture** | Upload to canonical paths; extend `importUploadService` |
| 4 | **Status lifecycle** | `imported` → `processing` → `ready` (or remain `imported` on derivative failure) |
| 5 | **`originalPath` validation review** | Confirm existing canonical contract; no path format change |
| 6 | **`thumbnailPath` population** | Set via `designService.updateDesign` after upload |
| 7 | **`previewPath` population** | Set via `designService.updateDesign` after upload |
| 8 | **Design Library thumbnail rendering** | `DesignCard` shows resolved thumbnail URL |
| 9 | **Design Library preview rendering** | `DesignDetailsModal` / preview panel shows resolved preview URL |
| 10 | **Import pipeline integration** | Single + batch orchestration calls derivative pipeline per file |
| 11 | **Future AI compatibility** | Preserve `originalPath`, `aiProcessed: false`; do not write `aiMetadata` |
| 12 | **Storage structure review** | Extend `storage.rules` for `/thumbnails/`, `/previews/` |
| 13 | **Cleanup / failure recovery** | Rollback partial derivative uploads; do not delete original on derivative-only failure |
| 14 | **Performance** | Single IPC round-trip per file; `sharp` concurrency 1; upload concurrency 2 |
| 15 | **Security review** | Extend session-gated read IPC only; separate backfill IPC optional |

### 4.2 Optional in-scope (implement if time permits within 3C)

| Item | Notes |
| --- | --- |
| Strict DPI / dimension rejection toggle | Constants flag; default off (warn-only) |
| Backfill job for existing `imported` designs | Process designs missing derivatives without re-import |
| Resumable uploads | Only if profiling shows need |
| `processing` filter in Design Library | UX for in-flight derivative generation |

### 4.3 Success criteria

Phase 3C distinguishes two outcome tiers. UI, orchestration types, tests, and signoff must use both consistently.

#### Import success

Original upload and Firestore catalog record created. Design remains eligible for derivative processing.

* Original PNG uploaded to `/originals/{designId}.png`
* Firestore `designs` document created via `designService.createDesign`
* `status: "imported"`
* `thumbnailPath` and `previewPath` empty (or unchanged)
* Reported as **import success** even if derivatives fail later in the same action

#### Pipeline success

Full derivative pipeline completed. Design is catalog-presentable.

* Thumbnail WebP generated and uploaded to `/thumbnails/{designId}.webp`
* Preview WebP generated and uploaded to `/previews/{designId}.webp`
* `thumbnailPath` and `previewPath` populated via `designService.markDesignReady`
* `status: "ready"`
* Design Library grid shows resolved thumbnail; Design Details shows preview

#### Partial success (valid outcome)

* **Import success** achieved, **pipeline success** not achieved
* Design stays `imported`; original retained; derivative failure reported clearly
* Does not fail the overall import action if original + create succeeded

#### General criteria (both flows)

* Single-file and batch import still work end-to-end
* Storage rules deployed for derivative paths
* No Firebase calls in React components
* No renderer filesystem access
* Design Library rendering verified before signoff (Steps 9–10)

---

## 5. Explicit Exclusions

| Excluded | Target |
| --- | --- |
| AI vision, naming, tagging, categorization | Phase 7 |
| AI Review page workflows | Phase 7 |
| Show queue integration | Phase 6 |
| Customer website thumbnail/preview access policy | Phase 6+ (rules may stay staff-only in 3C) |
| Per-file / batch retry UI | Future hardening (optional 3C polish only if scoped) |
| Upload cancellation mid-derivative-generation | Deferred |
| JPG / WEBP **source** import | Future |
| Cloud Functions orchestration | Only if client limits require it |
| `importBatchId` on Firestore documents | Out of scope per 3B plan |
| Persistent import jobs across app restarts | Out of scope |
| Design Library pagination beyond 100 | Phase 2B+ enhancement |
| Modifying original PNG files in Storage | Never |
| Rewriting Phase 3B discovery / batch IPC | Frozen |

---

## 6. Data Model Impact

### 6.1 No schema migration required

The existing `Design` interface (`src/renderer/src/features/designs/types/design.types.ts`) already includes:

```ts
originalPath: string;
thumbnailPath: string;
previewPath?: string;
status: DesignStatus;
width: number;
height: number;
dpi: number;
aiProcessed: boolean;
aiReviewed: boolean;
```

Phase 3C **populates** fields that are intentionally empty today. No new Firestore fields unless optional metadata is approved (see below).

### 6.2 Status lifecycle (canonical)

Per `docs/DATA_MODEL.md`:

```txt
imported → processing → ready → queued → printed → archived
                    ↘ rejected (manual / AI — not import validation failure)
```

#### Phase 3C status definitions (locked)

| Status | Meaning in Phase 3C |
| --- | --- |
| **`imported`** | Original uploaded to Storage; Firestore record created; derivatives **not complete** (`thumbnailPath` / `previewPath` empty or pipeline not finished) |
| **`processing`** | Optional short-lived state during derivative upload and Firestore path update (recommended for UX clarity) |
| **`ready`** | Derivatives generated; thumbnail and preview uploaded; `thumbnailPath` and `previewPath` populated; Firestore paths updated; catalog presentation complete |
| **`rejected`** | **Not** used for import or derivative failures |

**`ready` requirements (all must be true):**

* `originalPath` set and canonical
* `thumbnailPath` set and canonical (`/thumbnails/{designId}.webp`)
* `previewPath` set and canonical (`/previews/{designId}.webp`)
* Thumbnail and preview objects exist in Storage
* Enforced by `designService.markDesignReady` before status transition (see Section 10.6)

#### Out of scope — Phase 7 AI statuses

Phase 3C does **not** implement AI queue transitions. Phase 7 may later use `processing` again for AI enrichment (`ready` → `processing` → `ready`). Step 13 must update `docs/WORKFLOWS.md` to document:

* `imported` and `ready` definitions above
* Ordered enrichment stages: derivatives (3C) before AI (Phase 7)
* `processing` as generic background enrichment, not AI-only

Phase 7 AI status behavior is **not** specified in this plan.

### 6.3 Optional future fields (do not add without approval)

| Field | Purpose | Decision |
| --- | --- | --- |
| `derivativeGeneratedAt` | Audit timestamp | Defer — use `updatedAt` |
| `derivativeError` | Last failure message | Defer — import job result / logs only |
| `importBatchId` | Batch correlation | Defer per 3B plan |

### 6.4 AI compatibility

Phase 7 will read `originalPath` from Storage. Phase 3C must:

* Never overwrite `originalPath` during derivative processing
* Keep `aiProcessed: false`, `aiReviewed: false` on import
* Not write `aiMetadata` sub-objects
* Complete derivative work before any Phase 7 AI processing

**WORKFLOWS.md update (Step 13):** Document that `processing` may be entered twice in a design's lifetime — once for derivatives (3C), once for AI (Phase 7) — but Phase 3C only owns the derivative stage. Phase 7 must not assume `processing` implies missing thumbnails.

---

## 7. Storage Architecture

### 7.1 Path contract (unchanged)

| Asset | Path | Content-Type |
| --- | --- | --- |
| Original | `/originals/{designId}.png` | `image/png` |
| Thumbnail | `/thumbnails/{designId}.webp` | `image/webp` |
| Preview | `/previews/{designId}.webp` | `image/webp` |

Helpers remain in `designStoragePaths.ts`. All uploads use `designId` generated before any Storage write.

### 7.2 Upload ownership

| Layer | Responsibility |
| --- | --- |
| `importUploadService` (renderer) | `uploadOriginalPng`, **new** `uploadThumbnailWebp`, `uploadPreviewWebp`, derivative delete helpers |
| `designStorageUrlService` (renderer, new) | `getDownloadUrlForCatalogPath(catalogPath)` via Firebase `getDownloadURL` |
| Main process | **No** Firebase Storage access |

### 7.3 Storage rules changes (required)

Extend `storage.rules` with explicit derivative path rules. Mirror the existing `/originals/` pattern.

#### Thumbnails

```txt
/thumbnails/{designId}.webp
```

#### Previews

```txt
/previews/{designId}.webp
```

#### Rule requirements (locked)

| Requirement | Value |
| --- | --- |
| **Format** | WebP only (`contentType == "image/webp"`) |
| **Filename pattern** | `isCanonicalDerivativeFileName(fileName)` — `{designId}.webp` where `designId` matches `[A-Za-z0-9_-]+` (mirror `isCanonicalOriginalFileName`) |
| **Size cap** | **10 MB** per derivative object (`request.resource.size < 10 * 1024 * 1024`) |
| **Read** | Staff only (`owner`, `admin`, `helper`, active) |
| **Write (create/update)** | Staff only; canonical filename; WebP content-type; size cap |
| **Delete** | Staff only; canonical filename |
| **Customer access** | **Denied** in Phase 3C |

#### Example rule structure

```txt
function isCanonicalDerivativeFileName(fileName) {
  return fileName.matches('[A-Za-z0-9_-]+\\.webp');
}

function isValidDerivativeUpload() {
  return request.resource.size < 10 * 1024 * 1024
    && request.resource.contentType == "image/webp";
}

match /thumbnails/{fileName} {
  allow read: if isStaff() && isCanonicalDerivativeFileName(fileName);
  allow create, update: if isStaff()
    && isCanonicalDerivativeFileName(fileName)
    && isValidDerivativeUpload();
  allow delete: if isStaff() && isCanonicalDerivativeFileName(fileName);
}

match /previews/{fileName} {
  // same constraints as thumbnails
}
```

Customer read on thumbnails/previews remains **denied** in 3C unless Phase 6 explicitly requires public catalog assets.

**Deploy required:** `firebase deploy --only storage` before derivative upload QA. Block signoff without deploy verification.

**Documentation:** Update `docs/setup/firebase-storage-setup.md` and `docs/SECURITY.md` with derivative rule details.

### 7.4 Catalog path vs download URL

Firestore stores **catalog paths** (e.g. `/thumbnails/abc123.webp`), not Firebase download URLs. UI services resolve paths at render time. Cache URLs in hook/service layer with TTL to avoid excessive `getDownloadURL` calls.

### 7.5 Orphan prevention (derivatives)

| Failure point | Action |
| --- | --- |
| Thumbnail upload fails | No Firestore path update; design stays `imported` |
| Preview upload fails after thumbnail succeeded | Delete uploaded thumbnail; design stays `imported` |
| `updateDesign` fails after both uploads | Delete both derivatives; design stays `imported` with paths unchanged |
| Original already exists | **Never** delete original on derivative-only failure |

---

## 8. Thumbnail Generation Architecture

### 8.1 Location

**Main process:** `electron/services/import/derivativeGenerator.ts` (or `imageDerivativeService.ts`)

Uses native image library (`sharp` recommended) — not available in renderer without WASM tradeoffs.

### 8.2 Input source (locked for import flow)

During import, PNG bytes are read in main process inside the **existing session-gated** `READ_SELECTED_PNG_BYTES` handler. Phase 3C **extends** that handler — no additional renderer → main byte transfer for import flow.

**Locked import flow (single IPC round-trip):**

```txt
validateReadPngFileBytesRequest (session / batch gates — unchanged)
    ↓
read file from disk (main)
    ↓
derivativeGenerator.generateFromPngBytes (main, sharp concurrency queue)
    ↓
return ImportIpcResult {
  bytes,              // original PNG for renderer upload
  thumbnailBytes,     // WebP for renderer upload
  previewBytes,       // WebP for renderer upload
  thumbnailWidth, thumbnailHeight,
  previewWidth, previewHeight,
  fileName, filePath, fileSizeBytes
}
```

**Requirements:**

1. Derivative generation occurs **inside** the secured main-process read workflow — same trust gates as Phase 3A/3B byte reads
2. **No** separate `generate-design-derivatives` invoke during import — avoids double transfer of up to 50 MB per file
3. **No** re-read from disk after validation
4. **No** download from Storage during import transaction

**Backfill only (optional Step 12):** A separate session-gated `generate-design-derivatives` IPC may accept renderer-supplied bytes (downloaded from Storage) for designs stuck at `imported`. This path is **not** used during normal import.

### 8.3 Thumbnail spec (proposed — confirm at kickoff)

| Constant | Proposed value | Notes |
| --- | --- | --- |
| `THUMBNAIL_MAX_WIDTH_PX` | `320` | Aligns with import preview max width |
| `THUMBNAIL_MAX_HEIGHT_PX` | `320` | Preserve aspect ratio |
| `THUMBNAIL_WEBP_QUALITY` | `80` | Balance size vs quality |
| Output format | WebP | Per `designStoragePaths.ts` |

### 8.4 IPC surface (import flow — extend existing channel)

**Primary (import flow):** Extend existing channel — no new import IPC for derivative generation.

```txt
fresh-prints:import:read-selected-png-bytes   (existing — extended response)
```

**Request** (backward compatible):

```txt
// Legacy single — original bytes only
filePath: string

// Single with optional derivatives
{ filePath: string; includeDerivatives?: boolean }

// Batch
{ jobId: string; filePath: string; includeDerivatives?: boolean }
```

**Extended response** when `includeDerivatives: true` (additive on success):

```txt
ImportIpcResult<ReadSelectedPngFileBytesResult>

ReadSelectedPngFileBytesResult {
  bytes, fileName, filePath, fileSizeBytes,   // always
  derivatives?: { thumbnailBytes, previewBytes, thumbnail, preview },
  derivativeError?: DerivativeGenerationFailure  // original bytes still returned
}
```

**Derivative failure policy (Step 4+):** IPC returns `success: true` with `bytes` and `derivativeError` when generation fails. Step 5 orchestration maps this to **import success + pipeline failure** (partial success). Original read failure still returns IPC `success: false`.

**Status:** Implemented in Step 4 (`enrichReadResultWithDerivatives`, `validateReadPngFileBytesRequest`).

**Security (unchanged gates + additive checks):**

* `validateReadPngFileBytesRequest` enforces single-file session and batch `jobId` gates — **preserved**
* Reject reads over `MAX_SINGLE_PNG_SIZE_BYTES` — **preserved**
* Derivative generation runs only after successful read inside same handler
* No file path accepted on a standalone generate channel during import

**Backfill only (optional):**

```txt
fresh-prints:import:generate-design-derivatives
```

* Request: `{ pngBytes: Uint8Array }` within 50 MB cap
* Response: derivative buffers only (no original re-read)
* Staff-only orchestration; not used in `importValidatedPngFile`
* Allowlist in preload + `importIpcChannels.ts`

### 8.5 Alternative considered — generate in renderer

Rejected for Phase 3C: Canvas/`createImageBitmap` struggles with large print PNGs, duplicates logic, and increases renderer memory pressure. Main-process `sharp` matches `import-pipeline-plan.md` and Phase 3A preview generation pattern (`nativeImage` in main).

---

## 9. Preview Generation Architecture

### 9.1 Same service, different resize profile

Single `derivativeGenerator` module with two outputs:

| Constant | Proposed value | Notes |
| --- | --- | --- |
| `PREVIEW_MAX_WIDTH_PX` | `1280` | Medium resolution for detail view |
| `PREVIEW_MAX_HEIGHT_PX` | `1280` | Preserve aspect ratio |
| `PREVIEW_WEBP_QUALITY` | `85` | Slightly higher than thumbnail |

### 9.2 Original preservation

Generator must **not** modify source PNG bytes. Output WebP only.

### 9.3 Metadata

Store resulting pixel dimensions in import result metadata for debugging (optional). Catalog `width`/`height` remain **source PNG** dimensions from validation — do not overwrite with derivative dimensions.

---

## 10. Status Lifecycle Architecture

### 10.1 Per-file state machine (import + derivatives)

```txt
validate PNG (main) — unchanged
    ↓
readSelectedPngFileBytes (main — session-gated)
    → read file + generate derivatives (sharp, concurrency 1)
    → single IPC return { bytes, thumbnailBytes, previewBytes }
    ↓
upload original (renderer)
    ↓
createDesign({ status: "imported", thumbnailPath: "", previewPath: "" })
    → IMPORT SUCCESS tier achieved
    ↓
updateDesign({ status: "processing" })   // optional but recommended
    ↓
upload thumbnail + preview (renderer)
    ↓
markDesignReady(caller, designId, { thumbnailPath, previewPath })
    → validates paths + originalPath → status "ready"
    → PIPELINE SUCCESS tier achieved
```

### 10.2 Failure transitions

```txt
derivative failure at any step after createDesign
    ↓
rollback partial derivative Storage objects (if any)
    ↓
design remains status: "imported" (or revert from "processing")
    ↓
result: IMPORT SUCCESS + pipeline failure reported separately
```

**Policy:** Original + Firestore record are **retained**. Staff can view design under **Imported** filter and retry/backfill in future.

### 10.3 Batch behavior

Each file in `importBatchOrchestrationService` runs the full per-file lifecycle. One file's pipeline failure does not fail the batch. Batch summary reports both tiers:

* `importSuccess` count — original uploaded + Firestore `imported` record
* `pipelineSuccess` count — derivatives complete + `ready`
* `derivativeFailed` count — import succeeded but pipeline failed

### 10.4 Design Library filters

| Filter | Shows after 3C |
| --- | --- |
| `imported` | Designs with originals but derivatives incomplete |
| `ready` | Designs with derivatives complete |
| Default filter today (`ready`) | Will show newly completed imports after 3C |

Confirm filter UX with stakeholders — imports may briefly appear under `imported` before derivatives complete within the same user action.

### 10.5 Service method

Add focused helper in `designService`:

```txt
markDesignReady(caller, designId, { thumbnailPath, previewPath })
```

Prefer **one service method** to centralize audit fields, permission checks, and path validation. Do not set `status: "ready"` via raw `updateDesign` from import orchestration.

### 10.6 `markDesignReady` validation (required)

**Responsibility:** `designService.markDesignReady` — sole gate for `imported` → `ready` transition during import.

**Before setting `status: "ready"`, validate:**

| Check | Requirement |
| --- | --- |
| `originalPath` | Non-empty; exists on design document; passes `isCanonicalDesignStoragePath(path, "originals")` |
| `thumbnailPath` | Non-empty; argument matches `getThumbnailStoragePath(designId)`; passes `isCanonicalDesignStoragePath(path, "thumbnails")` |
| `previewPath` | Non-empty; argument matches `getPreviewStoragePath(designId)`; passes `isCanonicalDesignStoragePath(path, "previews")` |
| Caller permission | `permissionService.canEditDesigns(caller)` (or equivalent existing edit gate) |

**Failure behavior:**

* Throw or return structured error — **do not** set `status: "ready"`
* Caller (`importDerivativeService`) rolls back uploaded derivative Storage objects
* Design remains `imported` (or reverts from `processing`)
* Import result reports **import success** with pipeline failure message

**Note:** `designService.restoreDesign` setting `ready` without path validation is pre-existing debt — out of 3C scope; backfill or future hardening may address.

---

## 11. Service Layer Changes

### 11.1 New main process

| Module | Responsibility |
| --- | --- |
| `electron/services/import/derivativeGenerator.ts` | Resize PNG → WebP thumbnail + preview |
| `electron/services/import/sharpConcurrencyQueue.ts` | Global mutex — max **1** concurrent `sharp` operation |
| `electron/ipc/import/readSelectedPngFileBytes.ts` | **Extend** — after read, call `derivativeGenerator` before IPC return |
| `electron/ipc/import/generateDesignDerivatives.ts` | **Backfill only** — optional standalone handler |
| `shared/types/import/importIpc.types.ts` | Extend read response with derivative buffer fields |

**No new IPC channel required for import flow.** Extend `READ_SELECTED_PNG_BYTES` handler and response types.

### 11.2 Extended renderer services

| Service | Changes |
| --- | --- |
| `importUploadService` | `uploadThumbnailWebp`, `uploadPreviewWebp`, `deleteThumbnailWebp`, `deletePreviewWebp`, optional `deleteAllDesignAssets` |
| `importDerivativeService` (new) | Orchestrate: use derivative bytes from read response → upload both → `markDesignReady` |
| `importOrchestrationService` | Extend `importValidatedPngFile` — read returns derivatives; derivative step after `createDesign` |
| `importBatchOrchestrationService` | Per-file import/pipeline success tiers in batch report |
| `importDesktopService` | Read wrapper unchanged; response type extended (no `generateDesignDerivatives` for import) |
| `designStorageUrlService` (new) | Resolve catalog path → Firebase download URL with in-memory cache |
| `designService` | `markDesignReady` with path validation (Section 10.6); optional `markDesignProcessing` |

### 11.3 Service rules

* Services may call Firebase and IPC
* Services must not render UI
* All Storage deletes best-effort with logged warnings (match Phase 3A orphan cleanup pattern)
* No duplicate path construction — always use `designStoragePaths.ts`

### 11.4 `originalPath` validation review

`designService.createDesign` already validates `originalPath` via `isCanonicalDesignStoragePath(path, "originals")`. Phase 3C review confirms:

* No change to original path format
* Derivative paths validated on `updateDesign` with `isCanonicalDesignStoragePath(path, "thumbnails" | "previews")`
* `originalPath` on document must match uploaded object before derivatives reference the design

---

## 12. Hook Layer Changes

### 12.1 `useSinglePngImport`

| Change | Detail |
| --- | --- |
| Progress phases | Add `generating-derivatives` / include in upload phase messaging |
| Result type | Extend with `importSuccess`, `pipelineSuccess`, `derivativesReady` tiers |
| Error display | Distinguish import success + pipeline failure (partial success) |

### 12.2 `useBatchImport`

| Change | Detail |
| --- | --- |
| Progress model | Add `generating` phase to unified progress shape |
| Upload report | Surface `importSuccess` / `pipelineSuccess` / `derivativeFailed` counts per tier |
| Warnings | Partial success when import succeeded but pipeline failed |

### 12.3 Hook rules (unchanged)

Hooks coordinate services and state; they do not contain `sharp` logic, ZIP logic, or raw Firebase calls.

### 12.4 `useDesigns` / Design Library hooks

| Change | Detail |
| --- | --- |
| Optional refresh | After import complete, designs with `ready` appear in default filter |
| URL resolution | New `useDesignAssetUrl(catalogPath)` hook wrapping `designStorageUrlService` |

---

## 13. UI Layer Changes

### 13.1 Imports page

| Area | Change |
| --- | --- |
| `ImportResultPanel` | Show derivative status on success (ready vs imported-with-warning) |
| `BatchImportResultPanel` | Add derivative summary counts |
| `BatchImportProgressPanel` | Show `generating` / `uploading-derivatives` phase labels |
| Partial success copy | Clear message when original imported but thumbnail failed |

### 13.2 Design Library

| Component | Change |
| --- | --- |
| `DesignCard` | Replace static placeholder with resolved thumbnail URL; fallback when missing/loading/error |
| `DesignThumbnailPanel` | Accept catalog path **or** URL; resolve via `designStorageUrlService` |
| `DesignDetailsModal` | Show preview image from `previewPath`; loading/error states |
| New `DesignAssetImage` (optional shared) | Centralize resolve + fallback + lazy load |

### 13.3 UI behavior while derivatives missing

| State | Grid behavior | Detail modal behavior |
| --- | --- | --- |
| `imported`, empty `thumbnailPath` | Placeholder "Preview pending" (current) | Show original metadata; preview pending message |
| `processing` | Optional subtle loading indicator | Processing message |
| `ready`, paths set | Render WebP images | Render preview |
| URL resolve failure | Placeholder + optional retry | Error message |

### 13.4 Styling

Follow `docs/STYLE_GUIDE.md`:

* Use existing `design-card-thumbnail`, `design-thumbnail-panel` classes
* Theme-aware borders and fallbacks
* Light/dark mode for images and placeholders
* No inline styles for static layout

### 13.5 Components must not

* Import `firebase/*`
* Call `window.freshPrints` directly (use hooks/services)
* Read local filesystem paths

---

## 14. Security Review

| Area | Phase 3C requirement | Status |
| --- | --- | --- |
| Session ownership | Unchanged batch/single session gates on `READ_SELECTED_PNG_BYTES` | Preserve |
| Dialog-origin trust | No new path-based derivative inputs during import | Preserve |
| IPC surface | Extend existing read channel — no new import invoke for derivatives | Required |
| IPC payload size | Enforce 50 MB cap on read (unchanged) | Preserve |
| Backfill IPC | Optional separate generate channel; bytes-only; size cap | Optional Step 12 |
| ZIP / folder protections | Unchanged — derivatives run inside gated read | Preserve |
| Temp directory jail | Unchanged | Preserve |
| Renderer filesystem | No new access | Preserve |
| Storage rules | Staff-only derivative write; WebP only; canonical filename; 10 MB cap | **Update required** |
| Firestore rules | No change expected — staff update via `designService` | Preserve |
| Customer access | Thumbnails/previews remain staff-only in Storage until Phase 6 | Preserve |
| Privilege escalation | No new roles; `importDesigns` + staff Storage rules | Preserve |
| Secrets | No admin SDK in Electron | Preserve |

Document updates: `docs/SECURITY.md`, `docs/setup/electron-security-setup.md`, `docs/setup/firebase-storage-setup.md`.

---

## 15. Failure Recovery Strategy

### 15.1 Per-stage failures

| Stage | Failure | Recovery |
| --- | --- | --- |
| Derivative generation (main) | OOM, corrupt PNG, sharp error | No Storage writes; design stays `imported`; report error |
| Thumbnail upload | Storage permission, network | No path update; retry import/backfill later |
| Preview upload after thumbnail | Network | Delete thumbnail object; design stays `imported` |
| `updateDesign` / `markDesignReady` after uploads | Firestore error or validation failure | Delete both derivative objects; design stays `imported` |
| Firestore create (3A pattern) | After original upload | Delete original — **unchanged** |
| Batch partial failure | Mixed outcomes | Per-file results; no batch-wide rollback |

### 15.2 Cleanup helpers

Extend `importUploadService`:

```txt
deleteThumbnailWebp(designId)
deletePreviewWebp(designId)
deleteDesignDerivatives(designId)  // both
```

Log cleanup failures; surface `cleanupWarning` on file result (match Phase 3B pattern).

### 15.3 Backfill recovery (optional)

For designs stuck at `imported` with empty paths:

* Staff-triggered "Generate derivatives" action (defer UI to 3C optional or follow-up)
* Or batch admin tool in dev console

### 15.4 No automatic Firestore delete on derivative failure

Deleting the catalog record when derivatives fail would lose valid originals. **Retain record.**

---

## 16. Performance Considerations

| Concern | Mitigation |
| --- | --- |
| Memory (large PNGs) | Single IPC round-trip; release buffers after upload; 50 MB cap on source |
| Main-process CPU / memory (`sharp`) | **Dedicated concurrency limit: 1** — global queue/mutex in main |
| Renderer upload parallelism | **`UPLOAD_CONCURRENCY = 2`** — unchanged from Phase 3B |
| IPC buffer copy | One transfer main → renderer per file (original + derivatives); no renderer → main round-trip during import |
| Duplicate Storage download | Do not download original during import flow |
| `getDownloadURL` churn | Cache URLs per path in `designStorageUrlService` (TTL 5–15 min) |
| Design Library grid N+1 | Batch URL resolution or lazy load on card visibility |
| 100 designs per query limit | Existing debt — imports may create >100 `ready` designs; pagination deferred |
| WebP size | Quality constants tuned to keep thumbnails <100 KB typical; 10 MB Storage rule cap |

### 16.1 Concurrency model (locked)

| Stage | Concurrency | Rationale |
| --- | --- | --- |
| **`sharp` decode/encode (main)** | **1** | Large PNG decode can exceed file size in memory; parallel sharp on 2 batch workers risks OOM |
| **Batch original + derivative upload (renderer)** | **2** | Network-bound; existing `UPLOAD_CONCURRENCY` |
| **Derivative generation timing** | Inline in read handler | Runs before IPC return; queued behind sharp mutex if multiple reads pending |

**Interaction:** With upload concurrency 2, two files may be in flight — one uploading while main processes the next read+generate. Sharp still runs **one at a time** via `sharpConcurrencyQueue`. Do not tie sharp concurrency to upload concurrency.

Avoid separate unbounded derivative pool.

---

## 17. Testing Strategy

### 17.1 Unit tests (main process)

| Target | Cases |
| --- | --- |
| `derivativeGenerator` | Aspect ratio preserved; max dimensions enforced; WebP output magic |
| Path validation | Unchanged |

### 17.2 Integration tests (manual — primary for 3C)

| ID | Test | Success tier |
| --- | --- | --- |
| T1 | Single PNG import → Design Library shows thumbnail → status `ready` | Pipeline + UI |
| T2 | Batch folder import → all valid PNGs → thumbnails visible | Pipeline + UI |
| T3 | Batch ZIP import → derivatives + temp cleanup | Pipeline |
| T4 | Force derivative failure (e.g. deny Storage rules) → design stays `imported`, original retained | Import only |
| T5 | Preview upload fails after thumbnail → thumbnail deleted, no orphan | Import only |
| T6 | `markDesignReady` fails after uploads → both derivatives deleted; stays `imported` | Import only |
| T7 | Design Details preview renders | UI (signoff gate) |
| T8 | Imported filter shows in-progress; Ready filter shows completed | Pipeline |
| T9 | Single PNG regression — full 3A flow still works | Import |
| T10 | Batch cancel/reset — unchanged behavior | Regression |
| T11 | Light/dark theme on image cards | UI (signoff gate) |
| T12 | Large PNG near 50 MB — completes without OOM | Pipeline |
| T13 | Import result UI shows import success vs pipeline success distinctly | UX |
| T14 | Batch summary reports `importSuccess` and `pipelineSuccess` counts separately | UX |

**Signoff gate:** T1, T7, T11 require Steps 9–10 (Design Library URL resolution + rendering) complete. Phase 3C cannot be signed off until UI rendering is verified.

### 17.3 Security tests

| Test | Expected |
| --- | --- |
| Read bytes without valid session / batch job | Rejected (unchanged) |
| Oversized read payload / file | Rejected |
| Customer user Storage write to `/thumbnails/` | Denied by rules |
| Non-WebP upload to `/thumbnails/` | Denied by rules |
| Derivative file over 10 MB | Denied by rules |

### 17.4 Firebase deploy verification

- [ ] `firebase deploy --only storage`
- [ ] Staff can upload WebP to thumbnails/previews
- [ ] Non-staff cannot

---

## 18. Risks

### Low

| Risk | Mitigation |
| --- | --- |
| UI polish (loading states, blur) | Shared `DesignAssetImage` component |
| Filter confusion (`imported` vs `ready`) | Clear badges; auto-transition in same import action |
| WebP browser support in Electron | Chromium supports WebP |

### Medium

| Risk | Mitigation |
| --- | --- |
| `sharp` native dependency build | Document electron-rebuild; CI build matrix |
| Large batch operational testing | Soak test 50–100 files in staging |
| Temp / derivative cleanup edge cases | Best-effort delete + stale job cleanup |
| Long-running upload + derivative on slow network | Per-file timeout messages; partial success reporting |
| Design Library URL cache staleness | TTL + invalidate on design update |

### High

| Risk | Mitigation |
| --- | --- |
| Storage rules not deployed before QA | Step 4 deploy gate; T4; block signoff without deploy verification |
| `sharp` OOM on large PNGs with concurrent upload | Sharp concurrency = 1; single IPC round-trip |

**Resolved by plan modification:** Double IPC transfer of full PNG buffers — eliminated by extending read handler.

---

## 19. Deferred Technical Debt

| Item | Notes |
| --- | --- |
| Per-file / batch retry | Failed derivatives require re-run or backfill tool |
| Upload cancellation during derivatives | Not supported in 3B or 3C |
| Automated E2E tests | Manual signoff for 3C |
| Design Library pagination >100 | Phase 2B+ |
| Customer-facing thumbnail CDN policy | Phase 6 |
| Resumable uploads | Profile first |
| Strict DPI rejection default-on | Business decision |
| Export rejection report | Optional polish |
| Persistent import history | Future |
| Cloud Functions derivative generation | Only if desktop limits hit |

---

## 20. Implementation Sequence

Implement in order. Do not skip Storage rules deployment before upload QA.

### Step 1 — Kickoff decisions

* Approve `sharp` dependency (`docs/AI_RULES.md` justification)
* Lock thumbnail/preview dimension and quality constants
* Lock derivative failure policy (retain `imported` vs fail entire file)
* Confirm strict DPI toggle default (recommend: off)

### Step 2 — Constants and types

* `shared/constants/import/derivativeGeneration.constants.ts` — include `SHARP_CONCURRENCY = 1`
* Extend `shared/types/import/importIpc.types.ts` — read response with derivative fields
* Extend orchestration result types with `importSuccess` / `pipelineSuccess` tiers

### Step 3 — Main process derivative generator

* `derivativeGenerator.ts` with unit tests
* `sharpConcurrencyQueue.ts` — global mutex, max 1 concurrent sharp operation
* **Extend** `readSelectedPngFileBytes` handler — generate derivatives before IPC return
* Extend preload + `importDesktopService` response types (no new import invoke channel)
* Optional: `generateDesignDerivatives.ts` for backfill only (Step 12)

### Step 4 — Storage layer

* `designDerivativeStorageService` — WebP uploads/deletes at canonical paths (`uploadThumbnailWebp`, `uploadPreviewWebp`, delete helpers)
* Client validation — `shared/utils/derivativeWebpValidation.ts` (bytes, WebP magic, 10 MB cap)
* Extend `storage.rules` — WebP only, canonical filename, **10 MB cap**, staff-only
* Deploy Storage rules to dev project (`firebase deploy --only storage`)
* Update `docs/setup/firebase-storage-setup.md`

**Status:** Implemented in Phase 3C Step 5 (rules + service + validation). Firestore updates and orchestration remain Step 6+.

### Step 5 — Derivative orchestration service

* `importDerivativeService.ts` — use derivative bytes from read response → upload → `markDesignReady`
* Rollback on partial failure
* Integrate into `importValidatedPngFile` (single-file only)

**Status:** Implemented in Phase 3C Step 7 (`importDerivativeService` + single PNG orchestration). **Correction:** pipeline success keeps `status: imported`; `ready` reserved for post-AI review. Batch wiring remains Step 8.

### Step 6 — Status lifecycle

* `designReadyService.markDesignProcessing` — `imported` → `processing`
* `designReadyService.markDesignReady` — path validation (Section 10.6) + `processing`/`imported` → `ready`
* Audit fields preserved via `designService.updateDesign` (`updatedAt`, `updatedBy`; `createdAt`, `createdBy`, `uploadedBy` unchanged)
* Wire `imported` → `processing` → `ready` in orchestration (Step 7+)

**Status:** Implemented in Phase 3C Step 6 (`designReadyService`). Import pipeline wiring in Step 7.

### Step 7 — Single-file import integration

* `importValidatedPngFile` — read with derivatives, full pipeline for single PNG
* `ImportResultPanel` — import vs pipeline success messaging
* `useSinglePngImport` — partial success handling

**Status:** Implemented in Phase 3C Step 7. Batch import integration remains Step 8.

### Step 8 — Batch import integration

* `importValidatedPngFile` with `jobId` — batch read with `includeDerivatives: true`
* `importBatchOrchestrationService` — per-file pipeline + derivative outcome fields
* `BatchImportResultPanel` — derivative complete / failed summary
* Batch progress copy for derivative steps

**Status:** Implemented in Phase 3C Step 8. Design Library rendering remains Step 10.

### Step 8A — Batch validation warning visibility

* Discovery summary — `Files with warnings` count (files with warnings, not total warning messages)
* Validated file list — per-file warning messages from existing manifest validation data

**Status:** Implemented in Phase 3C Step 8A (UI only).

### Step 8B — Batch manual exclude from upload

* Per-file include/exclude toggle before upload (UI state only)
* Excluded files skipped by `importBatchOrchestrationService` — no Storage/Firestore side effects
* Discovery summary **Excluded** count; upload summary **Skipped by user**

**Status:** Implemented in Phase 3C Step 8B (UI + batch upload filter only).

### Step 9 — Design Library URL resolution

**Status:** Implemented in Phase 3C Step 9.

* `designDerivativeUrlService.ts` — `getThumbnailUrl`, `getPreviewUrl`, `getDownloadUrlForCatalogPath`
* `designDerivativeUrlCache.ts` — in-memory path → URL cache with in-flight deduplication
* `useDesignDerivativeUrl` hook
* `DesignCard` thumbnail via `thumbnailPath`
* `DesignThumbnailPanel` / `DesignDetailsModal` preview via `previewPath`
* Loading/unavailable fallbacks; no layout redesign

### Step 10 — Design Library rendering (**signoff gate**)

**Status:** Implemented in Phase 3C Step 10 (polish + signoff prep). **Not approved** — manual QA pending.

* `DesignThumbnailPanel` — loading spinner, unavailable/broken-image fallbacks, fixed aspect ratio
* `DesignCard` — decorative thumbnail (`contain`); `DesignDetailsModal` — preview (`contain`) + lightbox
* Accessibility — `aria-busy`, decorative vs informative images, screen-reader-friendly placeholders
* `docs/reviews/phase-3c-signoff-draft.md` — draft checklist for final signoff
* **Manual QA T1, T7, T11 must pass before signoff**

### Step 11 — Optional: strict DPI toggle

* Constants flag in main validator
* Warning vs reject policy documented

### Step 12 — Optional: backfill tool

* Process existing `imported` designs without derivatives

### Step 13 — Documentation and signoff

* Update `WORKFLOWS.md` — `imported` / `ready` definitions; `processing` semantics (Section 6.2)
* Update `FIREBASE.md`, `SECURITY.md`, `ROADMAP.md`
* Manual QA checklist (including signoff gate tests)
* `docs/reviews/phase-3c-signoff.md`

**Checkpoint:** Steps 7–8 may proceed before Steps 9–10, but **signoff requires Steps 9–10 complete** with Design Library rendering verified.

---

## 21. Exit Criteria

Phase 3C is complete when all criteria below are met. Distinguish **import success** and **pipeline success** per Section 4.3.

### Import success (required for every valid PNG)

- [ ] Original PNG uploaded to Storage
- [ ] Firestore design document created with `status: "imported"`
- [ ] Single-file and batch import regression passes (T9, T10)
- [ ] Partial pipeline failure reported clearly — does not mask import success

### Pipeline success (required when derivatives succeed)

- [ ] Thumbnail WebP generated (main, inside session-gated read)
- [ ] Preview WebP generated (main, inside session-gated read)
- [ ] Thumbnail uploaded to `/thumbnails/{designId}.webp`
- [ ] Preview uploaded to `/previews/{designId}.webp`
- [ ] `thumbnailPath` and `previewPath` populated via `markDesignReady`
- [ ] `markDesignReady` validates `originalPath`, `thumbnailPath`, `previewPath` before `ready`
- [ ] `status` transitions to `ready` when pipeline succeeds
- [ ] Designs with pipeline failures remain `imported` with original retained

### Design Library rendering (**signoff gate — required**)

- [ ] `designStorageUrlService` resolves catalog paths without persisting URLs in Firestore
- [ ] Design Library grid shows real thumbnails for `ready` designs (T1, T11)
- [ ] Design Details shows preview image when `previewPath` populated (T7)
- [ ] **Phase 3C cannot be approved until UI rendering is verified**

### Infrastructure and architecture

- [ ] Storage rules deployed for `/thumbnails/` and `/previews/` (WebP, 10 MB cap, staff-only)
- [ ] Single IPC round-trip for read + generate — no double PNG transfer during import
- [ ] `sharp` concurrency limited to 1 in main process
- [ ] No Firebase calls in UI components
- [ ] No renderer filesystem access introduced
- [ ] `App.tsx` unchanged (routes/providers only)
- [ ] AI readiness preserved (`originalPath`, `aiProcessed: false`)

### Signoff

- [ ] Phase 3C signoff recorded (`docs/reviews/phase-3c-signoff.md`)
- [ ] Phase 3 (3A + 3B + 3C) exit criteria from `import-pipeline-plan.md` satisfied

### Phase 3 complete (parent milestone)

After Phase 3C signoff, the import pipeline milestone from `docs/plans/import-pipeline-plan.md` is complete for desktop staff imports:

* Individual PNG, folder, and ZIP sources
* Validation with reported rejections
* Original + derivative Storage uploads
* Firestore catalog records via `designService`
* Design Library presentation with real thumbnails

---

## Appendix A — Target folder structure (Phase 3C additions)

```txt
electron/
├── ipc/import/
│   ├── readSelectedPngFileBytes.ts         (extend — generate before return)
│   ├── generateDesignDerivatives.ts        (optional — backfill only)
│   └── importIpcChannels.ts                (extend types only for import flow)
└── services/import/
    ├── derivativeGenerator.ts              (new)
    └── sharpConcurrencyQueue.ts            (new)

shared/
├── constants/import/
│   └── derivativeGeneration.constants.ts   (new — includes SHARP_CONCURRENCY)
└── types/import/
    └── importIpc.types.ts                  (extend read response)

src/renderer/src/features/
├── imports/
│   ├── services/
│   │   ├── importDerivativeService.ts      (new)
│   │   └── importUploadService.ts          (extend)
│   └── hooks/                              (extend)
└── designs/
    ├── services/
    │   └── designStorageUrlService.ts      (new)
    └── components/                         (extend DesignCard, panels)

storage.rules                                 (extend — WebP, 10 MB, staff-only)
```

---

## Appendix B — Alignment with prior signoffs

| Document | Relevance |
| --- | --- |
| `docs/reviews/phase-3a-final-signoff.md` | Original upload + create; empty derivative paths by design |
| `docs/reviews/phase-3b-signoff.md` | Batch pipeline; explicit handoff to 3C for derivatives |
| `docs/reviews/phase-3b-step10-signoff.md` | UI layer; partial success reporting extended in 3C |
| `docs/plans/phase-3b-implementation-plan.md` | Locked deferrals (thumbnails, strict DPI, retry) |
| `docs/reviews/phase-3c-plan-review.md` | Seven modifications incorporated in this revision |

---

## Appendix C — Open decisions (resolve at Step 1 kickoff)

1. **Exact thumbnail/preview dimensions and WebP quality** — values proposed in Sections 8–9; confirm with business/ops.
2. **Use `processing` status during derivatives** — recommended yes; `imported` / `ready` definitions locked in Section 6.2.
3. **Strict DPI rejection** — default off; confirm before enabling toggle.
4. **`sharp` version and Electron rebuild** — confirm compatibility with current `electron-builder` target; document in `docs/setup/electron-security-setup.md`.
5. **Backfill in 3C vs follow-up** — recommend optional Step 12; uses separate backfill IPC only.
6. **Customer thumbnail read rules** — remain staff-only until Phase 6 catalog launch.

---

## Appendix D — Plan review modifications incorporated

This revision incorporates all required modifications from `docs/reviews/phase-3c-plan-review.md`:

| # | Modification | Sections updated |
| --- | --- | --- |
| 1 | IPC byte flow — extend session-gated read; single round-trip | 2.1, 3.1, 3.5, 8.2, 8.4, 11.1, 14, 16, 20 Step 3, 21, Appendix A |
| 2 | WORKFLOWS clarification — `imported` / `ready` definitions; Phase 7 out of scope | 6.2, 6.4, 20 Step 13 |
| 3 | `markDesignReady` validation | 10.6, 11.2, 17.2 T6, 21 |
| 4 | Storage rules — WebP, filename pattern, 10 MB cap, staff-only | 7.3, 17.3, 21 |
| 5 | Sharp concurrency = 1 | 1, 16.1, 20 Step 2–3, 21 |
| 6 | Import success vs pipeline success tiers | 4.3, 10.1–10.2, 12.1–12.2, 17.2, 21 |
| 7 | Signoff requires Design Library rendering | 4.3, 17.2, 20 Step 10, 21 |

---

## Recommendation

**Approved with modifications — modifications incorporated in this plan revision.**

Phase 3B is complete and approved. Phase 3C is the final import-pipeline sub-phase. Implementation may begin after Step 1 kickoff decisions (Appendix C) are recorded.

Do **not** begin Phase 4 (search), Phase 6 (queue), or Phase 7 (AI) until Phase 3C signoff is recorded with Design Library rendering verified.

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/CODING_STANDARDS.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/ROADMAP.md`, `docs/SECURITY.md`, `docs/STYLE_GUIDE.md`, `docs/WORKFLOWS.md`, `docs/plans/import-pipeline-plan.md`, `docs/plans/phase-3b-implementation-plan.md`, `docs/reviews/phase-3a-final-signoff.md`, `docs/reviews/phase-3b-signoff.md`, `docs/reviews/phase-3b-step10-signoff.md`, `docs/reviews/phase-3c-plan-review.md`*
