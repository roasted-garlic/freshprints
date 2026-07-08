# Plan: Auto-Upscale Underpowered Imports to 300 DPI / 10" Wide

**Date:** 2026-07-06
**Status:** Draft — awaiting review

## Problem

Today, `assessPrintSizeCapability` (`shared/utils/printSizeMath.ts`) only
*assesses* whether an imported PNG's native pixel dimensions support 300 DPI
at the preferred 10" width. If they don't, the import proceeds anyway and the
Imports page shows a warning (`PRINT_SIZE_BELOW_PREFERRED` /
`PRINT_SIZE_SMALL_FORMAT` / `PRINT_SIZE_TERRIBLE`) — no pixel data is ever
resampled. Staff have asked that instead of just warning, the app
automatically upscale any image that doesn't meet 300 DPI at 10" wide, for
every way an image can be imported, and clearly tell staff when it did so.

## Scope

### In scope

All four PNG upload paths that already funnel through the shared
`validatePngFile()` / `readSelectedPngFileBytes()` /
`readBatchValidatedPngFileBytes()` choke points:

- Single PNG file picker (`electron/ipc/import/selectSinglePngFile.ts`)
- Multiple PNG files (`electron/ipc/import/multiplePngBatchDiscovery.ts`)
- Folder import (`electron/ipc/import/folderBatchDiscovery.ts`)
- ZIP import (`electron/ipc/import/zipBatchDiscovery.ts`)

