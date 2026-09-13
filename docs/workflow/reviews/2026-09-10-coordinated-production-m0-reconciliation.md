# Coordinated Production M0 Reconciliation

## Authoritative final parent M0 reconciliation — 2026-09-12

This section is the final owner-authorized, read-only M0 reconciliation for
`coordinated-production-promotion-release-readiness`. It supersedes every earlier snapshot and
dirty packet in this file. Classification: **A — READY FOR REVIEWED CANDIDATE COMMIT/PUSH**. This
means the reviewed source is ready for a separately authorized explicit-path commit/push checkpoint;
it is not a candidate freeze, deployment approval, or production authorization.

### Owner authorization and boundary

The owner authorized **RERUN FINAL PARENT M0 / COMMIT-BYTE CANDIDATE RECONCILIATION** after the
cutover-prerequisites child closed with `approved_with_notes` and explicit
`OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`. This M0 was read-only:
production untouched; no production reads; production runner never invoked; no production DRY RUN,
VERIFY, APPLY/backfill, Rules or Functions deployment, Portal or Studio publication, maintenance
activation, settings/data/secret/Auth mutation, staging, commit, push, candidate freeze, or parent
M0 rerun beyond this one occurred.

Settled release decisions are preserved: Strategy B coordinated release; maintenance as a safety
layer rather than a standalone release; transition Rules before final Rules; additive indexes only
with no `--force`; projection-preferred dual-read; production-locked population with APPLY separately
gated; no broad Function deploy; hard-delete and DEV/test-only exports excluded; and no migration or
backfill merely because code exists.

### Git truth and complete status inventory

- Branch: `development`; `HEAD` = `origin/development` =
  `a76d8be218571e1260bdb983f86ee5cf86563e1b`; ahead/behind: `0 / 0`.
- `origin/production` = `36165096f09bef6817adb5b11d496dbb1502b34b`.
- Current dirty inventory: **256 status paths** (**134 tracked modifications + 122 untracked
  files**). No status path is unexplained.
- Sorted status-path SHA-256 (UTF-8, LF-separated, final LF):
  `bfd1a1911d94449dee74dea0134061744814f42b51b80f90014bc38f357da0ac`.
- The path inventory below is the complete `git status --porcelain=v1 --untracked-files=all`
  output. The classified inventory uses deterministic first-match rules and contains all 256 paths;
  the final catch-all is zero.

| Classification (first matching rule) | Paths |
|---|---:|
| tests/validation | 35 |
| workflow evidence | 85 |
| permanent documentation | 7 |
| handoff/state | 12 |
| Firestore Rules | 1 |
| transition Rules/config | 2 |
| Storage Rules | 1 |
| indexes | 1 |
| commit/reconciliation tooling | 3 |
| Firebase/release/package/config | 3 |
| Portal runtime | 21 |
| Studio runtime | 32 |
| Functions runtime | 26 |
| shared runtime | 27 |
| explicitly excluded/deferred material | 0 |
| **Total** | **256** |

<details>
<summary>Complete per-path classification (256/256; status prefix retained)</summary>

