# Gang Sheet Builder — Reference-Parity Implementation Test Report

Date: 2026-07-06

Plan: `docs/workflow/plans/2026-07-06-gang-sheet-builder-reference-parity-plan.md` (fully approved,
including `react-rnd` installation)

## Scope implemented

Replaced the custom pointer-drag/resize/collision/bounds builder with a `react-rnd`-based canvas
matching the reference builder's interaction model, per the approved plan:

- `<Rnd>` per placed item, fully controlled from `GangSheetItem` state, `bounds="parent"` for
  structural containment, `lockAspectRatio` on resize, `scale` prop wired to new zoom state.
- 90°-increment-only rotation: `rotateSelectedItem` now only accepts `90 | -90`, swaps
  width/height in storage via new `rotateRectByCardinalDegrees` (box stays axis-aligned; only the
  rendered `<img>` gets a CSS `rotate()` transform). Removed `rotatedBoundingBox`,
  `clampRectToSheetBounds`, `fitsWithinSheetBounds` from `gangSheetLayoutUnits.ts` — no longer
  needed once every stored rect is always axis-aligned.
- Simplified `gangSheetLayoutCollision.ts`'s `overlapsAnyOtherItem` to a plain AABB check (dropped
  the `rotationDegrees` parameter — no rotation math needed anywhere now).
