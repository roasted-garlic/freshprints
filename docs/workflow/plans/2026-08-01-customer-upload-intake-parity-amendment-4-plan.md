# Customer upload intake parity Amendment 4 plan

## Confirmed repository findings

- Donated Designs route: `DonatedDesignsPage.tsx`, using `useCustomerUploadIntake({ purposeScope: "catalog_donation" })` and shared `CustomerUploadIntakeSection`.
- Customer Uploads route: `CustomerUploadsPage.tsx`, using `purposeScope: "print_request"` and the same shared section.
- The shared listener queries `customerUploads` by `catalogReviewStatus` + `createdAt`, then filters donations to exact `catalog_donation`; Customer Uploads includes every non-donation purpose. Missing legacy purpose resolves to `print_request`.
- Only `pending_staff_review` and `excluded_from_catalog` appear in these tabs. `not_eligible` records are not queried and therefore receive no catalog-review controls.
- Restore already exists end-to-end: `restoreCustomerUploadCatalogEligibility` callable → `customerUploadIntakeService.restore` → `useCustomerUploadIntake.restore` → an inline button in `CustomerUploadIntakeSection`.
- The callable updates the same document from `excluded_from_catalog` to `pending_staff_review`; it performs no Storage or request mutation and does not inspect the excluding actor.
- The current UI button says `Restore`, performs immediately without confirmation, and is suppressed by `fullSizePurgedAtMs`. This conditional is the direct source-level reason an excluded row can show only Delete Upload.

## Goal and scope

- Add a shared accessible in-app restore confirmation dialog with exact visible label `Restore to Pending`.
- Render the visible restore action on eligible excluded rows across both shared intake surfaces.
- Keep historically purged rows safely non-restorable with an explicit visible explanation rather than silently omitting the lifecycle control; no asset recreation or migration.
- Preserve pending promotion/exclusion, owner/admin deletion, helper denial, purpose/status eligibility, menu placement, focus behavior, and stale-state cleanup.
- Add focused failing-before/passing-after shared parity and lifecycle contract coverage.

## Backend and Rules impact

No Functions or Rules change is planned. Existing callable authorization already allows active owner/admin/helper restoration independent of actor. Amendment 3 deletion behavior remains unchanged.

## Verification

Run focused Donated Designs, Customer Uploads, dialog, permission, restore/exclude, and deletion tests; Studio TypeScript; Studio production build/package; Functions build only if Functions unexpectedly change; lint; and `git diff --check`.
