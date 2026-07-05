# Print Request Oversized Selection Unblock Plan

Date: 2026-07-04
Mode: Managed Phase
Goal: `print-request-oversized-selection-unblock`
Roadmap Area: Phase 6 - Customers And Print Requests follow-up

## Workflow Gate

Status: signed off PASS WITH FOLLOW-UP NOTES.

Required workflow:

1. Plan
2. Review
3. Implement
4. Test
5. Signoff

Implementation was approved on 2026-07-04, completed within this plan scope, and signed off on
2026-07-04 after automated verification and manual QA passed.

## 1. Goal

Allow approved catalog designs with oversized catalog/default print dimensions to be added to
standard Print Requests from Design Library request-selection mode, while initializing the
request-item requested size to a usable standard size.

The 22-inch standard-size limit should apply to requested Print Request item dimensions and future
submit/print-readiness checks, not to whether an approved catalog design can be selected.

## 2. Phase Alignment

This is a Phase 6 Print Requests follow-up for Studio staff workflows.

It prepares reusable requested-size initialization logic for future Portal add-to-request behavior,
but it must not implement Portal UI, customer-created Portal requests, customer Auth/login, Print
Runs, show capacity, Custom Requests, migrations, backfills, deploys, image processing, or catalog
dimension mutation.

## 3. Current State

Docs and repo paths inspected:

- `project-chatgpt-handoff/CURRENT-STATE.md`
- `.cursor/workflow/state.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/DECISIONS.md`
- `shared/types/printRequest/printRequest.types.ts`
- `src/renderer/src/features/print-requests/`
- `src/renderer/src/features/designs/`
- `shared/utils/`
- `firestore.rules`

No requested path differed.

Current add-to-request flow:

- `PrintRequestsPage.tsx` opens Design Library with `mode: "request-selection"` and a
  `requestId` URL param.
- `DesignLibraryPage.tsx` detects request-selection mode and delegates request selection state to
  `usePrintRequestSelectionMode`.
- `usePrintRequestSelectionMode.saveSelections()` calls
  `printRequestService.savePrintRequestDesignSelections(user, printRequestId, selections)`.
- Selection mode sends only `designId` and `quantity`; it does not send requested item dimensions.
- `printRequestService.savePrintRequestDesignSelections()` loads each design and calls
  `resolveRequestedItemSize(design, {})`.
- `resolveRequestedItemSize()` uses `resolveDefaultRequestedSize(design)` when no item size is
  provided.
- `resolveDefaultRequestedSize()` currently returns `design.printWidthInches` and
  `design.printHeightInches` when those catalog/default fields exist.
- `resolveRequestedItemSize()` then immediately runs `assessPrintRequestItemSize()`.
- `assessPrintRequestItemSize()` blocks when either requested dimension is greater than
  `MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES` (`22`).
- `addPrintRequestItem()` uses the same requested-size resolver before writing the
  `printRequestItems` document.
- `PrintRequestItemCard` displays the item-level error/warning from `assessPrintRequestItemSize()`
  and autosaves only when the current requested size can save.
- `firestore.rules` currently validates optional `printRequestItems.printWidthInches` and
  `printHeightInches` with `isOptionalPositiveStandardPrintInches`, which requires values to be
  `> 0` and `<= 22`.

## 4. Root Cause

The oversized block happens in the Print Request item creation service path, not in Design Library
selection UI itself.

Design Library request-selection mode correctly allows staff to select approved designs, but saving
the selection calls the same service-side requested-size validation used for item edits. Because the
service initializes new items from the catalog/default design size, a design with a catalog size such
as 30 x 35 inches is treated as a requested Print Request item of 30 x 35 inches and is rejected
before the item document is created.

The current behavior conflates:

- Catalog/default design print dimensions on `designs`.
- Requested print dimensions on `printRequestItems`.

The product decision is that these must remain separate.

## 5. Product Decisions

Confirmed:

- Approved catalog designs should be addable to a Print Request regardless of catalog/default print
  size.
- The actual image file must not be resized, resampled, downscaled, compressed, or regenerated.
- The catalog design's stored print dimensions must not be changed when adding or resizing a Print
  Request item.
- New Print Request items should initialize requested print size from a standard requested width:
  - If the design/default width is greater than 10 inches, requested width starts at 10 inches.
  - If the design/default width is already below 10 inches, keep that smaller width.
  - Requested height is calculated proportionally from the design aspect ratio.
- The 22-inch standard Print Request cap remains item-level validation.
- Saving/autosaving item dimensions over 22 inches should remain blocked.
- Final submit/ready-to-print behavior is future work unless such a workflow already exists and is
  directly impacted.

