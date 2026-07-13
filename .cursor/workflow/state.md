## Current Goal
portal-donate-designs

## Phase
test

## Plan Status
complete — docs/workflow/plans/2026-07-13-portal-donate-designs-plan.md

## Review Status
approved_with_changes — docs/workflow/reviews/2026-07-13-portal-donate-designs-review.md

## Implementation Status
complete

## Test Status
partial — unit tests + portal typecheck + functions build passed; Studio has pre-existing unrelated tsc errors; manual UI checkpoint pending

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual UI verification of Portal Donate Designs + Studio Donated Designs; Functions/indexes deploy before production.

## Allowed Actions
Run/record remaining tests; write test report; prepare manual checkpoint; docs-only fixes

## Forbidden Actions
Production deploy without approval; scope expansion

## Next Required Step
Owner manual PASS on Portal donate + Studio Donated Designs; then signoff


## Decision Log
- 2026-07-13 — Parked prior goal `studio-upload-preview-and-show-queue-links` (implementation complete; owner visual confirm still outstanding as follow-up).
- 2026-07-13 — Started managed phase `portal-donate-designs`: reuse customer-upload pipeline for catalog donations.
- 2026-07-13 — Review **approved_with_changes**.
- 2026-07-13 — Implemented: `purpose` field, `confirmCustomerUploadsForDonation`, Portal `/donate` + sidebar link, Studio `/donated-designs`, indexes, ADR-FP-078.
- 2026-07-13 — Automated: purpose + donate validation tests pass; functions build pass; portal typecheck pass.
- 2026-07-13 — UX fixes: hide floating theme on `/donate`; donate sidebar chip (blue soft bg, red icon, centered inset); Studio donate intake uses existing index + client purpose filter.

## Files Created
- packages/shared/src/utils/customerUploadPurpose.ts (+ test)
- packages/shared/src/types/customerUpload/confirmCustomerUploadDonate.types.ts
- functions/src/confirmCustomerUploadsForDonation.ts
- functions/src/lib/confirmCustomerUploadDonateValidation.ts (+ test)
- functions/src/lib/customerUploadCatalogConfirmation.ts
- apps/portal/app/(app)/donate/page.tsx
- apps/studio/.../pages/DonatedDesignsPage.tsx
- docs/workflow/plans/2026-07-13-portal-donate-designs-plan.md
- docs/workflow/reviews/2026-07-13-portal-donate-designs-review.md

## Files Modified
- Shared customer upload types/enums; create/finalize/attach callables; Portal upload panel/hook/service + sidebar; Studio intake/sidebar/routes; firestore.indexes.json; DATA_MODEL, BACKEND, DECISIONS, ROADMAP