```text
handoff/state ::  M .cursor/workflow/state.md
tests/validation ::  M .github/scripts/publish-studio-stable-github-release.test.ts
tests/validation ::  M .github/workflows/studio-release-signing-policy.test.ts
Firebase/release/package/config ::  M .github/workflows/studio-release.yml
Portal runtime ::  M apps/portal/app/(app)/dashboard/page.tsx
Portal runtime ::  M apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx
Portal runtime ::  M apps/portal/features/admin-show-queue/components/PortalAdminViewDesignsModal.tsx
Portal runtime ::  M apps/portal/features/assisted-creation/components/AssistedAddToRequestProgressModal.tsx
Portal runtime ::  M apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx
Portal runtime ::  M apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx
Portal runtime ::  M apps/portal/features/assisted-creation/services/assistedCreationService.ts
tests/validation ::  M apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts
Portal runtime ::  M apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx
Portal runtime ::  M apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx
Portal runtime ::  M apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx
Portal runtime ::  M apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx
Portal runtime ::  M apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts
Portal runtime ::  M apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts
Portal runtime ::  M apps/portal/features/print-requests/services/portalPrintRequestService.ts
tests/validation ::  M apps/portal/features/print-requests/utils/addDesignRuntime.test.ts
Portal runtime ::  M apps/portal/features/print-requests/utils/addDesignRuntime.ts
tests/validation ::  M apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.test.ts
Portal runtime ::  M apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.ts
tests/validation ::  M apps/portal/features/print-requests/utils/printRequestDetailPostQueueHydration.contract.test.ts
Portal runtime ::  M apps/portal/features/shared/context/PortalToastContext.tsx
Portal runtime ::  M apps/portal/lib/firebase/collections.ts
Portal runtime ::  M apps/portal/styles/assisted-creation.css
Portal runtime ::  M apps/portal/styles/shell.css
Firebase/release/package/config ::  M apps/studio/package.json
Studio runtime ::  M apps/studio/src/renderer/src/features/ai-review/components/AiReviewPreviewBackgroundToggle.tsx
Studio runtime ::  M apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx
Studio runtime ::  M apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetShowAssets.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/gang-sheets/services/gangSheetService.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/permissions/services/permissionService.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/permissions/types/permission.types.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemsPreviewLightbox.tsx
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/utils/buildPrintRequestExportAssets.ts
tests/validation ::  M apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.test.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts
Studio runtime ::  M apps/studio/src/renderer/src/features/upcoming-shows/utils/buildShowExportAllocationAssets.ts
Studio runtime ::  M apps/studio/src/renderer/src/routes/AppRoutes.tsx
Studio runtime ::  M apps/studio/src/renderer/src/shared/components/Select.tsx
Studio runtime ::  M apps/studio/src/renderer/src/shared/components/Sidebar.tsx
Studio runtime ::  M apps/studio/src/renderer/src/styles/components/ai-review.css
Studio runtime ::  M apps/studio/src/renderer/src/styles/components/print-requests.css
Studio runtime ::  M apps/studio/src/renderer/src/styles/components/staff-inbox.css
Studio runtime ::  M apps/studio/src/renderer/src/styles/globals.css
permanent documentation ::  M docs/architecture/BACKEND.md
permanent documentation ::  M docs/architecture/DATA_MODEL.md
permanent documentation ::  M docs/architecture/FIREBASE.md
permanent documentation ::  M docs/project/DECISIONS.md
permanent documentation ::  M docs/project/RISK_REGISTER.md
permanent documentation ::  M docs/project/ROADMAP.md
permanent documentation ::  M docs/standards/SECURITY.md
workflow evidence ::  M docs/workflow/plans/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-plan.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-config-data-disposition.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-function-closure-audit.mjs
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-index-union.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-portal-build-input-manifest.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-rules-manifest.md
workflow evidence ::  M docs/workflow/reviews/2026-09-10-coordinated-production-studio-build-input-manifest.md
indexes ::  M firestore.indexes.json
Firestore Rules ::  M firestore.rules
Functions runtime ::  M functions/src/allocateStudioPrintRequestToShow.ts
Functions runtime ::  M functions/src/assistedCreationRequests.ts
tests/validation ::  M functions/src/assistedCreationWs2Corrective.contract.test.ts
Functions runtime ::  M functions/src/convertCustomerPrintRequestToInternal.ts
Functions runtime ::  M functions/src/customerAddAssistedApprovedProofToPrintRequest.ts
Functions runtime ::  M functions/src/duplicatePortalPrintRequestItem.ts
Functions runtime ::  M functions/src/getPortalAdminShowQueueRequestDesigns.ts
Functions runtime ::  M functions/src/index.ts
Functions runtime ::  M functions/src/lib/assistedCreationProofPurge.ts
Functions runtime ::  M functions/src/lib/copyStudioPrintRequestCore.ts
tests/validation ::  M functions/src/lib/customerUploadCatalogConfirmation.test.ts
Functions runtime ::  M functions/src/lib/customerUploadProcessing.ts
tests/validation ::  M functions/src/lib/email/email.test.ts
Functions runtime ::  M functions/src/lib/email/emailJobIdentity.ts
Functions runtime ::  M functions/src/lib/email/emailTemplates.ts
Functions runtime ::  M functions/src/lib/portalAdminDailyShowQueue.ts
Functions runtime ::  M functions/src/lib/portalAdminUpcomingShowQueueDashboard.ts
Functions runtime ::  M functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.ts
Functions runtime ::  M functions/src/lib/showProductionRecoveryRequeue.ts
Functions runtime ::  M functions/src/lib/showQueueMove.ts
Functions runtime ::  M functions/src/onEmailDeliveryJobCreated.ts
Functions runtime ::  M functions/src/queuePortalPrintRequestToShow.ts
Firebase/release/package/config ::  M package-lock.json
shared runtime ::  M packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts
shared runtime ::  M packages/shared/src/types/assistedCreation/assistedCreation.types.ts
shared runtime ::  M packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts
shared runtime ::  M packages/shared/src/types/customerNotifications/customerNotifications.types.ts
shared runtime ::  M packages/shared/src/types/gangSheet/gangSheet.types.ts
shared runtime ::  M packages/shared/src/types/portal/getPortalAdminDailyShowQueue.types.ts
shared runtime ::  M packages/shared/src/types/portal/getPortalAdminUpcomingShowQueueDashboard.types.ts
shared runtime ::  M packages/shared/src/types/printRequest/printRequest.types.ts
shared runtime ::  M packages/shared/src/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types.ts
shared runtime ::  M packages/shared/src/types/showAllocation/showAllocation.types.ts
tests/validation ::  M packages/shared/src/utils/assistedCreationApprovedProofRetention.test.ts
shared runtime ::  M packages/shared/src/utils/assistedCreationApprovedProofRetention.ts
tests/validation ::  M packages/shared/src/utils/assistedCreationHistory.test.ts
shared runtime ::  M packages/shared/src/utils/assistedCreationHistory.ts
shared runtime ::  M packages/shared/src/utils/currentRequestAggregates.ts
tests/validation ::  M packages/shared/src/utils/customerNotifications.test.ts
shared runtime ::  M packages/shared/src/utils/customerNotifications.ts
shared runtime ::  M packages/shared/src/utils/portalAdminShowQueueMetrics.ts
shared runtime ::  M packages/shared/src/utils/printAssetResolution.ts
tests/validation ::  M packages/shared/src/utils/printRequestItemSource.test.ts
shared runtime ::  M packages/shared/src/utils/printRequestItemSource.ts
shared runtime ::  M packages/shared/src/utils/printRequestItemSummaries.ts
shared runtime ::  M packages/shared/src/utils/resolveShowExportProductionAsset.ts
shared runtime ::  M packages/shared/src/utils/showAllocationAttachmentDisplay.ts
shared runtime ::  M packages/shared/src/utils/showAllocationSourceFields.ts
handoff/state ::  M references/project-chatgpt-handoff/03-roadmap-and-phases.md
handoff/state ::  M references/project-chatgpt-handoff/04-features-inventory.md
handoff/state ::  M references/project-chatgpt-handoff/05-workflows-summary.md
handoff/state ::  M references/project-chatgpt-handoff/06-data-model-essentials.md
handoff/state ::  M references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md
handoff/state ::  M references/project-chatgpt-handoff/10-security-essentials.md
handoff/state ::  M references/project-chatgpt-handoff/11-testing-commands.md
handoff/state ::  M references/project-chatgpt-handoff/12-decisions-and-constraints.md
handoff/state ::  M references/project-chatgpt-handoff/13-recent-completed-work.md
handoff/state ::  M references/project-chatgpt-handoff/CURRENT-STATE.md
handoff/state ::  M references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md
Storage Rules ::  M storage.rules
tests/validation :: ?? apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts
tests/validation :: ?? apps/portal/features/print-requests/utils/clearWorkingRequestPending.contract.test.ts
tests/validation :: ?? apps/portal/features/print-requests/utils/mergeProjectionPreferredPrintRequestItems.test.ts
Portal runtime :: ?? apps/portal/features/print-requests/utils/mergeProjectionPreferredPrintRequestItems.ts
tests/validation :: ?? apps/portal/features/print-requests/utils/workingItemsSubscribeMerge.contract.test.ts
Studio runtime :: ?? apps/studio/src/renderer/src/features/customers/components/SearchableCustomerPicker.tsx
tests/validation :: ?? apps/studio/src/renderer/src/features/permissions/services/permissionService.staffArtwork.test.ts
Studio runtime :: ?? apps/studio/src/renderer/src/features/staff-artwork/components/SendStaffArtworkToAiReviewConfirmDialog.tsx
Studio runtime :: ?? apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx
Studio runtime :: ?? apps/studio/src/renderer/src/features/staff-artwork/services/staffArtworkService.ts
Studio runtime :: ?? apps/studio/src/renderer/src/features/staff-artwork/utils/generateStaffArtworkTitle.ts
Studio runtime :: ?? apps/studio/src/renderer/src/features/staff-artwork/utils/suggestDarkArtworkBackgroundFromObjectUrl.ts
Studio runtime :: ?? apps/studio/src/renderer/src/styles/components/staff-artwork.css
workflow evidence :: ?? docs/workflow/plans/2026-09-11-studio-staff-artwork-library-and-print-request-source-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-assisted-creation-multi-proof-selection-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-assisted-final-artwork-ready-email-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-coordinated-production-cutover-prerequisites-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md
workflow evidence :: ?? docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-plan.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-dev-deployment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-classification-b-amendment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-dev-deployment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-owner-dev-qa-checklist.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-source-delta-reconciliation.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-dev-deployment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-signoff-preparation.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-dev-deployment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-owner-dev-qa-checklist.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-dev-deployment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-owner-dev-qa-checklist.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-dev-deployment.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-owner-dev-qa-checklist.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-apply.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-dry-run.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-verify.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-dev-rules-storage-cutover.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-image-title-product-decision.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-owner-dev-qa-checklist.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-dev-apply.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-dev-dry-run.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-dev-verify.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-signoff.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-implementation-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-review.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-test-report.md
workflow evidence :: ?? docs/workflow/reviews/2026-09-12-studio-staff-artwork-library-and-print-request-source-signoff.md
transition Rules/config :: ?? firebase.transition.json
transition Rules/config :: ?? firestore.transition.rules
tests/validation :: ?? functions/scripts/backfill-portal-print-request-items-dev.test.ts
Functions runtime :: ?? functions/scripts/backfill-portal-print-request-items-dev.ts
tests/validation :: ?? functions/scripts/reconcile-portal-print-request-items-prod.test.ts
Functions runtime :: ?? functions/scripts/reconcile-portal-print-request-items-prod.ts
Functions runtime :: ?? functions/src/lib/portalPrintRequestItemProjectionSync.ts
tests/validation :: ?? functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts
Functions runtime :: ?? functions/src/onPrintRequestItemPortalProjectionWritten.ts
tests/validation :: ?? functions/src/onStaffArtworkPortalProjectionRefreshWritten.contract.test.ts
Functions runtime :: ?? functions/src/onStaffArtworkPortalProjectionRefreshWritten.ts
Functions runtime :: ?? functions/src/staffArtwork.ts
tests/validation :: ?? functions/src/updatePortalStaffArtworkPrintRequestItemSize.contract.test.ts
Functions runtime :: ?? functions/src/updatePortalStaffArtworkPrintRequestItemSize.ts
tests/validation :: ?? packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.test.ts
shared runtime :: ?? packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.ts
shared runtime :: ?? packages/shared/src/types/portal/portalPrintRequestItem.types.ts
shared runtime :: ?? packages/shared/src/types/staffArtwork/staffArtwork.types.ts
tests/validation :: ?? packages/shared/src/utils/assistedCreationProofRounds.test.ts
shared runtime :: ?? packages/shared/src/utils/assistedCreationProofRounds.ts
tests/validation :: ?? packages/shared/src/utils/portalPrintRequestItemProjection.test.ts
shared runtime :: ?? packages/shared/src/utils/portalPrintRequestItemProjection.ts
tests/validation :: ?? packages/shared/src/utils/staffArtworkDeletionEligibility.test.ts
shared runtime :: ?? packages/shared/src/utils/staffArtworkDeletionEligibility.ts
tests/validation :: ?? packages/shared/src/utils/staffArtworkSource.test.ts
commit/reconciliation tooling :: ?? scripts/commit-byte-manifest.mjs
commit/reconciliation tooling :: ?? scripts/generate-commit-byte-manifest.mjs
tests/validation :: ?? scripts/generate-commit-byte-manifest.test.ts
commit/reconciliation tooling :: ?? scripts/generate-firestore-transition-rules.mjs
tests/validation :: ?? scripts/generate-firestore-transition-rules.test.ts
tests/validation :: ?? tests/firebase/catalogPrintRequestItemCreate.rules.test.ts
tests/validation :: ?? tests/firebase/staffArtwork.rules.contract.test.ts
tests/validation :: ?? tests/firebase/staffArtwork.storage.rules.test.ts
tests/validation :: ?? tests/firebase/staffArtworkPrintRequestItem.rules.test.ts
```
</details>

<details>
<summary>Complete raw porcelain status output</summary>

