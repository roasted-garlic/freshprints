# Plan: Gang Sheet Row Centering, Lone-Image Rotation, and Sheet Labels

**Date:** 2026-07-06
**Status:** Approved by user (via clarifying questions), ready to implement
**Related:** `docs/workflow/plans/2026-07-06-show-export-multiply-and-gang-sheet-nesting-plan.md` (the shelf-nesting algorithm and export pipeline this extends)

## Problem

The user reviewed real gang sheet export output and asked for two changes to the
already-working auto-nested PNG export:

1. **Centering / rotation** — rows are currently left-aligned against the side
   margin. The user wants each row's images centered as a group within the
   sheet's usable width (equal leftover space on both sides), and wants any
   image that ends up alone on a row, and is taller than it is wide, rotated
   90° so it lies wider and fills more of the sheet's horizontal space.
2. **Sheet labels** — the user wants the gang sheet's filename printed as text
   near the top of the sheet image itself (not just the file's name on disk),
   at least 1" clear of the nearest placed image, and — when a show's content
   spans multiple sheets — that label should read like "1 of 3", "2 of 3",
   etc., with **every** sheet labeled (including single-sheet exports, which
   should read "1 of 1").

Clarified during requirements review:

- Rotation is **narrow-scope only**: a row must end up with exactly one image,
  and that image's height must exceed its width, for it to be rotated. No
  broader packing-optimization search across multi-image rows.
- Any design may be rotated — no per-design opt-out field needed.
- The on-sheet label text is the **full gang sheet base filename plus "N of
  M"** (e.g. `whatnot_2026-07-06_18-00_gang-sheet — 1 of 3`), shown on every
  sheet, including single-sheet exports (which currently get no on-sheet label
  or `-N` filename suffix at all — this changes to always showing "1 of 1").

## Scope

### In scope

- **Row centering**: `nestBoxesIntoShelves` (and its height-capped sibling)
  change from left-aligning each row at `sideMarginPx` to centering the row's
  total content width (sum of box widths + gutters between them) within the
  usable width (`sheetWidthPx - 2 * sideMarginPx`), splitting leftover space
  evenly left/right. A row that exactly fills the usable width behaves
  identically to today (no leftover to split).
- **Lone tall-image rotation**: after a row is fully packed (still one image
  because a second didn't fit), if that row contains exactly one box and its
  `heightPx > widthPx`, swap its stored width/height (matching the existing
  `rotateRectByCardinalDegrees` convention already used in the interactive
  Gang Sheet Builder — box dimensions swap, later composited with a 90°
  rotation) before computing that row's placement and centering. This can let
  a previously-narrow image now span more of the row width, which may still
  leave it short of a second image fitting — that's fine, the goal is
  reducing wasted horizontal space, not guaranteeing full-width rows.
  - The nesting function's return shape gains a `rotated: boolean` flag per
    placement so the compositing step knows which images to rotate 90° when
    building the actual sheet PNG (the nesting function only reasons about
    pixel boxes; it does not touch image bytes).
- **Compositing applies rotation**: `exportGangSheetPng.ts`'s composite step
  passes `{ input, left, top }` today; for placements marked `rotated`, the
  input image bytes are rotated 90° via `sharp(...).rotate(90)` before being
  handed to `.composite()` (or an equivalent pre-rotate pass keyed by
  placement id), matching the swapped width/height the nesting step already
  assumed.
- **Sheet label rendering**: after nesting determines final sheet count, each
  sheet's canvas height grows by a reserved label band at the top (label text
  height + enough clearance that the nearest placed image is still ≥1" below
  the label's own bottom edge — placement math shifts every row's `y` down by
  this reserved band, on top of the existing `topBottomMarginPx`). The label
  text (`{baseFilenameWithoutExtension} — {sheetIndex} of {sheetTotal}`) is
  rendered by generating a small SVG string (text element, centered
  horizontally, fixed font-family/size) and compositing it at the top of the
  canvac via `sharp`'s SVG-to-raster support — no new dependency, `sharp`
  already handles SVG input.
- **Filename numbering always applied**: `buildGangSheetFilename` (shared
  util) changes so every sheet gets a "-{n}-of-{m}"-style filename suffix
  (exact on-disk filename format below), not just when `sheetTotal > 1`. The
  saved PNG filename and the on-image label text both derive from the same
  base name and sheet index/total so they stay in sync.
- Unit tests for: row centering math (single full-width row, row with
  leftover space split evenly, odd-pixel leftover rounding), lone-tall-image
  rotation triggering/not-triggering (single narrow-tall box alone → rotates;
  same box with a second box on the row → does not rotate; single box that is
  wider than tall → does not rotate), and the updated filename-numbering
  function (1 of 1, 1 of 3/2 of 3/3 of 3).

### Out of scope (this phase)

- Broader bin-packing / rotation search across multi-image rows or between
  rows — still shelf-row nesting, height-sorted, tallest-first, as before.
- Per-design "do not rotate" flag or any data model change — not needed since
  rotation is approved for any design.
- Changing configured spacing values (side margins, gutters, top/bottom
  margins) — centering happens within the existing configured spacing, it
  does not change how much spacing is reserved.
- Any change to the qty-multiply zip export (`exportShowZip.ts`) — labels and
  centering are gang-sheet-PNG-export-only.

## Technical Approach

### 1. `shared/utils/gangSheetNesting.ts`

- Extend `NestedPlacement` with a `rotated: boolean` field (default `false`
  for every non-rotated placement, so existing callers/tests that don't care
  about rotation are unaffected in shape but need the new field populated).
- In both `nestBoxesIntoShelves` and `nestBoxesIntoShelvesWithHeightCap`,
  after a row's contents are finalized (on `finishSheet`/row-overflow/end of
  loop — i.e. wherever "this row is done, no more boxes will be added to it"
  is already known), check: does this row have exactly one placement, and is
  that box's original `heightPx > widthPx`? If so, swap the stored
  width/height used for that row's width-sum and re-run that single box's `x`
  centering with the swapped width, and mark its placement `rotated: true`.
