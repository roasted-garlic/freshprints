# Plan: Studio Pre-Release Print Request Download and Intake Navigation

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Author | Managing / Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Goal | `studio-pre-release-pr-item-download-and-intake-navigation` |
| Related | `docs/workflow/reviews/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-formal-review.md` |

---

## Goal

Deliver two bounded Studio-only refinements before a later coordinated Studio/Portal promotion:

1. Add a per-item Download action on Studio `/print-requests` that saves exactly one PNG for
   the item's current saved `printWidthInches` × `printHeightInches` at the established fixed
   300-DPI target.
2. Add `ArrowUp` → Previous and `ArrowDown` → Next keyboard behavior to the existing Studio
   Uploaded Designs and Donated Designs lightbox navigation, using the exact current loaded,
   filtered, previewable intake list and existing boundary/selection behavior.

This plan authorizes no implementation, release, deployment, or production action. The next
gate after Formal Review is explicit owner authorization for Implement → Test.

## Investigation Record

The investigation was performed against the current `development` checkout and the prior
reviewed artifacts for `print-request-direct-export-gangsheet-and-copy` and
`cross-app-lightbox-previous-next-navigation`.

### Workstream A — Per-item Print Request Download

| # | Required question | Current-repo answer |
|---|---|---|
| 1 | What renders individual Studio Print Request item cards? | `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` renders each item. `PrintRequestsPage.tsx` maps the current `requestItems` collection to that component. |
| 2 | What existing request-item production builder is available? | `apps/studio/src/renderer/src/features/print-requests/utils/buildPrintRequestExportAssets.ts` exposes `resolvePrintRequestExportAsset(...)` and `buildPrintRequestExportAssets(...)`. The latter already loads catalog, customer-upload, and Staff Artwork sources, then calls `resolveShowExportProductionAsset(...)`. |
| 3 | Is there a reusable one-item seam from request-level Export Images? | Yes. The existing builder accepts an item array and returns one resolved asset per item. A per-item hook can call the existing builder with a one-item array, or extract a singular wrapper without changing its source branching. It must not copy that branching into the card or page. |
| 4 | What performs one download plus 300-DPI resize? | `apps/studio/electron/services/export/downloadAndResizeExportImage.ts` fetches one authorized download URL, uses Sharp in the Electron main process, resizes to the supplied target pixels, encodes PNG bytes, and returns structured success/failure plus an upscale warning. |
| 5 | Can that IPC be reused unchanged for one item? | The in-memory processing helper can be reused unchanged. The current `EXPORT_SHOW_ZIP` IPC and `exportShowZip.ts` cannot be used unchanged because they always build a ZIP and carry quantity/multiplication semantics. The plan therefore adds a narrow additive export IPC operation that wraps the unchanged helper and saves one PNG through the native dialog. |
| 6 | What filename utility should be reused? | `packages/shared/src/utils/printRequestExportFilename.ts` contains the request export sanitization and size-formatting primitives plus `buildPrintRequestExportImageFilename(...)`. The direct-item filename should use the same title/size sanitization primitives but have a dedicated item-download helper, proposed as `buildPrintRequestExportItemFilename(...)`, so a one-file action does not falsely suggest a ZIP sequence or quantity copy. It must contain title, requested size, and an `item-` identifier; it must not contain an allocation identifier. |
| 7 | How does the card expose autosave and pending-size state? | `PrintRequestItemCard.tsx` keeps local width/height/quantity drafts and tracks `isSaving`, `isFailed`, `isDirty`, and `persistenceHealth`. It registers a flush callback with the page through `onRegisterFlush`; successful `onUpdate(...)` causes the page to replace the saved item. Existing blur/debounce/autosave behavior remains the authority. |
| 8 | How will Download use the latest saved dimensions? | The Download control will be disabled while the card has a dirty, invalid, saving, or failed size draft. The handler will receive the current saved `item` object from `requestItems`, not local input state, and resolve target pixels at click time. After a successful save, `replacePrintRequestItem` updates that object, so the next click resolves the new dimensions. No export target or gang-sheet cache will be retained. |
| 9 | How are source paths resolved? | `resolvePrintRequestExportAsset(...)` converts the source into `resolveShowExportProductionAsset(...)`, which calls `resolvePrintAssetPaths(...)`. The existing builder loads catalog designs through `designService.getDesignById`, customer uploads through `customerUploadReadService.getUploadById`, and Staff Artwork through `staffArtworkService.getById`. The page already hydrates `designById`, `uploadSummariesById`, and `staffArtworkById` for detail presentation; the download path will use the existing builder/service contracts rather than direct component Firebase calls. |
| 10 | How is `artworkEnhanceMode` handled? | The existing shared resolver selects the baseline or interactive enhanced production path based on the item mode. Missing enhanced path or dimensions fail closed. The per-item action will pass the item unchanged through that resolver and will never fall back from enhanced to baseline. |
| 11 | Are any lifecycle states unsafe for a valid item? | No unsafe state was found for a read-only production download. The request-level action gate currently hides request-wide actions on Working/Editing, but that gate must not hide the new per-item action. A per-item Download is available across Working, Editing, Queued, Printing, and Printed when the saved dimensions and source resolve; read-only cards remain read-only. Missing source, invalid dimensions, missing enhanced derivative, or inaccessible Storage produces a disabled/unresolvable action or visible bounded error, never a lifecycle mutation. |
| 12 | Are backend, Rules, schema, index, or migration changes needed? | No. This is an existing staff-authorized read plus local Electron transformation. No Functions, Firestore Rules, Storage Rules, collection, field, index, migration, or backfill is expected. |
| 13 | Does export cache matter? | No. The action will bypass `gangSheetCache.ts`, gang-sheet fingerprints, cached gang-sheet IPC, and ZIP generation entirely. It has no quantity multiplication, no generated artifact, and no request lifecycle telemetry. |

