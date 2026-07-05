# Print Request Item Preview And DPI Polish Plan

## 1. Goal

Plan a narrow Phase 6 follow-up for Print Request item-card polish:

- Show the full design image inside the existing Print Request item thumbnail footprint.
- Let staff open the item thumbnail in an enlarged lightbox preview.
- Keep accurate requested-size DPI feedback visible even when a requested width or height is over the 22-inch standard Print Request maximum.

Implementation is not approved by this plan. This plan must be reviewed and explicitly approved before code changes.

## 2. Phase Alignment

This is a Phase 6 follow-up for Studio Print Requests. It addresses follow-up notes from `print-request-oversized-selection-unblock`:

- TD-019: Print Request item thumbnails crop artwork previews.
- TD-020: Print Request item thumbnails are not openable in a lightbox.
- TD-021: Oversized requested item dimensions show `0 DPI` instead of accurate calculated DPI.

The work does not add Phase 7 Print Runs, Phase 8 Portal behavior, or Phase 9 Custom Requests.

## 3. Current State

Inspected files:

- `project-chatgpt-handoff/CURRENT-STATE.md`
- `.cursor/workflow/state.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/DECISIONS.md`
- `src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `src/renderer/src/features/print-requests/`
- `src/renderer/src/features/designs/`
- `src/renderer/src/styles/components/print-requests.css`
- `shared/utils/printRequestItemSizing.ts`
- `shared/utils/`

`PrintRequestItemCard.tsx` renders each request item and currently uses `DesignThumbnailPanel` with `imageFit="cover"`, which crops artwork in the fixed item-card thumbnail area.

`src/renderer/src/styles/components/print-requests.css` controls the current item-card thumbnail footprint with `.print-requests-item-card-thumbnail` at a fixed `5.5rem` width and matching panel styling. The desired change should keep that footprint stable.

The Design Library already has reusable preview behavior:

- `DesignThumbnailPanel` supports `imageFit="contain"`, `interactive`, and `onImageClick`.
- `DesignPreviewLightbox` provides a modal lightbox with overlay click and Escape close behavior.
- `DesignSelectionCard` already uses contained thumbnails plus the shared lightbox pattern.

`shared/utils/printRequestItemSizing.ts` owns requested-size assessment. `assessPrintRequestItemSize()` currently checks the 22-inch maximum before validating pixel dimensions and calculating effective DPI. Because of that order, over-22 requested dimensions return `effectiveDpi: 0` and `qualityLabel: "Below Minimum"` even when the design has valid pixels and the actual DPI can be calculated.

## 4. Root Cause

Thumbnail cropping is caused by the Print Request item card passing `imageFit="cover"` to `DesignThumbnailPanel`. The thumbnail panel already supports contained rendering, so the card is opting into crop behavior.

Lightbox preview is missing because the Print Request item card does not hold lightbox state, does not resolve a preview derivative URL, and does not render `DesignPreviewLightbox` for item thumbnails.

The oversized DPI issue is caused by validation ordering in `assessPrintRequestItemSize()`. The standard-size maximum is treated as an early return before DPI calculation, so the UI receives no accurate DPI value for oversized-but-otherwise-calculable requested sizes.

## 5. Product Decisions

- Print Request item thumbnail footprint should remain visually stable.
- The full artwork should be visible in the item thumbnail using contained fit, not cropped cover fit.
- Item thumbnails should be clickable/openable in a lightbox preview.
- Lightbox preview must not mutate design records, request items, dimensions, images, thumbnails, previews, or derivatives.
- The 22-inch maximum remains a save-blocking standard Print Request rule.
- Oversized requested dimensions should still show the calculated DPI value and quality label when source pixel dimensions are valid.
- The existing over-22 Custom Request guidance remains visible.
- A red warning/error border or error styling remains acceptable for over-22 requested sizes.
- Autosave remains blocked while either requested dimension is over 22 inches.
- Resizing back to 22 inches or less should clear the over-22 validation if no other validation error remains.

## 6. Proposed Implementation Outline By Layer

### Shared utility

Update `shared/utils/printRequestItemSizing.ts` so `assessPrintRequestItemSize()` separates DPI calculation from standard-request save eligibility:

- Keep positive-inch validation first because non-positive dimensions cannot produce meaningful DPI.
- Validate pixel dimensions before DPI calculation.
- Calculate `effectiveDpi`, `qualityLevel`, and `qualityLabel` whenever inch and pixel dimensions are valid.
- Apply the 22-inch maximum after DPI calculation.
- When over 22 inches, return the accurate DPI/quality plus `canSave: false` and the existing Custom Request error message.
- Preserve existing below-72 blocking behavior.
- Preserve existing 72-299 warning behavior.
- Preserve 300+ no-warning behavior.

### Print Request item card

Update `PrintRequestItemCard.tsx`:

- Change the item thumbnail to contained rendering while keeping the current card footprint.
- Reuse `DesignPreviewLightbox`.
- Resolve preview URL from `design.previewPath ?? design.thumbnailPath`, matching the existing Design Library selection-card pattern.
- Make the thumbnail interactive only when a resolved preview can be opened.
- Keep item quantity, width, height, autosave, duplicate, remove, and validation behavior unchanged.
- Keep standard item notes/status hidden.

### Styling

Update `src/renderer/src/styles/components/print-requests.css` only as needed to support:

- Stable item thumbnail footprint.
- Contained image rendering without layout shift.
- Appropriate interactive cursor/focus behavior through existing thumbnail panel styles where possible.

Avoid changing overall Print Request layout or card hierarchy.

### Tests

Add or update focused tests for `assessPrintRequestItemSize()`:

- Oversized requested dimensions with valid pixels return accurate DPI/quality.
- Oversized requested dimensions still return `canSave: false`.
- Oversized requested dimensions still return the Custom Request guidance error.
- Below-72 DPI remains blocked independently of the 22-inch maximum.
- Resizing within 22 inches uses the existing DPI warning/allow/block rules.

Add component-level coverage for the thumbnail/lightbox path where practical. If a lightweight component test harness is not already present, rely on manual QA for the visual lightbox behavior rather than adding a new testing framework.

### Docs

Update durable docs after implementation only if behavior changes are made:

- `docs/project/ROADMAP.md`
- `docs/architecture/DATA_MODEL.md` only if the behavior description needs clarification; no data model change is expected.
- `docs/WORKFLOWS.md` if Print Request item UI workflow text mentions thumbnail previews or DPI behavior.
- `docs/project/DECISIONS.md` if a decision entry is needed for separating DPI assessment from save eligibility.
- `project-chatgpt-handoff/CURRENT-STATE.md`

## 7. Out Of Scope

- No Print Runs.
- No Portal behavior.
- No customer Auth or customer-created Portal requests.
- No Custom Request implementation.
- No request naming changes.
- No request origin badge changes.
- No item autosave behavior changes beyond preserving current validation behavior.
- No duplicate/remove behavior changes.
- No production status workflow.
- No design lifecycle status changes.
- No image file mutation.
- No thumbnail or preview regeneration.
- No image resizing, resampling, downscaling, or compression.
- No catalog design dimension mutation.
- No Firestore rules changes expected.
- No Firestore index changes expected.
- No Firebase deploy.
- No migration or backfill.

## 8. Risks And Product Decisions Needed

No product decision is currently blocking implementation approval.

Implementation risks:

- If `previewPath` is missing for an older design, the lightbox should fall back to `thumbnailPath`.
- If neither derivative path resolves, the item thumbnail should keep the existing unavailable state and not open a broken lightbox.
- DPI assessment must keep the over-22 save block while avoiding the misleading `0 DPI` display.
- The thumbnail footprint should remain stable on desktop and narrow layouts.

## 9. Acceptance Criteria

- Print Request item thumbnails keep the same card footprint.
- Print Request item thumbnails show the full design using contained fit instead of cropped cover fit.
- Clicking an available Print Request item thumbnail opens a lightbox/modal preview.
- The lightbox can be closed by close button, overlay click, and Escape key.
- Missing/unavailable thumbnails keep the existing fallback state and do not open a broken preview.
- No image file, thumbnail, preview, derivative, catalog dimension, or request dimension is mutated by preview behavior.
- Requested width or height over 22 inches still shows an accurate calculated DPI value and quality label when design pixel dimensions are valid.
- The existing over-22 Custom Request guidance remains visible.
- Over-22 requested sizes still block autosave.
- Resizing back to 22 inches or less clears over-22 validation when no other validation error remains.
- Quantity, width, and height autosave still work.
- Duplicate/remove behavior still works.
- CR/IR request names still work.
- Request origin badges still work.
- No design lifecycle status changes occur.

## 10. Verification Plan

Automated verification after implementation:

- `npx tsx --test <new or updated print request sizing/preview test paths>`
- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual QA after implementation:

- Open `/print-requests`.
- Open or create a request with items.
- Confirm item thumbnails keep the same card footprint.
- Confirm item thumbnails show the full image using contained fit, not cropped cover fit.
- Click an item thumbnail and confirm a lightbox opens.
- Close the lightbox by close button, overlay click, and Escape key.
- Confirm missing/unavailable thumbnails do not open a broken preview.
- Edit requested width above 22 inches and confirm autosave blocks with Custom Request guidance.
- Confirm the oversized item still shows accurate DPI and quality, not `0 DPI` solely because it is oversized.
- Resize back to 22 inches or less and confirm autosave reaches `Saved` when no other validation blocks it.
- Confirm quantity autosave still works.
- Confirm duplicate/remove behavior still works.
- Confirm CR/IR request names still work.
- Confirm request origin badges still work.
- Confirm catalog dimensions and image files are unchanged.
- Confirm no design lifecycle status changes occur.

## 11. Human Checkpoints

Before implementation:

- Plan review and explicit implementation approval are required.

During implementation/testing:

- Stop and ask before any Firebase deploy.
- Stop and ask before any Firestore rules or index deploy, even though none are expected.
- Stop and ask before any migration, backfill, image mutation, derivative regeneration, or production write.

Signoff:

- Requires automated verification results and manual QA result or documented blocker.
