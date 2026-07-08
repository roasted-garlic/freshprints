# Show Queue Export — Part B Implementation Test Report

Date: 2026-07-06

Plan: `docs/workflow/plans/2026-07-06-show-queue-export-pivot-plan.md` (Part B, fully approved)

## Scope implemented

Per-show Export feature replacing the (now-standalone, unlinked) Gang Sheet Builder entry point on
Show Queue detail:

- Staff clicks `Export` on Show Queue detail (disabled when the show has no active allocations,
  same guard the prior `Build Gang Sheet` button used).
- A confirmation modal (`ExportShowConfirmModal`) explains the export, then on confirm:
  - Renderer loads the show's active allocations, joins each with its approved `Design`, and
    resolves each design's canonical original-image Firebase Storage download URL (reusing the
    same allocation/design loading pattern already proven by `useGangSheetShowAssets`, adapted to
    resolve `originalPath` instead of `thumbnailPath`).
  - Renderer computes, per allocation: the print size (allocation override, falling back to the
    design's own print size), the fixed-300-DPI target pixel dimensions
    (`printInches * 300`, per the approved DPI decision — `Design.effectiveDpi` is **not** used),
    and the per-image filename (`{seq}_QTY-{qty}_{w}x{h}_{title}_alloc-{id}.png`).
  - Renderer calls the new `window.freshPrints.export.exportShowZip(...)` IPC method with the
    image list and the computed zip filename (`whatnot_<show scheduledStartAt>.zip`).
  - Electron main downloads each image, resizes it via `sharp` to the exact target pixel size
    (upscaling if the source has fewer pixels than required, recorded as an informational
    warning), builds the zip in memory via `yazl`, adds an `EXPORT_WARNINGS.txt` entry if any
    warnings exist, shows a native save dialog defaulting to the computed filename, and writes the
    file. One image failing to download/resize is skipped and recorded as a warning rather than
    aborting the export; if every image fails, the export aborts without writing a file and
    returns a clear error.
  - Modal shows a loading state during export, then a success summary (exported count, saved path,
    any warnings) or an error state.

## Follow-up direction recorded (not implemented)

Per explicit instruction, `docs/workflow/plans/2026-07-06-show-queue-export-pivot-plan.md` now
records that the Gang Sheet Builder should eventually move to its own standalone route outside
`/show-queue/`, rather than remaining at `/show-queue/:showId/gang-sheet` even in its unlinked
form. This is recorded as future-direction guidance only — not implemented in this pass, per
explicit instruction not to do so unless required to keep Show Queue clean (it was not required).

## Files changed

- `docs/workflow/plans/2026-07-06-show-queue-export-pivot-plan.md` — recorded the follow-up
  direction and all finalized Part B decisions (yazl approval, DPI, quantity, filename convention,
  failure handling, scope, architecture split).
- `shared/utils/showExportFilename.ts` (+ test) — pure filename/target-pixel-size utilities.
- `shared/types/export/showExportIpc.types.ts` — new IPC request/result types and
  `FreshPrintsExportApi` interface.
- `shared/types/import/importIpc.types.ts` — added `export: FreshPrintsExportApi` to
  `FreshPrintsPreloadApi` (existing circular-type-import pattern, already used by the other
  per-feature APIs; erased at compile time, no runtime impact).
- `electron/ipc/export/exportIpcChannels.ts` (new) — channel constants + allowlist guard.
- `electron/ipc/export/exportRequestValidation.ts` (new) — validates the export request, including
  an explicit Firebase Storage host allowlist so main never fetches an arbitrary renderer-supplied
  URL.
- `electron/ipc/export/exportIpcHandlers.ts` (new) — `registerExportIpcHandlers()`, following the
  existing `ipcMain.handle` + uniform result-envelope convention.
- `electron/services/export/downloadAndResizeExportImage.ts` (new) — per-image download + `sharp`
  resize, using the existing `loadSharpModule()` lazy-load pattern; returns a discriminated
  success/skip-and-warn result rather than throwing.
- `electron/services/export/buildExportZipBuffer.ts` (new) — in-memory zip construction via `yazl`.
- `electron/services/export/exportShowZip.ts` (new) — orchestrates download/resize/zip/save-dialog/
  write; aborts (throws `AllExportImagesFailedError`) only if every image failed.
- `electron/main.ts` — registers `registerExportIpcHandlers()` alongside the existing handlers.
- `electron/preload.ts` — new `window.freshPrints.export.exportShowZip(...)` method, following the
  existing `invokeXxxChannel` convention.
- `src/renderer/src/features/upcoming-shows/hooks/useExportShowZip.ts` (new) — loads
  allocations/designs, resolves download URLs, computes sizing/filenames, calls the IPC method,
  tracks loading/error/result state.
- `src/renderer/src/features/upcoming-shows/components/ExportShowConfirmModal.tsx` (new) —
  confirmation/progress/result modal, using existing `Modal`/`ModalHeader`/`ModalBody`/
  `ModalFooter` components.
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — replaced (removed in
  the prior unlink pass) `Build Gang Sheet` button with the new `Export` button + modal wiring;
  restored the `hasActiveAllocationsForSelectedShow` guard for the new button.
- `src/renderer/src/styles/components/show-queue.css` — minor styling for the export result/
  warnings list in the modal.
- `package.json`/`package-lock.json` — added `yazl` (approved) and `@types/yazl` (dev, matching the
  existing `@types/yauzl` convention).

## Automated verification

- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS (0 warnings).
- `npx tsx --test shared/utils/showExportFilename.test.ts` — PASS, 15/15.
- `npx vite build` — PASS (renderer, Electron main — grew from 90 to 100 modules with the new
  export IPC/services — and preload all build cleanly), existing circular manual-chunk warning
  only.
- `git diff --check` — PASS (exit 0), standard pre-existing Windows LF/CRLF warnings only.

## Dependency changes

- `yazl` — approved, added as a runtime dependency (zip-writing in Electron main).
- `@types/yazl` — added as a dev dependency (type definitions, matching the existing
  `@types/yauzl` pattern). `npm audit` after both installs showed no new vulnerabilities beyond the
  pre-existing transitive issues in `electron`/`electron-builder`/`vite`.

## Local Firestore rules/index changes

None. This feature only reads existing `showAllocations`/`designs` collections; no new collection,
field, or rule was introduced.

## Scope confirmation

Implemented per the approved plan: Show Queue Export only (image download, fixed-300-DPI resize,
zip creation, save dialog, warnings reporting). Not implemented, per explicit scope guardrails: Gang
Sheet Builder fixes (including its unrelated `react-rnd`/`process` runtime crash), the Gang Sheet
Builder standalone-route migration (recorded as follow-up direction only), Auto Builder,
high-resolution gang-sheet-layout PNG export, printing timer controls, production-state
reconciliation, Portal work, live Whatnot sync, ecommerce, checkout, Add to Cart, shipping,
generated PNG upload, and any production-status write to `designs`. No original design asset was
mutated — every resize happens on an in-memory copy only.

## Manual QA checklist

1. Open Show Queue, select a show with at least one active allocation — confirm `Export` is
   enabled (and `Build Gang Sheet` no longer appears anywhere on the page).
2. Select a show with no active allocations — confirm `Export` is disabled with an explanatory
   tooltip.
3. Click `Export` — confirm the confirmation modal opens with the expected copy (mentions 300 DPI,
   print-request size, and that originals are never modified).
4. Click `Export` in the modal — confirm a loading state appears, then a native save dialog opens
   defaulting to `whatnot_<show's scheduled date>_<time>.zip`.
5. Save the zip — confirm the modal shows a success summary with the exported image count and
   saved file path.
6. Open the saved zip — confirm it contains one PNG per active allocation, each named
   `{seq}_QTY-{qty}_{width}x{height}_{design-title}_alloc-{id}.png`, and each image's actual pixel
   dimensions match `printWidthInches * 300` x `printHeightInches * 300`.
7. If any image needed upscaling (source smaller than the 300 DPI target), confirm it's still
   included in the zip and reported as a warning both in the modal and in `EXPORT_WARNINGS.txt`
   inside the zip.
8. Temporarily point one allocation at a design with an invalid/missing original path (or simulate
   a network failure) — confirm that one image is skipped with a warning and the rest of the
   export still completes successfully (skip-and-warn, not abort).
9. If every image would fail, confirm the export aborts with a clear error message and no zip file
   is written.
10. Click `Cancel` in the confirmation modal before confirming — confirm nothing is downloaded or
    written.
11. Cancel the native save dialog itself (after export processing) — confirm the modal reflects
    the cancellation without error, and no partial file is left on disk.
12. Confirm `designs.status` is unchanged throughout.
13. Confirm the original Storage assets are byte-for-byte unchanged (only an in-memory resized
    copy was created for the zip).
14. Confirm no export/timer/reconciliation/Portal/Whatnot-sync/ecommerce/Add-to-Cart/shipping
    behavior was added anywhere, and that the Gang Sheet Builder itself (still reachable directly
    at `/show-queue/:showId/gang-sheet`) was not modified by this change.
