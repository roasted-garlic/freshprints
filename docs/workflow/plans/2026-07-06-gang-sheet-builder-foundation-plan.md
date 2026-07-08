# Gang Sheet Builder Foundation Plan

## Goal

Plan the Phase 7 gang sheet workflow around the real production artifact:

```txt
Show Queue detail
  -> Build gang sheet
  -> saved gang sheet layout
  -> multi-sheet editing and object controls
  -> high-res transparent PNG export
  -> Start/Pause/Resume/Reset/Finished production timer
  -> production state reconciled from the saved gang sheet
```

This replaces the idea of a standalone production-status UI. Production status should come from the saved gang sheet workflow, not from unrelated status buttons.

## Current Verified Context

- Phase 7 Show Queue uses `upcomingShows` as the combined Whatnot show / print-run entity.
- Allocated production work lives on `showAllocations`.
- `printRequestItems` are the source request item records.
- `designs.status` is catalog lifecycle only and must never receive production writes.
- Original production assets are canonical Firebase Storage paths under `/originals/{designId}.png`.
- `sharp` is already available in `package.json`, so high-res PNG composition can use Electron main process code without adding a new image dependency.
- Existing `ShowAllocationStatus` and `PrintRequestItemStatus` still include both `printed` and `done`; this plan treats the UI action as one **Finished** action and recommends using `done` as the canonical finished write for new gang sheet workflow updates, while continuing to read existing `printed` values as finished-compatible legacy state.

## Overall Target Workflow

Long-term Phase 7 direction:

```txt
Show Queue detail
  -> Build gang sheet
  -> saved gang sheet layout
  -> multi-sheet editing and object controls
  -> high-res transparent PNG export
  -> Start/Pause/Resume/Reset/Finished production timer
  -> production state reconciled from the saved gang sheet
```

This section describes the final intended workflow, not the first implementation slice.

## This Managed Phase Scope

If implementation is approved from this plan, this managed phase should cover **Slice 1 only**.

Approval note:

This looks good and is approved to move forward with **Slice 1 only**.

Implementation clarification:

- For the Slice 1 builder canvas, it is acceptable to use thumbnails/previews for fast on-screen editing as long as saved `gangSheetItem` records keep the canonical `originalPathSnapshot` needed for future high-resolution export.
- Do not force the builder canvas to render huge original PNGs if that creates performance problems.
- Since future slices will support multiple sheets for one show, Slice 1 should consider adding a simple `sortOrder` or `sheetNumber` field on `gangSheets` even if Slice 1 only creates one sheet. That avoids a small data-model adjustment in Slice 2.

In scope for the first implementation phase:

- Add a **Build gang sheet** action to Show Queue detail.
- Add a Studio-only gang sheet builder route/view for the selected show.
- Load the selected show's allocated assets from `showAllocations`, `printRequestItems`, approved `designs`, and canonical original asset paths.
- Render the three-panel builder shell:
  - top toolbar skeleton
  - left show-assets panel
  - main canvas
  - right sheet/details panel shell
- Support the minimum usable saved-layout foundation:
  - place assets on the canvas
  - select placed items
  - move placed items
  - resize placed items with aspect ratio preserved by default
  - rotate placed items
  - delete placed items
- Save and reload layout metadata for a single sheet.
- Store the first-slice data model needed for future multi-sheet, export, and timer work.
- Default sheet width to `22` inches.
- Use a simple starting sheet height default that staff can change before save.
  Recommended starting default: `12` inches.

Out of scope for the first implementation phase:

- Multi-sheet authoring beyond the minimum data-model support needed to avoid repainting the architecture later.
- Flip controls in the UI.
- Duplicate, snap, align, center, or advanced object-property tools.
- High-resolution PNG export.
- Gang sheet upload to Firebase Storage.
- Printing timer controls.
- Production-state reconciliation from gang sheet actions.
- Any correction path for finished gang sheets.
- Live Whatnot sync.
- Portal work.
- Ecommerce, checkout, shipping, packing, fulfillment, or customer-facing behavior.
- Mutating original design assets.
- Writing production status to design documents.
- Automatic nesting/packing optimization unless explicitly approved later.

