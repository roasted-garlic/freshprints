# Gang Sheet Builder — Auto Builder Entry Step Plan (Next Slice, Not Yet Approved)

## Status

Planning only. Not implemented. Blocked pending explicit review approval, per user instruction to
separate this from the Slice 1 QA correction rather than build it silently.

## Origin

During Slice 1 manual QA, the user directed a product change: the gang sheet builder should
eventually open to an **Auto Builder** step that lists the show's allocated designs as
quantity/size cards, lets staff adjust width/height/quantity per design, and then generates an
initial placement on the sheet via a simple auto-build layout pass — instead of staff manually
placing every copy one at a time as Slice 1 does today.

## Relationship to Slice 1

Builds on the existing Slice 1 foundation (`gangSheets`/`gangSheetItems` collections,
`gangSheetService`, `useGangSheetBuilder`, `useGangSheetShowAssets`, the three-panel builder shell).
Does not require re-architecting Slice 1's data model. `useGangSheetShowAssets` already loads the
show's active allocations joined with approved designs, thumbnails, and remaining quantity — this
is the same data source the Auto Builder cards would use.

## Scope

### In scope

- A new Auto Builder step/page within the gang sheet workflow, shown first when the builder loads
  for a show (with a way to reach the existing manual canvas view).
- One card per allocated design, matching the attached quantity/size card reference direction,
  showing:
  - thumbnail/preview
  - design title
  - width input
  - height input
  - lock-aspect-ratio toggle
  - DPI/quality indicator, using existing size/DPI utilities if available from the design/allocation
    data already loaded (no new DPI computation logic unless repo inspection shows a gap)
  - quantity to place on the gang sheet
  - remaining/allocated quantity, reusing the existing `gangSheetItemQuantity` availability utility
  - placeholder-only, visually indicated controls for future remove-background and upscale actions
    (disabled/no-op; no upscaling or background removal implemented)
- An `Auto Build` / `Apply` action that generates initial placement using a simple, configurable
  layout pass:
  - left-to-right placement, wrapping to the next row when the next item would exceed sheet width
  - configurable margin (distance from sheet corner) and configurable spacing (distance between
    images)
  - does not exceed each design's allocated/remaining quantity
  - writes the resulting `gangSheetItem` records through the existing `gangSheetService`, the same
    way Slice 1's manual `placeAsset` does
- Adjusting width, height, and quantity per design before running Auto Build.

### Out of scope (this slice)

- Advanced nesting/packing optimization (bin-packing, rotation-aware placement, gap-filling). The
  first pass is the simple left-to-right/wrap-row algorithm only.
- Actual background removal or upscale image processing — placeholder UI only.
- Multi-sheet distribution logic beyond what Slice 1 already models via `sheetNumber`.
- Export, timer, production reconciliation, Portal, live Whatnot sync, ecommerce/shipping.
- Any change to `designs.status` or mutation of original design assets.
- New dependencies (the layout math is plain arithmetic; no packing library).

## Data Model Impact

Likely additive only, pending implementation-time repo inspection:

- Auto Build settings (margin, spacing, and optionally target sheet width/height) probably belong as
  transient UI state for the first pass rather than a new persisted document, unless the user wants
  per-show settings remembered — flag this as an open question before implementation.
- No changes anticipated to `GangSheet` or `GangSheetItem` shapes; Auto Build produces the same
  `gangSheetItem` records Slice 1's manual placement already produces (`xInches`, `yInches`,
  `widthInches`, `heightInches`, `rotationDegrees: 0`, etc.).
- Width/height edits on a card, prior to Auto Build, adjust the values passed into item creation;
  they do not need a new field on `ShowAllocation` unless the user wants those edits to persist back
  to the allocation (open question — recommend keeping them session-local to the Auto Builder step
  for the first pass).

## Layout Algorithm (first pass)

Pseudocode-level description for implementation-time reference:

```txt
for each design card with quantity > 0, in list order:
  for i in 1..quantity:
    if cursorX + itemWidth > sheetWidth - marginRight:
      cursorX = marginLeft
      cursorY = cursorY + rowMaxHeight + spacingY
      rowMaxHeight = 0
    place item at (cursorX, cursorY) with (itemWidth, itemHeight)
    cursorX = cursorX + itemWidth + spacingX
    rowMaxHeight = max(rowMaxHeight, itemHeight)
  # continue accumulating cursor position across designs, do not reset per design
sheetHeight may need to grow to fit the last row + marginBottom (reuse Slice 1's editable-height
pattern rather than forcing a fixed height)
```

This should live as a pure, tested utility (e.g. `shared/utils/gangSheetAutoBuildLayout.ts`) so it
can be unit tested independently of the React page, consistent with the existing
`gangSheetItemQuantity` / `gangSheetLayoutUnits` utilities from Slice 1.

## Files Likely to Touch

- New `shared/utils/gangSheetAutoBuildLayout.ts` (+ test)
- New `src/renderer/src/features/gang-sheets/pages/GangSheetAutoBuilderPage.tsx` (or a step/tab
  within the existing `GangSheetBuilderPage.tsx` — implementation-time decision)
- New card component(s) under `src/renderer/src/features/gang-sheets/components/`
- Possible small addition to `useGangSheetBuilder` or a new hook for batch-creating items from an
  Auto Build run (reusing `gangSheetService.addGangSheetItem` per item, or a new batched service
  method if repo inspection shows a clear win — flag before adding a new service method)
- `src/renderer/src/styles/components/gang-sheet-builder.css` additions for the card list

## Acceptance Criteria

- Staff can see one card per allocated design with thumbnail, title, width, height,
  lock-aspect-ratio, DPI indicator (where available), quantity, and remaining/allocated count.
- Staff can adjust width, height, and quantity before running Auto Build.
- Clicking `Auto Build`/`Apply` places items left-to-right with row wrapping, respecting margin and
  spacing settings and each design's remaining allocated quantity.
- Placed items from Auto Build are fully editable afterward using Slice 1's existing
  select/move/resize/rotate/delete controls.
- Remove-background/upscale controls are visible but inert (no processing implemented).

## Tests and Manual QA

- Unit tests for the auto-build layout utility: row wrapping at sheet width, margin/spacing
  application, quantity-cap enforcement, and stable ordering across designs.
- Manual QA: open Auto Builder, adjust width/height/quantity on multiple cards, run Auto Build,
  confirm placement matches the wrap-row expectation and does not exceed allocated quantities, then
  confirm the placed items are still editable on the existing canvas.

## Human Checkpoints

- Explicit review approval required before implementation, same as Slice 1.
- Confirm whether width/height edits made on an Auto Builder card should persist back to
  `showAllocations` or stay session-local — needs a decision before implementation.
- Confirm whether Auto Build settings (margin/spacing) should be remembered per show/user or reset
  each session.
- No new dependency without separate approval (the layout math does not need one).
- No Firestore rules/index deploy without separate approval.
