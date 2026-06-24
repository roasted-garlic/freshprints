# Phase 3C Kickoff — Derivative Asset Generation

## Purpose

This document **locks implementation decisions** for Phase 3C before any derivative-generation code is written.

Phase 3C completes the desktop import pipeline started in Phase 3A/3B: WebP thumbnail and preview generation, Storage uploads, Firestore path population, `imported` → `ready` transition, and Design Library image rendering.

**Parent plan:** `docs/plans/phase-3c-implementation-plan.md`  
**Plan review:** `docs/reviews/phase-3c-plan-review.md` — approved with modifications incorporated  
**Prerequisites:** Phase 3A complete (`docs/reviews/phase-3a-final-signoff.md`), Phase 3B complete (`docs/reviews/phase-3b-signoff.md`)

**Kickoff date:** 2026-06-20  
**Status:** Step 1 complete — **Step 2 (constants and types) may begin**

---

## Goal

After a successful Phase 3A/3B import (original in Storage, Firestore record at `status: "imported"`), Phase 3C:

1. Generates WebP thumbnail and preview derivatives in the Electron main process
2. Uploads derivatives to canonical Storage paths
3. Populates `thumbnailPath` and `previewPath` via `designService.markDesignReady`
4. Transitions eligible designs to `status: "ready"`
5. Renders real images in the Design Library grid and detail views

Phase 3C does **not** deliver AI enrichment, show queue integration, customer catalog access, or import job persistence.

---

# Locked Decisions

## 1. Thumbnail dimensions and quality

| Decision | Value |
| --- | --- |
| **Max width** | **320 px** |
| **Max height** | **320 px** |
| **Resize mode** | Fit inside box; **preserve aspect ratio** |
| **WebP quality** | **80** |
| **Output format** | **WebP** (`image/webp`) |
| **Preserve transparency** | **Yes** — encode with alpha when source PNG has transparency (DTF artwork) |
| **Allow upscaling** | **No** — if source dimensions are already ≤ 320 px on both axes, output matches source dimensions (no enlargement) |

**Rationale:**

* 320 px max width aligns with existing import UI preview (`PNG_PREVIEW_MAX_WIDTH_PX = 320` in `electron/ipc/import/getSelectedPngPreview.ts`).
* Downscale-only matches Phase 3A preview behavior (resize only when `width > max`).
* WebP quality 80 balances grid performance and visual clarity; typical thumbnail target &lt; 100 KB.

**Constant names (Step 2):**

```txt
THUMBNAIL_MAX_WIDTH_PX = 320
THUMBNAIL_MAX_HEIGHT_PX = 320
THUMBNAIL_WEBP_QUALITY = 80
DERIVATIVE_ALLOW_UPSCALE = false
DERIVATIVE_PRESERVE_ALPHA = true
```

**Storage path:** `/thumbnails/{designId}.webp`

---

## 2. Preview dimensions and quality

| Decision | Value |
| --- | --- |
| **Max width** | **1280 px** |
| **Max height** | **1280 px** |
| **Resize mode** | Fit inside box; **preserve aspect ratio** |
| **WebP quality** | **85** |
| **Output format** | **WebP** (`image/webp`) |
| **Preserve transparency** | **Yes** — same as thumbnail |
| **Allow upscaling** | **No** — downscale only when source exceeds max dimension |

**Rationale:**

* 1280 px provides medium-resolution detail for `DesignDetailsModal` without duplicating full print-resolution originals.
* Slightly higher quality (85) than thumbnail for detail view.

**Constant names (Step 2):**

```txt
PREVIEW_MAX_WIDTH_PX = 1280
PREVIEW_MAX_HEIGHT_PX = 1280
PREVIEW_WEBP_QUALITY = 85
```

**Storage path:** `/previews/{designId}.webp`

**Catalog metadata:** Firestore `width` / `height` / `dpi` remain **source PNG** values from validation — do not overwrite with derivative pixel dimensions.

---

## 3. Status lifecycle

| Decision | Value |
| --- | --- |
| **Phase 3C lifecycle** | **`imported` → `processing` → `ready`** |
| **Skip `processing`?** | **No** — use `processing` during derivative upload and Firestore update |

### Status definitions (Phase 3C)

| Status | Meaning |
| --- | --- |
| **`imported`** | Original uploaded; Firestore record created; derivatives **not complete** (`thumbnailPath` / `previewPath` empty) |
| **`processing`** | Short-lived state after `imported` while derivative Storage uploads and path updates are in progress |
| **`ready`** | Derivatives generated and uploaded; `thumbnailPath` and `previewPath` populated; `markDesignReady` validation passed |

### Exact transition behavior

