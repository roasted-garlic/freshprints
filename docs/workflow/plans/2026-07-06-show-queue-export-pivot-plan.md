# Show Queue — Gang Sheet Builder Unlink and Export Feature Plan

## Status

Part A (unlink) implemented. Part B (Export feature) **approved** with the decisions recorded below
— implementation proceeding.

## Follow-up direction (not implemented this phase)

The Gang Sheet Builder should eventually move off the Show Queue route entirely — its future
standalone form should live at its own separate builder area/route, not nested under
`/show-queue/:showId/gang-sheet`, so Show Queue is not coupled to it even at the URL level. For now,
leaving it unlinked-but-still-under-`/show-queue/`  is accepted as the smallest safe step (Part A).
**Do not implement this route move as part of the Export phase** unless it turns out to be required
to keep Show Queue clean (it is not expected to be). This is recorded here purely as future-direction
guidance for whenever Gang Sheet Builder work resumes.

## Why this plan exists

The reference-parity Gang Sheet Builder refactor (`react-rnd`-based canvas) crashes at runtime:
`Uncaught ReferenceError: process is not defined` inside `react-rnd`'s internal `Draggable`
component. `react-rnd` (via `react-draggable`) reads `process.env.NODE_ENV` using a legacy
`React.createClass`-era pattern that assumes a Node-style `process` global exists in the browser
context — Vite's renderer sandbox does not polyfill `process` by default, so this throws immediately
on mount. This is a real, unresolved integration problem with `react-rnd` in this Electron+Vite
stack, not a bug in the Fresh Prints code around it.

Rather than keep the Gang Sheet Builder blocking Show Queue's own progress while that library issue
is debugged, the user has decided to:

- **Unlink** the Gang Sheet Builder from Show Queue entirely — keep the feature as a standalone,
  independently-reachable part of the app so it can be debugged/finished later without blocking
  Show Queue.
- **Replace** the Show Queue's builder entry point with a new **Export** action: a per-show zip
  download of each allocated design's original image, resized to its print-request dimensions, with
  a filename derived from the show's own scheduled date/time.

## Part A — Unlink Gang Sheet Builder from Show Queue

### Decision

Keep all Gang Sheet Builder code (route, page, hooks, service, `react-rnd` integration, Firestore
`gangSheets`/`gangSheetItems` model) exactly as-is, reachable at its current route
(`/show-queue/:showId/gang-sheet`) if navigated to directly. Only remove the entry point — the
`Build Gang Sheet` button — from the Show Queue detail view. This keeps the `react-rnd` crash
isolated to a page nobody currently reaches through normal navigation, so it does not block Show
Queue work, while preserving all completed work (data model, service layer, panel/toolbar UI) for
whenever the `react-rnd` issue is resolved or a different drag/resize approach is chosen.

### Scope

- Remove the `Build Gang Sheet` button and its `getGangSheetBuilderPath` import/usage from
  `UpcomingShowsPage.tsx`.
- Remove the now-unused `hasActiveAllocationsForSelectedShow` computation *only if* nothing else
  uses it after the Export button is added (the Export button will need its own, likely identical,
  guard — confirm during implementation whether to keep or rename this variable for the new button).
- No route removal, no deletion of `src/renderer/src/features/gang-sheets/`, no Firestore rules/
  index change, no `react-rnd` removal. The builder remains fully intact at its existing route.
- Add a short code comment or a `docs/project/TECH_DEBT.md` note (if repo convention favors that)
  recording that the Gang Sheet Builder is currently unreachable from normal navigation pending a
  `react-rnd`/`process` polyfill fix or a replacement drag/resize approach — so this isn't
  mistaken for accidental dead code later.

### Not fixing `react-rnd` in this pass

This plan does not attempt to fix the `process is not defined` crash (e.g. via a Vite `define`
polyfill for `process.env.NODE_ENV`, or swapping `react-rnd` for another library). That is separate,
optional follow-up work on the now-standalone Gang Sheet Builder, out of scope for Show Queue.

## Part B — Show Queue Export Feature

### Product requirement (as given)

Replace the Show Queue's `Build Gang Sheet` button with an `Export` button. Clicking it shows a
confirmation modal explaining that it will download each allocated design's image at the size set
during the print request stage, then zips them and downloads a file named `whatnot_<show
date/time>.zip`.

