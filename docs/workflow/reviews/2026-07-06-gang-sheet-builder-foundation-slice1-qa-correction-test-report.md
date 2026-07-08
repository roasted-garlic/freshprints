# Gang Sheet Builder Foundation — Slice 1 QA Correction Test Report

Date: 2026-07-06

Plan: `docs/workflow/plans/2026-07-06-gang-sheet-builder-foundation-plan.md` (Slice 1 only, approved)

Prior report: `docs/workflow/reviews/2026-07-06-gang-sheet-builder-foundation-slice1-test-report.md` (manual QA failed)

## QA failure summary

Manual QA of the initial Slice 1 implementation failed. Findings:

1. The builder route already bypassed the app sidebar/navigation shell (via `AuthenticatedRouteGate`
   and a route mounted outside `AuthenticatedLayout`/`AppShell` in `AppRoutes.tsx`), but
   `.gang-sheet-builder-page` and `.gang-sheet-builder-header` had **no CSS rules at all**. With no
   `height: 100vh` / fixed layout, the builder rendered as an ordinary in-flow scrolling page instead
   of a dedicated full-window workspace, so it still felt like a normal app page.
2. Placed canvas items were not rendering their image. `.gang-sheet-builder-item-image` was
   referenced in `GangSheetBuilderPage.tsx` but had **no matching CSS rule**, so the `<img>` had no
   explicit `width`/`height`/`object-fit` inside its flex-centered parent and effectively collapsed
   to nothing, leaving only the selection rectangle and fallback text label visible.
3. Product direction changed: the Auto Builder entry step (allocated-designs list with
   width/height/quantity cards and a simple auto-build layout pass) is scoped as a **separate,
   not-yet-approved next slice** per explicit instruction, not implemented as part of this
   correction.

## Corrections made in this pass

Scoped strictly to items 1 and 2 above (CSS/layout only, no data model or service changes):

- `src/renderer/src/styles/components/gang-sheet-builder.css`:
  - Added `.gang-sheet-builder-page` (`height: 100vh`, `overflow: hidden`, flex column, app
    background/foreground colors) so the route fills the app content area as a dedicated
    full-window workspace instead of scrolling like a normal page.
  - Added `.gang-sheet-builder-header` / `.gang-sheet-builder-header-copy` layout rules.
  - Added `.gang-sheet-builder-canvas-scroll` as the scrollable region around the fixed-size sheet
    canvas (the canvas itself can be larger than the viewport; only this wrapper scrolls).
  - Added the missing `.gang-sheet-builder-item-image` rule (`width`/`height: 100%`,
    `object-fit: contain`, `pointer-events: none` so drag/pointer handlers on the parent still
    work) so placed images render, scale with the item, and move/resize/rotate with it.
- `src/renderer/src/features/gang-sheets/pages/GangSheetBuilderPage.tsx`:
  - Wrapped the existing canvas `<div>` in a new `.gang-sheet-builder-canvas-scroll` container and
    re-indented the unchanged item-rendering JSX beneath it. No behavior, data, or service logic
    changed — this is a structural wrapper for the new scroll region only.

No changes were made to `shared/types/gangSheet/`, `gangSheetService`, `useGangSheetBuilder`,
`useGangSheetShowAssets`, Firestore rules/indexes, or the route/permission wiring in `AppRoutes.tsx`
— those were already correct (sidebar-hiding route was already implemented properly; the bug was
purely missing CSS for two selectors).

## Automated verification (this pass)

- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS (0 warnings).
- `npx tsx --test shared/utils/gangSheetItemQuantity.test.ts shared/utils/gangSheetLayoutUnits.test.ts`
  — PASS, 19/19 (unchanged; no logic touched).
- `npx vite build` — PASS (renderer, Electron main, and preload all build cleanly), existing
  circular manual-chunk warning only.
- `git diff --check` — PASS (exit 0), standard pre-existing Windows LF/CRLF warnings only, no new
  whitespace/conflict errors.

## Local Firestore rules/index changes

None in this pass. No `firebase deploy` command was run.

## Scope confirmation

Implemented in this pass: full-screen distraction-free builder workspace CSS, placed-image
rendering fix, and the canvas scroll-region wrapper needed to make a fixed-size sheet usable inside
a fixed-height workspace.

Not implemented, per explicit scope instruction: Auto Builder entry step, width/height/quantity
cards, auto-build layout pass, remove-background/upscale controls, high-resolution PNG export,
Electron IPC export, gang sheet upload to Storage, printing timer controls, production-state
reconciliation, any finished-sheet correction path, live Whatnot sync, Portal work,
ecommerce/shipping/fulfillment behavior, mutation of original design assets, writes of production
status to `designs`, and automatic nesting/packing.

## Manual QA checklist (for the user to rerun)

Full-screen workspace:

1. Open `/show-queue`, select a show with an active allocation, click `Build gang sheet`.
2. Confirm the normal app sidebar/navigation is **not visible** on the builder route.
3. Confirm the builder fills the app content area as a dedicated workspace (header + three-panel
   layout fill the window height; no page-level scrollbar around the whole builder).
4. Confirm `Back to Show Queue` in the header returns to `/show-queue` and restores the normal
   sidebar/navigation.

Placed image rendering:

5. Place an asset from the left panel onto the canvas — confirm the design's thumbnail image is
   now visible on the placed item (not just a selection rectangle/text label).
6. Move the placed item — confirm the image moves with it.
7. Resize the placed item — confirm the image scales with it and aspect ratio is preserved by
   default.
8. Rotate the placed item — confirm the image rotates with it.
9. Select and delete a placed item — confirm selection highlight and delete both still work.

Persistence and scope guardrails:

10. Change the sheet height in the right panel and confirm it persists.
11. Leave the builder and reopen it for the same show — confirm the same layout (including placed
    images) reloads.
12. Confirm `designs.status` is unchanged throughout.
13. Confirm original Storage assets are unchanged (only thumbnail/preview derivatives are rendered
    on the canvas).
14. Confirm there is still no export, timer, production reconciliation, Portal, live Whatnot sync,
    ecommerce, shipping, or Auto Builder behavior anywhere in the builder.
