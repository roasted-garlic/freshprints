# Gang Sheet Builder Foundation — Slice 1 Test Report

Date: 2026-07-06

Plan: `docs/workflow/plans/2026-07-06-gang-sheet-builder-foundation-plan.md` (Slice 1 only, approved)

## Scope implemented

Studio-only gang sheet builder foundation for one show and one sheet:

- `Build gang sheet` action on Show Queue detail, disabled when the selected show has no active
  (non-canceled) allocations.
- New route `/show-queue/:showId/gang-sheet` rendering a three-panel builder shell (left allocated
  assets panel, main canvas, right sheet/details panel) plus a top toolbar showing placed/allocated
  counts and sheet size.
- Loads the show's active `showAllocations`, joined with approved `designs` for title, requested
  size, and a thumbnail preview (via the existing `designDerivativeUrlService` thumbnail cache).
- Place / select / move / resize (aspect-ratio preserved by default) / rotate / delete for placed
  items on a single sheet, backed by pointer-drag on a DOM/CSS canvas (no new dependency).
- Save/reload is implicit and per-action: every place/move/resize/rotate/delete writes directly to
  Firestore, and reopening the builder reloads the same saved layout.
- Sheet defaults to `22 x 12` inches; height is editable in the details panel before/after save.
- New `gangSheets`/`gangSheetItems` collections, shared types, and a `gangSheetService`.
- Local-only `firestore.rules` and `firestore.indexes.json` updates for the two new collections —
  not deployed.

## Files changed (representative)

- `shared/types/gangSheet/gangSheet.enums.ts`, `gangSheet.types.ts` (new)
- `shared/utils/gangSheetItemQuantity.ts` (+ test) (new)
- `shared/utils/gangSheetLayoutUnits.ts` (+ test) (new)
- `src/renderer/src/features/firebase/constants/firestoreCollections.ts` (updated)
- `src/renderer/src/features/firebase/services/firestoreCollectionService.ts` (updated)
- `src/renderer/src/features/gang-sheets/services/gangSheetService.ts` (new)
- `src/renderer/src/features/gang-sheets/hooks/useGangSheetShowAssets.ts` (new)
- `src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts` (new)
- `src/renderer/src/features/gang-sheets/pages/GangSheetBuilderPage.tsx` (new)
- `src/renderer/src/features/gang-sheets/constants/gangSheetRoutes.ts` (new)
- `src/renderer/src/routes/AppRoutes.tsx` (updated — new route)
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (updated — Build gang sheet action)
- `src/renderer/src/styles/components/gang-sheet-builder.css` (new)
- `src/renderer/src/styles/globals.css` (updated — new stylesheet import)
- `firestore.rules` (updated — local only, not deployed)
- `firestore.indexes.json` (updated — local only, not deployed)

## Automated verification

- `npx tsx --test shared/utils/gangSheetItemQuantity.test.ts shared/utils/gangSheetLayoutUnits.test.ts`
  — PASS, 19/19.
- Full repo test sweep `npx tsx --test $(all *.test.ts under shared/, src/, functions/)` — 677/678
  PASS. The single failure (`functions/node_modules/@stablelib/base64/base64.test.ts`) is a
  third-party dependency's own bundled test file, unrelated to this change and unrelated to any
  file touched in this phase.
- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS (0 warnings).
- `npx vite build` — PASS (renderer, Electron main, and preload all build cleanly), existing
  circular manual-chunk warning only.
- `git diff --check` — PASS, standard Windows LF/CRLF warnings only.

## Local Firestore rules/index changes (not deployed)

- `firestore.rules`: added `gangSheetRequiredFieldsValid`/`gangSheetItemRequiredFieldsValid`
  validators and `match /gangSheets/{gangSheetId}` / `match /gangSheetItems/{gangSheetItemId}`
  blocks, staff read/write gated the same way as `showAllocations`.
- `firestore.indexes.json`: added `gangSheets.upcomingShowId + updatedAt` and
  `gangSheetItems.gangSheetId + zIndex` composite indexes.
- No `firebase deploy` command was run.

## Manual QA (for the user to run)

1. Open `/show-queue`.
2. Select a show with at least one active allocation — confirm `Build gang sheet` is enabled.
3. Select a show with no allocations — confirm the action is disabled with an explanatory title/tooltip.
4. Click `Build gang sheet` — confirm the three-panel builder opens at
   `/show-queue/:showId/gang-sheet`.
5. Confirm the left panel lists the show's allocated designs with thumbnail, size, and remaining
   quantity.
6. Place an asset — confirm it appears on the canvas and the toolbar's placed/allocated count updates.
7. Select, drag-move, resize (confirm aspect ratio holds by default), rotate, and delete a placed item.
8. Place copies up to the allocation limit — confirm the `Place` button disables once the
   allocation's remaining quantity reaches zero.
9. Change the sheet height in the right panel and confirm it persists.
10. Leave the builder and reopen it for the same show — confirm the same layout reloads.
11. Confirm `designs.status` and original Storage assets are unchanged throughout.
12. Confirm there is no export, timer, production reconciliation, Portal, or live Whatnot behavior
    anywhere in the builder.

## Scope confirmation

- Slice 1 stayed in scope: builder shell, allocated-asset loading, place/select/move/resize/rotate/
  delete, single-sheet save/reload, `22 x 12` default sizing, `sheetNumber` defaulting to `1`, and
  canonical `originalPathSnapshot` preserved on every saved item.
- Not implemented, per scope: high-resolution PNG export, Electron IPC export, gang sheet upload to
  Storage, printing timer controls, production-state reconciliation, any finished-sheet correction
  path, live Whatnot sync, Portal work, ecommerce/shipping/fulfillment behavior, mutation of original
  design assets, writes of production status to `designs`, automatic nesting/packing, and no
  Firestore rules/index deploy.
