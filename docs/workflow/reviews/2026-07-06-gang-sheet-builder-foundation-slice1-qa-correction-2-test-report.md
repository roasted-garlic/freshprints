# Gang Sheet Builder Foundation — Slice 1 QA Correction 2 Test Report

Date: 2026-07-06

Plan: `docs/workflow/plans/2026-07-06-gang-sheet-builder-foundation-plan.md` (Slice 1 only, approved)

Prior reports:
- `docs/workflow/reviews/2026-07-06-gang-sheet-builder-foundation-slice1-test-report.md` (initial manual QA failed)
- `docs/workflow/reviews/2026-07-06-gang-sheet-builder-foundation-slice1-qa-correction-test-report.md` (full-screen workspace + placed-image rendering correction)

## QA failure summary (second pass)

1. A persistent `"Gang sheet error" / "A gang sheet item record is incomplete."` banner appeared.
2. Dragging a placed image lagged badly instead of following the cursor in real time.
3. Placed images could overlap each other.
4. Placed images could be moved partly or fully outside the sheet bounds.

## Reference folder

Inspected `gang-sheet-builder-reference/` (now present at the repo root) for this pass, specifically
`gang-sheet-builder-map.md` and `frontend/src/pages/Builder.tsx`'s `aabbOverlap`/`resolveCollision`
functions, to understand the reference builder's collision-detection approach. The reference uses a
full sweep-based continuous collision resolver (traces the drag vector, finds earliest contact,
slides along the colliding wall) across ~5,500 lines. That level of complexity is not appropriate
for Slice 1. Instead, a simpler MVP was implemented per the QA note's explicit allowance: a basic
axis-aligned bounding-box overlap check, validated once per interaction commit, that blocks/reverts
an invalid move/resize/rotate rather than continuously resolving collisions during the drag. Nothing
from the reference's Express/Postgres/Shopify backend, cart, or checkout code was used.

## Root causes

1. **Incomplete record error**: `mapGangSheetData`/`mapGangSheetItemData` in `gangSheetService.ts`
   required both `createdAt` and `updatedAt` to already be resolved Firestore `Timestamp` values.
   Both `addGangSheetItem`/`updateGangSheetItemTransform`/`getOrCreateLatestGangSheetForShow` write
   with `serverTimestamp()` and then immediately `getDoc` the same document — a well-known Firestore
   race where the local read can still observe a `null` sentinel for one of the two timestamp
   fields before the server-resolved value is echoed back. This is not a data-corruption bug; no
   `gangSheetItem` was ever actually missing a required field. The existing `designService.ts`
   already has an established fix for exactly this race (`resolveDesignDocumentTimestamps`, which
   falls back to whichever of the pair has resolved) — the gang sheet mapper simply hadn't adopted
   the same pattern yet.
2. **Drag lag**: `moveSelectedItem` previously called `gangSheetService.updateGangSheetItemTransform`
   (a Firestore write) on every `pointermove` event, so each frame of a drag waited on a network
   round-trip before the canvas re-rendered.
3. **Overlap**: no collision check existed anywhere in the builder; items could be placed or moved
   to any position regardless of other placed items.
4. **Out-of-bounds**: `clampRectToSheetOrigin` only clamped the negative/left/top edge, never the
   right/bottom edge, and resize/rotate had no bounds check at all.

## Corrections made

### 1. Incomplete record error — fixed at the root

- `src/renderer/src/features/gang-sheets/services/gangSheetService.ts`: both `mapGangSheetData` and
  `mapGangSheetItemData` now resolve `createdAt`/`updatedAt` via the existing
  `resolveDesignDocumentTimestamps` helper (falls back to whichever of the pair has resolved) instead
  of requiring both to already be non-null. This removes the race entirely; no field was added,
  removed, or made optional in the saved data model.
- `listGangSheetItems` no longer throws and aborts the whole builder load if one item document is
  genuinely malformed. It now quarantines (skips, with a `console.warn`) any individual item that
  still fails validation and returns the rest, so one bad record cannot leave the builder in a
  persistent error state. No migration, backfill, or delete of existing data was performed — this is
  a read-path safety net only, and it only takes effect on a real validation failure (which should
  now be rare given the timestamp fix above).