```text
 M .cursor/workflow/state.md
 M .github/scripts/publish-studio-stable-github-release.test.ts
 M .github/workflows/studio-release-signing-policy.test.ts
 M .github/workflows/studio-release.yml
 M apps/portal/app/(app)/dashboard/page.tsx
 M apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx
 M apps/portal/features/admin-show-queue/components/PortalAdminViewDesignsModal.tsx
 M apps/portal/features/assisted-creation/components/AssistedAddToRequestProgressModal.tsx
 M apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx
 M apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx
 M apps/portal/features/assisted-creation/services/assistedCreationService.ts
 M apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts
 M apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx
 M apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx
 M apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx
 M apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx
 M apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts
 M apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts
 M apps/portal/features/print-requests/services/portalPrintRequestService.ts
 M apps/portal/features/print-requests/utils/addDesignRuntime.test.ts
 M apps/portal/features/print-requests/utils/addDesignRuntime.ts
 M apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.test.ts
 M apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.ts
 M apps/portal/features/print-requests/utils/printRequestDetailPostQueueHydration.contract.test.ts
 M apps/portal/features/shared/context/PortalToastContext.tsx
 M apps/portal/lib/firebase/collections.ts
 M apps/portal/styles/assisted-creation.css
 M apps/portal/styles/shell.css
 M apps/studio/package.json
 M apps/studio/src/renderer/src/features/ai-review/components/AiReviewPreviewBackgroundToggle.tsx
 M apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx
 M apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts
 M apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts
 M apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetShowAssets.ts
 M apps/studio/src/renderer/src/features/gang-sheets/services/gangSheetService.ts
 M apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts
 M apps/studio/src/renderer/src/features/permissions/services/permissionService.ts
 M apps/studio/src/renderer/src/features/permissions/types/permission.types.ts
 M apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx
 M apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemsPreviewLightbox.tsx
 M apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.ts
 M apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx
 M apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts
 M apps/studio/src/renderer/src/features/print-requests/utils/buildPrintRequestExportAssets.ts
 M apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.test.ts
 M apps/studio/src/renderer/src/features/print-requests/utils/resolvePrintRequestItemArtworkBackground.ts
 M apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts
 M apps/studio/src/renderer/src/features/upcoming-shows/utils/buildShowExportAllocationAssets.ts
 M apps/studio/src/renderer/src/routes/AppRoutes.tsx
 M apps/studio/src/renderer/src/shared/components/Select.tsx
 M apps/studio/src/renderer/src/shared/components/Sidebar.tsx
 M apps/studio/src/renderer/src/styles/components/ai-review.css
 M apps/studio/src/renderer/src/styles/components/print-requests.css
 M apps/studio/src/renderer/src/styles/components/staff-inbox.css
 M apps/studio/src/renderer/src/styles/globals.css
 M docs/architecture/BACKEND.md
 M docs/architecture/DATA_MODEL.md
 M docs/architecture/FIREBASE.md
 M docs/project/DECISIONS.md
 M docs/project/RISK_REGISTER.md
 M docs/project/ROADMAP.md
 M docs/standards/SECURITY.md
 M docs/workflow/plans/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-plan.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-config-data-disposition.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-function-closure-audit.mjs
 M docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-index-union.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-portal-build-input-manifest.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-rules-manifest.md
 M docs/workflow/reviews/2026-09-10-coordinated-production-studio-build-input-manifest.md
 M firestore.indexes.json
 M firestore.rules
 M functions/src/allocateStudioPrintRequestToShow.ts
 M functions/src/assistedCreationRequests.ts
 M functions/src/assistedCreationWs2Corrective.contract.test.ts
 M functions/src/convertCustomerPrintRequestToInternal.ts
 M functions/src/customerAddAssistedApprovedProofToPrintRequest.ts
 M functions/src/duplicatePortalPrintRequestItem.ts
 M functions/src/getPortalAdminShowQueueRequestDesigns.ts
 M functions/src/index.ts
 M functions/src/lib/assistedCreationProofPurge.ts
 M functions/src/lib/copyStudioPrintRequestCore.ts
 M functions/src/lib/customerUploadCatalogConfirmation.test.ts
 M functions/src/lib/customerUploadProcessing.ts
 M functions/src/lib/email/email.test.ts
 M functions/src/lib/email/emailJobIdentity.ts
 M functions/src/lib/email/emailTemplates.ts
 M functions/src/lib/portalAdminDailyShowQueue.ts
 M functions/src/lib/portalAdminUpcomingShowQueueDashboard.ts
 M functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.ts
 M functions/src/lib/showProductionRecoveryRequeue.ts
 M functions/src/lib/showQueueMove.ts
 M functions/src/onEmailDeliveryJobCreated.ts
 M functions/src/queuePortalPrintRequestToShow.ts
 M package-lock.json
 M packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts
 M packages/shared/src/types/assistedCreation/assistedCreation.types.ts
 M packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts
 M packages/shared/src/types/customerNotifications/customerNotifications.types.ts
 M packages/shared/src/types/gangSheet/gangSheet.types.ts
 M packages/shared/src/types/portal/getPortalAdminDailyShowQueue.types.ts
 M packages/shared/src/types/portal/getPortalAdminUpcomingShowQueueDashboard.types.ts
 M packages/shared/src/types/printRequest/printRequest.types.ts
 M packages/shared/src/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types.ts
 M packages/shared/src/types/showAllocation/showAllocation.types.ts
 M packages/shared/src/utils/assistedCreationApprovedProofRetention.test.ts
 M packages/shared/src/utils/assistedCreationApprovedProofRetention.ts
 M packages/shared/src/utils/assistedCreationHistory.test.ts
 M packages/shared/src/utils/assistedCreationHistory.ts
 M packages/shared/src/utils/currentRequestAggregates.ts
 M packages/shared/src/utils/customerNotifications.test.ts
 M packages/shared/src/utils/customerNotifications.ts
 M packages/shared/src/utils/portalAdminShowQueueMetrics.ts
 M packages/shared/src/utils/printAssetResolution.ts
 M packages/shared/src/utils/printRequestItemSource.test.ts
 M packages/shared/src/utils/printRequestItemSource.ts
 M packages/shared/src/utils/printRequestItemSummaries.ts
 M packages/shared/src/utils/resolveShowExportProductionAsset.ts
 M packages/shared/src/utils/showAllocationAttachmentDisplay.ts
 M packages/shared/src/utils/showAllocationSourceFields.ts
 M references/project-chatgpt-handoff/03-roadmap-and-phases.md
 M references/project-chatgpt-handoff/04-features-inventory.md
 M references/project-chatgpt-handoff/05-workflows-summary.md
 M references/project-chatgpt-handoff/06-data-model-essentials.md
 M references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md
 M references/project-chatgpt-handoff/10-security-essentials.md
 M references/project-chatgpt-handoff/11-testing-commands.md
 M references/project-chatgpt-handoff/12-decisions-and-constraints.md
 M references/project-chatgpt-handoff/13-recent-completed-work.md
 M references/project-chatgpt-handoff/CURRENT-STATE.md
 M references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md
 M storage.rules
?? apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts
?? apps/portal/features/print-requests/utils/clearWorkingRequestPending.contract.test.ts
?? apps/portal/features/print-requests/utils/mergeProjectionPreferredPrintRequestItems.test.ts
?? apps/portal/features/print-requests/utils/mergeProjectionPreferredPrintRequestItems.ts
?? apps/portal/features/print-requests/utils/workingItemsSubscribeMerge.contract.test.ts
?? apps/studio/src/renderer/src/features/customers/components/SearchableCustomerPicker.tsx
?? apps/studio/src/renderer/src/features/permissions/services/permissionService.staffArtwork.test.ts
?? apps/studio/src/renderer/src/features/staff-artwork/components/SendStaffArtworkToAiReviewConfirmDialog.tsx
?? apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx
?? apps/studio/src/renderer/src/features/staff-artwork/services/staffArtworkService.ts
?? apps/studio/src/renderer/src/features/staff-artwork/utils/generateStaffArtworkTitle.ts
?? apps/studio/src/renderer/src/features/staff-artwork/utils/suggestDarkArtworkBackgroundFromObjectUrl.ts
?? apps/studio/src/renderer/src/styles/components/staff-artwork.css
?? docs/workflow/plans/2026-09-11-studio-staff-artwork-library-and-print-request-source-plan.md
?? docs/workflow/plans/2026-09-12-assisted-creation-multi-proof-selection-plan.md
?? docs/workflow/plans/2026-09-12-assisted-final-artwork-ready-email-plan.md
?? docs/workflow/plans/2026-09-12-coordinated-production-cutover-prerequisites-plan.md
?? docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-plan.md
?? docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-plan.md
?? docs/workflow/plans/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-plan.md
?? docs/workflow/plans/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-plan.md
?? docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md
?? docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md
?? docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-plan.md
?? docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-signoff.md
?? docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-test-report.md
?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-implementation-review.md
?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-review.md
?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-and-print-request-source-test-report.md
?? docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-dev-deployment.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-classification-b-amendment.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-dev-deployment.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-implementation-review.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-owner-dev-qa-checklist.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-review.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-signoff.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-source-delta-reconciliation.md
?? docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-test-report.md
?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-dev-deployment.md
?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-review.md
?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-signoff.md
?? docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-test-report.md
?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-implementation-review.md
?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-review.md
?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-signoff-preparation.md
?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-signoff.md
?? docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-dev-deployment.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-owner-dev-qa-checklist.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-review.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-signoff.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-dev-deployment.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-review.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md
?? docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-owner-dev-qa-checklist.md
?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-review.md
?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-signoff.md
?? docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-dev-deployment.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-owner-dev-qa-checklist.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-apply.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-dry-run.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-verify.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-dev-rules-storage-cutover.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-image-title-product-decision.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-owner-dev-qa-checklist.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-dev-apply.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-dev-dry-run.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-dev-verify.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-signoff.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-test-report.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-implementation-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-review.md
?? docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-test-report.md
?? docs/workflow/reviews/2026-09-12-studio-staff-artwork-library-and-print-request-source-signoff.md
?? firebase.transition.json
?? firestore.transition.rules
?? functions/scripts/backfill-portal-print-request-items-dev.test.ts
?? functions/scripts/backfill-portal-print-request-items-dev.ts
?? functions/scripts/reconcile-portal-print-request-items-prod.test.ts
?? functions/scripts/reconcile-portal-print-request-items-prod.ts
?? functions/src/lib/portalPrintRequestItemProjectionSync.ts
?? functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts
?? functions/src/onPrintRequestItemPortalProjectionWritten.ts
?? functions/src/onStaffArtworkPortalProjectionRefreshWritten.contract.test.ts
?? functions/src/onStaffArtworkPortalProjectionRefreshWritten.ts
?? functions/src/staffArtwork.ts
?? functions/src/updatePortalStaffArtworkPrintRequestItemSize.contract.test.ts
?? functions/src/updatePortalStaffArtworkPrintRequestItemSize.ts
?? packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.test.ts
?? packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.ts
?? packages/shared/src/types/portal/portalPrintRequestItem.types.ts
?? packages/shared/src/types/staffArtwork/staffArtwork.types.ts
?? packages/shared/src/utils/assistedCreationProofRounds.test.ts
?? packages/shared/src/utils/assistedCreationProofRounds.ts
?? packages/shared/src/utils/portalPrintRequestItemProjection.test.ts
?? packages/shared/src/utils/portalPrintRequestItemProjection.ts
?? packages/shared/src/utils/staffArtworkDeletionEligibility.test.ts
?? packages/shared/src/utils/staffArtworkDeletionEligibility.ts
?? packages/shared/src/utils/staffArtworkSource.test.ts
?? scripts/commit-byte-manifest.mjs
?? scripts/generate-commit-byte-manifest.mjs
?? scripts/generate-commit-byte-manifest.test.ts
?? scripts/generate-firestore-transition-rules.mjs
?? scripts/generate-firestore-transition-rules.test.ts
?? tests/firebase/catalogPrintRequestItemCreate.rules.test.ts
?? tests/firebase/staffArtwork.rules.contract.test.ts
?? tests/firebase/staffArtwork.storage.rules.test.ts
?? tests/firebase/staffArtworkPrintRequestItem.rules.test.ts
```
</details>

