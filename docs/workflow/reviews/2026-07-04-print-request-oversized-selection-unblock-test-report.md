# Print Request Oversized Selection Unblock Test Report

Date: 2026-07-04
Managed phase: `print-request-oversized-selection-unblock`
Result: automated verification PASS; manual QA PASS WITH FOLLOW-UP NOTES

## Scope Verified

- Added shared requested-size initialization for new Print Request items.
- New item initialization uses a 10-inch requested width when possible, preserves smaller default
  widths, preserves aspect ratio, and caps extreme aspect ratios so neither requested side exceeds
  22 inches.
- Design Library request-selection creation now uses initialized requested item dimensions instead
  of inheriting oversized catalog/default dimensions.
- Existing edit/autosave validation still blocks requested sizes over 22 inches and below 72 DPI.
- Catalog design dimensions, original images, thumbnails, and previews are not mutated.
- Duplicate item creation remains explicit-size based and preserves the source item's requested
  size.

## Automated Verification

```bash
npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts
```

Result: PASS, 27/27 tests.

```bash
npx tsc --noEmit
```

Result: PASS.

```bash
npm run lint
```

Result: PASS.

```bash
npx vite build
```

Result: PASS. Existing circular manual-chunk warning remains non-blocking.

```bash
git diff --check
```

Result: PASS. Standard Windows LF/CRLF warnings only.

## Manual QA Status

Manual authenticated QA passed in the user's dev session:

- Opened `/print-requests`.
- Opened or created a request.
- Opened Design Library request-selection mode.
- Selected the approved test design whose catalog/default size is `30 x 36`.
- Saved the selection.
- Confirmed it successfully adds to the request and does not block during selection mode.
- Confirmed the new request item appears in the Print Request detail page.
- Confirmed the requested item size initializes to about `10 x 12`, not `30 x 36`.
- Confirmed the catalog design's stored/default dimensions still show as `30 x 36` wherever
  catalog dimensions are shown.
- Confirmed no image file changed, regenerated, resized, compressed, or downscaled.
- Edited the item width above 22 inches and confirmed autosave blocks or shows oversized
  validation.
- Resized it back to 22 inches or less and confirmed autosave reaches `Saved`.
- Confirmed item quantity autosave still works.
- Duplicated the item and confirmed the duplicate keeps the same requested size as the source item.
- Removed an item and confirmed remove behavior still works.
- Confirmed CR/IR request names and request origin badges still work.
- Confirmed no design lifecycle status changes occurred.

## Follow-Up Notes

Non-blocking follow-ups captured in `docs/project/TECH_DEBT.md`:

- TD-019: Print Request item thumbnail should keep the same card footprint but show the full image
  using contained fit, not a cropped preview.
- TD-020: Print Request item thumbnail should be clickable/openable in a lightbox preview.
- TD-021: When a requested item size is over the 22-inch threshold, the item should still show the
  accurate DPI rating instead of `0 DPI`.

## Deploy Checkpoints

No Firestore rules, Firestore indexes, Firebase Functions, Hosting, Storage rules, migration,
backfill, or production deploy was needed or performed.
