## Current Goal
portal-persistent-current-request

## Phase
test — await manual UI checkpoint (after UX mid-checkpoint fixes)

## Plan Status
complete

## Review Status
approved_with_changes

## Implementation Status
complete — load regression remediated; mid-checkpoint UX fixes applied; selection-mode cleanup still deferred

## Test Status
passed_with_notes — portal typecheck green after UX fixes; awaiting owner manual retest

## Signoff Status
blocked until manual PASS

## DONE
no

## Blocked
no

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual retest after UX mid-checkpoint fixes — docs/workflow/reviews/2026-07-12-portal-persistent-current-request-manual-checkpoint.md

## Allowed Actions
Read docs; wait for owner PASS / PASS WITH NOTES / FAIL; narrow fixes within scope

## Forbidden Actions
Production deploy; selection-mode cleanup before manual PASS; signoff without manual PASS; concurrent next build while next dev is running

## Next Required Step
Await owner reply on restored manual checkpoint (include mid-checkpoint UX checklist)


## Decision Log
- 2026-07-12 — Mid-checkpoint: Studio tsconfig `ignoreDeprecations: 6.0` for baseUrl; qty +/- coalesced optimistic (toast only on first add).
- 2026-07-12 — Mid-checkpoint: optimistic trash remove (working items patch immediately); mobile Discover browse uses folder-search icon.
- 2026-07-12 — Mid-checkpoint: mobile View all → library kept previous scroll offset. Hardened PortalScrollReset (layout + delayed retries, manual history restoration) and forced scroll top on Discover openLibrary.
- 2026-07-12 — Owner FAIL: Portal did not load.
- 2026-07-12 — Root cause: Context↔Drawer circular import + corrupted `.next` (CSS error then concurrent build vs dev). Fixed drawer mount in PortalAppShell; cleared cache; restarted `npm run dev:portal`. Routes return 200.
- 2026-07-12 — Regression test: PortalPrintRequestContext.boundary.test.ts. Manual checkpoint restored.
- 2026-07-12 — ADR-FP-076; B–F implemented earlier; selection-mode cleanup still gated.
- 2026-07-12 — Owner mid-checkpoint UX feedback: qty steppers, remove Continue request, remove How print requests work, snazzier drawer, hide desktop hamburger. Fixes applied; portal `tsc --noEmit` passed.
- 2026-07-12 — Owner follow-up: Upload Designs + image-up icon; restore perpetual selection-card highlight/qty/trash UI (CatalogSelectionCard) on Discover/Library instead of “In Current Request” ecommerce cards.
- 2026-07-12 — Owner follow-up: drawer Uploaded/Library one-word pills; condense `/requests/artwork` header spacing. Typecheck green; awaiting retest.
- 2026-07-12 — ZIP upload: discovery-first finalize (list all extracted images, then process) + Portal live batch subscription. Deployed `finalizeCustomerUploadZip` to fresh-prints-dev.
- 2026-07-12 — Import upscale floor raised to 15″@300 DPI (4500px); request defaults remain 10″. Portal “Add Request to Show” got calendar-plus icon.