### Terminal child and gate-chain reconciliation

The parent Plan's dated signoff inventory is reconciled: its historical terminal approvals remain
included, and the 2026-09-05 owner-signoff checkpoint is superseded by its terminal signoff. The
latest planned pre-freeze children are all terminal, including:

- customer-upload follow-up/catalog permission;
- production-maintenance prerequisite corrective amendment;
- Studio hard-delete production UI gate (hard-delete exports remain excluded);
- customer-upload Studio deferral/personal-library/Portal inline remove;
- Studio Staff Artwork library and print-request source;
- Portal Staff Artwork neutral projection (umbrella base/population/visibility/image-title-DPI evidence);
- Portal assisted final-artwork progress/re-add and retention sentinel;
- assisted final-artwork-ready email;
- assisted-creation multi-proof selection;
- Portal post-queue-items/submit-nudge corrective; and
- this `coordinated-production-cutover-prerequisites` child.

The terminal evidence inspected for the current closing wave is:

```text
docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-signoff.md
docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-signoff.md
docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-signoff.md
docs/workflow/reviews/2026-09-10-show-queue-print-time-estimate-signoff.md
docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md
docs/workflow/reviews/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-signoff.md
docs/workflow/reviews/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-signoff.md
docs/workflow/reviews/2026-09-12-studio-staff-artwork-library-and-print-request-source-signoff.md
docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-signoff.md
docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md
docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-signoff.md
docs/workflow/reviews/2026-09-12-assisted-final-artwork-ready-email-signoff.md
docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-signoff.md
docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-signoff.md
docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-signoff.md
```

`studio-permission-two-ask-activity-excluded-handoff` is accepted closed under the 2026-09-11
umbrella evidence by owner decision; no separate Signoff is required. Every planned pre-freeze child
is therefore closed or explicitly dispositioned, and the cutover child gate chain is complete:
Plan → Formal Review (`approved_with_changes`) → Implement → Test → Owner DEV QA PASS → Signoff
(`approved_with_notes`).

### Reconciled implementation and deployment-input scope

- Firestore Rules: deterministic transition artifact plus authoritative final Rules state.
- Portal: projection-preferred `portalPrintRequestItems` dual-read with bounded canonical fallback
  during transition.
- Functions: production-hard-pinned projection reconciliation runner; distinct pre-APPLY VERIFY
  (population deltas allowed, unsafe drift fails closed); distinct post-APPLY exact-equality VERIFY;
  required post-APPLY zero-diff DRY RUN. Production APPLY remains separately owner-gated.
- Commit-byte manifest generation/audit tooling is present and tested; it intentionally cannot emit
  an immutable manifest while this checkout is dirty.
- Studio release metadata is `1.0.10`; rollback anchor remains `1.0.9`.
- `SECURITY.md`, `FIREBASE.md`, and `RISK_REGISTER.md` are synchronized, including the
  accepted authenticated Staff Artwork preview/thumbnail known-ID residual risk.

| Evidence | Current result |
|---|---|
| Function closure | 186 current exports / 120 production exports; 530 unique local closure paths; digest `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc`; actions ADD 54, UPDATE 110, RETAIN LIVE VERSION 3, EXCLUDE 10, NO ACTION 9 |
| Firestore Rules | final `firestore.rules`: 2,867 lines, 127,614 bytes, SHA-256 `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`; transition `firestore.transition.rules`: 2,868 lines, 127,701 bytes, SHA-256 `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945` |
| Storage Rules | 298 lines, 13,502 bytes, SHA-256 `f35c049fe4991e05dd73a8e6b2165ee3d24874ee3a081599894ee979abba1795` |
| Firebase transition config | `firebase.transition.json`, 108 bytes, SHA-256 `c07e7c2772b6fcf94b14f42af211883f248952d28bddd6e40c9efe6c8aef0c03` |
| Index union | 95 current / 77 production; 18 additive, zero removed/replaced, 3 field overrides; current SHA `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`; continuity union digest `f720a348bbf5be7392f77560748f229902c9e5a98f2b4022f0ac9150c2887f75` |
| Portal inputs | 388 app + 345 shared + 9 show-picker + 5 common = 747; digest `cf8c36d25807fa1195744a9952b1e65d3e923fbaabd6e4df25ab72025db62f2`; no build/publication |
| Studio inputs | 786 app + 345 shared + 9 show-picker + 5 common = 1,145; digest `bc72d879dd17beca0bc85c83de7526c0eda16ebb27fc19b2eec0c0853ae09aea`; version `1.0.10`; no package build/publication |

The projection cutover gate specifically requires Firestore index
`portalPrintRequestItems: printRequestId ASC, updatedAt DESC` to be READY before production
population or Portal exposure. Staff Artwork and other additive indexes are likewise verified by
the union audit before any later owner-authorized deployment.

### Configuration, data, and exact cutover disposition

Maintenance is absent/OFF; AI autonomy and Pass 2 remain OFF/parked; retention scheduling is
paused. No production population, migration, backfill, cleanup, Auth/identity, Algolia/provider,
secret, or settings operation occurred. The additive index union and Rules artifacts are evidence
only. Required transition sequence is:

1. clean frozen candidate and RC approval;
2. additive indexes READY (including the projection index);
3. required projection synchronizer/refresh Functions;
4. transition Firestore Rules/config;
5. projection-preferred dual-read Portal candidate;
6. production projection DRY RUN page-by-page;
7. production pre-APPLY VERIFY page-by-page;
8. explicit owner APPLY authorization;
9. APPLY one bounded page;
10. post-APPLY exact-equality VERIFY;
11. same-page zero-diff DRY RUN;
12. continue bounded pages only under reviewed operating authorization;
13. complete convergence, observation, and smoke;
14. separate owner final-boundary approval;
15. authoritative final Firestore Rules;
16. immediate post-final-Rules smoke; and
17. retain Portal compatibility code during observation.

This is the production sequence to be executed only through later owner checkpoints. Maintenance
remains a safety layer: verify capability while OFF, separately authorize ON if needed, perform only
selected approved overnight operations, verify/smoke, then turn OFF. APPLY/backfill, maintenance,
overnight operations, and every production deployment/publication remain separately owner-gated. No
step was executed in production by this M0.

### Validation and limitations

- Function closure audit: PASS (metrics above).
- Transition Rules and commit-byte tooling focused tests: **6/6 PASS**.
- Child focused validation: **87/87 PASS**; Functions build PASS; Portal typecheck PASS; targeted
  lint PASS; `git diff --check` PASS (line-ending warnings only).
- Portal production build remains blocked by the existing `.next/trace` EPERM environment issue.
- Firestore full Rules emulator suite retains the existing expression-budget baseline.
- Studio full typecheck retains existing unrelated baseline errors.
- Whole-repository lint retains existing unrelated errors/warnings.
- Studio packaging build was intentionally not run because it invokes installer-producing tooling.
  These are existing baseline/environment limitations, not newly introduced failures.

Commit-byte CLI output is deliberately not generated: its clean-checkout guard is expected to refuse
this dirty tree. The current candidate SHA is therefore **TBD**; no candidate is frozen. On
classification A, the exact next checkpoint is **OWNER AUTHORIZE FINAL REVIEWED CANDIDATE COMMIT/PUSH**.
Only after that authorization may explicit paths be staged, one `development` commit created and
pushed only to `origin/development`, followed by clean SHA/upstream verification and immutable
manifest regeneration. Stop before M1 or any production action.

## Authoritative post-pre-freeze-child reconciliation — 2026-09-12

This section supersedes every older snapshot below. The owner-authorized M0 rerun is complete as a
read-only reconciliation, but candidate assembly and M1 remain blocked. No staging, commit, push,
freeze, deployment, publication, setting write, migration, backfill, scheduler activation, or
production action occurred.

### Git and scope truth

