# Amendment 2 Plan: Donation exclusion and in-app Delete Upload

Date: 2026-08-01
Parent slice: `donated-designs-overflow-menu-no-op`
Starting commit: `1bbd2594ca7595dba6a98e2dc59c77a3972914a7`

## Confirmed repository findings

- Unsupported native call: `useCustomerUploadIntake.ts` invokes `window.prompt` inside `deleteEligible`; Electron rejects it with `prompt() is and will not be supported.`
- The same shared intake also uses `window.confirm` for **Do not add to catalog**. Both native calls must be replaced.
- Existing Fresh Prints modal precedent: `PrintRequestDeletionDialog` and `UpcomingShowDeletionDialog` load a trusted preview, show blockers, and call the existing confirmed service from `Modal`/`ModalBody`/`ModalFooter` primitives.
- Delete preview queries `printRequestItems.customerUploadId` (limit 20) and blocks any match; it separately blocks any nonempty `promotedDesignId`. It deletes only the upload document plus the upload's source, production, preview, and thumbnail Storage paths. It does not delete print requests/items, allocations, designs, batches, customers, or audit documents.
- Delete callable and Studio permission are owner-only today. Product decision requires active owner/admin and denies helper/customer at both UI and callable layers.
- Exclusion callable permits active owner/admin/helper through `assertCanManageCustomerUploadIntake`, changes `catalogReviewStatus` from `pending_staff_review` to `excluded_from_catalog`, and the hook removes the item from the Pending list. Restore changes it back when reversible.
- Defect against clarified behavior: donation exclusion currently deletes source/production assets and stamps `fullSizePurgedAt`, making restore impossible. Exclusion must become a metadata-only catalog lifecycle update for every upload purpose.

## Implementation

1. Add `CustomerUploadDeletionDialog` using existing Modal/Button primitives. On open it calls the existing preview callable and renders loading, allowed, blocked, already-done, and safe error states. It never uses native prompt/confirm/alert. Cancel/Escape do no work; Delete Upload calls the existing deletion callable once with the established server confirmation phrase.
2. Add `CustomerUploadExclusionDialog` to replace native confirm. It clearly states exclusion is reversible catalog review and preserves upload/request artwork. Explicit confirmation calls the existing exclusion hook.
3. Keep modal target identity captured in `IntakeDetail`; selected row/filter changes already remount the detail and clear stale dialogs. Add focus containment, safest initial Cancel focus, Escape cancel, and trigger focus return.
4. Rename the overflow item exactly **Delete Upload** and preserve the downward portaled menu behavior.
5. Remove prompt-driven deletion from the hook. Add a narrow local-completion callback so dialog success removes only the selected row and publishes the callable's safe message.
6. Change `permissionService.canDeleteEligibleCustomerUpload` to active owner/admin.
7. Add trusted `assertCanDeleteCustomerUpload` in `customerUploadStaffAuth`; use it in both preview and delete callables. Helpers and nonstaff/customers fail with permission denied.
8. Preserve safe-delete blockers but extract their pure decision and Storage-path allowlist for direct tests. No force-delete, detach, allocation rewrite, or history rewrite.
9. Remove donation full-size purge from exclusion. Exclusion only updates `catalogReviewStatus` and `updatedAt`; existing restore remains valid for newly excluded uploads. Historical already-purged donations remain blocked from restore because their files cannot be recreated.

## Verification

- Focused Studio modal/source contracts, permission tests, Functions auth/eligibility/exclusion contracts, existing menu tests.
- Functions build, Studio TypeScript, Studio production build/package, repository lint, and `git diff --check`.
- No Rules change is expected: mutations remain callable/Admin SDK operations, and callable authorization is the trusted boundary.

## Deployment and promotion gates

- Commit/push development only. Functions source changes require a later explicit scoped deployment approval after production merge.
- Manual development owner/admin/helper QA remains required before promotion.
- No production PR, merge, installer, deployment, data, Stage 2, or domain action in this pass.