## Future Slices

- Slice 2: multi-sheet support and expanded object properties/tools
- Slice 3: high-resolution transparent PNG export
- Slice 4: printing timer and finished production state

## Recommended Data Model

Add a new top-level collection:

```txt
gangSheets
```

Document:

```txt
gangSheets/{gangSheetId}
```

Recommended type:

```ts
export type GangSheetStatus =
  | "draft"
  | "ready"
  | "printing"
  | "paused"
  | "finished"
  | "archived";

export interface GangSheet {
  id: string;
  upcomingShowId: string;
  title?: string;

  status: GangSheetStatus;

  sheetWidthInches: number;
  sheetHeightInches: number;
  dpi: number;
  backgroundColor?: string;

  itemCount: number;
  totalQuantity: number;

  accumulatedPrintMs: number;
  activePrintStartedAt?: Timestamp;
  printStartedAt?: Timestamp;
  printPausedAt?: Timestamp;
  printFinishedAt?: Timestamp;
  printFinishedBy?: string;
  lastResetAt?: Timestamp;
  lastResetBy?: string;

  lastExportedAt?: Timestamp;
  lastExportedBy?: string;
  lastExportFileName?: string;

  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Sheet sizing rule:

- Default width for the first slice: `22` inches.
- Height must not be treated as a forever-hardcoded constant.
- First-slice recommendation: start new sheets at `22 x 12` inches and let staff change height before first save.
- Later slices may add presets, but the data model should always store explicit width and height per sheet.
- Slice 1 should also consider storing a simple `sortOrder` or `sheetNumber` field on `gangSheets` so multi-sheet ordering is already modeled even when only one sheet exists.

Add a related top-level collection:

```txt
gangSheetItems
```

Document:

```txt
gangSheetItems/{gangSheetItemId}
```

Recommended type:

```ts
export interface GangSheetItem {
  id: string;
  gangSheetId: string;
  upcomingShowId: string;
  showAllocationId: string;
  printRequestId: string;
  printRequestItemId: string;
  designId: string;

  copyIndex: number;
  sourceQuantitySnapshot: number;