- Branch/upstream: `development` / `origin/development`.
- `HEAD` = `origin/development` = `a76d8be218571e1260bdb983f86ee5cf86563e1b` (`0` ahead / `0` behind).
- `origin/production` = `36165096f09bef6817adb5b11d496dbb1502b34b`.
- Evidence-snapshot status inventory: **231 paths** = **125 tracked modifications + 106 untracked
  files**. Mandatory post-M0 state/handoff synchronization subsequently made the live tree **232**
  paths = **126 tracked + 106 untracked**; that additional path is documentation-only and is not
  silently folded into the evidence digest below.
- Sorted status-path SHA-256 (UTF-8, LF-separated, final LF):
  `f244839eededa736574b86303ae1f65127165c41875bee2022b68986eecc0626`.
- Categories: Portal 27; Studio 34; Functions 32; shared 36; Firestore/Storage/indexes 3;
  Firebase tests 4; workflow docs 78; permanent docs 6; handoff docs 9; workflow state 1; other 1.

The six children completed after the prior 111-path packet all have terminal evidence: Portal Staff
Artwork projection (umbrella Signoff for base/population/visibility/image-title-DPI amendments),
Assisted final-artwork-ready email, Assisted progress/re-add, Assisted retention sentinel, Portal
post-queue/nudge, and Assisted multi-proof selection. Earlier Plan/Review status text is historical
and is superseded by the terminal Signoffs.

### Regenerated deployment-input evidence

| Surface | Current result |
|---|---|
| Function exports | 186 current / 120 production-source; 67 additions and 1 removal |
| Function closure | 530 unique local paths; digest `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc` |
| Function actions | ADD 54; UPDATE 110; RETAIN LIVE VERSION 3; EXCLUDE 10; NO ACTION 9 |
| Maintenance guards | 32 customer-mutation callable modules plus the trusted resolver |
| Firestore Rules | 3,127 lines; `35f6567cfd21268c65f7ebc53310065e60faa90540d5de15c39b7c7afceed459` |
| Storage Rules | 345 lines; `f35c049fe4991e05dd73a8e6b2165ee3d24874ee3a081599894ee979abba1795` |
| Index union | 95 definitions = 77 retained + 18 additive; 3 field overrides; zero deletions/replacements |
| Portal build inputs | 388 app + 345 shared + 9 show-picker + 5 common = 747; digest `cf8c36d25807fa1195744a9952b1e65d3e923fbaabd6e4df25ab72025db62f2a` |
| Studio build inputs | 786 app + 345 shared + 9 show-picker + 5 common = 1,145; digest `bc72d879dd17beca0bc85c83de7526c0eda16ebb27fc19b2eec0c0853ae09aea` |

The Function audit was corrected to compare the full `origin/production` → current worktree source
delta, including committed development work and the dirty overlay. The prior dirty-overlay-only
method undercounted production-existing updates. The Portal/Studio build-input audit now includes
public assets, the direct `@fresh-prints/show-picker` workspace dependency, and, for Studio,
Electron and packaging scripts; prior counts omitted release inputs.

### Explicit exclusions and open blockers

The ten Function exclusions remain `upsertDevFixtureShow`, `inventoryCatalogImageStorage`,
`testAiEnrichmentPlayground`, `testAiEnrichmentSemanticReviewPlayground`,
`wipeOperationalTestData`, `ownerDeleteUser`, `previewHardDeleteCustomerAccount`,
`hardDeleteCustomerAccount`, `rebuildTaxonomyMaterialization`, and
`backfillPrintRequestQueueTab`. The removed production-source export is
`testAiEnrichmentTagRerank`; it is not live, and no production deletion is authorized.

M0 stops on two scope decisions:

1. The zero-byte untracked root file `{console.error(e)` is absent from every reviewed Plan/Review/
   Signoff. It is preserved and excluded; the owner must authorize deletion or provide another
   disposition before a clean candidate can exist.
2. `studio-permission-two-ask-activity-excluded-handoff` has an accepted Plan/Review and automated
   coverage inside the 2026-09-11 umbrella test report, but no goal-specific terminal Signoff. The
   owner must either accept it under the umbrella `customer-upload-studio-deferral-personal-library-
   portal-inline-remove` Signoff or require a separate closure review.

M0 also found four release-plan blockers that require an amended parent Plan and Formal Review:

3. The approved M5→M9 ordering is incompatible with the new `portalPrintRequestItems` projection
   cutover: final Rules deny legacy raw customer reads, while the production Portal still uses them.
   A reviewed transitional dual-read sequence (projection Functions → bounded population/verify →
   Portal → final Rules tightening, with maintenance/rollback gates) is required.
4. The only checked-in projection population runner is DEV-hardcoded. A production-safe dry-run/
   apply/verify runner and bounded rollback/repair evidence must be reviewed before freeze.
5. Studio still reports version `1.0.9`, which is already the rollback release and is enforced by the
   release workflow. The owner must select the next version before the candidate can freeze.
6. `SECURITY.md`, `FIREBASE.md`, and the risk register must be synchronized to the accepted enriched
   Staff Artwork projection and its known-ID preview/thumbnail residual risk before M1.

State/handoff drift discovered during this rerun is corrected in the same pass: the sentinel and
multi-proof children are closed, and the parent is now the active goal. This synchronization is
documentation-only and does not clear the two blockers above.

### Exact next checkpoint

**STOP before candidate assembly and M1.** Request owner disposition of the unexplained file, the
two-ask umbrella closure, the projection cutover amendment, and the next Studio version. Only after
an amended parent Plan/Formal Review and those decisions may the workflow request a separately
explicit authorization to stage the reviewed candidate path set, commit once on `development`, push
only `origin/development`, verify a clean immutable SHA, and regenerate all manifests at that SHA.
M1 freeze, M2+, production, maintenance activation, data operations, and publication remain forbidden.

## Authoritative post-Staff-Artwork reconciliation — 2026-09-12

This section supersedes the older snapshots below for the current parent continuation. It is a
read-only M0 packet. No staging, commit, push, candidate freeze, deployment, publication, setting
write, migration, backfill, scheduler activation, or production action occurred.

### 1. Git truth

- Branch: `development`; upstream: `origin/development`.
- `HEAD` = `origin/development` = `a76d8be218571e1260bdb983f86ee5cf86563e1b`.
- `origin/production` = `36165096f09bef6817adb5b11d496dbb1502b34b`.
- Divergence: `0 ahead / 0 behind`; the worktree is dirty.
- Expanded status inventory: **111 paths** (**85 tracked modifications + 26 untracked files**).
- Sorted status-path SHA-256: `0404c2917d8c07c5f3815077da2c100c02017cffc52ead9977db331c518bcef6`.

The earlier candidate SHA `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` is stale and is not reused.

### 2. Signed-off child inventory

The parent scope carries forward all accepted, signed-off work already represented in the development
tip, and adds the fully tested Staff Artwork child:

1. Production maintenance-mode prerequisite and corrective work — `approved_with_notes`; included
   as the required safety layer, not as a standalone production release.
2. Studio hard-delete production UI gate — `approved_with_notes`; the two destructive backend
   exports remain excluded.
3. Customer-upload catalog-permission follow-up — `approved_with_notes`; Owner DEV QA PASS.
4. Customer-upload Studio deferral, personal library, gallery re-add, and Portal inline remove —
   `approved_with_notes`; Owner DEV QA PASS; retention scheduler remains paused.
5. Studio Staff Artwork library and Print Request source — `approved_with_notes`; Owner DEV QA PASS
   on 2026-09-12, including all post-QA corrective requirements (PNG-only, Auto/Light/Dark handling,
   deletion release, queue/allocation fallback, catalog create Rules repair, Portal/Studio parity,
   and explicit AI Review promotion).

Previously signed-off lifecycle ordering, Portal admin Show Queue, Print Request export/copy, atomic
AI reprocess, legacy-tag/Smart Profile search, and related polish remain carried-forward baseline
scope in `HEAD`. No unresolved child is silently promoted. The request-design parity Plan remains
separately excluded.

### 3. Exact candidate scope and disposition

The reviewed dirty candidate path set is the **111-path** expanded status inventory above. Category
counts are: Portal 8, Studio 31, Functions 14, shared 21, Rules/indexes 3, docs/workflow 21,
handoff/state 10, and other workspace files 3. Runtime/build manifests are whole-resource inputs;
validation tests and workflow documents are evidence only. There are no unexplained status paths.

The candidate is not frozen. The eventual reviewed commit must stage an explicit path list, never a
wildcard. The current status-path digest and the complete `git status --porcelain=v1
--untracked-files=all` output are the mechanical exact-set references for that review.

### 4. Function export actions

The complete action lists and reproducible audit are in
`2026-09-10-coordinated-production-function-closure.md` and its updated read-only audit script:

| Action | Count |
|---|---:|
| `ADD` | 51 |
| `UPDATE` | 30 |
| `RETAIN LIVE VERSION` | 83 |
| `EXCLUDE` | 10 |
| `NO ACTION` | 9 |

The six Staff Artwork callables are `ADD`; the two hard-delete exports are `EXCLUDE`. No allowlist
or deployment command was executed.

### 5. Function transitive closure

Current exports: **183**; production-source exports: **120**; unique local closure paths: **523**;
sorted closure-path SHA-256:
`a5feabf0e4e02e954e520758706f3ff833b32cf1cee6a0f4303b77540f4be715`.
The audit uses 31 changed runtime source paths; four changed tests remain validation-only.

