# Formal Review: Studio Pre-Release Print Request Download and Intake Navigation

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Reviewer | Formal Review (managed-phase) |
| Plan | `docs/workflow/plans/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-plan.md` |
| Goal | `studio-pre-release-pr-item-download-and-intake-navigation` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is bounded to two Studio refinements and is aligned with the current repository seams:

- Print Request item Download reuses the existing request export builder, source-aware production
  resolver, fixed-300-DPI target calculation, signed URL flow, and Electron Sharp helper.
- Intake Up/Down navigation extends the existing Studio lightbox key handler and callbacks, using
  the current `CustomerUploadIntakeSection` rows and shared focus guard.

The review approves the direction with the implementation conditions below. It authorizes no
implementation, test execution, release, deployment, or production action. Owner authorization is
still required before Implement → Test.

## Review checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Two Studio-only refinements; ZIP, gang sheet, Portal, lifecycle, backend, and production work excluded. |
| Repository evidence | pass | The plan identifies exact current components, hooks, services, IPC files, shared resolvers, and intake paths. |
| Architecture alignment | pass with conditions | Component → hook/service → preload/IPC → Electron main is preserved; the single-image IPC must remain a thin wrapper around the existing resize helper. |
| Source parity | pass | Catalog, customer-upload, and Staff Artwork paths use the existing request builder and `resolveShowExportProductionAsset` chain. |
| Enhanced-mode safety | pass | Existing active-asset selection and fail-closed missing enhanced derivative behavior are preserved. |
| Saved-size freshness | pass with conditions | Download must be disabled for dirty/invalid/saving/failed drafts and must resolve from the current saved item snapshot at click time. |
| Security | pass with conditions | Existing staff permission checks, signed URLs, Firebase URL allowlist, target validation, filename sanitization, and main-process file writes are required. |
| Quantity/lifecycle safety | pass | One PNG only; quantity is not sent to the single-file operation; no request/item/allocation/show mutation. |
| Lifecycle availability | pass with conditions | Do not reuse the request-wide Working/Editing gate. Show the action for valid saved items across Working, Editing, Queued, Printing, and Printed; missing sources/dimensions must remain truthful and visible. |
| Cache boundary | pass | Single-item Download bypasses ZIP, gang-sheet, and cache paths completely. |
| Lightbox behavior | pass | Up/Down maps to existing Previous/Next callbacks; no second ordering model, wrapping, auto-load, or visible control changes. |
| Portal isolation | pass | Portal uses a separate lightbox; the vertical option is Studio-only and opt-in. |
| Data/backend impact | pass | No Function, Rules, Storage Rules, schema, index, migration, or backfill is expected. |
| Testing strategy | pass with conditions | Focused resolver, filename, IPC, UI-contract, navigation, typecheck, lint, build, and diff checks are identified; actual results must be recorded later. |
| Human gates | pass | Owner implementation authorization, Owner DEV QA, and later Studio release/promotion remain separate checkpoints. |

## Formal findings and required implementation conditions

### 1. Per-item export contract

Approved with these requirements:

- The renderer must call the existing request export builder with exactly one current saved item,
  or use a singular extraction that is behavior-identical to the existing builder. No source-type
  branching may be reimplemented in `PrintRequestItemCard.tsx` or `PrintRequestsPage.tsx`.
- The path must remain `buildPrintRequestExportAssets` / `resolvePrintRequestExportAsset` →
  `resolveShowExportProductionAsset` → `resolvePrintAssetPaths`, including the existing
  `artworkEnhanceMode` behavior and active pixel-dimension validation.
- Target pixels must be computed from the saved item `printWidthInches` and
  `printHeightInches` through `computeExportTargetPixelSize`. No local input draft, catalog
  default, allocation quantity, or cached target may be used.
- The single-image request must not contain quantity or allocation identity. The main process must
  produce one PNG and must not call ZIP, gang-sheet, quantity multiplication, or cache code.
- A non-fatal upscale warning returned by `downloadAndResizeExportImage` must be surfaced as a
  truthful bounded status/message; it must not turn a successful PNG into a silent failure.
- Missing source, inaccessible Storage, invalid pixels, missing enhanced derivative, download
  failure, resize failure, dialog cancellation, and write failure must remain distinguishable
  enough for the card/page to show an honest outcome. Enhanced requests must never fall back to
  baseline.

### 2. Freshness and lifecycle availability

- `PrintRequestItemCard` must disable Download while its requested-size draft is dirty, invalid,
  saving, or failed. The control must not initiate an export while a pending autosave could change
  the dimensions.
- After the existing save completes, the page's replaced `PrintRequestItem` is the only size
  authority for the next click. Do not add a Download-specific save button or hidden flush race.
- The per-item action must be independent of `canShowDirectRequestActions`; that existing gate is
  request-wide and intentionally hides Export Images on Working/Editing.