- Reference-style zoom controls in the header: zoom in/out buttons (25% steps, 25%–400% range) plus
  a preset dropdown (matching the reference's button-based, zoom-independent-coordinate approach).
  Item coordinates remain in inches regardless of zoom; only a CSS `transform: scale()` on the
  canvas wrapper changes, with `<Rnd>`'s own `scale` prop kept in sync.
- Reference-style left asset panel: 2-column thumbnail grid with a hover "+ Add" overlay and a
  remaining/allocated quantity badge, replacing the prior list-of-cards layout. Data source
  unchanged (`useGangSheetShowAssets`).
- Reference-style right object-properties panel: added Duplicate, Flip H, and Flip V actions
  alongside the existing Rotate and Delete actions.
- `duplicateSelectedItem` and `flipSelectedItem` added to `useGangSheetBuilder.ts`, reusing the
  existing `gangSheetService.addGangSheetItem`/`updateGangSheetItemTransform` calls — no new
  service methods needed. Duplicate respects `canPlaceAnotherCopy` and reuses the existing
  non-overlapping placement search.
- `updateGangSheetItemTransform`'s input type extended with optional `flipHorizontal`/
  `flipVertical` fields (`gangSheetService.ts`) so the flip actions can persist through the
  existing update path; no new Firestore fields (both already existed on `GangSheetItem` for
  forward-compat since Slice 1) and no `firestore.rules` change needed (the rules validator checks
  the resulting merged document, not the update payload, and both fields were already required/
  validated there).
- Drag/resize now use a local-preview + commit-on-release split (`previewItemPosition`/
  `commitItemPosition`, `previewItemSize`/`commitItemSize`) wired to `<Rnd>`'s
  `onDrag`/`onDragStop`/`onResize`/`onResizeStop` — no per-frame Firestore writes, matching the
  reference's controlled-component pattern.
- Removed now-dead `resizeSelectedItem` (the old "Smaller/Larger" button action) since resize is
  now handled entirely by `<Rnd>`'s own drag handles, matching the reference.
- Plan doc `docs/workflow/plans/2026-07-06-gang-sheet-builder-reference-parity-plan.md` updated to
  remove stale "blocked"/"not installed" language for `react-rnd` and record the completed
  installation, audit review, and post-install typecheck.

## Files changed

- `docs/workflow/plans/2026-07-06-gang-sheet-builder-reference-parity-plan.md` (doc correction)
- `shared/utils/gangSheetLayoutUnits.ts` (+ test) — removed rotated-bounds utilities, added
  `rotateRectByCardinalDegrees`
- `shared/utils/gangSheetLayoutCollision.ts` (+ test) — simplified to plain AABB, no rotation param
- `src/renderer/src/features/gang-sheets/services/gangSheetService.ts` — extended
  `UpdateGangSheetItemTransformInput`/`updateGangSheetItemTransform` with flip fields
- `src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts` — rewritten for `<Rnd>`
  preview/commit semantics, 90°-rotation, duplicate, flip
- `src/renderer/src/features/gang-sheets/pages/GangSheetBuilderPage.tsx` — rewritten: `<Rnd>` per
  item, zoom controls, reference-style asset grid, duplicate/flip buttons
- `src/renderer/src/styles/components/gang-sheet-builder.css` — zoom controls, asset grid/cell
  styles, scaled-canvas wrapper, `<Rnd>`-compatible item styling

## Automated verification

- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS (0 warnings).
- `npx tsx --test shared/utils/gangSheetItemQuantity.test.ts shared/utils/gangSheetLayoutUnits.test.ts shared/utils/gangSheetLayoutCollision.test.ts`
  — PASS, 30/30 (rotation-utility tests replaced the removed rotated-bounds tests; collision tests
  updated for the simplified non-rotation signature).
- `npx vite build` — PASS (renderer, Electron main, and preload all build cleanly; `react-rnd`
  bundles into the existing `react-vendor` chunk), existing circular manual-chunk warning only.
- `git diff --check` — PASS (exit 0), standard pre-existing Windows LF/CRLF warnings only.

## Local Firestore rules/index changes

None. `flipHorizontal`/`flipVertical` were already required, validated fields in
`gangSheetItemRequiredFieldsValid` (rules validate the resulting document, not the update payload),
so no rules change was needed to persist flip state through the existing update path.

## Dependency changes

`react-rnd@^10.5.3` — previously approved and installed (see plan doc). No other dependency added
in this pass.

## Scope confirmation

Implemented per the approved plan: `<Rnd>`-based drag/resize, 90°-rotation model, zoom controls,
reference-style asset/properties panels, duplicate/flip. Full-screen shell, route, permission
gating, Firestore `gangSheets`/`gangSheetItems` data model, `gangSheetService`,
`useGangSheetShowAssets`, and `originalPathSnapshot` preservation are all unchanged from the prior
implementation.

Not implemented, per explicit scope: Auto Builder entry step, high-resolution PNG export, Electron
IPC export, gang sheet upload to Storage, printing timer controls, production-state reconciliation,
Portal, live Whatnot sync, ecommerce/checkout/Add to Cart/shipping, generated PNG upload, writes of
production status to `designs`, multi-sheet UI, and the reference's align-grid toolbar action
(explicitly deferred per the plan).

## Manual QA checklist

1. Open `/show-queue`, select a show with an active allocation, click `Build gang sheet`.
2. Confirm the builder opens full-screen with no Fresh Prints sidebar/navigation visible.
3. Confirm the left panel shows a 2-column thumbnail grid of allocated designs (not the prior list
   layout), each with a hover "+ Add" overlay and a remaining/allocated quantity badge.
4. Click an asset to place it — confirm it appears on the canvas with its thumbnail image visible.
5. Place a second item — confirm it does not stack exactly on top of the first (non-overlapping
   placement search).
6. Drag a placed item — confirm smooth, real-time movement using `<Rnd>`'s own handles, with no lag.
7. Release the drag — confirm the position persists (reload the builder to confirm).
8. Try to drag one item on top of another — confirm the drop reverts with an "Items cannot
   overlap." message.
9. Try to drag an item toward any sheet edge — confirm `<Rnd>`'s `bounds="parent"` prevents it from
   leaving the canvas.
10. Select an item and resize it using its `<Rnd>` corner/edge handles — confirm aspect ratio is
    locked (matching the reference's `lockAspectRatio`) and the resize cannot exceed the sheet
    bounds.
11. Click Rotate on a selected item — confirm it rotates in 90° increments only, the image content
    visually rotates, and the item's footprint/bounding box stays axis-aligned (does not become a
    diagonal hit-box).
12. Click Flip H and Flip V on a selected item — confirm the image mirrors accordingly and the
    flip state persists after reload.
13. Click Duplicate on a selected item — confirm a second copy is placed without exceeding the
    allocation's remaining quantity, and that duplicating is blocked once the allocation is fully
    placed.
14. Use the header zoom controls (zoom in/out buttons and the percentage preset dropdown) — confirm
    the canvas visually scales, items stay positioned correctly, and drag/resize still feel correct
    at non-100% zoom levels.
15. Delete a placed item — confirm it's removed and the asset panel's remaining-quantity count
    updates.
16. Change the sheet height in the right panel — confirm it persists.
17. Reload the builder for the same show — confirm the full saved layout (including rotation and
    flip state) reloads correctly.
18. Confirm `designs.status` is unchanged throughout.
19. Confirm original Storage assets are unchanged (only thumbnails render on the canvas).
20. Confirm there is still no export, timer, production reconciliation, Portal, live Whatnot sync,
    ecommerce/checkout/Add to Cart, or generated PNG upload behavior anywhere in the builder.
