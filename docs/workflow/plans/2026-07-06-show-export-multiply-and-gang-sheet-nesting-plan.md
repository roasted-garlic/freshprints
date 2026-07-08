# Plan: Multiply-by-Qty Export + Auto-Nested Gang Sheet Export

**Date:** 2026-07-06
**Status:** Implemented — automated verification passed; manual QA pending before signoff
**Related:** `docs/workflow/plans/2026-07-06-show-queue-export-pivot-plan.md` (existing zip export this builds on)

## Addendum (2026-07-06): Spacing/width/max-length as settings

Follow-up to the initial implementation. The user asked for the previously
hardcoded gang sheet spacing constants and height cap to become Show Queue
settings, alongside the already-implemented `gangSheetWidthInches`:

- `gangSheetSideMarginInches` (default 0.25") — sheet edge to nearest image, left/right only.
- `gangSheetTopBottomMarginInches` (default 0.5") — sheet edge to nearest image, top/bottom only.
- `gangSheetGutterInches` (default 0.5") — image-to-image spacing, both within a row and between rows.
- `gangSheetMaxLengthInches` (default 50") — height cap before starting a new sheet.

All four follow the exact same pattern as `gangSheetWidthInches`: stored on
`settings/showQueue`, read/written via `showQueueSettingsService`, exposed in
the same Show Queue settings modal, threaded from the renderer through
`ExportGangSheetPngRequest` to `exportGangSheetPng` in Electron main (which no
longer hardcodes these values — they become required request fields with the
defaults applied client-side when unset).

## Problem

Show Queue export currently produces one PNG per allocation (already trimmed,
resized to 300 DPI print size, zipped). Staff then upload each file into a
separate third-party gang sheet builder and manually re-enter the quantity per
design, because the uploaded thumbnails don't show the original filename. This
is slow and error-prone.

Two additions were requested to fix this workflow gap:

1. **Multiply-by-qty export** — an option on the existing zip export to write
   N copies of each image (N = allocation quantity) instead of 1, so the
   qty is expressed as file count rather than something staff re-type.
2. **Auto-nested gang sheet export** — a new export button that composites
   every allocated image (repeated by qty) directly onto one or more
   transparent-background gang sheet PNGs, arranged in cuttable shelf rows,
   removing the third-party tool from the workflow entirely for teams that
   want it.

Clarified during requirements review:

- Gang sheet width is a **configurable setting** (default 22.75"), not
  hardcoded, editable from the existing Settings page pattern.
- The two features are **separate, independent** additions — the zip export
  keeps its current single-copy behavior as the default with qty-multiply as
  an opt-in checkbox; the gang sheet export is a new, separate button/flow.
- If a single design's width already exceeds the gang sheet's usable width
  (sheet width minus side margins), that image is **skipped with a warning**,
  matching the existing download/resize failure pattern — nesting continues
  for the rest.

## Scope

### In scope

- Add a "Multiply by quantity" checkbox to the existing Export Show modal
  (`ExportShowConfirmModal.tsx`). When checked, each allocation's image is
  written N times into the zip (N = allocation quantity), with a numeric
  suffix added to keep filenames unique. Default: unchecked (current
  behavior unchanged).
- Add a new gang sheet setting: `gangSheetWidthInches` (default `22.75`),
  stored as a new field directly on the existing `settings/showQueue`
  Firestore doc (`ShowQueueSettings`/`showQueueSettingsService`), following
  that doc's existing client-`setDoc`-with-merge pattern and
  `canManageUpcomingShows` permission gate — not a new doc or Cloud Function,
  since this setting belongs to the same Show Queue feature area as
  `defaultMaxTotalQuantity`. Exposed in the existing Show Queue settings UI
  on `UpcomingShowsPage.tsx` (not the AI-enrichment `SettingsPage.tsx`).
- Add a new "Export Gang Sheet" button on the Show Queue page, alongside the
  existing "Export" button, opening a new confirm modal
  (`ExportGangSheetConfirmModal.tsx`) with the same progress-label pattern
  (count + step, no spinner) established for the zip export.
- New Electron main-process pipeline:
  - Download + trim + resize each allocated image to its print-size target,
    repeated by quantity (reuses `downloadAndResizeExportImage.ts` as-is).
  - Shelf-pack the resulting bitmaps into rows that fit within
    `gangSheetWidthInches` minus **0.25" artboard/sheet side margins** (left
    and right edge of the sheet only), with **0.5" gutters between images**
    (both horizontally between images in a row and vertically between rows),
    and **0.5" top/bottom margin** (image-to-sheet-edge, top and bottom).
    Note the asymmetry: side margins (sheet edge to nearest image, left/right)
    are 0.25"; every other spacing — image-to-image gutters and top/bottom
    sheet-edge margins — is 0.5".
  - Composite each row/sheet onto a transparent canvas via `sharp.composite()`
    sized to the fixed width and the computed total height.
  - Any design still too wide for the usable width even alone is skipped and
    recorded as a warning (same `ShowExportImageWarning` shape/reason
    `"too_wide_for_sheet"`), consistent with skip-and-warn elsewhere in export.
  - Save via native save dialog (single PNG output for v1 — see Open
    Questions for multi-sheet overflow).
- New progress event stream for the gang sheet export, mirroring
  `ShowExportProgressEvent`/`onExportProgress`, with steps
  `"downloading" | "trimming" | "resizing" | "nesting" | "compositing"` and
  a plain count/step label in the modal (no spinner, consistent with the
  just-completed spinner removal work).
- Unit tests for the new shelf-nesting algorithm (pure function, given a list
  of `{ widthPx, heightPx }` boxes + sheet constraints, returns row placements
  or an overflow/skip result) and for the qty-multiply filename suffixing.

### Out of scope (this phase)

- True 2D bin-packing / rotation of images to improve density — v1 is
  shelf-row nesting only (sort by height descending, pack rows), matching the
  reference screenshot's "For Cutting" style. Rows are height-sorted only;
  identical designs are not specially grouped.
- Multi-page/multi-file gang sheet output beyond simple height-capped
  splitting (see Technical Approach §4) — no smarter packing across sheets
  than "start a new sheet once the height cap is hit."
- Editing/rearranging the nested layout after generation (no interactive
  canvas) — this is a batch export, not the `<Rnd>`-based Gang Sheet Builder
  reference tool.
- Any change to the existing single-copy zip export's default behavior.

## Technical Approach

### 1. Qty-multiply zip export

- `shared/types/export/showExportIpc.types.ts`: add `multiplyByQuantity: boolean`
  to `ExportShowZipRequest`, and `quantity: number` to `ShowExportImageRequest`
  (quantity already exists on allocations upstream — just needs threading
  through).
- `electron/services/export/exportShowZip.ts`: when `multiplyByQuantity` is
  true, loop `quantity` times per image, writing filenames like
  `{baseName}-1.png`, `{baseName}-2.png`, etc. Progress `imageTotal` becomes
  the sum of quantities, not the allocation count.
- `ExportShowConfirmModal.tsx`: add a checkbox, default unchecked, disabled
  while exporting.

### 2. Gang sheet setting

- Add `gangSheetWidthInches?: number` to `ShowQueueSettings`
  (`showQueueSettingsService.ts`), read/written on the existing
  `settings/showQueue` doc via the existing `getSettings`/`updateSettings`
  methods (extend their input/mapping, no new doc, no new Cloud Function).
  Client-side default of `22.75` applied when unset, validated to a
  reasonable range (e.g. 10"–60") before `setDoc`.
- Extend `useShowQueueSettings.ts`'s `updateSettings` input type to include
  `gangSheetWidthInches`.
- Extend `firestore.rules`'s `showQueueSettingsFieldsValid` to allow the new
  field (`isOptionalNumber(data, "gangSheetWidthInches")`), added to the
  `hasOnly([...])` field list.
- Add a "Gang sheet width" numeric input to the existing Show Queue settings
  UI on `UpcomingShowsPage.tsx`, alongside `defaultMaxTotalQuantity`, gated
  by the same `canManageUpcomingShows`-derived permission already used there.

### 3. Shelf-nesting algorithm (pure, testable)

New `shared/utils/gangSheetNesting.ts`:

```ts
interface NestableBox {
  id: string;
  widthPx: number;
  heightPx: number;
}

interface NestedPlacement {
  id: string;
  x: number;
  y: number;
}

interface NestResult {
  placements: NestedPlacement[];
  sheetHeightPx: number;
  skipped: { id: string; reason: "too_wide_for_sheet" }[];
}

interface NestingSpacingPx {
  /** Sheet edge to nearest image, left/right only. */
  sideMarginPx: number;
  /** Sheet edge to nearest image, top/bottom only. */
  topBottomMarginPx: number;
  /** Image-to-image spacing, both between images in a row and between rows. */
  gutterPx: number;
}

function nestBoxesIntoShelves(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
): NestResult;
```

Algorithm: sort boxes tallest-first, greedily pack each into the current row
if it fits within the row's usable width (`sheetWidthPx - 2 * sideMarginPx`,
accounting for `gutterPx` between images already placed in the row), else
start a new row; row height = tallest box in that row; sheet height = sum of
row heights + `gutterPx` between rows + `topBottomMarginPx` at the top and
bottom of the sheet. Any box wider than `sheetWidthPx - 2 * sideMarginPx` on
its own goes to `skipped`.

Concretely, at the confirmed values (0.25" side margins, 0.5" everything
else): a row's first image starts at `x = sideMarginPx`; each subsequent
image in the row starts at `previousImageRight + gutterPx`; the first row's
top starts at `y = topBottomMarginPx`; each subsequent row starts at
`previousRowBottom + gutterPx`; the sheet's final height adds
`topBottomMarginPx` again after the last row.

Unit tests cover: single box, multiple boxes fitting one row, overflow to a
second row, oversize box skipped while others still nest, empty input.

### 4. Gang sheet export pipeline (Electron main)

New `electron/services/export/exportGangSheetPng.ts`:

- Expand allocations by quantity into individual image requests (reuse
  `downloadAndResizeExportImage.ts` per copy, same trim+resize as today).
- Convert each result's pixel dimensions + the sheet's configured width
  into pixels at a **fixed 300 DPI** (same constant already used for
  print-size resize, so placed images are pixel-consistent with the zip
  export) and feed them into `nestBoxesIntoShelves`.
- **Height cap / auto-split**: `nestBoxesIntoShelves` (or a wrapper) stops
  adding rows to the current sheet once its running height would exceed a
  fixed cap (recommend ~15,000px at 300 DPI, i.e. 50"), and starts a new
  sheet for subsequent rows. Output becomes N sheets instead of 1 when a
  show's content is tall enough to exceed the cap; single-sheet shows are
  unaffected. Filenames get a sheet index suffix only when there's more than
  one (`{base}.png` for a single sheet, `{base}-1.png`, `{base}-2.png`, ...
  when split).
- Build a transparent canvas per sheet via
  `sharp({ create: { width, height, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })`
  and `.composite()` each placed image at its `(x, y)`.
- Emit progress via a new `onGangSheetExportProgress` event channel, steps
  `downloading | trimming | resizing | nesting | compositing`.
- Skip-and-warn for download/resize failures (existing pattern) and for
  `too_wide_for_sheet` (new reason, surfaced in the same warnings file /
  modal warning list UI as the zip export).
- Native save dialog. If multiple sheets result, save each into the same
  chosen destination folder using the indexed filenames above (single
  dialog pick for the folder/base name, consistent with the zip export's
  one-dialog UX).

### 5. IPC wiring

- New channel `fresh-prints:export:export-gang-sheet-png` +
  `fresh-prints:export:gang-sheet-progress`, following the exact structure of
  `exportIpcChannels.ts` / `exportIpcHandlers.ts` / `exportEvents.ts` /
  `exportRequestValidation.ts` (new sibling validation function for the new
  request shape).
- Preload: expose `exportGangSheetPng` + `onGangSheetExportProgress` next to
  the existing `exportShowZip`/`onExportProgress`.

### 6. UI

- New `ExportGangSheetConfirmModal.tsx`, structurally mirroring
  `ExportShowConfirmModal.tsx` (progress label with count + step, no spinner,
  warnings list, save-path result).
- New "Export Gang Sheet" button next to "Export" wherever that's currently
  rendered on the Show Queue page.

## Files Touched (expected)

- `shared/types/export/showExportIpc.types.ts` (extend)
- `shared/types/export/gangSheetExportIpc.types.ts` (new)
- `shared/utils/gangSheetNesting.ts` + `.test.ts` (new)
- `shared/utils/showExportFilename.ts` (extend for gang sheet filename, or new sibling util)
- `electron/services/export/exportShowZip.ts` (qty-multiply)
- `electron/services/export/exportGangSheetPng.ts` (new)
- `electron/ipc/export/exportIpcChannels.ts`, `exportIpcHandlers.ts`, `exportEvents.ts`, `exportRequestValidation.ts` (extend)
- `electron/preload.ts` (extend)
- `firestore.rules` (extend `showQueueSettingsFieldsValid` for `gangSheetWidthInches`)
- `src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts` (extend with `gangSheetWidthInches`)
- `src/renderer/src/features/upcoming-shows/hooks/useShowQueueSettings.ts` (extend `updateSettings` input)
- `src/renderer/src/features/upcoming-shows/components/ExportShowConfirmModal.tsx` (qty checkbox)
- `src/renderer/src/features/upcoming-shows/components/ExportGangSheetConfirmModal.tsx` (new)
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (new button + modal wiring + gang sheet width settings input)
- `src/renderer/src/styles/components/show-queue.css` (extend)

## Decisions Confirmed During Review

1. **Very tall sheets**: auto-split into multiple numbered PNGs once a
   height cap is exceeded (see Technical Approach §4), rather than one
   unbounded canvas.
2. **DPI for px conversion**: fixed 300 DPI, matching the existing print-size
   resize step.
3. **Row order within a sheet**: height-sorted only (tallest-first), matching
   the "For Cutting" reference screenshot. No special grouping of identical
   designs.

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build` — as with every prior
  phase in this project.
- New unit tests: `shared/utils/gangSheetNesting.test.ts` covering the shelf
  algorithm's edge cases listed above, plus a qty-multiply filename-suffix
  test alongside the existing `showExportFilename.test.ts`.
- Manual QA: run an actual Show Queue export with qty-multiply on a show with
  mixed quantities; run gang sheet export on a show with varied image sizes
  and confirm visually (screenshot) that spacing/margins/transparency match
  spec before signoff.