### 6. Maintenance guard manifest

There are **31 guarded customer-mutation callable modules** using
`assertPortalMaintenanceAllowsCustomerMutation`. The trusted resolver is
`functions/src/lib/portalMaintenance.ts`; absent or validated-OFF maintenance permits normal
mutation, enabled maintenance blocks ordinary customers, and the configured eligible tester keeps
the reviewed exception. Staff/admin Staff Artwork management callables do not bypass customer
maintenance because they are not customer mutation paths. The complete module list is recorded in
the M0 evidence below and was mechanically checked with `rg`:

`addPortalCatalogDesignToPrintRequest.ts`, `assistedCreationRequests.ts`,
`attachExistingCustomerUploadsToPrintRequest.ts`, `clearCustomerNotificationHistory.ts`,
`clearPortalWorkingPrintRequest.ts`, `completeEtsyRecommendationRequest.ts`,
`confirmCustomerUploadsAndAttachToRequest.ts`, `confirmCustomerUploadsForDonation.ts`,
`createCustomerUploadBatch.ts`, `createPortalPrintRequest.ts`,
`customerAddAssistedApprovedProofToPrintRequest.ts`, `deleteEligibleCustomerUpload.ts`,
`duplicatePortalPrintRequestItem.ts`, `etsySuggestionRequests.ts`, `finalizeCustomerUpload.ts`,
`finalizeCustomerUploadZip.ts`, `queuePortalPrintRequestToShow.ts`,
`recordCustomerUploadHalftoneResponse.ts`, `registerCustomer.ts`, `registerWebPushSubscription.ts`,
`removePortalPrintRequestItem.ts`, `requestPortalAccountDeletion.ts`,
`respondToCustomerUploadCatalogPermissionFollowUp.ts`, `searchEtsyRecommendations.ts`,
`setPrintRequestItemArtworkEnhanceMode.ts`, `submitEtsyRecommendationRequest.ts`,
`submitPortalDesignIssueReport.ts`, `syncPortalAccountEmail.ts`,
`unqueuePortalPrintRequestFromShow.ts`, `updatePortalCustomerProfile.ts`,
`updatePortalPrintRequestItemQuantity.ts`.

### 7. Firestore/Storage Rules hashes

| File | Production SHA-256 | Current SHA-256 | Lines |
|---|---|---|---:|
| `firestore.rules` | `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad` | `3d1da896e731de9de9f1bf6aae6d3991bf7b4de718d719618613e4a2c618f28c` | 3,128 |
| `storage.rules` | `39f17c0fbc25435eac4355ec2b5977a1aaecf3b340619b3d5f0b6d4ae22a3a36` | `2fac70564dd6ac208c138950988c67692787855e70b140eb1392f3c7226dd28b` | 341 |

Whole-file Rules resources include the accumulated accepted scope plus Staff Artwork private access,
canonical Storage paths, source-specific validation, and the lean create validators. No deploy or
production Rules operation occurred.

### 8. Additive-only index union

Current indexes: 94; production baseline: 77; additive entries: 17; deletions/replacements: **0**;
field overrides: 3. The exact canonical union SHA-256 is
`40c69c94e42062ce42e4a0d1928214aec4b37612b6d23cf3403ec45bbc02ebf5`. The legacy
`designs(status ASC, updatedAt ASC)` index is restored, so the `__name__` variant is additive. No
index deploy or `--force` operation occurred.

### 9. Portal and Studio build-input manifests

| Surface | Runtime/build files | Digest | Rollback |
|---|---:|---|---|
| Portal | 725 (379 app + 342 shared + 4 common) | `d17fc13606a1357abb7bbeeeecfb546b575d25c35717e835087e3fdafabdbe46` | Portal build-003 |
| Studio | 1,019 (673 app + 342 shared + 4 common) | `676bf86df0d4c048fd9b5fdb642c63d4bb23950e6ddc494d3a3b342d73f81312` | Studio v1.0.9 |

The manifests exclude tests, local env values, dependency/build/release/generated output, and logs.
No App Hosting build or Studio publication occurred.

### 10. Shared third-source audit

The read-only `rg` audit found Staff Artwork/source references in **51 files**, including Portal
customer-safe projections, Studio library/picker/request/queue/export surfaces, Functions upload/
finalize/CRUD/promotion plus queue/allocate/copy/convert/enhance/export/gang-sheet/history paths,
shared source identity/types/aggregates/resolvers, Firestore/Storage Rules, and indexes. Legacy
missing `sourceType` resolution is centralized with explicit `staff_artwork` ID validation and no
unresolved fallback branch was found. Private Staff Artwork identity/title/raw paths do not cross
the Portal customer boundary.

### 11. Configuration and data disposition

Maintenance remains absent/OFF; AI autonomy is OFF/shadow; Pass 2 is parked; Algolia and Smart
Profile operations remain conditional; Auth/secrets/config are unchanged; hard-delete, merge, wipe,
physical cleanup, and customer data rewrites remain excluded. No production setting was initialized.

### 12. Scheduler disposition

`purgeExpiredCustomerUploadCatalogRetentionScheduled` is an ADD for later review but remains paused
and uninvoked. No retention, catalog, Algolia, Smart Profile, lifecycle, or maintenance scheduler
was activated. Existing scheduled exports not required by this candidate remain retain/no-action or
conditional.

### 13. Backfill and migration disposition

No Staff Artwork migration/backfill, queueTab backfill, lifecycle mirror backfill, customer-upload
rewrite, Auth/identity merge, hard-delete, cleanup, or production data operation occurred.

### 14. Test and QA evidence

- Owner DEV QA: **PASS**, 2026-09-12; child Signoff `approved_with_notes`.
- Staff Artwork source-focused contracts: **31/31 PASS**.
- Staff Artwork/catalog-create emulator Rules suites: **11/11 PASS**.
- Prior Staff Artwork focused suite: **22/22 PASS**.
- Functions build, Portal typecheck, targeted lint, and `git diff --check`: **PASS**.
- Repository-wide Rules command: known legacy/heavy expression-budget baseline remains; do not claim
  a current full-suite pass. Studio full typecheck/build retain unrelated baseline diagnostics.

### 15. Baseline watches and release risks

Watch the known Firestore expression-budget failure on legacy/heavy request paths, unrelated Studio
TypeScript/build diagnostics, and the Windows Portal `.next/trace` build baseline. These are recorded
risks, not silently waived. M3/RC validation has not been run.

### 16. Candidate path count and integrity

The exact current status inventory is **111 paths**: **85 tracked + 26 untracked**, with sorted path
digest `0404c2917d8c07c5f3815077da2c100c02017cffc52ead9977db331c518bcef6`. The packet does not stage
or mutate any path.

### 17. Explicit exclusions

The unchanged `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md`
is explicitly excluded pending separate review. The ten Function exclusions, hard-delete backend
exports, all ignored local env/secrets/build/log paths, production setting initialization, scheduler
activation, migrations/backfills, and all production actions are also excluded. The ignored-file audit
found 29 local/generated paths; no secret contents were read or copied.

### 18. Production and publication boundary

Production remains untouched. No Rules/Storage/index deployment, Functions deploy, App Hosting build,
Studio publication, merge, maintenance activation, or data operation occurred. DEV deployment and
Owner QA evidence are child evidence only and do not authorize production.

### 19. Required next action after owner review

If the owner authorizes the reviewed path set, stage only the explicit reviewed paths, run cached
diff hygiene, create one coordinated development commit, push only `origin/development`, verify the
new immutable SHA/upstream equality, and regenerate every manifest at that SHA. This step is not
authorized by the current state and is not being performed now.

### 20. Portal boundary audit and exact next action — STOP HERE

The required pre-commit Portal audit found **Outcome B**. The current Portal source violates the
approved neutral no-image contract by reading `staffArtworks`, carrying `staffArtworkId` and private
summary fields, resolving preview/thumbnail Storage URLs, rendering Staff Artwork images/titles,
showing DPI, and constructing `/staff-artwork/{id}/preview.webp` in the Current Request drawer. The
authoritative details and line-level evidence are in the boundary-audit section of the Portal
build-input manifest. No runtime code was changed in this audit.

**STOP candidate assembly. Do not request or perform `OWNER AUTHORIZE REVIEWED POST-STAFF-ARTWORK
COORDINATED CANDIDATE COMMIT/PUSH`.**

Required next step is a FreshForge corrective child for the Portal neutral projection. Its smallest
reviewed scope must retain only a neutral Staff Artwork label, quantity, requested size, and minimum
request state; remove all Portal `staffArtworks` reads and `/staff-artwork/...` Storage resolution;
strip Staff Artwork ID/title/private metadata from Portal DTO/state; and preserve server-side size
validation without exposing private artwork data. Return to parent M0 only after corrective Plan →
Review → Implement → Test → Signoff. M1 freeze, Rules/Storage/index deployment, Portal/Studio
publication, maintenance activation, migration/backfill, and production remain forbidden.

## Rerun — customer-upload follow-up child signed off (2026-09-10)

This section is the authoritative current M0 preparation. The pre-child sections below are retained
as historical evidence and are not a candidate disposition.

| Field | Current rerun result |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Child | `customer-upload-follow-up-catalog-permission` — Signoff `approved_with_notes` |
| Snapshot | `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`; `origin/development` same |
| Production baseline | `origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b`; untouched |
| Working-tree inventory | **59** status entries: **43 tracked**, **16 untracked** |
| Candidate SHA | None; prior `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` is stale and must not be reused |
| Freeze / deploy | Not executed; no production, DEV, hosting, Rules, Storage, index, setting, or data action |