- Change row `x` placement math: instead of each row starting at
  `sideMarginPx` and boxes flowing left-to-right from there, first compute
  `rowContentWidthPx = sum(box widths in row) + gutterPx * (count - 1)`, then
  `rowStartX = sideMarginPx + (usableWidthPx - rowContentWidthPx) / 2`
  (rounded), and lay out boxes left-to-right starting from `rowStartX`
  instead of `sideMarginPx`. This requires buffering a row's boxes until the
  row is known to be complete before assigning any `x` values (today `x` is
  assigned incrementally per-box as soon as it's added to the row) — a
  structural change to both nesting functions' inner loops, but the packing
  decision (which box goes in which row) is unchanged, only the moment `x` is
  computed shifts to "row is closed."

### 2. `electron/services/export/exportGangSheetPng.ts`

- Reserve a top label band per sheet: `labelBandPx = labelTextHeightPx +
  oneInchPx` (where `oneInchPx = EXPORT_DPI`, i.e. 300px, guaranteeing the
  nearest image sits at least 1" below the label's own bottom edge) added on
  top of the existing `topBottomMarginPx` for the first row's `y` origin (and
  reflected in each sheet's total `sheetHeightPx`). This is passed into the
  nesting call as an adjusted effective top margin for the first row only, or
  equivalently the nesting result's placements are shifted down by
  `labelBandPx` post-hoc and `sheetHeightPx` increased by the same amount —
  whichever keeps `gangSheetNesting.ts` free of label-specific concerns (label
  rendering stays entirely in the export service, not the shared nesting
  util).
- For placements marked `rotated`, rotate that image's PNG bytes 90° (via
  `sharpApi(pngBytes).rotate(90).toBuffer()`) before compositing, keyed by
  placement id so each image is only rotated once even if referenced by
  multiple placements (qty > 1 copies of the same design could each
  independently decide to rotate or not depending on which row they land in,
  so rotation is truly per-placement, not per-design).
- After nesting determines final `sheets.length`, build each sheet's label
  string via a new `buildGangSheetSheetLabel(baseFileNameWithoutExtension,
  sheetIndex, sheetTotal)` helper (new export in `showExportFilename.ts`,
  format: `{base} — {sheetIndex} of {sheetTotal}`), render it as a simple SVG
  (`<svg><text>...</text></svg>`, centered, fixed sans-serif font/size, dark
  fill since gang sheets are printed on colored/dark garments and staff need
  to read it against the transparent-PNG checkerboard in their viewer),
  rasterize via `sharp(Buffer.from(svg)).png().toBuffer()`, and composite it
  at `top: topBottomMarginPx` (within the reserved label band), horizontally
  centered on the sheet.
- Filename saving changes from the current `sheetBuffers.length > 1 ?
  '-{n}.png' : '.png'` branch to always using the new "N of M" filename
  suffix for every sheet (see below), since labeling is now unconditional.

### 3. `shared/utils/showExportFilename.ts`

- Change `buildGangSheetFilename`'s always-suffix behavior: replace the
  current `sheetTotal > 1 ? '${base}-${sheetIndex}.png' : '${base}.png'` with
  an always-applied suffix reflecting "N of M", e.g.
  `${base}_${sheetIndex}-of-${sheetTotal}.png` (filename-safe — no spaces or
  special characters — even though the on-image label uses the more readable
  "N of M" with a space and em dash). A single-sheet export's file becomes
  `..._gang-sheet_1-of-1.png` instead of `..._gang-sheet.png`.
- Add `buildGangSheetSheetLabel(base: string, sheetIndex: number, sheetTotal:
  number): string` returning the human-readable on-image label text described
  above, reusing the same base name the filename function receives (base
  name without the `.png` extension or numbering suffix).
- Update `showExportFilename.test.ts` for the new always-numbered filename
  behavior (existing "single sheet gets no suffix" test case is replaced with
  "single sheet gets `_1-of-1` suffix") and add tests for the new label
  helper.

### 4. Wiring note on sheet count timing

`exportGangSheetPng.ts` currently calls the renderer-supplied
`request.baseFileName` (already built as `buildGangSheetFilename(scheduledStartAt,
1, 1)` before the export even starts, since sheet count isn't known yet
client-side). This plan keeps that: the renderer-supplied `baseFileName`
becomes the un-numbered base (e.g. `whatnot_2026-07-06_18-00_gang-sheet`,
extension-stripped), and `exportGangSheetPng.ts` — which already knows
`nestResult.sheets.length` after nesting completes — appends the "N of M"
suffix itself per sheet for both the label text and the final saved filename,
rather than relying on a pre-nesting guess. This matches how the save dialog
path already strips `.png` and re-appends per-sheet suffixes today.

## Files Touched (expected)

- `shared/utils/gangSheetNesting.ts` (row centering math, rotation detection,
  `rotated` field on `NestedPlacement`)
- `shared/utils/gangSheetNesting.test.ts` (extend)
- `shared/utils/showExportFilename.ts` (always-numbered filename suffix, new
  `buildGangSheetSheetLabel`)
- `shared/utils/showExportFilename.test.ts` (extend)
- `electron/services/export/exportGangSheetPng.ts` (label band reservation,
  per-placement rotation before compositing, SVG label rendering/compositing,
  filename numbering applied unconditionally)

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build` — as with every prior
  phase in this project.
- Extended/new unit tests in `gangSheetNesting.test.ts` and
  `showExportFilename.test.ts` covering centering, rotation triggers, and
  filename/label numbering.
- Manual QA: run a real gang sheet export on a show with (a) a row that fits
  multiple images (confirm centered as a group, not left-aligned), (b) at
  least one image tall-and-narrow enough to end up alone on its row (confirm
  it rotates and the row still centers), and (c) enough content to span 2+
  sheets (confirm each sheet's on-image label reads "1 of N", "2 of N", etc.,
  matching the saved filenames, and that the label sits ≥1" clear of the
  nearest image).