### Workstream B — Uploaded / Donated Intake Lightbox Navigation

| # | Required question | Current-repo answer |
|---|---|---|
| 14 | What is the current Uploaded/Donated path? | Both `apps/studio/src/renderer/src/features/customer-uploads/pages/CustomerUploadsPage.tsx` and `DonatedDesignsPage.tsx` render `CustomerUploadIntakeSection.tsx`. That component builds preview navigation from its current `intake.rows` and renders Studio `DesignPreviewLightbox.tsx`. Donated Designs supplies `purposeScope="catalog_donation"`; Uploaded Designs uses the normal print-request intake scope. |
| 15 | What keyboard bindings exist? | `DesignPreviewLightbox.tsx` handles Escape, ArrowLeft → Previous, and ArrowRight → Next through the existing `goPrevious` / `goNext` callbacks. Visible Previous/Next controls use the same callbacks and remain unchanged. |
| 16 | What editable-target guard exists? | `packages/shared/src/utils/previewLightboxNavigation.ts` exports `isPreviewLightboxEditableKeyboardTarget(...)`. The lightbox uses it before horizontal arrow navigation and checks input, textarea, select, contenteditable, textbox, and spinbutton targets. The vertical keys will use this same guard. |
| 17 | Can vertical keys map directly to existing callbacks? | Yes. `ArrowUp` will call `goPrevious`; `ArrowDown` will call `goNext`. The existing `getPreviewLightboxNavigationState(...)` continues to enforce the current IDs, active ID, no-wrap boundaries, and disabled-state behavior. |
| 18 | Does any current intake control depend on ArrowUp/ArrowDown? | No current Uploaded/Donated lightbox control was found that requires those keys. The guard still prevents interception when focus is in an editable or arrow-sensitive control. |
| 19 | Are visible Up/Down buttons required? | No. The owner request is specifically keyboard navigation using the existing Previous/Next system. No new visible controls are planned; current Previous/Next, position text, Escape, and close behavior remain unchanged. |
| 20 | Can the change remain Studio-only? | Yes. `DesignPreviewLightbox.tsx` is a Studio component and Portal uses its separate `CatalogPreviewLightbox`. Add an opt-in vertical-navigation prop defaulting to false and set it only from `CustomerUploadIntakeSection`; do not change Portal code or default behavior for other Studio lightbox consumers. |

## Scope

### In scope

