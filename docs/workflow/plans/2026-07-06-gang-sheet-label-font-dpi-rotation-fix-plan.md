# Plan: Gang Sheet Label Font Setting, Default Width, DPI Metadata Fix, and Rotation Improvement

**Date:** 2026-07-06
**Status:** Draft — awaiting review

## Problems being addressed

1. The sheet-label text (filename printed at the top of each gang sheet PNG)
   is too small and its size is hardcoded (`LABEL_FONT_SIZE_PX = 60` in
   `electron/services/export/exportGangSheetPng.ts`) — staff want it
   configurable from Show Queue settings, and roughly doubled from its
   current size.
2. The default gang sheet width (`DEFAULT_GANG_SHEET_WIDTH_INCHES = 22.75` in
   `showQueueSettingsService.ts`) needs to become 23".
3. **Real bug** — a real export of 8 images that should have produced a
   23"x42.5" sheet at 300 DPI instead produced a file that Photoshop reports
   as 273"x557.56" at 25 DPI. Traced the actual pixel dimensions
   (6825x13939px) and confirmed two independent defects:
   - **Missing DPI metadata**: nothing in the export pipeline
     (`exportGangSheetPng.ts`) ever calls `sharp`'s `.withMetadata({ density })`
     on the final composited PNG, so the file carries no (or an incidental,
     wrong) DPI tag. External apps that read embedded DPI to compute
     "inches" — like the reference builder and Photoshop — get an
     unrelated/default DPI and misreport the physical size, even though the
     pixel dimensions were computed correctly for 300 DPI internally. This
     alone explains the "25 DPI" reading.
   - **Excess sheet height**: at true 300 DPI the file is actually
     22.75"x46.46" tall — taller than the reference builder's 23"x42.5"
     result for the identical images. Root cause is in
     `shared/utils/gangSheetNesting.ts`'s `layoutRow`: today a box is only
     ever rotated when it ends up **completely alone** in a row
     (`boxes.length === 1`). Looking at the reported export, several rows
     hold 2 portrait images side by side with no rotation considered at all,
     wasting vertical space rows the reference builder recovered by
     rotating those images 90° to lie flatter.

## Decisions (confirmed with user)

- Rotation fix scope: extend the existing greedy shelf-packer's per-row
  logic to try rotating **any** portrait (taller-than-wide) box when doing
  so helps that row — not just the already-handled "exactly one box alone in
  the row" case. This stays a single left-to-right greedy pass (same
  algorithm shape, smarter per-box orientation choice), not a full
  bin-packing rewrite — kept fast and predictable for staff cutting sheets.
- No per-design/per-allocation opt-out for rotation — matches the existing
  "any tall lone box may be rotated" behavior, just extended to more cases.

## Scope

### In scope

**A. Sheet label font size setting**

- Add `gangSheetLabelFontSizePx?: number` to `ShowQueueSettings`
  (`showQueueSettingsService.ts`), with a new
  `DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX = 120` (double the current
  hardcoded `60`) and range constants
  (`MIN_GANG_SHEET_LABEL_FONT_SIZE_PX` / `MAX_GANG_SHEET_LABEL_FONT_SIZE_PX`,
  reasonable bounds e.g. 20–300px), validated the same way the existing
  gang sheet settings are (`isWithinRange` + thrown `Error` in
  `updateSettings`).
