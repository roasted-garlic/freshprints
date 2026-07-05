# Print Request Item Preview And DPI Polish Test Report

## Phase

`print-request-item-preview-and-dpi-polish`

## Status

Implementation complete. Automated verification passed. User-run manual authenticated QA passed.

## Scope Verified

- Print Request item thumbnails now use contained fit in the existing item-card footprint.
- Print Request item thumbnails now open the existing design preview lightbox when a preview or
  thumbnail URL can be resolved.
- Preview URL resolution follows the existing Design Library pattern: `previewPath`, falling back to
  `thumbnailPath`.
- Missing/unresolved images keep the existing thumbnail fallback and do not render a lightbox.
- Requested-size assessment now calculates accurate DPI before applying the 22-inch standard
  Print Request save block.
- Over-22 requested sizes still return `canSave: false` and the existing Custom Request guidance.
- Below-72 DPI blocking, 72-299 DPI warning, and 300+ DPI valid behavior remain covered.
- Quantity, width, and height inputs now keep transient text state while editing instead of
  coercing blank input to `0`.
- Quantity, width, and height inputs now select their current value on focus.
- Blank or invalid quantity/width/height input blocks autosave and does not persist to Firestore.
- Aspect-ratio recalculation now runs only from valid positive width/height input.

## Automated Verification

- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts`
  - Result: PASS, 21/21
- `npx tsc --noEmit`
  - Result: PASS
- `npm run lint`
  - Result: PASS
- `npx vite build`
  - Result: PASS
  - Warning: existing circular manual-chunk warning only:
    `Circular chunk: vendor -> react-vendor -> vendor. Please adjust the manual chunk logic for these chunks.`
- `git diff --check`
  - Result: PASS
  - Warnings: standard Windows LF/CRLF conversion warnings only

## Manual QA Status

Manual authenticated QA passed in the user's dev session.

Verified:

- Opened `/print-requests`.
- Opened a request with items.
- Confirmed quantity, width, and height inputs auto-select their current value on focus.
- Confirmed width can be cleared to a blank value while editing.
- Confirmed blank width does not automatically become `0`.
- Confirmed blank width shows validation and does not autosave.
- Confirmed entering a valid width recalculates height through aspect ratio lock.
- Confirmed valid width autosaves.
- Confirmed height can be cleared to a blank value while editing.
- Confirmed blank height does not automatically become `0`.
- Confirmed blank height shows validation and does not autosave.
- Confirmed entering a valid height recalculates width through aspect ratio lock.
- Confirmed valid height autosaves.
- Confirmed quantity can be edited cleanly and valid quantity autosaves.
- Confirmed over-22 requested dimensions still show Custom Request guidance.
- Confirmed over-22 requested dimensions still block autosave.
- Confirmed over-22 requested dimensions show accurate DPI and do not show `0 DPI` solely because they are oversized.
- Confirmed resizing back to 22 inches or less allows autosave to reach `Saved`.
- Confirmed item thumbnails keep the same card footprint.
- Confirmed item thumbnails show the full image using contained fit, not cropped cover fit.
- Confirmed item thumbnails open in a lightbox.
- Confirmed the lightbox can be closed.
- Confirmed duplicate/remove behavior still works.
- Confirmed CR/IR request names still work.
- Confirmed request origin badges still work.
- Confirmed catalog dimensions and image files are unchanged.
- Confirmed no design lifecycle status changes occurred.

## Deploy Status

No deploy was needed or performed.

No Firestore rules deploy, Firestore index deploy, Functions deploy, Hosting deploy, Storage rules
deploy, migration, backfill, image mutation, derivative regeneration, catalog dimension mutation,
request naming change, origin badge change, Portal behavior, Print Runs, Custom Requests,
production status workflow, or design lifecycle status change was performed.