When an image's native pixels can't reach `PREFERRED_PRINT_WIDTH_INCHES`
(10") at `TARGET_PRINT_DPI` (300) — i.e. native width < 3000px — upscale it
(preserving aspect ratio) so its width becomes exactly 3000px, using `sharp`
(already a dependency, already used for this exact purpose on the export
side in `electron/services/export/downloadAndResizeExportImage.ts`).

Surface this as a new warning code in the same `warnings` array already
rendered on the Imports page (single-file result panel and batch file
list/summary), consistent with how `PRINT_SIZE_BELOW_PREFERRED` etc. already
render — no new UI surface needed.

### Out of scope

- Whatnot show import (`electron/ipc/whatnotImport/*`) — does not currently
  route through `validatePngFile`/PNG bytes reading at all, and the current
  workflow state's Forbidden Actions explicitly disallow changing Whatnot
  import behavior without separate approval. Not touched by this plan.
- Any change to the existing reject threshold (`MIN_ACCEPTABLE_EFFECTIVE_DPI`
  / `meetsMinimumPixelDimensions`) — images that are rejected today (e.g.
  under ~72 DPI at their native size) are still rejected; upscaling only
  applies to images that already pass validation but land below the
  preferred 10"/300 DPI target.
- Height is not independently targeted — aspect ratio is always preserved,
  so hitting the 10"-wide-at-300-DPI pixel width automatically brings height
  up proportionally (this matches the "10 inch wide" framing of the request;
  a non-standard extreme aspect ratio is not a case staff have described).
- Downscaling / re-encoding already-sufficient images — untouched, byte-for-
  byte passthrough as today.
- Batch discovery's in-progress preview thumbnails (`getSelectedPngPreview.ts`)
  — preview generation is unaffected; it already resizes down for on-screen
  display regardless of source resolution.

## Technical Approach

### 1. Upscale decision + pixel math (shared, pure)

Add to `shared/utils/printSizeMath.ts` (or a small new sibling util) a pure
helper:

```ts
export function resolveImportUpscaleTargetPx(
  pixelWidth: number,
  pixelHeight: number,
): { widthPx: number; heightPx: number } | null
```

Returns `null` when `pixelWidth >= PREFERRED_PRINT_WIDTH_INCHES * TARGET_PRINT_DPI`
(3000px) — no upscale needed. Otherwise returns the target width (3000px)
and a proportionally scaled height (`Math.round(pixelHeight * (3000 / pixelWidth))`),
i.e. the same "upscale to exactly 10"@300DPI" behavior already used for gang
sheet export upscaling, applied here to the import width threshold instead of
an arbitrary sheet target.

Unit tests: already-sufficient image (no-op), narrow image needing upscale,
exact-boundary case (2999px vs 3000px vs 3001px), non-square aspect ratio
preserved correctly.

### 2. New Electron main image-upscale service

New `electron/services/import/upscaleImportImage.ts`, modeled directly on
`downloadAndResizeExportImage.ts`'s upscale block:

```ts
export interface UpscaleImportImageResult {
  bytes: Buffer;
  width: number;
  height: number;
  wasUpscaled: boolean;
  originalWidth: number;
  originalHeight: number;
}

export async function upscaleImportImageIfNeeded(
  pngBytes: Buffer,
  pixelWidth: number,
  pixelHeight: number,
): Promise<UpscaleImportImageResult>
```

Uses `loadSharpModule()` + `resolveImportUpscaleTargetPx()`; when a target is
returned, resizes via `sharp(pngBytes).resize(targetWidth, targetHeight, { fit: "fill", withoutEnlargement: false }).png().toBuffer()`
(same `fit: "fill"` + explicit dimensions approach as the export precedent,
since we've already computed the exact aspect-correct target ourselves).
When no upscale is needed, returns the original bytes/dimensions unchanged
(no re-encode, to avoid needless PNG recompression of already-good images).

### 3. Wire into validation (metadata) and byte-read (actual pixels) — must stay consistent

This is the part requiring care: today `validatePngFile()` (assessment) and
`readSelectedPngFileBytes()`/`readBatchValidatedPngFileBytes()` (actual bytes
later uploaded) are separate calls, and the **design record persisted to
Firestore is built entirely from the validation result**
(`src/renderer/src/features/imports/services/importOrchestrationService.ts:106-193`
reads `validationResult.width`/`.height`/`.fileSizeBytes` and
`printSizeAssessment` — not the later byte-read result). If upscaling only
happened at the byte-read step, the persisted `width`/`height`/`dpi`/
`printWidthInches` fields would describe the original image while the
actually-uploaded bytes (and derivative thumbnails generated from them) would
be the upscaled one — a real metadata/pixel mismatch.

To keep both consistent, upscaling happens once, at `validatePngFile()` time:

- `pngValidator.ts`'s `validatePngFile()`, after parsing metadata and before
  calling `assessPrintSizeCapability`, calls `upscaleImportImageIfNeeded`.
  If it upscales, `assessPrintSizeCapability` is run against the **upscaled**
  width/height (so `printSizeAssessment`/`suggestedPrintWidthInches`/
  `effectiveDpi` all reflect the corrected image, and the acceptance level
  that would have been `warn`/`small_format`/`terrible` becomes `accept`).
  `ValidateSelectedPngFileResult.width`/`.height` become the upscaled pixel
  dimensions; `fileSizeBytes` becomes the upscaled buffer's byte length (this
  keeps the later `fileSizeBytes === pngBytes.byteLength` invariant enforced
  in `derivativePngValidation.ts` intact).
  Cache the upscaled buffer in-memory keyed by `filePath` (short-lived, same
  session pattern already used by `importFileSession.ts`/`importBatchSession.ts`
  for "already validated" tracking) so the later byte-read step doesn't
  re-run `sharp` a second time for the same file.
- `readSelectedPngFileBytes.ts` / `readBatchValidatedPngFileBytes.ts`: after
  `readFile(filePath)`, check the same cache; if this file was upscaled
  during validation, return the cached upscaled buffer instead of the raw
  file bytes. If no cache entry exists (defensive — e.g. batch read without
  a prior validate call), fall back to running the upscale check inline
  against the freshly-read bytes so correctness never depends on call order.
- Add `wasUpscaled: boolean` + `originalWidth`/`originalHeight` (only present
  when `wasUpscaled`) to `ValidateSelectedPngFileResult` for clarity/debugging,
  though the primary signal to staff is the new warning below.

### 4. New warning code

Add `"IMAGE_UPSCALED"` to `ImportPngWarningCode` in
`shared/types/import/importIpc.types.ts`, with `details` carrying
`originalWidth`/`originalHeight`/`upscaledWidth`/`upscaledHeight` (reuse the
existing `ImportPngWarning.details` shape, extended with pixel fields
alongside the existing `dpi`/`dpiX`/`dpiY`).

`pngValidator.ts`'s `buildPrintSizeWarnings` adds this warning first when
`wasUpscaled` is true, with a message like:

> "Image was upscaled from 1500x2000px to 3000x4000px to meet the 300 DPI /
> 10" wide print requirement."

Because the assessment now runs against upscaled dimensions,
`PRINT_SIZE_BELOW_PREFERRED`/`SMALL_FORMAT`/`TERRIBLE` will no longer fire in
the cases that get upscaled to `accept` — the new `IMAGE_UPSCALED` warning
replaces them as the informational signal for that file. (An image that's
upscaled but still can't reach `accept`, if that's ever mathematically
possible, would show both — not expected in practice since 3000px will always
resolve the width-driven acceptance levels used today.)

### 5. Frontend — no new component needed

`getImportWarningMessageClassName` (`src/renderer/src/features/imports/utils/importPrintSizeDisplay.ts`)
gets a new case for `"IMAGE_UPSCALED"` (likely the same "info" styling as
`PRINT_SIZE_NORMALIZED`, not a "danger"/"warn" style, since this is a
successful automatic correction, not a problem). It will render for free
through the existing warnings list on both `ImportResultPanel.tsx` (single
import) and the batch components (`BatchImportFileValidationWarnings.tsx`,
`BatchImportResultPanel.tsx`, `BatchImportDiscoverySummary.tsx`,
`BatchImportFileList.tsx`) since they all iterate `warnings`/`file.warnings`
already.

## Files Touched (expected)

- `shared/constants/printSize.constants.ts` (no changes expected — reuses
  existing `TARGET_PRINT_DPI`/`PREFERRED_PRINT_WIDTH_INCHES`)
- `shared/utils/printSizeMath.ts` (new `resolveImportUpscaleTargetPx`) + `.test.ts`
- `shared/types/import/importIpc.types.ts` (new `IMAGE_UPSCALED` warning code,
  extend `ImportPngWarning.details`, extend `ValidateSelectedPngFileResult`
  with `wasUpscaled`/`originalWidth`/`originalHeight`)
- `electron/services/import/upscaleImportImage.ts` (new) + test
- `electron/ipc/import/pngValidator.ts` (call upscale before assessment,
  cache result, add warning)
- `electron/ipc/import/readSelectedPngFileBytes.ts` (use cached/upscaled bytes)
- `electron/ipc/import/readBatchValidatedPngFileBytes.ts` (same)
- A small shared in-memory cache module, e.g.
  `electron/ipc/import/upscaledImportBytesCache.ts` (new — keyed by filePath,
  cleared alongside existing session-clear points in
  `importFileSession.ts`/`importBatchSession.ts`)
- `shared/utils/importPrintSizeMessages.ts` (new message formatter for the
  upscale warning)
- `src/renderer/src/features/imports/utils/importPrintSizeDisplay.ts` (style
  case for the new warning code)

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build` — as with every prior
  phase in this project.
- New unit tests: `resolveImportUpscaleTargetPx` edge cases (no-op, upscale,
  exact boundary, aspect ratio preservation) and `upscaleImportImageIfNeeded`
  (via a small fixture PNG, asserting output pixel dimensions and that
  already-sufficient images pass through byte-identical).
- Manual QA: import one deliberately low-resolution PNG (e.g. 800x1000px)
  through each of the four upload paths (single file, multiple files, folder,
  zip) and confirm: (a) the resulting design's persisted width/height/DPI in
  Firestore reflect the upscaled size, (b) the uploaded original in Storage is
  actually the upscaled image, (c) thumbnail/preview derivatives are generated
  from the upscaled image, not the original, and (d) the "Image was upscaled"
  warning is visible in the Imports UI for that file in all four flows.