### Clarified decisions

- **Image fidelity**: each original image is actually resized/rasterized to its print-request
  dimensions before being added to the zip (not just labeled with size metadata).
- **Filename date/time source**: the show's own `scheduledStartAt` (Firestore Timestamp already on
  `UpcomingShow`), not the moment the export is clicked.
- **Image selection**: one entry per active `ShowAllocation` for the show (excluding `canceled`),
  reusing the same allocation-loading logic already proven in `useGangSheetShowAssets`.

### Data sources (already exist, reused as-is)

- `ShowAllocation.printWidthInches` / `ShowAllocation.printHeightInches` — per-show print size
  (falls back to `Design.printWidthInches`/`Design.printHeightInches` if the allocation didn't
  override it, matching the existing gang sheet placement-size logic in
  `useGangSheetBuilder.placeAsset`).
- `Design.originalPath` — canonical Storage catalog path for the full-resolution original PNG.
  Resolved to a download URL via `designDerivativeUrlService.getDownloadUrlForCatalogPath`.
- `Design.width` / `Design.height` — source pixel dimensions, needed to compute the resize target
  pixel size at a chosen export DPI.
- `Design.effectiveDpi` — **not used** for export. The export always targets a fixed 300 DPI
  regardless of a design's stored effective DPI (see Decisions below), so only `Design.width`/
  `Design.height` (source pixel dimensions) matter, to detect whether upscaling is needed.
- `UpcomingShow.scheduledStartAt` — Firestore Timestamp, source for the filename's date/time
  component. A new filename-safe formatter is needed (existing `formatShowDateTimeLabel` produces
  a human-readable string with commas/colons, unsafe for a filename) — e.g.
  `whatnot_2026-07-06_1400.zip`.
- `upcomingShowService.listShowAllocations` + `designService.getDesignById` — the exact pair of
  calls `useGangSheetShowAssets` already uses; reused directly (or via a small new hook that swaps
  `getThumbnailUrl` for `getDownloadUrlForCatalogPath(design.originalPath)`) rather than duplicating
  the allocation/design join logic.

### New capabilities needed (none exist yet)

1. **Zip-writing.** The repo has `yauzl` (zip **reading**, used only by the batch import
   extractor) but no zip-**writing** library anywhere. **`yazl` is approved** (the write-side
   sibling of `yauzl`, from the same maintainer, minimal API, no native bindings) for creating the
   export zip in Electron main.
2. **Image download + resize pipeline in Electron main.** `sharp` is already a dependency and
   already has an established lazy-load pattern (`electron/services/import/loadSharpModule.ts`) and
   an established resize-pipeline pattern (`electron/services/import/encodeWebpDerivative.ts`), but
   both existing usages operate on local files/buffers already on disk from a user-initiated import.
   This feature instead needs each image's bytes **downloaded from its Firebase Storage download
   URL** first (no local file exists yet), then resized via `sharp` to the target print-size pixel
   dimensions, then handed to the zip writer — a new pipeline, following the existing lazy-load/
   discriminated-result conventions but net-new logic.
3. **Save-dialog IPC handler.** No `dialog.showSaveDialog`/`showOpenDialog`-based *save* flow exists
   anywhere in `electron/` today (only *open* dialogs for import file pickers). A new IPC channel
   (e.g. `fresh-prints:export:save-show-zip` or similar, namespaced under a new `electron/ipc/
   export/` folder) is needed to let the renderer trigger "build this zip and let the user choose
   where to save it," following the exact channel-naming/registration/preload conventions already
   established by `electron/ipc/import/` and `electron/ipc/app/` (kebab-case channel constants,
   `registerExportIpcHandlers()` called from `electron/main.ts`, a `contextBridge`-exposed
   `window.freshPrints.export.*` namespace in `electron/preload.ts`, uniform
   `{ success, data } | { success, error }` result envelope).

### Proposed flow

1. Staff clicks `Export` on Show Queue detail (guarded by the same "has active allocations" check
   the old `Build Gang Sheet` button used).
2. A confirmation modal opens (new `ExportShowConfirmModal` or similar, using the existing
   `Modal`/`ModalHeader`/`ModalBody`/`ModalFooter` components), explaining: "This will download each
   design at its print request size and package them into a zip file named
   `whatnot_<date>_<time>.zip`." Staff confirms or cancels.