```txt
createDesign({ status: "imported", thumbnailPath: "", previewPath: "" })
    → IMPORT SUCCESS tier
    ↓
updateDesign({ status: "processing" })     // required in Phase 3C
    ↓
upload thumbnail + preview (renderer)
    ↓
markDesignReady({ thumbnailPath, previewPath })
    → status: "ready"
    → PIPELINE SUCCESS tier
```

**On derivative failure:**

* Revert or never leave `processing` — design ends at **`imported`**
* Original and Firestore record **retained**

**On pipeline failure after `processing`:**

* `updateDesign({ status: "imported" })` if needed to revert from `processing`

**Out of scope:** Phase 7 AI transitions (`ready` → `processing` → `ready` for AI) are documented in Step 13 (`WORKFLOWS.md`) but not implemented in Phase 3C.

---

## 4. Strict DPI rejection

| Decision | Value |
| --- | --- |
| **Default policy** | **Warn-only** (unchanged from Phase 3A/3B) |
| **Strict DPI rejection** | **Off** — not enabled in Phase 3C default build |
| **Missing DPI metadata** | **Warning only** — import continues |
| **DPI below 300 (`MIN_DPI`)** | **Warning only** — import continues |
| **Optional strict toggle** | Deferred to **Step 11** (optional); default **off** if implemented |

**Rationale:**

* Phase 3A kickoff and Phase 3B signoff established warn-only DPI behavior.
* Phase 3C focuses on derivatives and library rendering; changing rejection policy is optional polish, not a signoff requirement.
* Strict rejection requires explicit business approval before enabling the Step 11 toggle.

**Constants (unchanged):**

```txt
MIN_DPI = 300   // shared/constants/importValidation.constants.ts
```

---

## 5. Sharp dependency approval

| Decision | Value |
| --- | --- |
| **Add `sharp` dependency** | **Approved for Step 2** |
| **Install in Step 1** | **No** — documentation only in this kickoff |
| **Install timing** | Step 2 or Step 3 when main-process generator is implemented |

### Why `sharp` is needed

* Phase 3C must produce high-quality WebP thumbnails and previews from large print-resolution PNGs (up to 50 MB).
* Renderer Canvas / `createImageBitmap` struggles with large DTF artwork and increases renderer memory pressure.
* `sharp` provides reliable resize, WebP encode, and alpha-channel handling in Node.js.

### Why Electron main process

* Filesystem read and validation already run in main (session-gated IPC).
* Derivative generation is integrated **inside** the read handler — same process, no renderer filesystem access.
* Matches `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/AI_RULES.md` layer rules.
* Phase 3A import UI preview uses `nativeImage` for display only; production derivatives need consistent WebP output separate from that path.

### Risks of native dependency

| Risk | Mitigation |
| --- | --- |
| Platform-specific native binaries | Test on Windows x64 (primary target per `electron-builder.json5`) before signoff |
| Electron ABI mismatch after upgrade | Pin `sharp` version; run `electron-rebuild` after install; verify in dev build |
| Build/packaging failures | Document steps in `docs/setup/electron-security-setup.md` during Step 3 |
| OOM on large PNG decode | `SHARP_CONCURRENCY = 1` (see §6); 50 MB source cap preserved |

### Electron rebuild / build implications

* **Current stack:** Electron `^30.0.1`, electron-builder `^24.13.3`, Windows x64 NSIS target.
* After `npm install sharp`, run native rebuild for Electron (e.g. `npx electron-rebuild` or equivalent per `sharp` docs for this Electron version).
* Verify `npm run dev` and packaged build smoke test after sharp install.
* **Exact `sharp` version** is selected at Step 2 after compatibility check against Electron 30 — not locked in this kickoff.

### Approval statement

**Approved:** `sharp` may be added to `package.json` during **Step 2** (constants/types) or **Step 3** (main-process generator). Dependency justification recorded per `docs/AI_RULES.md`.

---

## 6. Sharp concurrency

| Decision | Value |
| --- | --- |
| **`sharp` processing concurrency** | **1** (global mutex / queue in main process) |
| **Renderer upload concurrency** | **2** (`UPLOAD_CONCURRENCY` — unchanged from Phase 3B) |

### Rationale

* `sharp` decodes PNGs into bitmaps that can exceed file size in memory.
* With upload concurrency 2, two files may be in flight, but **only one `sharp` decode/encode runs at a time**.
* Parallel `sharp` on two large print PNGs risks main-process OOM on staff workstations.
* Upload work is network-bound and safely parallelized at 2.

**Constant (Step 2):**

```txt
SHARP_CONCURRENCY = 1
```

**Module (Step 3):** `electron/services/import/sharpConcurrencyQueue.ts`

---

## 7. IPC model