- Studio Print Request item Download for catalog designs, customer uploads, and Staff Artwork.
- One PNG per click, using the item's saved requested dimensions and fixed 300-DPI target.
- Existing source-aware baseline/enhanced production resolution and signed download URL flow.
- A narrow Electron main-process save operation that reuses `downloadAndResizeExportImage`.
- Per-item busy/error UI and autosave-safe enablement.
- Working, Editing, Queued, Printing, and Printed item availability when the saved asset is valid.
- Studio Uploaded Designs and Donated Designs ArrowUp/ArrowDown lightbox navigation.
- Existing loaded/filtered/previewable ordering, no-wrap boundaries, selection synchronization,
  and removal behavior.
- Focused tests, targeted lint/typecheck, `git diff --check`, implementation documentation, and
  the actual cumulative promotion-manifest delta at Signoff.

### Out of scope

- Portal item Download or Portal lightbox keyboard behavior.
- ZIP, gang-sheet, allocation, request lifecycle, production-status, or quantity behavior changes.
- New DPI, sizing, upscaling, source conversion, derivative-generation, or cache policy.
- New Functions, Firestore/Storage Rules, schema fields, indexes, migrations, or backfills.
- Auto-load-more, wraparound navigation, a second intake ordering model, or visible Up/Down buttons.
- Production deployment, Functions deployment, Studio release/publish, Portal publication, commit,
  push, or any console action.
- Unrelated cleanup or refactoring.

## Proposed implementation

### A. Shared export contract and filename

1. Add a dedicated typed request/result for one PNG download in
   `packages/shared/src/types/export/showExportIpc.types.ts`. The request should contain only
   the validated signed `downloadUrl`, target width/height pixels, and sanitized filename (plus
   the existing request-item identity if needed for diagnostics); it must not include quantity,
   allocation ID, filesystem paths, or renderer bytes.
2. Extend `FreshPrintsExportApi` with the single-image operation so the renderer reaches it only
   through the typed preload bridge.
3. Add `buildPrintRequestExportItemFilename(...)` beside the existing request export filename
   helpers. Reuse the existing safe title and inch formatting logic, produce a PNG filename that
   identifies title, requested size, and `item-<id>`, and keep the existing ZIP filename helper
   unchanged.
4. Add pure tests for title sanitization, size formatting, item identity, PNG extension, no
   `alloc-` label, and no quantity/sequence semantics.

### B. Electron single-image export

1. Add one export IPC channel to `apps/studio/electron/ipc/export/exportIpcChannels.ts`, register
   it in the allowlist, and expose it in `apps/studio/electron/preload.ts`.
2. Extend `exportRequestValidation.ts` with a validator for the dedicated request. Reuse the
   current Firebase Storage URL allowlist and positive finite target-pixel checks; require a
   PNG-safe sanitized filename and reject arbitrary paths or unapproved URLs.
3. Add a thin main-process service under the existing export service area (proposed
   `apps/studio/electron/services/export/exportSingleImage.ts`). It will call
   `downloadAndResizeExportImage(...)` unchanged, show the existing native save dialog, write the
   returned PNG bytes only after the user chooses a path, and return cancellation/success or a
   structured failure. It will not call `exportShowZip`, gang-sheet cache, or quantity logic.
4. Wire the handler in `exportIpcHandlers.ts` with the existing import IPC success/failure shape.
   Surface download/resize/dialog/write failures to the renderer; do not silently swallow them.
5. Add validation and service coverage for URL rejection, target validation, PNG output, cancel,
   write failure, resize failure, and single-file behavior. Existing ZIP and gang-sheet handlers
   and services remain unchanged except for type-level additions required by the bridge.

### C. Renderer per-item Download

1. Add a focused hook under
   `apps/studio/src/renderer/src/features/print-requests/hooks/` (proposed
   `useDownloadPrintRequestItem.ts`). It will:
   - require the existing authenticated Studio staff permission;
   - accept the current saved request, item, and existing source maps/objects;
   - call `buildPrintRequestExportAssets(user, printRequest, [item])` or a behavior-preserving
     singular wrapper;
   - use the resolved target pixels, production signed URL, title, and item dimensions;
   - call the new single-image export bridge with a filename from the shared item helper;
   - maintain status/error keyed by `requestItemId`, so one item never blocks another.
2. Extend `PrintRequestItemCard.tsx` with a Download callback and per-item status/error props.
   Render the small action with the established `Download` icon/Button conventions and an
   accessible label. Keep it visible in read-only cards when eligible. Disable it when the saved
   item is not valid or the card reports dirty/invalid/saving/failed persistence, while showing a
   truthful busy label/state during the operation. Keep errors bounded and associated with the
   item; do not add a second Save button.