## 6. Proposed Implementation Outline By Layer

### Shared Utilities

Add a shared requested-size initialization utility, likely in `shared/utils/printRequestItemSizing.ts`,
so Studio and future Portal can reuse the same math.

Recommended API:

```ts
export const STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES = 10;

export function resolveInitialPrintRequestItemSize(input: {
  pixelWidth: number;
  pixelHeight: number;
  defaultPrintWidthInches?: number;
  defaultPrintHeightInches?: number;
}): {
  printWidthInches: number;
  printHeightInches: number;
};
```

Recommended behavior:

- Validate positive pixel dimensions.
- Resolve source width:
  - Prefer `defaultPrintWidthInches` when positive.
  - Otherwise calculate a fallback width from pixel dimensions at the existing target DPI path.
- Set requested width to:
  - `defaultPrintWidthInches` if it is positive and `< 10`.
  - `10` if `defaultPrintWidthInches` is positive and `>= 10`.
  - fallback calculated width capped the same way if no default width exists.
- Calculate requested height from pixel aspect ratio using `calculateLockedHeightFromWidth()`.
- Do not mutate design data.
- Round consistently with existing inch rounding rules.

Keep `assessPrintRequestItemSize()` unchanged for edit/save validation unless implementation
review explicitly approves a narrow change.

### Print Request Service

Change the new-item creation path so request item initialization uses the new standard requested-size
utility instead of directly inheriting catalog/default dimensions.

Recommended service changes:

- Keep `loadPrintableDesign()` restricted to `status: "ready"`.
- Keep `resolveRequestedItemSize()` for update/autosave validation.
- Split create-time initialization from edit-time validation:
  - For `addPrintRequestItem()`, when input does not include `printWidthInches` /
    `printHeightInches`, initialize from `resolveInitialPrintRequestItemSize()`.
  - If input explicitly includes item dimensions, continue to validate them through
    `assessPrintRequestItemSize()`.
  - For `updatePrintRequestItem()`, continue to block invalid dimensions over 22 inches and below
    72 DPI.
- In `savePrintRequestDesignSelections()`, stop pre-validating selection uniqueness with oversized
  catalog/default dimensions. Use the same initialized requested size that `addPrintRequestItem()`
  will use when checking for an existing item with the same design and requested size.
- Ensure `requestedSizesMatch()` compares request item requested dimensions, not catalog dimensions.

### Design Library Request-Selection Mode

No direct Firebase or sizing validation should be added to components.

Expected UI behavior after service change:

- Staff can select oversized approved designs.
- Saving selection creates request items with initialized requested size metadata.
- If service creation still fails, `DesignLibraryPage.formatSelectionActionError()` continues to
  show the service error.

### Print Request Item UI

Keep existing item-level display and autosave behavior:

- `PrintRequestItemCard` should continue showing sizing error/warning messages from
  `assessPrintRequestItemSize()`.
- Autosave should remain disabled while the requested item size is invalid.
- Once staff resizes to 22 inches or less and at least 72 DPI, autosave can save successfully.

If create-time initialized width 10 produces a height over 22 for an extreme aspect ratio, see the
open decision in Section 8.

### Firestore Rules

Current rules allow only positive requested item dimensions up to 22 inches.

Recommended first implementation:

- Do not change Firestore rules if all newly initialized request item dimensions are guaranteed to
  be within 22 inches.
- If the final product decision requires persisting an initialized request item whose height/width
  can still exceed 22 inches, then `firestore.rules` must be updated and a separate dev rules deploy
  checkpoint will be required before manual QA can pass.

### Docs

Update durable docs if implemented:

- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/DECISIONS.md`
- `docs/project/ROADMAP.md`
- `project-chatgpt-handoff/CURRENT-STATE.md`

## 7. Out Of Scope

- No implementation during planning.
- No Portal behavior.
- No customer-created Portal requests.
- No customer Auth/login behavior.
- No Print Runs.
- No submit/finalize request workflow unless one already exists and is directly impacted.
- No show capacity.
- No Custom Requests.
- No migration or backfill.
- No Firebase deploy.
- No Firestore rules deploy unless later explicitly approved.
- No Firestore index deploy.
- No design lifecycle status changes.
- No changing catalog design original/default dimensions.
- No image file resizing, resampling, downscaling, compression, or derivative regeneration.
- No changing approved Design Library visibility rules.
- No Remove Background.
- No Upscale.
- No origin badge changes.
- No CR/IR naming changes.

## 8. Risks And Product Decisions Needed

### Extreme Aspect Ratio Edge Case

Most oversized catalog/default designs will become valid when initialized to 10 inches wide. For
example, a 30 x 35 inch default design becomes about 10 x 11.67 inches and can be saved under the
22-inch cap.

However, an extreme portrait design could still be over 22 inches tall when width is initialized to
10 inches. Current Firestore rules and service validation reject requested item dimensions over
22 inches, so such an item cannot be persisted under the current rule shape.

Product decision needed before implementation if this edge case must be supported immediately:

- Option A, stricter and rule-compatible: initialize width to the smaller of 10 inches and the
  width that keeps height at or below 22 inches. This slightly modifies the "10-inch width" rule for
  extreme aspect ratios but avoids persisting invalid standard request items.
- Option B, looser and requires rules/service exception: allow create-time persistence of an
  oversized requested item so the detail page can show the over-22 error and staff can resize down.
  This requires careful Firestore rules changes and a dev rules deploy checkpoint.

Recommended implementation unless changed in review: Option A, because it preserves the current
rule that saved standard Print Request item dimensions must be 22 inches or less.

### Duplicate Items

Duplicating an existing item currently passes the existing item dimensions explicitly into
`addPrintRequestItem()`. That should remain unchanged: duplicates should preserve the source item's
requested size rather than reinitializing to 10 inches.

### Existing Items

Existing `printRequestItems` should not be changed or normalized by this phase.

## 9. Acceptance Criteria

Plan implementation to satisfy:

- A catalog design with default/original print size greater than 22 inches can be added from Design
  Library request-selection mode.
- A catalog design with default/original print size greater than 10 inches is initialized on the
  request item with `printWidthInches` of 10 inches, except for the Section 8 extreme-aspect decision
  if review approves the rule-compatible cap.
- The request item height is calculated proportionally from the design's aspect ratio.
- A catalog design already below 10 inches wide keeps its smaller requested width.
- The oversized catalog design appears in the Print Request detail page after adding.
- The item clearly shows an oversized requested-size warning/error if either requested dimension is
  greater than 22 inches and the final implementation allows that state to persist.
- Staff can resize the item to 22 inches or less.
- Once resized to 22 inches or less, the item can save/autosave successfully.
- The catalog design's own dimensions are not changed by request item resizing.
- No image file is resized, downscaled, resampled, compressed, or regenerated.
- Existing item autosave behavior still works.
- Existing duplicate/remove behavior still works.
- Existing CR/IR naming and request origin badges still work.
- No design lifecycle status changes occur.
- No Portal, Print Runs, Custom Requests, migration, backfill, or deploy is performed.

## 10. Verification Plan

Automated verification after implementation:

```bash
npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts <new oversized selection test path>
npx tsc --noEmit
npm run lint
npx vite build
git diff --check
```

Focused tests to add or update:

- Oversized catalog/default design can be initialized for request item creation without inheriting
  the oversized catalog width.
- Catalog/default width greater than 10 inches initializes request item width to 10 inches.
- Catalog/default width below 10 inches keeps that smaller width.
- Requested height is calculated from pixel aspect ratio.
- Requested item size over 22 inches remains invalid for edit/autosave validation.
- Requested item size 22 inches or less is valid when DPI is valid.
- Resizing down clears oversized validation.
- Catalog design dimensions are not mutated by request item size initialization.
- Duplicate item creation preserves the source request item requested size.

Manual QA after implementation:

- Open Design Library in request-selection mode for an existing Print Request.
- Select an approved design whose catalog/default print size is greater than 22 inches.
- Save the selection and confirm the item appears in the Print Request detail page.
- Confirm the new item requested width is 10 inches unless the design default width is below
  10 inches.
- Confirm requested height is proportional to the design aspect ratio.
- Confirm the design catalog/default dimensions did not change.
- Confirm item width/height edits still autosave.
- Confirm over-22 requested item dimensions are blocked on edit/autosave.
- Confirm resizing to 22 inches or less succeeds.
- Confirm duplicate/remove still work.
- Confirm CR/IR names and origin badges still work.
- Confirm no Portal, Print Runs, Custom Requests, migration, backfill, Firebase deploy, or design
  lifecycle status changes occur.

## 11. Human Checkpoints

Required before implementation:

- Plan review and explicit implementation approval.
- If the Section 8 extreme-aspect edge case should use Option B, explicitly approve the required
  local Firestore rules changes before implementation.

Required before deploy:

- Explicit approval before any Firestore rules deploy to `fresh-prints-dev`.
- Explicit approval before any Firebase deploy.

Always forbidden without separate approval:

- Production deploys.
- Data migrations/backfills.
- Firestore index deploys.
- Functions deploys.
- Portal/customer Auth/customer-created request behavior.
- Image file mutation or derivative regeneration.
