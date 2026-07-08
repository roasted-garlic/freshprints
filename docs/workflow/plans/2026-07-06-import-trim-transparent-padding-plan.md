# Plan: Trim Transparent Padding at Import (Fix Aspect Ratio Mismatch)

**Date:** 2026-07-06
**Status:** Draft — awaiting review

## Problem

A user reported that a design imported at 4500x5400px, when resized to 10"
wide anywhere else (e.g. Photoshop), naturally lands at ~12.29" tall — but
this app locks it to 10"x12" at the Print Request stage, and the exported
image is still 10"x12", visibly shorter/squashed compared to the true
artwork proportions.

Root cause, confirmed by tracing the pipeline:

- `design.width`/`design.height` are persisted from the **raw imported PNG's
  pixel dimensions** (`electron/ipc/import/pngValidator.ts`), which can
  include fully-transparent padding baked around the visible artwork by
  whatever tool produced the PNG. Nothing in the import pipeline trims that
  padding today — `assessPrintSizeCapability` and the (separate) upscale step
  both operate on the untrimmed dimensions.
- The Print Request stage (`PrintRequestItemCard.tsx`) locks the
  width/height aspect ratio using exactly these untrimmed
  `design.width`/`design.height` values (`calculateLockedHeightFromWidth` /
  `calculateLockedWidthFromHeight`). So a 10" width lock produces whatever
  height the *untrimmed* ratio implies (12" here).
- Export (`electron/services/export/downloadAndResizeExportImage.ts`)
  downloads the original, **trims** fully-transparent edges
  (`sharp(...).trim(...)`), then force-resizes (`fit: "fill"`) the *trimmed*
  content into the target pixel box computed from the *untrimmed* print
  inches. Once trimmed, the artwork's real aspect ratio no longer matches the
  untrimmed-derived box, so `fit: "fill"` stretches/squashes it to fit —
  producing a visibly distorted final image, on top of being the wrong
  overall size (10"x12" instead of the true ~10"x12.29").

## Decision

Trim transparent padding **at import time**, immediately after the file is
read, before any print-size assessment or upscale decision. This makes
`design.width`/`design.height` (and everything derived from them —
Firestore print-size fields, Print Request aspect lock, gang sheet nesting)
correct from the moment a design exists, rather than only becoming correct
at export. Export's own trim step is removed, since the source it downloads
is now guaranteed already-trimmed — export becomes resize-only, one fewer
transform on the time-sensitive export path.

This was chosen over trimming only at the Print Request stage or only at
export, because every consumer of `design.width`/`design.height` prior to
export (Design Library, Print Request sizing UI, DPI/quality assessment,
gang sheet nesting math) would otherwise keep reading the untrimmed ratio
until export corrected it — which is the exact bug being fixed, just
deferred. Resizing to a per-item exact print size (a further optimization
the user floated) is explicitly **out of scope** for this plan — export
continues to resize from the (now correctly trimmed) original, per user
decision; only the trim responsibility is moving.

## Scope

### In scope

- Trim fully-transparent edge padding from the pixel buffer on all four PNG
  import paths that funnel through `validatePngFile()` (single file,
  multiple files, folder, zip) — the same choke point the auto-upscale
  feature already hooked into.
- Order of operations inside `validatePngFile()`: read bytes → **trim** →
  reject-floor assessment (against trimmed dimensions) → upscale-if-needed
  (against trimmed dimensions) → final assessment/warnings (against
  trimmed+upscaled dimensions). Trim must run before the reject-floor check
  so an image that only fails the floor because of transparent padding isn't
  wrongly rejected (and, symmetrically, one that only passes because of
  padding isn't wrongly accepted).
- Persist trimmed (and possibly then upscaled) dimensions as
  `design.width`/`design.height`, consistent with how upscaled dimensions are
  persisted today.
- Remove the trim step from
  `electron/services/export/downloadAndResizeExportImage.ts` — it becomes
  download → resize only. Its resize target math is unchanged (still derived
  from the print request's chosen inches x 300 DPI); only the redundant trim
  call is deleted.
- New warning code, `IMAGE_TRIMMED`, surfaced the same way `IMAGE_UPSCALED`
  is today (informational, existing warnings list, no new UI surface),
  shown when trimming actually removed any pixels.

### Out of scope

- Whatnot import (`electron/ipc/whatnotImport/*`) — does not route through
  `validatePngFile`, untouched per existing workflow constraints.
- Resizing images to their exact per-print-request-item size ahead of
  export (considered and explicitly deferred per user decision — export
  keeps doing the resize step, just no longer the trim step).
- Any change to `MIN_ACCEPTABLE_EFFECTIVE_DPI` / reject-floor thresholds
  themselves — only which dimensions (trimmed vs untrimmed) they're
  evaluated against.
- Re-trimming/re-validating designs already imported before this change
  ships — existing designs keep their currently-persisted (untrimmed)
  width/height unless re-imported. (Flagged for user awareness in the
  review step; a backfill is a separate, explicit decision if wanted.)

## Technical Approach

### 1. Trim service (Electron main, mirrors `upscaleImportImage.ts`)

New `electron/services/import/trimImportImage.ts`:

```ts
export interface TrimImportImageResult {
  bytes: Buffer;
  width: number;
  height: number;
  wasTrimmed: boolean;
  originalWidth: number;
  originalHeight: number;
}

export async function trimImportImageIfNeeded(
  pngBytes: Buffer,
): Promise<TrimImportImageResult>
```

Uses `loadSharpModule()` and the same trim call already used at export:
`sharp(pngBytes).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()`,
then reads the trimmed buffer's metadata for the new width/height. Compares
against the original metadata to set `wasTrimmed` (only true if width or
height actually shrank — an image with no transparent padding round-trips
through `trim()` as a no-op but we still avoid the "trimmed" label/warning
when nothing changed, matching the upscale precedent of not relabeling
already-good images).

### 2. Wire into `pngValidator.ts`

Insert the trim call right after `parsePngMetadata`, before the existing
reject-floor `assessPrintSizeCapability` call:

```
fileBuffer = readFile(filePath)
trimResult = trimImportImageIfNeeded(fileBuffer)
rejectAssessment = assessPrintSizeCapability(trimResult.width, trimResult.height)
...
upscaleResult = upscaleImportImageIfNeeded(trimResult.bytes, trimResult.width, trimResult.height)
```

Everything downstream (`assessmentResult`, `fileSizeBytes`, `width`,
`height`, cached bytes for the later byte-read step) flows from the trimmed
(then possibly upscaled) buffer/dimensions, following the exact pattern the
upscale feature already established for keeping validation-time metadata and
byte-read-time bytes consistent. The existing
`upscaledImportBytesCache.ts` cache is reused/extended to cache the
trim+upscale result together (one cache write per file, not two separate
caches), since `readSelectedPngFileBytes.ts` /
`readBatchValidatedPngFileBytes.ts` need the fully-corrected bytes
regardless of whether trim, upscale, both, or neither applied.

### 3. New warning code

Add `"IMAGE_TRIMMED"` to `ImportPngWarningCode`
(`shared/types/import/importIpc.types.ts`), with `details` carrying
`originalWidth`/`originalHeight`/`trimmedWidth`/`trimmedHeight`. New
`formatImageTrimmedMessage` in `shared/utils/importPrintSizeMessages.ts`,
e.g.:

> "Removed transparent padding: image was 4500x5400px, now 4500x5535px."

Styled the same informational way as `IMAGE_UPSCALED` in
`importPrintSizeDisplay.ts` / `BatchImportFileValidationWarnings.tsx`. Order
in the warnings array: trim warning first, then upscale warning (if both
apply — trim can change whether upscale is needed), then print-size
warnings — matching the existing "most-corrective-first" convention.

### 4. Export: remove redundant trim

In `downloadAndResizeExportImage.ts`, delete the `onStep("trimming")` /
`sharpApi(sourceBuffer).ensureAlpha().trim(...)` block entirely; resize
directly from `sourceBuffer`. Update the function's doc comment (currently
describes trim-then-resize) to reflect resize-only. `ShowExportImageStep`'s
`"trimming"` step type and any UI progress-label wiring for it should be
removed if `"trimming"` is not used elsewhere — needs a quick grep during
implementation to confirm no other caller depends on that step name.

## Files Touched (expected)

- `electron/services/import/trimImportImage.ts` (new) + test
- `electron/ipc/import/pngValidator.ts` (call trim before reject-floor
  assessment and before upscale; extend cache)
- `electron/ipc/import/upscaledImportBytesCache.ts` (rename/extend to cover
  trim+upscale together, or add a sibling cache — decide during
  implementation based on which reads cleaner)
- `electron/ipc/import/readSelectedPngFileBytes.ts` /
  `readBatchValidatedPngFileBytes.ts` (consume the combined cached buffer)
- `shared/types/import/importIpc.types.ts` (new `IMAGE_TRIMMED` warning code
  + details fields)
- `shared/utils/importPrintSizeMessages.ts` (new message formatter)
- `src/renderer/src/features/imports/utils/importPrintSizeDisplay.ts` (style
  case for new warning code)
- `electron/services/export/downloadAndResizeExportImage.ts` (remove trim
  step, update comment)
- `shared/types/export/showExportIpc.types.ts` (remove `"trimming"` step
  type if unused elsewhere, after grep confirms)

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build`, full `npx tsx --test`
  repo sweep — as with every prior phase.
- New unit tests for `trimImportImageIfNeeded`: image with transparent
  padding on all sides (trims correctly, `wasTrimmed: true`), image with no
  transparent padding (byte-identical passthrough behavior for
  dimensions/`wasTrimmed: false`), image with padding on only one/two sides
  (asymmetric trim).
- Manual QA: import the exact PNG that surfaced this bug (or an equivalent
  fixture with known transparent padding) through all four upload paths;
  confirm (a) persisted `design.width`/`design.height` reflect the trimmed
  size, (b) locking width to 10" at the Print Request stage now produces the
  true proportional height instead of a padding-inflated one, (c) exported
  image is no longer squashed/stretched, and (d) the "removed transparent
  padding" warning appears in the Imports UI.