3. Wire `PrintRequestsPage.tsx` to the existing `requestItems`, `designById`,
   `uploadSummariesById`, and `staffArtworkById` maps. Do not reuse the existing
   `canShowDirectRequestActions` request-wide lifecycle gate for this per-item action. Do not
   perform Firebase reads from the card or add a page-specific source resolver.
4. Ensure the click path consumes the latest saved item snapshot and has no cache key or stale
   target state. If a size save is pending or invalid, the control remains disabled until the
   existing persistence state is clean and the saved item has updated.

### D. Studio intake vertical navigation

1. Extend `DesignPreviewLightbox.tsx` with an optional vertical-key capability, default off. In
   its existing keydown effect, after the existing open/navigation checks and the shared editable
   target guard, map ArrowUp to `goPrevious` and ArrowDown to `goNext` only when enabled. Call
   `preventDefault()` only when handling a valid navigation key. Leave Escape, ArrowLeft,
   ArrowRight, visible controls, position text, and no-wrap state unchanged.
2. Enable the option only in `CustomerUploadIntakeSection.tsx`, which is shared by both
   Uploaded Designs and Donated Designs. Preserve `previewNavigationItems` from
   `intake.rows.filter(row => row.previewUrl)`, `onPreviewNavigate`/selected-ID synchronization,
   current filters/sorts/loaded rows, `purposeScope`, and removal behavior. Do not modify
   `CatalogPreviewLightbox.tsx` or Portal code.

### E. Documentation and manifest at implementation Signoff

After implementation and tests, update only the durable documents whose behavior changed:

- `docs/architecture/ARCHITECTURE.md`: document the per-item read-only export path and the
  Studio-only intake key extension.
- `docs/architecture/BACKEND.md`: record that no Function/backend mutation is needed and the
  single-image work is main-process IPC over existing signed URLs.
- `docs/WORKFLOWS.md`: document saved-size authority, one-PNG/no-quantity semantics, lifecycle
  availability, and intake keyboard mapping.
- `docs/standards/TESTING.md`: add the focused commands/regressions if the final test surface
  warrants a durable entry.
- `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`: append the actual delta at
  Signoff: Studio release **REQUIRED**; Portal App Hosting, Functions, Firestore Rules, Storage
  Rules, indexes, migrations/backfills, and data mutation **NONE**, unless implementation proves
  otherwise and stops for review.
- `.cursor/workflow/state.md` and
  `references/project-chatgpt-handoff/CURRENT-STATE.md` at Signoff, as required by FreshForge.

No permanent documentation claims or manifest entry are made by this plan-only pass beyond the
reviewed expected direction.

## Architecture and security constraints

- Preserve Component → Hook/service → Electron IPC layering. React must not resize images, write
  files, access Firebase directly, or receive raw filesystem paths.
- Reuse `resolveShowExportProductionAsset` → `resolvePrintAssetPaths` and
  `resolveActiveArtworkPixelDimensions`; never create a parallel source-type resolver.
- Preserve baseline/enhanced fail-closed behavior, including private Staff Artwork production
  paths and customer-upload access boundaries.
- Require the existing Studio permission checks before building an item asset. Obtain only the
  existing authorized signed URL, validate it again at the Electron boundary, and sanitize the
  filename before the native save dialog.
- Keep the current Electron `contextIsolation`/preload allowlist model and validate IPC payloads
  before execution. Do not introduce arbitrary URL or arbitrary renderer-file APIs.
- This operation is read-only with respect to Firestore, Storage metadata, print requests,
  request items, allocations, shows, quantities, statuses, and production history.

## Test strategy and gates

### Focused automated coverage

Workstream A:

- Extend `apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts`
  or add a focused neighboring contract for the one-item builder/hook, typed single-image IPC,
  no ZIP/cache/quantity path, per-item status, and lifecycle-independent availability.
- Extend/add shared tests for `buildPrintRequestExportItemFilename`,
  `resolveShowExportProductionAsset`, `resolvePrintAssetPaths`, and
  `computeExportTargetPixelSize` covering catalog, customer upload, Staff Artwork, baseline,
  enhanced, missing enhanced derivative, current-size target pixels, and changed-saved-size
  target pixels.