- Thread it through `useShowQueueSettings.ts`'s `updateSettings` input type,
  `UpcomingShowsPage.tsx`'s settings modal (new `TextInput` in the "Gang
  sheet layout" section, same pattern as the existing width/margin/gutter
  fields), and into `ExportGangSheetPngRequest`
  (`gangSheetExportIpc.types.ts`) as a new `labelFontSizePx` field, replacing
  the hardcoded `LABEL_FONT_SIZE_PX` constant in `exportGangSheetPng.ts` with
  `request.labelFontSizePx`. `LABEL_BAND_HEIGHT_PX`'s derivation
  (font size + padding + 1" clearance) stays the same shape, just computed
  from the request value instead of the constant.
- `useExportGangSheetPng.ts`'s `GangSheetLayoutSettings` gains
  `labelFontSizePx`, sourced the same way the other layout settings are
  (from `showQueueSettings.settings`, defaulting via the new default
  constant).

**B. Default gang sheet width → 23"**

- Change `DEFAULT_GANG_SHEET_WIDTH_INCHES` from `22.75` to `23` in
  `showQueueSettingsService.ts`. Existing shows/settings docs that already
  have an explicit `gangSheetWidthInches` value stored are unaffected (this
  only changes the fallback used when unset) — no migration needed per the
  same convention the auto-upscale and trim plans used for existing data.

**C. DPI metadata fix**

- In `exportGangSheetPng.ts`, add `.withMetadata({ density: EXPORT_DPI })`
  to the final `sharp({ create: ... }).composite(...).png()` call so every
  saved gang sheet PNG carries the correct 300 DPI tag. This is the fix for
  "Photoshop says 25 DPI" — the pixel math was already right, only the
  embedded metadata was missing.

**D. Rotation improvement**

- Rework `layoutRow` in `shared/utils/gangSheetNesting.ts`: instead of only
  checking `boxes.length === 1`, evaluate rotation per-box while assembling
  a row. Specifically, change the packing loop in
  `nestBoxesIntoShelves`/`nestBoxesIntoShelvesWithHeightCap` so that for
  each portrait box being considered for the current row, it tries both
  orientations against the row's remaining usable width, and rotates
  whenever doing so lets the box fit (or fit more efficiently) in the
  current row instead of overflowing to a new one. Landscape/square boxes
  are never rotated (unchanged). The existing "lone box, taller than wide"
  case becomes one instance of this more general per-box rule, not a
  separate special case — existing tests for that case should keep passing
  since it's a strict superset of behavior.
- Row height calculation (tallest box in the row sets row height) is
  unchanged; a box that rotates simply contributes its rotated height
  instead.

### Out of scope

- Per-design/per-allocation "don't rotate" opt-out (explicitly declined).
- Full bin-packing rewrite / non-greedy search (explicitly declined —
  staying with the existing greedy shelf-pack shape).
- Any change to the standard (non-gang-sheet) zip export's naming or sizing.
- Re-running/backfilling gang sheets already exported before this fix.

## Technical Approach

1. `shared/utils/gangSheetNesting.ts`: extend `layoutRow`'s per-box handling
   so any portrait box in the row (not just a lone box) can be rotated when
   it helps fit the row's usable width. Update the packing loop's
   "does this box fit in the current row" check
   (`nestBoxesIntoShelves`/`WithHeightCap`) to consider the rotated width as
   an alternative before deciding to overflow to a new row.
2. `electron/services/export/exportGangSheetPng.ts`: add
   `.withMetadata({ density: EXPORT_DPI })`; replace `LABEL_FONT_SIZE_PX`
   constant usage with `request.labelFontSizePx`.
3. `shared/types/export/gangSheetExportIpc.types.ts`: add
   `labelFontSizePx: number` to `ExportGangSheetPngRequest`.
4. `src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts`:
   add `gangSheetLabelFontSizePx` field + default/min/max constants; change
   default width to `23`; extend `updateSettings` validation/payload.
5. `src/renderer/src/features/upcoming-shows/hooks/useShowQueueSettings.ts`:
   extend `updateSettings` input type.
6. `src/renderer/src/features/upcoming-shows/hooks/useExportGangSheetPng.ts`:
   extend `GangSheetLayoutSettings` with `labelFontSizePx`; pass through to
   the IPC request.
7. `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`:
   new settings-modal input (state, open-modal seeding, validation,
   disabled-save wiring) following the exact pattern of the existing
   gang-sheet-layout fields; pass `labelFontSizePx` into the layout settings
   object built for `exportGangSheetPng`.

## Files Touched (expected)

- `shared/utils/gangSheetNesting.ts` (+ `.test.ts`)
- `electron/services/export/exportGangSheetPng.ts`
- `shared/types/export/gangSheetExportIpc.types.ts`
- `src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts`
- `src/renderer/src/features/upcoming-shows/hooks/useShowQueueSettings.ts`
- `src/renderer/src/features/upcoming-shows/hooks/useExportGangSheetPng.ts`
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build`, full `npx tsx --test`
  repo sweep.
- New/updated unit tests in `gangSheetNesting.test.ts`: two portrait boxes
  side by side where rotating one (or both) lets them both fit a row that
  couldn't otherwise hold them unrotated; a case where rotating would *not*
  help (both already fit) confirming no unnecessary rotation; existing lone-
  box rotation tests continue to pass unmodified.
- Manual QA: re-run a real gang sheet export with the same 8 images from the
  bug report, confirm (a) the saved PNG's embedded DPI reads as 300 in an
  external tool, (b) final sheet dimensions are close to the reference
  builder's 23"x42.5" (allowing for this app's independent margin/gutter
  settings), (c) the label text is visibly larger, (d) the settings modal's
  new font size field saves and is reflected in the next export, (e) a
  fresh Show Queue settings doc defaults to 23" width.