3. On confirm, the renderer:
   - loads active allocations + designs for the show (reusing the existing pattern),
   - resolves each design's original download URL,
   - calls a new Electron IPC handler with the list of `{ downloadUrl, targetWidthPx,
     targetHeightPx, fileName, allocationId }` entries (target pixel size computed as
     `printInches * 300` per the approved DPI decision) plus the computed zip filename,
   - shows a loading/progress state on the button/modal while the export runs.
4. Electron main, per entry: downloads the image bytes, resizes via `sharp` to the target pixel
   size (upscaling if the source has fewer pixels than the target, recording that as a warning),
   adds the resulting PNG buffer to an in-memory zip via `yazl`; if an entry fails at any step, it is
   skipped and recorded as a warning rather than aborting the whole export. Once all entries are
   processed: if every entry failed, abort without writing a file and return a failure result; if
   any warnings exist, an `EXPORT_WARNINGS.txt` entry is added listing them; then a native save
   dialog (defaulting to the computed zip filename) is shown and the zip is written to the chosen
   path.
5. Result (success with saved path and any warnings, or a specific failure reason) is returned to
   the renderer via the IPC result envelope; the modal shows a success/warning/error state
   accordingly.

### Explicitly out of scope for this feature

- Any change to `designs.status` or production-status writes of any kind.
- Any change to `ShowAllocation`/`PrintRequestItem` status as a side effect of exporting — exporting
  is a read-only, non-destructive action on production state.
- Mutating original design assets — only a resized **copy** in memory/temp is created for the zip;
  the canonical Storage original is never modified.
- Any Gang Sheet Builder functionality (multi-sheet, layout, drag/resize) — this is a distinct,
  simpler feature: one image per allocation, no manual arrangement.
- Any Portal/customer-facing exposure of this export — staff-only, desktop-local file save.
- Any change to Firestore rules/indexes (this feature reads existing collections only; no new
  collection is introduced unless an export-history record is later requested — not proposed here).

### Decisions (approved)

1. **Zip-writer dependency: `yazl`, approved.** Matching write-side sibling of the already-present
   `yauzl`; minimal surface, no native bindings, appropriate for Electron main. No other zip/export
   dependency may be added without separate approval.

2. **Export DPI: fixed 300 DPI for every exported copy.** Do **not** use `Design.effectiveDpi` as
   the output DPI — the goal is a consistent print-size export regardless of each design's stored
   effective DPI. Per image:
   - `targetWidthPx = printWidthInches * 300`
   - `targetHeightPx = printHeightInches * 300`
   If the source image has fewer pixels than the 300-DPI target requires, **upscale the exported
   copy only** so the file matches the requested print size at 300 DPI. The original design asset,
   its catalog dimensions, and its metadata are never mutated — only an in-memory/temp resized copy
   is produced for the zip. When upscaling occurred, record it as a warning (see Failure handling).

3. **Quantity: one file per active `ShowAllocation`, not one duplicate per physical copy.** Include
   the allocation's `allocatedQuantity` in the filename so staff can see how many physical copies
   that file represents without needing 25 duplicate files for 25 prints.

4. **Filename convention.** Per-image filename inside the zip:

   ```txt
   {seq}_QTY-{allocatedQuantity}_{widthInches}x{heightInches}_{sanitized-design-title}_alloc-{shortAllocationId}.png
   ```

   Example: `001_QTY-2_10x8.33_design-title_alloc-abc123.png`

   Rules:
   - `{seq}` is a 3-digit, 1-based sequence number (`001`, `002`, ...) in the order allocations are
     processed — guarantees uniqueness and stable ordering even before considering the rest of the
     name.
   - `QTY-{allocatedQuantity}` — the allocation's quantity, verbatim.
   - Print size formatted as `{width}x{height}` in inches, trimmed of unnecessary trailing zeros
     (e.g. `10x8.33`, not `10.00x8.33000`).
   - Design title sanitized: lowercase, spaces → hyphens, strip anything that is not
     `[a-z0-9-]`, collapse repeated hyphens, trim leading/trailing hyphens.
   - `alloc-{shortAllocationId}` — a short suffix derived from the `ShowAllocation.id` (e.g. first 6
     characters) to guarantee collision-safety even if two allocations sanitize to the same title
     and size.
   - No slashes, colons, commas, emoji, or other filesystem-unsafe characters anywhere in the name.

   Zip filename: `whatnot_YYYY-MM-DD_HH-mm.zip`, built from the show's own `scheduledStartAt`
   (never the moment Export is clicked). Example: `whatnot_2026-07-06_14-00.zip`.