- Extend `apps/studio/electron/ipc/export/exportRequestValidation.test.ts` and add focused
  `exportSingleImage` tests for URL/target/name validation, one PNG, dialog cancellation, and
  truthful error handling.
- Re-run existing request ZIP, resolver, filename, gang-sheet planner/compositor, and cache
  fingerprint regressions listed by `docs/standards/TESTING.md`.

Workstream B:

- Extend `apps/studio/src/renderer/src/features/designs/utils/previewLightboxNavigation.contract.test.ts`
  and/or `packages/shared/src/utils/previewLightboxNavigation.test.ts` for ArrowUp → Previous,
  ArrowDown → Next, unchanged Left/Right/Escape, `preventDefault`, editable-target guard, and
  first/last boundaries.
- Extend `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeParityContract.test.ts`
  to assert both pages still route through `CustomerUploadIntakeSection`, preserve
  `purposeScope="catalog_donation"`, and use the current loaded previewable rows and selected-ID
  synchronization. Keep removal/action parity assertions intact.

### Commands after implementation authorization

Run and record actual results; do not claim unrun checks:

```text
npx tsx --test <focused shared resolver/filename/navigation tests>
npx tsx --test <focused Studio print-request, intake, and Electron export tests>
npx tsc --noEmit -p apps/studio/tsconfig.json
npx eslint <changed TS/TSX files> --report-unused-disable-directives --max-warnings 0
git diff --check
npm run build:studio
```

The exact focused test file list will be frozen in the implementation test report after the
changed files are known. Functions build/tests and Rules tests are not required unless the
implementation unexpectedly touches those areas; such a scope change requires review before
continuing. Manual Electron/DEV QA is a later owner checkpoint and must verify actual PNG pixel
dimensions after a saved-size change plus Uploaded/Donated Up/Down boundaries.

## Risks and mitigations

| Risk | Level | Mitigation |
|---|---:|---|
| Download uses a stale local size draft or target | High | Disable while dirty/invalid/saving/failed; use the saved `requestItems` snapshot; resolve at click time; no export cache. |
| Enhanced or private source selection diverges | High | Reuse the existing request builder and shared resolver; do not duplicate source branching or fallback behavior. |
| New IPC becomes an arbitrary file/URL surface | High | Dedicated typed request, existing Firebase URL allowlist, positive target checks, sanitized PNG name, main-process save only. |
| One item blocks other item downloads | Medium | Hook state keyed by item ID and card-local disabled/busy state. |
| Vertical keys affect unrelated lightboxes or Portal | Medium | Opt-in prop defaults false; enable only in `CustomerUploadIntakeSection`; leave Portal component untouched. |
| Native dialog/write/resize failure is silent | Medium | Structured result and bounded per-item error/alert state; cancellation is distinct from failure. |
| Lifecycle gate hides a safe per-item action | Medium | Keep per-item Download separate from request-wide Export Images gate; show on all reviewed lifecycle states when saved asset is valid. |

## Rollback

The change is additive and has no data migration. If implementation fails review or QA, remove the
new renderer wiring, optional lightbox prop, shared single-image type/filename helper, and additive
IPC channel/service. Existing request ZIP, gang-sheet, intake actions, and Portal behavior remain
available and unchanged.

## Human checkpoints

- Formal Review is required before implementation.
- Explicit owner authorization is required for Implement → Test after this plan and review.
- Owner DEV QA is required after automated tests and before Signoff.
- Studio release/promotion is a separate later human approval. No production action is authorized
  in this goal.

## Definition of done

- Every valid saved request item exposes a working one-file Download action for all three source
  types and reviewed lifecycle states.
- Output is one PNG at the current saved requested dimensions under the fixed 300-DPI contract;
  quantity never creates additional files.
- Baseline/enhanced resolver parity, fail-closed errors, private paths, busy/error UI, and no
  lifecycle mutation are covered by tests.
- Uploaded and Donated Designs support Up/Down through the exact current loaded previewable list,
  with no wrap, editable focus protection, and existing controls unchanged.
- Portal and unrelated Studio lightbox consumers have no behavior regression.
- Required focused checks, Studio typecheck/build, targeted lint, and diff check are run and
  honestly recorded.
- Owner DEV QA is recorded; state/handoff and the actual promotion manifest delta are current at
  Signoff.