  designTitleSnapshot?: string;
  requestNameSnapshot: string;
  originalPathSnapshot: string;

  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
  rotationDegrees: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  zIndex: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Why separate `gangSheetItems` instead of embedding layout items in `gangSheets`:

- A show can eventually have many placed copies.
- Firestore document size limits make large embedded layout arrays risky.
- Individual item rows are easier to validate, diff, and batch-update.
- Querying by `gangSheetId` is straightforward and mirrors existing top-level collection patterns.

First-slice note:

- `flipHorizontal` and `flipVertical` should be included in the initial data model even though flip controls are deferred to a later slice. That avoids a data-model rewrite once the toolbar gains flip actions.
- Saved `gangSheetItem` records must keep the canonical `originalPathSnapshot` for future export even if the Slice 1 canvas renders thumbnails/previews for performance.

## Relationships

`gangSheets.upcomingShowId` points to one `upcomingShows` document.

Each `gangSheetItem` points back to:

- the saved gang sheet (`gangSheetId`)
- the show (`upcomingShowId`)
- the allocation being printed (`showAllocationId`)
- the source request item (`printRequestItemId`)
- the source design (`designId`)

The builder should generate one placed `gangSheetItem` per physical printed copy. For example, a `showAllocation` with `allocatedQuantity = 25` creates up to 25 placed layout items. This keeps the saved layout faithful to what will actually print.

Validation rule: a gang sheet cannot be considered `ready` for printing unless every active placed copy references an active allocation for the same show and the placed-copy counts do not exceed the allocation quantities.

## Timer Ownership

Timer state belongs on `gangSheets`.

Reason:

- One show can eventually have multiple gang sheets.
- Each gang sheet can take a different amount of time to print.
- Pausing/resuming/resetting a single sheet should not corrupt show-level or allocation-level status.

The show can derive display state from its gang sheets. Allocation and request status should update only when a saved gang sheet starts or finishes.

## Timer Behavior

### Start Printing

Allowed when:

- gang sheet has been saved
- gang sheet has at least one placed item
- status is `ready` or was reset to `ready`

Writes:

- `gangSheets.status = "printing"`
- `gangSheets.activePrintStartedAt = now`
- if first start, `gangSheets.printStartedAt = now`
- related `showAllocations.status = "in_progress"`
- `upcomingShows.productionStatus = "printing"`

### Pause

Allowed when `gangSheets.status = "printing"`.

Writes:

- add elapsed time since `activePrintStartedAt` into `accumulatedPrintMs`
- clear `activePrintStartedAt`
- `gangSheets.status = "paused"`
- `gangSheets.printPausedAt = now`

Related allocations remain `in_progress`; the work has started and is not editable through normal queue actions.

### Resume

Allowed when `gangSheets.status = "paused"`.

Writes:

- `gangSheets.status = "printing"`
- `gangSheets.activePrintStartedAt = now`

### Stop/Reset

Allowed when status is `printing` or `paused`, before finish.

Writes:

- `gangSheets.status = "ready"`
- `gangSheets.accumulatedPrintMs = 0`
- clear active timer fields
- set `lastResetAt` / `lastResetBy`
- related `showAllocations.status = "queued"` if no other active printing gang sheet references the same allocation
- recompute `upcomingShows.productionStatus` from current gang sheet/allocation state

Reset is an action, not a stored status.

### Mark Finished

Allowed when status is `printing`, `paused`, or `ready`.

If printing, first fold the active elapsed time into `accumulatedPrintMs`.

Writes:

- `gangSheets.status = "finished"`
- `gangSheets.printFinishedAt = now`
- `gangSheets.printFinishedBy = caller.id`
- final elapsed print time remains in `accumulatedPrintMs`
- related `showAllocations.status = "done"`
- related allocation `completedAt` / `completedBy` set
- related `printRequestItems.status = "done"` only when all quantities for that item are finished across all show allocations/gang sheets
- related `printRequests.status = "completed"` only when every unit in the request is finished
- `upcomingShows.productionStatus = "completed"` only when every non-canceled allocation for the show is finished

UI label should be **Finished** / **Mark finished**, not separate Printed and Done steps.

## Production Status Rules

Do not write `queued`, `printing`, `printed`, `done`, or any other production state to `designs`.

Recommended canonical writes from this workflow:

- Gang sheet:
  - `ready`
  - `printing`
  - `paused`
  - `finished`
- Show allocations:
  - `queued` when layout is saved and ready, if needed
  - `in_progress` when printing starts
  - `done` when the gang sheet is marked finished
- Print request items:
  - `done` only after all allocated quantities for that item are finished
- Print requests:
  - existing `completed` when all request item quantities are done
- Upcoming show:
  - `printing` while at least one gang sheet for the show is printing or paused
  - `completed` when every active allocation for the show is done

Existing `printed` / `fully_printed` values should remain readable for compatibility, but this workflow should not expose them as separate staff actions.

## File/Image Pipeline

Recommended implementation:

1. Renderer loads builder state and resolves original asset access for the placed designs.
2. Staff arranges layout using a responsive builder canvas measured in inches.
3. Saved layout stores inch-based coordinates and sheet DPI, not screen pixels.
4. Export invokes a new Electron IPC handler, for example `fresh-prints:gang-sheet:export-png`.
5. Electron main uses `sharp` to compose a high-resolution PNG:
   - output width = `sheetWidthInches * dpi`
   - output height = `sheetHeightInches * dpi`
   - each placed item is rendered from the original PNG, resized to `widthInches * dpi` by `heightInches * dpi`
   - each item is composited at `xInches * dpi`, `yInches * dpi`
   - rotation is applied if non-zero
6. Electron shows a save dialog and writes the generated PNG to the staff-selected local file path.
7. Renderer records `lastExportedAt`, `lastExportedBy`, and `lastExportFileName` on the gang sheet after a successful export.

Transparency rule:

- Exported PNGs must preserve transparency by default.
- The checkerboard is editor-only visualization and must never be baked into the exported PNG.
- A non-transparent background should only appear if a future approved slice adds an explicit background setting.

Security guardrails:

- Renderer must only pass canonical `/originals/{designId}.png` paths associated with the selected show's allocated designs.
- Electron main must not fetch or read arbitrary user-supplied paths.
- If signed Firebase download URLs are used, Electron main should validate the URL host/protocol and pair every URL with a canonical original path before fetching.
- Original design assets are read-only for export and never mutated.
- Generated PNGs are local downloads in the export slice; uploading generated gang sheet PNGs to Storage is a future explicit decision.

Slice 1 rendering note:

- The builder canvas does not need to render full original PNGs during editing.
- Using thumbnails or previews for interactive editing is approved for Slice 1 if that gives materially better performance.
- The saved layout model must still preserve canonical original asset paths for future export-quality composition.

Rotation and bounds rule for the export slice:

- Export validation should use the fully transformed bounding box, not just unrotated width/height.
- The MVP export path should not silently clip rotated items at the sheet edge.
- Recommended behavior: any placed item whose transformed bounds exceed the sheet bounds is invalid, must be visually flagged in the builder, and blocks export until corrected.
- Slice 1 does not need final transformed-bounds validation logic, but the saved-layout model and future export slice must honor this rule.

## UI Shape

Show Queue detail:

- Add **Build gang sheet** near the show production/capacity actions.
- Disable or explain the action when the show has no active allocations.
- If a saved gang sheet exists, show the latest sheet status and a button to continue.

Gang sheet builder:

- Header: show date/title, saved state, export action, production timer.
- Left rail or tray: allocated designs/copies still needing placement.
- Main workspace: sheet canvas.
- Right/secondary panel: selected item controls such as size, rotation, duplicate/delete, alignment.
- Bottom/status region: placed count vs allocated count, save state, validation errors.

Production timer controls:

- `Start printing` when ready.
- Count-up timer while printing.
- `Pause` while printing.
- `Resume` while paused.
- `Stop/Reset` while printing or paused.
- `Mark finished` available while printing/paused and optionally ready for early finish.

Builder states should be visually distinct:

- Ready: saved and ready to print.
- Printing: timer counting up.
- Paused: timer frozen with Resume visible.
- Finished: timer final, layout locked.

Finished-layout correction path:

- Finished sheets must not be silently editable.
- Any explicit "unlock for correction" path is future work and out of scope unless separately approved.

## Service Boundaries

Add a `gangSheetService` in the renderer feature layer for Firestore reads/writes:

- create/update gang sheet metadata
- save layout items
- load latest gang sheets for a show
- start/pause/resume/reset/finish timer actions
- reconcile allocation/item/request/show state after timer actions

Add Electron IPC only for local high-res PNG export:

- renderer never writes directly to the local filesystem
- Electron main owns save dialog and file write
- renderer owns Firestore state and authenticated Firebase Storage access

Shared pure utilities should own:

- timer elapsed calculations
- layout unit conversion (`inches` <-> `pixels`)
- placed-copy validation against allocation quantities
- production reconciliation planning

## Firebase Impact

Firestore rules must be extended for:

- `gangSheets`
- `gangSheetItems`

Rules should allow active staff to read/write. Field validation should enforce:

- valid statuses
- same-show relationship fields
- positive sheet size and DPI
- non-negative timer elapsed
- non-negative layout coordinates
- canonical original path snapshots

Indexes likely needed:

- `gangSheets.upcomingShowId + updatedAt`
- `gangSheetItems.gangSheetId + zIndex`
- possibly `gangSheetItems.showAllocationId`

Storage rules do not need to change for local-only PNG export. If generated gang sheet PNG upload is added later, that requires a separate Storage path and explicit rules plan.

Local rule/index file edits are acceptable in implementation slices when needed, but deploys are not. No Firestore rules or index deployment should happen without explicit user approval.

## Risks And Open Decisions

- Sheet size presets are not yet chosen beyond the first-slice default of `22 x 12`; later presets remain an open product decision.
- Auto layout/nesting is intentionally out of scope; manual placement comes first.
- Very large original PNGs and many placed copies can be memory-heavy during export. `sharp` in Electron main is the right starting point, but export should show progress/error states and avoid UI freezes.
- Existing status enums include both `printed` and `done`; this plan recommends keeping compatibility but making `done` the canonical new Finished write.
- If one show has multiple gang sheets, finishing one sheet should only finish the allocations represented by that sheet, then recompute show/request completion from all related allocations.
- Resetting a gang sheet after printing started must not reopen allocations that are already represented by another active/finished gang sheet.
- The exact builder route should still be confirmed during implementation, for example `/show-queue/:showId/gang-sheet`.

## Suggested Implementation Slices

Slice 1 - Builder foundation and saved layout model

- Goal:
  Establish the Studio-only gang sheet builder shell and a durable saved-layout model for one show and one sheet.
- Scope:
  Build Show Queue entry into the builder, load selected-show assets, support place/select/move/resize/rotate/delete on a single sheet, and save/reload layout metadata.
- Out of scope:
  Multi-sheet editing, flip UI, duplicate/snap/align tools, export, timer, production reconciliation.
- Data model impact:
  Add `gangSheets` and `gangSheetItems` types plus local Firestore rules/index file updates.
- Files likely to touch:
  `shared/types/`, `src/renderer/src/features/upcoming-shows/`, new `src/renderer/src/features/gang-sheets/` area, `firestore.rules`, `firestore.indexes.json`, route/shell wiring.
- Acceptance criteria:
  Staff can open the builder from a show, place allocated assets on a single 22-inch-wide sheet, save, reload, and see the same layout.
- Tests and manual QA:
  Quantity validation and layout serialization tests; manual open/place/move/resize/rotate/delete/save/reload QA.
- Human checkpoints:
  Review approval before implementation; separate approval before any rules/index deploy.
- Dependencies:
  None.

Slice 2 - Multi-sheet support and object properties

- Goal:
  Expand the saved-layout foundation into a practical authoring workspace for multiple sheets and richer object editing.
- Scope:
  Add multiple sheets, sheet list/thumbnails, object properties panel, duplicate, flip, snap, center, and align tools.
- Out of scope:
  PNG export, timer, finished-state reconciliation.
- Data model impact:
  Primarily uses Slice 1 model; may extend metadata for sheet ordering or per-sheet summaries if repo inspection shows it is needed.
- Files likely to touch:
  New gang sheet feature components, shared layout utilities, builder styles.
- Acceptance criteria:
  Staff can distribute placements across multiple sheets and edit object properties in inches without exceeding remaining quantity.
- Tests and manual QA:
  Multi-sheet and transform utility tests; manual QA for sheet switching, flip state persistence, and quantity enforcement.
- Human checkpoints:
  Review before expanding if the Slice 1 implementation reveals model gaps.
- Dependencies:
  Slice 1.

Slice 3 - High-resolution transparent PNG export

- Goal:
  Export the saved gang sheet layout to a print-ready transparent PNG using original assets.
- Scope:
  Add Electron IPC export path, `sharp` composition, local save dialog, and export metadata recording.
- Out of scope:
  Timer controls, production-state reconciliation, automatic upload of generated exports to Storage.
- Data model impact:
  Add export metadata fields on `gangSheets`; no design-asset mutation.
- Files likely to touch:
  New gang sheet feature services, Electron IPC/main handlers, export utilities, possibly Storage URL helpers.
- Acceptance criteria:
  Staff can export a transparent high-resolution PNG from a saved sheet; export is blocked if transformed bounds exceed the sheet.
- Tests and manual QA:
  Export math/composition utility tests where practical; manual QA for transparency, sizing, rotation, and save-dialog flow.
- Human checkpoints:
  Explicit review before adding any new dependency; explicit approval before any decision to upload generated exports to Storage.
- Dependencies:
  Slice 1 and Slice 2.

Slice 4 - Printing timer and finished production state

- Goal:
  Track real print progress from the saved gang sheet workflow.
- Scope:
  Add Start/Pause/Resume/Reset/Mark finished, store timer state, and reconcile related allocation/request/show production state.
- Out of scope:
  Any correction/unlock flow for finished sheets unless separately approved.
- Data model impact:
  Uses gang sheet timer fields and updates allocation/request/show state through workflow services.
- Files likely to touch:
  `gangSheetService`, upcoming-show allocation services, status helpers, Firestore rules.
- Acceptance criteria:
  Staff can start printing, pause/resume, reset, and mark finished; final elapsed time is preserved; finished sheets lock; related production state updates without touching `designs`.
- Tests and manual QA:
  Timer calculation tests, reconciliation tests, and end-to-end manual QA across start/pause/resume/reset/finished.
- Human checkpoints:
  Review approval before implementation; separate approval before rules/index deploy.
- Dependencies:
  Slice 1, Slice 2, and Slice 3.

## Safest First Slice Recommendation

Start with **Slice 1 only**.

Why:

- It creates the persistent layout model that every later slice depends on.
- It avoids mixing canvas authoring, export pipeline, and production-state writes in one phase.
- It keeps the first implementation reversible and reviewable.
- It gives a concrete builder shell to validate before committing to export math or timer semantics.

Approved Slice 1 scope recap:

- Build gang sheet action from Show Queue detail.
- Studio-only builder route/view.
- Load allocated show assets.
- Three-panel builder shell.
- Place/select/move/resize/rotate/delete on one sheet.
- Save and reload single-sheet layout metadata.
- Local Firestore rules/index file updates if needed.
- No deploys without separate approval.
- No export, timer, production reconciliation, Portal, live Whatnot sync, ecommerce, shipping, or generated PNG upload.

## Verification Plan

Automated:

- Slice 1:
  - pure utility tests for placed-copy quantity validation
  - pure utility tests for inch-based layout serialization
  - service tests/mocks for save/load where local patterns support them
- Later slices:
  - pure utility tests for timer elapsed calculations
  - pure utility tests for inch-to-pixel export conversion
- Shared checks for every implementation slice:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npx vite build`
  - `git diff --check`

Manual QA:

- Slice 1:
  - create/open show with allocations
  - open Build gang sheet
  - confirm allocated assets load into the left panel
  - place assets on the canvas
  - move, resize, rotate, select, and delete placed items
  - save and reload layout
  - confirm sheet width defaults to 22 inches and height is editable before save
  - confirm design records and original assets are unchanged
- Later slices:
  - export high-res transparent PNG
  - start timer, pause, resume, reset
  - start again and mark finished
  - confirm related allocation/request/show statuses update

## Human Checkpoints

Stop for approval before implementation.

Stop again before:

- deploying Firestore rules or indexes
- adding a new dependency
- uploading generated gang sheet PNGs to Firebase Storage
- changing existing status enums in a non-backward-compatible way
- implementing auto-layout/nesting
- adding any Portal/customer-facing behavior

Preserved constraints for Slice 1:

- Do not write production status to `designs.status`.
- Do not mutate original design assets.
- Keep original asset paths canonical for future export.
- Keep this Studio-only.
- Keep Slice 1 narrow and reversible.
- Do not deploy Firestore rules or indexes.
- Do not add dependencies without explicit approval.
