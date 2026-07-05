# Print Request Oversized Selection Unblock Signoff

Date: 2026-07-04
Managed phase: `print-request-oversized-selection-unblock`
Result: PASS WITH FOLLOW-UP NOTES

## Summary

The phase is signed off as PASS WITH FOLLOW-UP NOTES.

Oversized approved catalog designs can now be added from Design Library request-selection mode to
standard Print Requests. New request items initialize requested dimensions separately from catalog
dimensions, using the approved 10-inch requested-width default when possible and capping extreme
aspect ratios so neither requested side exceeds 22 inches.

## Files Changed

- `.cursor/workflow/state.md`
- `docs/WORKFLOWS.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/project/DECISIONS.md`
- `docs/project/ROADMAP.md`
- `docs/project/TECH_DEBT.md`
- `docs/workflow/plans/2026-07-04-print-request-oversized-selection-unblock-plan.md`
- `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-test-report.md`
- `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`
- `project-chatgpt-handoff/CURRENT-STATE.md`
- `shared/utils/printRequestItemSizing.ts`
- `src/renderer/src/features/print-requests/services/printRequestService.ts`
- `src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts`

## Automated Verification

```bash
npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts
```

Result: PASS, 27/27.

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

Result: PASS, existing circular manual-chunk warning only.

```bash
git diff --check
```

Result: PASS, standard Windows LF/CRLF warnings only.

## Manual QA

Manual authenticated QA passed in the user's dev session.

Verified:

- `/print-requests` opens.
- Request detail opens or can be created.
- Design Library request-selection mode opens.
- Approved `30 x 36` catalog/default-size test design saves into the request without blocking.
- New request item appears in Print Request detail.
- Requested item size initializes around `10 x 12`, not `30 x 36`.
- Catalog/default dimensions remain `30 x 36` wherever catalog dimensions are shown.
- No image file changed, regenerated, resized, compressed, or downscaled.
- Over-22 requested width is blocked or shows oversized validation.
- Resizing back to 22 inches or less autosaves to `Saved`.
- Quantity autosave still works.
- Duplicate preserves the source requested size.
- Remove behavior still works.
- CR/IR names still work.
- Request origin badges still work.
- No design lifecycle status changes occurred.

## Deploys

No deploy was needed or performed.

No Firestore rules deploy, Firestore index deploy, Functions deploy, Hosting deploy, Storage rules
deploy, migration, backfill, Portal work, Print Runs, Custom Requests, image mutation, origin badge
change, CR/IR naming change, production status workflow, or design lifecycle status change occurred.

## Follow-Up Notes

Non-blocking follow-ups captured in `docs/project/TECH_DEBT.md`:

- TD-019: Print Request item thumbnails should keep the same card footprint but use contained fit
  so full artwork is visible.
- TD-020: Print Request item thumbnails should open in a lightbox preview.
- TD-021: Oversized requested item dimensions should still show the accurate calculated DPI rather
  than `0 DPI`.

## Final Status

Workflow state, roadmap, durable docs, handoff, test report, and this signoff report are updated to
reflect signoff.