5. **Failure handling: skip-and-warn, with a full-failure abort.**
   - If one image fails to download, resize, or add to the zip: skip that image, continue with the
     rest, and surface a warning to the user after the export completes.
   - If the source image needed upscaling to hit the 300 DPI target, that is also recorded as a
     warning (informational, not a failure) — the export still succeeds for that image.
   - When practical, include an `EXPORT_WARNINGS.txt` file inside the zip itself, listing every
     skipped item (with a reason) and every upscaled item (with the scale factor or resulting
     resolution), so the warning information travels with the file.
   - If **every** image fails, abort the export entirely: do not create/save an empty (or
     warnings-file-only) zip, and show a clear error message instead of a false "success."

### Scope guardrails (reaffirmed)

Only the Show Queue Export feature is in scope for this implementation pass. Explicitly **not**
implemented as part of this phase: Gang Sheet Builder fixes (including the `react-rnd`/`process`
crash), the Gang Sheet Builder standalone route migration (see Follow-up direction above), Auto
Builder, high-resolution gang-sheet-layout PNG export, printing timer controls, production-state
reconciliation, Portal work, live Whatnot sync, ecommerce, checkout, Add to Cart, shipping,
generated PNG upload to Storage, or any production-status write to `designs`.

### Architecture split (reaffirmed)

Electron main owns: downloading each image, `sharp` resize to the fixed-DPI target dimensions, zip
creation (via `yazl`), the native save dialog, and local file writing. The renderer never touches
the filesystem directly — it only loads show allocation/design metadata, resolves authorized
original-image download URLs, calls the new IPC method with that data, and renders the
modal/progress/success/error UI. This follows the existing `contextBridge`/preload conventions
exactly (see `electron/ipc/import/`, `electron/preload.ts`).

### Files likely to touch

- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — remove `Build Gang Sheet`
  button, add `Export` button + modal wiring.
- New `src/renderer/src/features/upcoming-shows/components/ExportShowConfirmModal.tsx` (or similar).
- New `src/renderer/src/features/upcoming-shows/hooks/useExportShow.ts` (or reuse/adapt
  `useGangSheetShowAssets`'s query pattern) — loads allocations/designs, resolves original download
  URLs, calls the new IPC channel, tracks loading/success/error state.
- New `shared/utils/showExportFilename.ts` (or similar) — filename-safe date/time formatter, pure
  function with its own test.
- New `electron/ipc/export/exportIpcChannels.ts`, `exportIpcHandlers.ts` — new IPC surface following
  existing conventions.
- New `electron/services/export/` — download + resize + zip-write pipeline, reusing
  `loadSharpModule()`.
- `electron/preload.ts` — new `window.freshPrints.export.*` namespace.
- `electron/main.ts` (or wherever handlers are registered) — register the new export IPC handlers.
- `package.json`/`package-lock.json` — add the zip-writer dependency (pending approval).

### Tests and manual QA (once implementation is approved)

- Unit tests for the filename formatter (date/time → filename-safe string).
- Unit tests for the print-size-to-target-pixel-dimensions calculation (reusing/mirroring the
  existing DPI/inches math already tested for the gang sheet builder).
- Manual QA: export a show with multiple allocations, confirm the modal copy, confirm the saved zip
  contains correctly-sized/named images, confirm cancel doesn't download anything, confirm a show
  with no active allocations has Export disabled, confirm no production-status/design mutation
  occurred.

## Human checkpoints

- Part A (unlink): implemented — mechanical, reversible.
- Part B (Export feature): **approved**, including the `yazl` dependency and all decisions recorded
  above (DPI, quantity, filename convention, failure handling, scope, architecture split).
- No other dependency may be added without its own separate approval.
- No Firestore rules/index deploy anticipated; confirm during implementation if that changes.
- The Gang Sheet Builder standalone-route follow-up direction (see above) is recorded for later —
  not part of this implementation.