- Confirmed the saved `GangSheetItem` model (`shared/types/gangSheet/gangSheet.types.ts`) already
  includes every field listed in the QA note (`gangSheetId`, `upcomingShowId`, `showAllocationId`,
  `printRequestId`, `printRequestItemId`, `designId`, `originalPathSnapshot`, `xInches`, `yInches`,
  `widthInches`, `heightInches`, `rotationDegrees`, `flipHorizontal`, `flipVertical`, `zIndex`,
  `createdAt`, `updatedAt`) — no data model change was needed, only the read-side timestamp handling.

### 2. Drag lag — local-state preview, commit on release

- `useGangSheetBuilder.ts`: `moveSelectedItem` is now synchronous and only updates local React
  state (`previewSelectedItemTransform`) — no Firestore write during drag. A new
  `commitMoveSelectedItem` persists the final position once the interaction ends.
  `resizeSelectedItem`/`rotateSelectedItem` still validate-and-persist immediately (they are
  discrete button clicks, not continuous drags, so no separate preview/commit split was needed for
  them).
- `GangSheetBuilderPage.tsx`: `handleItemPointerMove` now throttles to one update per animation
  frame via `requestAnimationFrame` (cancelling any pending frame on pointerup) instead of running
  the full transform calculation on every raw pointer event. `handleItemPointerUp` calls
  `builder.commitMoveSelectedItem()` once, instead of the previous per-move persistence.

### 3 & 4. Overlap and out-of-bounds — new pure utilities, validated on commit