| Decision | Value |
| --- | --- |
| **Import flow IPC** | **Extend** existing `fresh-prints:import:read-selected-png-bytes` |
| **Derivative generation location** | **Inside** session-gated read handler (main process) |
| **Standalone renderer → main byte transfer (import)** | **No** — eliminated |
| **Standalone generate channel** | **Backfill only** (optional Step 12) — not used in `importValidatedPngFile` |

### Locked import flow

```txt
validateReadPngFileBytesRequest (single session + batch jobId gates)
    ↓
read file from disk (main)
    ↓
derivativeGenerator.generateFromPngBytes (main, sharp queue)
    ↓
single IPC return { bytes, thumbnailBytes, previewBytes, dimensions, ... }
    ↓
renderer: upload original → createDesign (imported)
    ↓
renderer: upload derivatives → markDesignReady (ready)
```

**Security preserved:**

* Same trust gates as Phase 3A/3B byte reads
* No new import invoke channel required
* No double transfer of up to 50 MB PNG buffers per file

**Backfill IPC (optional Step 12 only):**

```txt
fresh-prints:import:generate-design-derivatives
```

* Accepts renderer-supplied bytes (from Storage download)
* Not used during normal single-file or batch import

---

## 8. Storage rules

| Decision | Value |
| --- | --- |
| **Thumbnail path** | `/thumbnails/{designId}.webp` |
| **Preview path** | `/previews/{designId}.webp` |
| **Format** | **WebP only** (`contentType == "image/webp"`) |
| **Filename pattern** | `{designId}.webp` where `designId` matches `[A-Za-z0-9_-]+` |
| **Size cap** | **10 MB** per derivative object |
| **Staff access** | Read, create, update, delete — **staff only** (`owner`, `admin`, `helper`, active) |
| **Customer access** | **Denied** in Phase 3C |
| **Customer access timing** | Phase 6+ catalog launch — out of scope for 3C |

### Implementation requirements (Step 4)

* Add `isCanonicalDerivativeFileName(fileName)` mirroring originals pattern
* Add `isValidDerivativeUpload()` with 10 MB cap and WebP content-type check
* Match rules for `/thumbnails/{fileName}` and `/previews/{fileName}`
* Deploy: `firebase deploy --only storage` before derivative upload QA
* Update `docs/setup/firebase-storage-setup.md` and `docs/SECURITY.md`

**Signoff gate:** Storage rules must be deployed and verified before Phase 3C signoff.

---

## 9. Failure policy

| Decision | Value |
| --- | --- |
| **Original on derivative failure** | **Retain** — never delete original on derivative-only failure |
| **Firestore record on derivative failure** | **Retain** — stay `status: "imported"` (or revert from `processing`) |
| **Delete design record on derivative failure** | **No** |
| **Partial derivative uploads** | **Roll back** — delete uploaded thumbnail/preview objects on failure |
| **`markDesignReady` validation failure** | **No `ready`** — delete both derivatives if already uploaded |

### Outcome tiers

| Tier | Condition |
| --- | --- |
| **Import success** | Original uploaded + Firestore `imported` record created |
| **Pipeline success** | Derivatives uploaded + paths set + `markDesignReady` → `ready` |
| **Partial success** | Import success without pipeline success — reported clearly in UI |

### Rollback matrix

| Failure point | Action |
| --- | --- |
| Derivative generation (main / sharp) | No Storage writes; stay `imported` |
| Thumbnail upload fails | No path update; stay `imported` |
| Preview upload after thumbnail succeeded | Delete thumbnail object; stay `imported` |
| `markDesignReady` fails after both uploads | Delete both derivative objects; stay `imported` |
| Firestore create fails after original upload | Delete original — **unchanged Phase 3A behavior** |

---

## 10. Backfill

| Decision | Value |
| --- | --- |
| **Backfill for existing `imported` designs** | **Deferred** — follow-up after Phase 3C signoff |
| **Optional Step 12 in plan** | **Not in default 3C scope** unless required for QA |
| **Backfill IPC channel** | Build only if backfill is scoped into implementation |

### Rationale

* Phase 3C signoff validates forward import flow (single + batch).
* Existing `imported` records without derivatives can be processed in a follow-up tool or optional Step 12 if QA discovers a blocking need.
* Deferring backfill keeps Step 2–10 focused on the primary pipeline.

**Exception:** If manual QA cannot verify library rendering without backfilling pre-existing test data, a minimal backfill path may be added during implementation — requires explicit scope note in Step 12, not default signoff requirement.

---

## 11. Signoff gate

Phase 3C **cannot be signed off** until all items below pass manual QA.

### Pipeline

- [ ] Single PNG import produces thumbnail and preview WebP in Storage
- [ ] Batch import (folder and ZIP) produces derivatives per valid file
- [ ] `thumbnailPath` and `previewPath` populated on pipeline success
- [ ] `status` transitions `imported` → `processing` → `ready` on pipeline success
- [ ] `markDesignReady` validates paths before `ready`
- [ ] Derivative failure leaves design at `imported` with original retained
- [ ] Partial success reported distinctly from full pipeline success