### Complete current inventory and disposition

Every status entry from `git status --short --untracked-files=all` is classified below. Ignored
local environment/build/emulator material is not a status entry and remains excluded; no secret
value was read or staged.

**Included coordinated-candidate runtime (28):**

- Portal (7): `apps/portal/app/(app)/requests/artwork/page.tsx`; `apps/portal/features/auth/components/PortalLoginMaintenanceNotice.tsx`; `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx`; `apps/portal/features/navigation/components/PortalAppShell.tsx`; `apps/portal/features/notifications/services/customerNotificationsService.ts`; `apps/portal/styles/customer-uploads.css`; `apps/portal/features/customer-uploads/components/CustomerUploadCatalogPermissionFollowUpModal.tsx`.
- Studio (4): `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`; `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`; `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`; `apps/studio/src/renderer/src/styles/layout.css`.
- Functions (11): `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`; `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`; `functions/src/excludeCustomerUploadFromCatalog.ts`; `functions/src/getPortalMaintenanceState.ts`; `functions/src/index.ts`; `functions/src/lib/customerNotifications/createCustomerNotification.ts`; `functions/src/lib/customerUploadCatalogConfirmation.ts`; `functions/src/restoreCustomerUploadCatalogEligibility.ts`; `functions/src/getCustomerUploadCatalogPermissionFollowUp.ts`; `functions/src/requestCustomerUploadCatalogPermissionFollowUp.ts`; `functions/src/respondToCustomerUploadCatalogPermissionFollowUp.ts`.
- Shared (6): `packages/shared/src/types/customerNotifications/customerNotifications.types.ts`; `packages/shared/src/types/customerUpload/customerUpload.enums.ts`; `packages/shared/src/types/customerUpload/customerUpload.types.ts`; `packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types.ts`; `packages/shared/src/utils/customerNotifications.ts`; `packages/shared/src/utils/customerUploadCatalogIntakeEligibility.ts`.

**Validation-only (7):** `docs/workflow/reviews/2026-09-10-coordinated-production-function-closure-audit.mjs`; `functions/src/lib/customerUploadCatalogConfirmation.test.ts`; `packages/shared/src/utils/customerNotifications.test.ts`; `packages/shared/src/utils/customerUploadCatalogIntakeEligibility.test.ts`; `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.test.ts`; `tests/portalMaintenance.contract.test.ts`; `tests/customerUploadCatalogPermission.contract.test.ts`.

**Documentation/workflow (23):** `.cursor/workflow/state.md`; `references/project-chatgpt-handoff/CURRENT-STATE.md`; `docs/architecture/BACKEND.md`; `docs/architecture/DATA_MODEL.md`; `docs/project/DECISIONS.md`; `docs/workflow/plans/2026-09-10-customer-upload-follow-up-catalog-permission-plan.md`; `docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-candidate-preparation.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-config-data-disposition.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-index-union.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-portal-build-input-manifest.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-rules-manifest.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-studio-build-input-manifest.md`; the four customer-upload child review/implementation/test/signoff artifacts; and the three Portal-maintenance public-read review/test/signoff artifacts.

**Separately reviewable (1):** `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md` — explicitly excluded from this candidate.

No current status entry is silently discarded, deferred, or treated as unrelated runtime. The
previous hard-delete and maintenance runtime remain included through their already reviewed paths;
the parity plan remains outside the candidate.

### Prepared candidate assembly path set (not staged)

If the owner authorizes a new post-child candidate commit, the exact status-path set prepared for
staging is the **58 paths above**: all 28 included runtime paths, all 7 validation/evidence paths,
and these 23 workflow/state paths:

`.cursor/workflow/state.md`; `references/project-chatgpt-handoff/CURRENT-STATE.md`;
`docs/architecture/BACKEND.md`; `docs/architecture/DATA_MODEL.md`; `docs/project/DECISIONS.md`;
`docs/workflow/plans/2026-09-10-customer-upload-follow-up-catalog-permission-plan.md`;
`docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-implementation-review.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-review.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-signoff.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-test-report.md`;
`docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-review.md`;
`docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-signoff.md`;
`docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-test-report.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-preparation.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-config-data-disposition.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-index-union.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-portal-build-input-manifest.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-rules-manifest.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-studio-build-input-manifest.md`.

The modified closure-audit script is validation evidence in this set, not production runtime. The
only status path intentionally omitted is
`docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md`,
which remains separately reviewable. No staging, commit, push, or cleanup has occurred.

### Child inclusion and regenerated M0 evidence

- **Function closure:** 173 current exports, 120 production exports, 54 additions and 1 removal;
  513 unique local closure paths; digest
  `32cce483f02b8d69d2fcb1e7b98daf544f33095a977cb0d80cfa161c5e7dfb1e`. Action counts: ADD 41,
  UPDATE 47, RETAIN LIVE VERSION 66, EXCLUDE 10, NO ACTION 9. The three child exports are ADD;
  the response callable closure includes the Portal maintenance mutation guard; the read callable is
  owner-scoped and safe. DEV/test/source-only exports remain excluded/deferred, and no broad deploy
  is implied. Full artifact: `2026-09-10-coordinated-production-function-closure.md`.
- **Maintenance guard inventory:** 29 customer-mutation callable modules are guarded, including
  `respondToCustomerUploadCatalogPermissionFollowUp`, plus the shared trusted resolver in
  `functions/src/lib/portalMaintenance.ts`. Missing maintenance state remains OFF/allowed; ON
  blocks ordinary customer response mutation while the configured tester retains the signed-off
  exception. The complete list was mechanically checked with `rg` and the contract test.
- **Rules / Storage:** Firestore candidate `7c9c4a0026c4655ddedb606c043429dbf04d7a4cfe7c02a7af61ee002140612b` (production baseline `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad`); Storage candidate `d3260351cbf12e550dd3e5e89a1e217dc4b9a0c4e2d819221d6ec8fc5d946297` (production baseline `39f17c0fbc25435eac4355ec2b5977a1aaecf3b340619b3d5f0b6d4ae22a3a36`). Whole-file hashes are unchanged from the reviewed packet; no child Rules/Storage change, bypass, or hard-delete rule was found.
- **Indexes:** exact union remains **87** (77 production + 10 reviewed additions), with zero deletion/replacement and no child-specific index. Reviewed union digest remains `f95a9e68086203a1863a54911c812ae9b2acb73346253ab6f3b28a0081998a20`; current raw hash `6355ca54ce0c282cb6c19987a9c05c5acf8f0c0f259060f1c000c121b91f5ced`, production raw hash `8ede15025538dd4d8c96da28a24b6a8581e7425e75063632bca75b229713dcfa`.
- **Portal:** child Alert/deep-link/modal/service/CSS paths are included; only the opaque token is
  carried in `permissionRequest`, with no upload ID or Storage path/URL in URL or DTO. Existing
  Alerts remain compatible; rollback is Portal build-003. No build or publication occurred. The
  existing `.next/trace` EPERM remains an environment lock, not a pass.
- **Studio:** child Excluded reason/follow-up action, service/hook, query validation, and styling
  are included; the shared hard-delete UI gate remains production-hidden and both hard-delete
  Functions remain EXCLUDE. Rollback is Studio v1.0.9. Vite build and child focused evidence carry
  forward; unrelated Studio typecheck baseline remains documented.
- **Config/data:** maintenance document remains absent/OFF; AI autonomy and Pass 2 remain OFF;
  queueTab and lifecycle backfills remain deferred/conditional; Algolia and Smart Profile remain
  conditional; no child upload migration/backfill, Auth change, secret rotation, standard-size
  reset, production write, maintenance activation, or overnight backfill scheduling occurred.
- **Validation carried forward:** child focused tests **36/36 PASS**, maintenance contracts **9/9
  PASS**, Functions build **PASS**, Portal typecheck **PASS**, targeted ESLint **PASS**, and
  `git diff --check` **PASS**. This is M0 preparation evidence only; final RC/M3 was not run.
- **Hard-delete audit:** `functions/src/index.ts` retains both DEV exports, while neither appears in
  `origin/production:functions/src/index.ts`; both are EXCLUDE in the closure and no production UI
  path exposes them.

### M0 boundary and next owner checkpoint

M0 read-only reconciliation is complete at the dirty snapshot. A new candidate commit/push is not
authorized by the current state, and the previous candidate SHA is stale. Do not stage, commit,
push, freeze, deploy, publish, activate maintenance, run backfills, or mutate production in this
turn. The next exact owner checkpoint is:

> **OWNER AUTHORIZE REVIEWED POST-CHILD CANDIDATE COMMIT/PUSH** — authorize staging only the
> reviewed coordinated-candidate path set from this rerun, creating one new `development` commit
> with message `chore(release): assemble coordinated production candidate`, pushing only
> `origin/development`, and regenerating immutable manifests at the resulting SHA. This does not
> authorize M1 freeze, production deployment, Rules/Storage/index operations, hosting or Studio
> publication, maintenance activation, data operations/backfills, or merge to production.

STOP at this checkpoint. Do not present `FREEZE MAIN CANDIDATE SHA <SHA>` until a clean new SHA and
all regenerated manifests exist.