- New `shared/utils/gangSheetLayoutCollision.ts`: `rectsOverlap` (basic AABB overlap test) and
  `overlapsAnyOtherItem` (checks a candidate rect's rotated bounding box against every other placed
  item's rotated bounding box, excluding the item being moved). Per the QA note's explicit MVP
  allowance, this uses each item's rotated *bounding box* rather than exact rotated-polygon overlap
  — simple and safe, though it can be conservative (may report overlap slightly before two rotated
  rectangles' true edges touch). Precise rotated-polygon collision is deferred as future work if
  ever needed.
- `shared/utils/gangSheetLayoutUnits.ts`: added `rotatedBoundingBox` (enclosing AABB of a rect after
  rotation around its own center), `clampRectToSheetBounds` (clamps position so the full rotated
  visual bounds stay within the sheet on all four edges, superseding the old origin-only clamp for
  interactive use), and `fitsWithinSheetBounds` (true/false check used to accept or reject a
  candidate resize/rotate outright).
- `useGangSheetBuilder.ts`: added a `commitItemTransform(itemId, candidate)` path used by move,
  resize, and rotate. It checks `fitsWithinSheetBounds` and `overlapsAnyOtherItem` against the
  candidate; if either fails, local state reverts to the last **server-confirmed** transform
  (tracked in a `committedItemsRef` map, updated only on successful load/create/update) and a
  short user-facing message is set (`"Items cannot overlap."` or `"That position is outside the
  sheet."`) via the existing `builder.error` banner. If both checks pass, the transform is
  persisted as before.
- During an in-progress drag, `moveSelectedItem` clamps to sheet bounds continuously (so dragging
  never visually leaves the sheet while moving) but only checks overlap at commit — matching the
  QA note's guidance that a snap/revert at commit is an acceptable MVP behavior when full continuous
  collision resolution is out of scope.
- `placeAsset` in `useGangSheetBuilder.ts` now searches for the first non-overlapping left-to-right,
  top-to-bottom origin for a newly placed item (`findNonOverlappingOrigin`) instead of always using
  `(0, 0)`. This was necessary because, once overlap is blocked, placing a second copy at the
  previous hardcoded `(0, 0)` origin would always collide with the first placed item. This is a
  simple linear scan for Slice 1's placement, not the Auto Builder layout pass (a separate,
  not-yet-approved next slice) — it only prevents new placements from landing dead-on-arrival on
  top of an existing item.

## Files changed

- `src/renderer/src/features/gang-sheets/services/gangSheetService.ts` — timestamp resolution fix,
  quarantine-on-read for invalid items.
- `src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts` — local-preview/commit split
  for move, bounds/overlap validation and revert-on-invalid for move/resize/rotate, non-overlapping
  placement search for newly placed items.
- `src/renderer/src/features/gang-sheets/pages/GangSheetBuilderPage.tsx` —
  `requestAnimationFrame`-throttled pointer-move handling, commit-on-pointerup.
- `shared/utils/gangSheetLayoutUnits.ts` — added `rotatedBoundingBox`, `clampRectToSheetBounds`,
  `fitsWithinSheetBounds` (+ tests).
- `shared/utils/gangSheetLayoutCollision.ts` (new) — `rectsOverlap`, `overlapsAnyOtherItem` (+ tests).
- `.eslintrc.cjs` — added `gang-sheet-builder-reference` to `ignorePatterns` (the extracted
  reference folder is inspection material, not app code, and is already excluded from
  `tsconfig.json`'s `include`).

No changes to `shared/types/gangSheet/gangSheet.types.ts`, `firestore.rules`, or
`firestore.indexes.json` in this pass — the data model and rules were already correct; only the
client-side read/write behavior changed.

## Automated verification

- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS (0 warnings) after excluding `gang-sheet-builder-reference/` from lint scope.
- `npx tsx --test shared/utils/gangSheetItemQuantity.test.ts shared/utils/gangSheetLayoutUnits.test.ts shared/utils/gangSheetLayoutCollision.test.ts`
  — PASS, 36/36 (17 new: 9 for `rotatedBoundingBox`/`clampRectToSheetBounds`/`fitsWithinSheetBounds`,
  8 for `rectsOverlap`/`overlapsAnyOtherItem`).
- `npx vite build` — PASS (renderer, Electron main, and preload all build cleanly), existing
  circular manual-chunk warning only.
- `git diff --check` — PASS (exit 0), standard pre-existing Windows LF/CRLF warnings only.

## Local Firestore rules/index changes

None in this pass. No `firebase deploy` command was run.

## Scope confirmation

Preserved and verified unaffected by this pass: full-screen/distraction-free builder layout, placed
images visible on canvas, place/select/move/resize/rotate/delete, aspect ratio preserved by default,
quantity limits enforced, single-sheet save/reload, `22 x 12` default, `sheetNumber` defaulting to
`1`, `originalPathSnapshot` preserved for future high-res export.

Not implemented, per explicit scope instruction: high-resolution PNG export, Electron IPC export,
gang sheet upload to Storage, printing timer controls, production-state reconciliation, Portal/
customer-facing work, live Whatnot sync, ecommerce/cart/checkout/shipping/fulfillment/payment
behavior, writes of production status to `designs`, auto layout/nesting optimization, and no new
dependency was added.

## Manual QA checklist (for the user to rerun)

1. Open a show with allocations, open Gang Sheet Builder.
2. Confirm no top error banner appears on open.
3. Place at least two images.
4. Drag one image and confirm it follows the cursor smoothly in real time.
5. Confirm the image saves after the drag ends (release the pointer, then check it stays put).
6. Reopen the builder and confirm the final position persisted.
7. Try to drag one image over another and confirm the move is blocked (image snaps back, message
   reads "Items cannot overlap.").
8. Try to drag an image outside the left/top/right/bottom sheet edges and confirm it is clamped to
   stay fully inside the sheet.
9. Try to resize an image so it would extend beyond the canvas edge and confirm it is blocked
   (message reads "That position is outside the sheet.").
10. Try to rotate an item near the edge and confirm it does not end up outside the sheet.
11. Confirm quantity limits still work.
12. Confirm save/reload still works.
13. Confirm `designs.status` is unchanged.
14. Confirm original assets are unchanged.
15. Confirm no export, timer, production reconciliation, Portal, live Whatnot sync, ecommerce, or
    generated PNG upload was added.