- For an item with valid saved dimensions and an available source identity, the action remains
  discoverable in Working, Editing, Queued, Printing, and Printed detail. A missing source or
  invalid saved size may disable the control, but the UI must provide a bounded reason/error and
  must never pretend an export succeeded.
- Read-only cards remain read-only. Download does not reopen a request, update a status, change
  quantity, create an allocation, or record production history.

### 3. Electron and security boundary

- The proposed additive channel must be included in the existing export-channel allowlist,
  preload bridge, typed shared API, validation layer, IPC handler, and main-process service.
- The validator must reuse the Firebase Storage HTTPS host allowlist, positive finite target
  dimensions, and safe PNG filename rules. The request must not accept renderer filesystem paths,
  arbitrary URLs, or raw Storage paths for main-process resolution.
- Main-process file writing must occur only after native save-dialog selection and must write the
  PNG bytes returned by the existing in-memory resize helper. Existing ZIP and gang-sheet IPC
  behavior must remain unchanged.
- Existing authenticated Studio permission checks and service-level source reads remain the
  authority before the signed URL is sent to Electron. No new Rules or backend bypass is allowed.

### 4. Filename decision

The dedicated direct-item filename helper in
`packages/shared/src/utils/printRequestExportFilename.ts` is approved. It must reuse existing
sanitization and inch-formatting primitives and include:

- a safe title segment;
- the saved requested width × height;
- an item-labeled identifier for collision resistance; and
- a `.png` extension.

It must not include `alloc-`, show-allocation language, ZIP sequence numbering, or quantity-copy
semantics. The existing request ZIP filename and image filename helpers must retain their current
behavior.

### 5. Intake navigation

The optional vertical-navigation capability on `DesignPreviewLightbox` is approved only with
these boundaries:

- The default is disabled so unrelated Studio lightbox consumers retain behavior.
- `CustomerUploadIntakeSection` is the only current caller that enables it, covering both
  Uploaded Designs and Donated Designs through the existing `purposeScope` routes.
- `ArrowUp` calls the existing `goPrevious`; `ArrowDown` calls the existing `goNext`. The shared
  navigation state continues to enforce first/last disabled boundaries and no wraparound.
- The existing editable-target guard must run before vertical handling. Input, textarea, select,
  contenteditable, textbox, spinbutton, and other normal arrow-key controls retain their native
  behavior.
- `intake.rows` remains the only ordered collection. Preserve previewable filtering, current
  filters/sorts, loaded-only behavior, selected-ID synchronization, removals, visible controls,
  Left/Right, Escape, and no auto-load-more.
- Do not modify Portal's `CatalogPreviewLightbox`.

## Test review

The proposed test surface is sufficient if implementation records actual results for:

- shared filename and target-pixel behavior;
- catalog, customer-upload, Staff Artwork, baseline, enhanced, and missing-enhanced resolution;
- one PNG, no quantity multiplication, no cache/ZIP path, save-dialog cancellation, and visible
  failure/warning outcomes;
- stale-size prevention and new saved-size target pixels;
- lifecycle-independent per-item action availability and independent item busy/error state;
- existing request ZIP and gang-sheet regressions;
- ArrowUp/ArrowDown mapping, Left/Right/Escape preservation, editable guard, boundaries, loaded
  current rows, Uploaded/Donated parity, selection synchronization, and removal behavior;
- Studio typecheck, changed-file lint, Studio build, and `git diff --check`.

Functions and Rules tests/builds remain out of scope unless implementation unexpectedly touches
those areas. Any such scope change must stop for another review before continuing.

## Scope and deployment review

The plan does not require new Functions, Firestore Rules, Storage Rules, indexes, migrations,
backfills, or data mutation. The expected later promotion manifest delta is:

| Surface | Expected delta |
|---|---|
| Studio release | **REQUIRED** |
| Portal App Hosting | **NONE** |
| Functions | **NONE** |
| Firestore Rules | **NONE** |
| Storage Rules | **NONE** |
| Indexes | **NONE** |
| Migrations/backfills/data mutation | **NONE** |

This table is planning direction only; the cumulative manifest is updated with actual bytes at
Signoff. No production action is authorized now.

## Verdict rationale

**Approved with changes.** The plan uses the smallest safe existing seams and protects the key
invariants: current saved size, fixed 300-DPI output, source/variant parity, private asset access,
one-file semantics, no lifecycle mutation, current intake ordering, no-wrap navigation, editable
focus safety, and Portal isolation. The implementation conditions above are binding acceptance
constraints, not permission to broaden scope.

## Next step

Human checkpoint: await explicit owner authorization for **Implement → Test**. Until that
authorization is given, do not modify app code, run implementation tests, deploy Functions, publish
Studio, promote to production, commit, or push.