## Historical pre-child snapshot (retained for audit trail)

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Snapshot | `development` at `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa`; `origin/development` same; dirty |
| Production baseline | `origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b`; untouched |
| Current status | **M0 reconciliation complete at dirty snapshot; blocked before M1 candidate freeze** |
| Current worktree | 115 status entries: 59 tracked, 56 untracked; no secret-named status path found |
| Child status | `studio-hard-delete-production-ui-gate` Signoff `approved_with_notes` |
| Freeze | Not executed; no candidate SHA exists |

## 1. Complete runtime/config/package disposition

The current status inventory is mechanically classified below. No path is silently discarded. The
original 100-entry inventory and historical evidence remain in
`2026-09-10-coordinated-production-candidate-preparation.md`; the six new reconciliation manifests
and this report account for the current 115-entry snapshot.

The ignored-file audit found local environment files (`apps/portal/.env.local`, `apps/studio/.env.local`,
`functions/.env.fresh-prints-dev`, `functions/.env.fresh-prints-prod`), dependency/build directories,
and emulator/debug logs. They are explicitly excluded from the candidate; no secret value was read,
printed, staged, or copied into the manifests.

| Surface | Include/review as candidate runtime | Validation-only / docs-only / excluded |
|---|---|---|
| Portal (18 status paths) | 17 runtime paths: login page; providers; `PortalAdminAuthGate`; CompleteProfile/Login/Register; AuthProvider; PortalAppShell/HeaderActions/Sidebar; shell and admin Show Queue CSS; `PortalLoginMaintenanceNotice`; four maintenance context/service/experience/banner paths. Exact source and secret boundary: `2026-09-10-coordinated-production-portal-build-input-manifest.md`. | `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` is validation-only. Request-design parity Plan remains separate and excluded. |
| Studio (8 status paths) | Six runtime paths: SettingsPage, settings CSS, PortalMaintenanceSettingsSection, settings hook/service, and `CustomerDirectoryTable` hard-delete gate. Existing `operationalWipeUiGate.ts` is clean source retained as a DEV-only dependency. Exact build boundary: `2026-09-10-coordinated-production-studio-build-input-manifest.md`. | Two contract tests are validation-only. Hard-delete backend/dialog source remains retained but both hard-delete Functions are excluded. |
| Functions (35 status paths) | 32 changed runtime source paths (28 customer guard files plus `getPortalMaintenanceState`, `updatePortalMaintenanceState`, `listPortalMaintenanceTestCustomers`, and `lib/portalMaintenance.ts`); `functions/src/index.ts` is the changed export registry. Exact transitive closure and every export action are in `2026-09-10-coordinated-production-function-closure.md`, reproducible with its read-only `...function-closure-audit.mjs` script. | Two resolver integration/unit tests are validation-only. Explicit source-only/destructive/DEV exports are `EXCLUDE`; deferred catalog/Smart Profile playground exports are `NO ACTION`. |
| Shared (2 status paths) | `packages/shared/src/constants/portal/portalMaintenance.constants.ts` | Its contract test is validation-only. Other shared modules are included only when reached by the Function/Portal/Studio closure. |
| Firebase policy | Whole-file `firestore.rules` and `storage.rules`, with maintenance resolver/guards and the reviewed accumulated candidate drift | `tests/firebase/portalMaintenance.rules.test.ts` and `tests/portalMaintenance.contract.test.ts` are validation-only; no Rules deploy occurred. Exact hashes/map: `2026-09-10-coordinated-production-rules-manifest.md`. |
| Indexes | Proposed logical union = all 77 production definitions + 10 additions = 87; the legacy `designs(status ASC, updatedAt ASC)` definition is explicitly restored | No index deploy or data operation occurred. Exact union: `2026-09-10-coordinated-production-index-union.md`. |
| Package/build/config | Root `package.json` changed only for the Rules test command (validation-only); revalidate root `package-lock.json`, `firebase.json`, `.firebaserc`, `functions/package.json`, `functions/package-lock.json`, `functions/tsconfig.json`, `packages/shared/package.json`, Portal `package.json`/`next.config.ts`/`tsconfig.json`/`apphosting.yaml`, Studio `package.json`/`vite.config.ts`/`tsconfig.json`/`tsconfig.node.json`/`electron-builder.json5`, and generated build config at the clean SHA | No secret values, local env files, build output, release output, or debug logs are candidate inputs. |
| Documentation/state | `.cursor/workflow/state.md`, permanent docs, handoff docs, accepted Plans/Reviews/Signoff, historical maintenance evidence, the Portal admin signoff, M0 report, and the exact M1 proposal are retained as docs/evidence | The request-design parity Plan is explicitly excluded for separate review. Documentation does not authorize runtime inclusion or deployment. |

The Portal, Studio, Functions, Rules, index, and configuration/data manifests are the authoritative
path-level dispositions for this M0 snapshot. All must be regenerated at the eventual clean SHA.

## 2. Deterministic Function closure

The closure audit found 170 current exported names versus 120 in production source, 509 unique local
closure paths, and sorted newline-terminated closure hash
`a045c0514e855a08469cffadb81b487d4f5fbfb15e5757a9a588f5b8a3720a90`.

| Action | Count |
|---|---:|
| `ADD` | 38 |
| `UPDATE` | 41 |
| `RETAIN LIVE VERSION` | 72 |
| `EXCLUDE` | 10 |
| `NO ACTION` | 9 |

The artifact proves the required `export → transitive import closure → changed path → action`
mapping. `previewHardDeleteCustomerAccount` and `hardDeleteCustomerAccount` are both `EXCLUDE`;
their source remains available for allowlisted DEV only. No broad deploy command was run or prepared.

## 3. Rules, index, Portal and Studio packet

- Whole-file Rules hashes and the maintenance enforcement/compatibility map are recorded in the
  Rules manifest. `rg hardDelete|previewHardDelete firestore.rules storage.rules` returns no match.
- The index union retains all 77 production definitions and adds ten current entries without
  deletion or `--force`; the current file's `__name__` variant does not replace the required legacy
  definition.
- The Portal manifest records the App Hosting root, shared/lockfile/config inputs, 13 secret names
  (names only), maintenance/admin runtime, exclusions, and rollback build-003.
- The Studio manifest records the renderer/Electron/shared/release inputs, maintenance Settings,
  `isOperationalWipeUiEnabled()` hard-delete gate, production-hidden proof, exclusions, and rollback
  v1.0.9.
- The configuration/data disposition keeps maintenance absent/OFF, AI autonomy/Pass 2 OFF, lifecycle
  and queueTab backfills conditional/deferred, and Algolia/Smart Profile/Auth/settings/secrets
  unchanged pending later gates.

## 4. Validation evidence

- `git diff --check`: **PASS** (normal CRLF conversion warnings only).
- Function closure inventory: **PASS** at the dirty snapshot; must be re-run at clean SHA.
- Index structural comparison: **PASS** for 77 baseline + 10 additions, 87-entry proposal.
- Rules/Storage whole-file map and hashes: **GENERATED**; no deploy.
- Portal/Studio build-input manifests: **GENERATED**; no build/publication in this M0 step.
- Hard-delete exclusion audit: **PASS** — both current exports exist in DEV source and neither exists in
  `origin/production:functions/src/index.ts`; child UI contracts and build evidence remain recorded.
- Child focused contracts: **12/12 PASS**; targeted ESLint **PASS**; Studio Vite build **PASS**;
  repo-wide Studio typecheck retains its documented unrelated baseline. Parent M3/RC validation was
  not run and is not claimed.

## 5. Clean candidate boundary and owner checkpoint

The worktree is intentionally preserved and remains dirty. Creating one clean committed development
candidate requires an owner checkpoint because current FreshForge state forbids commit/push and the
115 status entries include prior user work, accepted child source, and untracked evidence. Do not use
`git reset`, `git checkout`, `git clean`, `git add .`, or `git add -A` to make it appear clean.

Exact prepared action after owner authorization:

1. Review the complete `git status --short --untracked-files=all` inventory and this disposition;
   explicitly approve the reviewed path set (including the new manifests) and any paths to retain
   outside the candidate.
2. Stage only that explicit path list with `git add -- <reviewed paths>`; run `git diff --cached --check`.
3. Commit with `chore(release): assemble coordinated production candidate` on `development`.
4. Push only to `origin/development` with `git push origin development`.
5. Verify `git status --short`, `git rev-parse HEAD`, `git rev-parse @{u}`, and
   `git merge-base --is-ancestor HEAD @{u}`; regenerate every manifest at the resulting SHA.

This action is **prepared, not executed**. It requires the owner decision
`OWNER AUTHORIZE REVIEWED CANDIDATE COMMIT/PUSH` and does not authorize a production deploy,
publication, maintenance activation, or M1 freeze.

## 6. M0 result and exact next checkpoint

M0 runtime reconciliation is complete at the dirty snapshot, but M0 is **not complete for freeze**:
the clean committed candidate SHA and its regenerated immutable manifests do not yet exist. No
`FREEZE MAIN CANDIDATE SHA <SHA>` decision is requested or implied here.

**Next parent checkpoint:** owner reviews this packet and authorizes the explicit reviewed
commit/push (or supplies dispositions that reduce the path set). After the clean SHA is verified,
regenerate the six manifests (and re-run the read-only closure audit script) and present the exact M1 proposal at
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`. Stop there
for the owner’s explicit freeze decision. Do not proceed to M2/M3, deploy, publish, mutate data,
activate maintenance, or perform Owner QA on the owner’s behalf.