### Design Library rendering (required — not optional)

- [ ] Design Library **grid** renders real thumbnails for `ready` designs
- [ ] Design **Details** renders preview image from `previewPath`
- [ ] URL resolution via `designStorageUrlService` — no URLs persisted in Firestore
- [ ] Light and dark theme on image cards

### Infrastructure

- [ ] Storage rules deployed for `/thumbnails/` and `/previews/` (WebP, 10 MB, staff-only)
- [ ] Single IPC round-trip for read + generate (no double PNG transfer)
- [ ] `sharp` concurrency = 1 verified under batch load

### Regression

- [ ] Single PNG import regression (Phase 3A behavior preserved)
- [ ] Batch cancel/reset regression (Phase 3B behavior preserved)
- [ ] `tsc` and lint pass
- [ ] `docs/reviews/phase-3c-signoff.md` recorded

**Checkpoint:** Steps 7–8 (import UI integration) may complete before Steps 9–10 (library rendering), but **signoff requires Steps 9–10 complete**.

---

# Success Criteria Summary

| Tier | Requirements |
| --- | --- |
| **Import success** | Original uploaded; design created; `status: "imported"` |
| **Pipeline success** | Derivatives created; paths stored; `status: "ready"`; library images render |
| **Signoff** | All §11 checklist items; library UI verified |

---

# Architecture Alignment

```txt
ImportsPage / DesignLibraryPage (components)
        ↓
useSinglePngImport / useBatchImport / useDesignAssetUrl (hooks)
        ↓
importOrchestrationService, importDerivativeService,
importUploadService, designService, designStorageUrlService (renderer)
        ↓
window.freshPrints.imports (preload — extended read response)
        ↓
readSelectedPngFileBytes + derivativeGenerator + sharpConcurrencyQueue (main)
        ↓
Firebase Storage / Firestore (renderer SDK)
```

**Forbidden:**

* Firebase calls in React components
* Renderer filesystem access
* Standalone generate IPC during normal import
* `sharp` in renderer process

---

# Implementation Sequence (reference)

Per `docs/plans/phase-3c-implementation-plan.md` §20:

| Step | Focus |
| --- | --- |
| **1** | **This kickoff** — decisions locked |
| **2** | Constants, types, `SHARP_CONCURRENCY`, outcome tiers |
| **3** | `derivativeGenerator`, `sharpConcurrencyQueue`, extend read handler |
| **4** | Storage uploads, `storage.rules`, deploy |
| **5** | `importDerivativeService`, orchestration integration |
| **6** | `markDesignReady` validation |
| **7–8** | Single + batch import UI |
| **9–10** | Library URL resolution + rendering (**signoff gate**) |
| **11** | Optional strict DPI toggle (default off) |
| **12** | Backfill — **deferred** unless QA requires |
| **13** | Documentation + signoff |

---

# Risks Accepted at Kickoff

| Risk | Severity | Mitigation locked |
| --- | --- | --- |
| Native `sharp` build on Windows | Medium | Rebuild + smoke test at Step 3 |
| Large PNG memory pressure | Medium | `SHARP_CONCURRENCY = 1`; 50 MB cap |
| Storage rules not deployed | High | Step 4 gate; block signoff |
| Partial success UX confusion | Medium | Import vs pipeline tiers in UI |
| `restoreDesign` → `ready` without derivatives | Low | Pre-existing debt; out of 3C scope |

---

# Unresolved at Kickoff (resolve during implementation)

| Item | Resolve when |
| --- | --- |
| **Exact `sharp` package version** | Step 2 — after compatibility check against Electron 30.0.1 |
| **Strict DPI toggle implementation** | Step 11 only if scoped; default off |
| **Backfill tool / IPC** | Follow-up after signoff unless QA blocks without it |
| **`processing` filter in Design Library** | Optional UX — not required for signoff |

---

# Step 2 Readiness

| Gate | Status |
| --- | --- |
| Kickoff decisions locked | **Yes** |
| Plan review modifications incorporated | **Yes** |
| `sharp` approved for addition | **Yes** (install in Step 2/3, not Step 1) |
| Open decisions blocking constants | **No** |

**Phase 3C Step 2 may begin.**

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/CODING_STANDARDS.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, `docs/WORKFLOWS.md`, `docs/plans/phase-3c-implementation-plan.md`, `docs/reviews/phase-3c-plan-review.md`, `docs/reviews/phase-3a-final-signoff.md`, `docs/reviews/phase-3b-signoff.md`, `docs/plans/phase-3a-kickoff.md`*
