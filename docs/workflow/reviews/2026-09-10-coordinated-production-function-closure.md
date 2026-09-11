# Coordinated Production Function Closure Manifest

Status: read-only M0 reconciliation artifact; no Functions deployment was executed and no production allowlist is authorized by this document.

Snapshot: current `development` working tree at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` (dirty; `origin/development` same); production baseline `origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b`. This is a read-only rerun after the signed-off `customer-upload-follow-up-catalog-permission` child; the dirty snapshot is not a candidate SHA.

Method: parse every named export in `functions/src/index.ts`; resolve each export module; recursively follow local relative imports and `@fresh-prints/shared` imports; union and sort all local closure paths. A changed-path hit marks an export `UPDATE`. Export names absent from the production index are `ADD`; existing names with no changed closure hit are `RETAIN LIVE VERSION`; explicit source-only/deferred names are `EXCLUDE` or `NO ACTION`.

Reproducible read-only audit: `node docs/workflow/reviews/2026-09-10-coordinated-production-function-closure-audit.mjs --summary` (omit `--summary` for the complete JSON row table). The script performs no writes or deployments.

Current exports: **173**; production exports: **120**; current-to-production delta: **54 additions and 1 removal**. Unique local closure paths: **513**. Sorted closure-path SHA-256 (newline-terminated): `32cce483f02b8d69d2fcb1e7b98daf544f33095a977cb0d80cfa161c5e7dfb1e`.

The closure is source-only by design; the Function build also requires `functions/package.json`,
`functions/package-lock.json`, `functions/tsconfig.json`, and the workspace/shared package metadata.
These package/config inputs are dispositioned in the parent M0 reconciliation and are revalidated at
the clean candidate SHA.

## Changed runtime paths

| ID | Path |
|---|---|
| F01 | `functions/src/addPortalCatalogDesignToPrintRequest.ts` |
| F02 | `functions/src/assistedCreationRequests.ts` |
| F03 | `functions/src/clearPortalWorkingPrintRequest.ts` |
| F04 | `functions/src/completeEtsyRecommendationRequest.ts` |
| F05 | `functions/src/confirmCustomerUploadsAndAttachToRequest.ts` |
| F06 | `functions/src/confirmCustomerUploadsForDonation.ts` |
| F07 | `functions/src/createCustomerUploadBatch.ts` |
| F08 | `functions/src/createPortalPrintRequest.ts` |
| F09 | `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` |
| F10 | `functions/src/deleteEligibleCustomerUpload.ts` |
| F11 | `functions/src/duplicatePortalPrintRequestItem.ts` |
| F12 | `functions/src/etsySuggestionRequests.ts` |
| F13 | `functions/src/finalizeCustomerUpload.ts` |
| F14 | `functions/src/finalizeCustomerUploadZip.ts` |
| F15 | `functions/src/queuePortalPrintRequestToShow.ts` |
| F16 | `functions/src/recordCustomerUploadHalftoneResponse.ts` |
| F17 | `functions/src/registerCustomer.ts` |
| F18 | `functions/src/registerWebPushSubscription.ts` |
| F19 | `functions/src/removePortalPrintRequestItem.ts` |
| F20 | `functions/src/requestPortalAccountDeletion.ts` |
| F21 | `functions/src/searchEtsyRecommendations.ts` |
| F22 | `functions/src/setPrintRequestItemArtworkEnhanceMode.ts` |
| F23 | `functions/src/submitEtsyRecommendationRequest.ts` |
| F24 | `functions/src/submitPortalDesignIssueReport.ts` |
| F25 | `functions/src/syncPortalAccountEmail.ts` |
| F26 | `functions/src/unqueuePortalPrintRequestFromShow.ts` |
| F27 | `functions/src/updatePortalCustomerProfile.ts` |
| F28 | `functions/src/updatePortalPrintRequestItemQuantity.ts` |
| F29 | `functions/src/getPortalMaintenanceState.ts` |
| F30 | `functions/src/lib/portalMaintenance.ts` |
| F31 | `functions/src/listPortalMaintenanceTestCustomers.ts` |
| F32 | `functions/src/updatePortalMaintenanceState.ts` |
| F33 | `packages/shared/src/constants/portal/portalMaintenance.constants.ts` |
| F34 | `functions/src/excludeCustomerUploadFromCatalog.ts` |
| F35 | `functions/src/getCustomerUploadCatalogPermissionFollowUp.ts` |
| F36 | `functions/src/requestCustomerUploadCatalogPermissionFollowUp.ts` |
| F37 | `functions/src/respondToCustomerUploadCatalogPermissionFollowUp.ts` |
| F38 | `functions/src/restoreCustomerUploadCatalogEligibility.ts` |
| F39 | `functions/src/lib/customerNotifications/createCustomerNotification.ts` |
| F40 | `functions/src/lib/customerUploadCatalogConfirmation.ts` |
| F41 | `packages/shared/src/types/customerNotifications/customerNotifications.types.ts` |
| F42 | `packages/shared/src/types/customerUpload/customerUpload.enums.ts` |
| F43 | `packages/shared/src/types/customerUpload/customerUpload.types.ts` |
| F44 | `packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types.ts` |
| F45 | `packages/shared/src/utils/customerNotifications.ts` |
| F46 | `packages/shared/src/utils/customerUploadCatalogIntakeEligibility.ts` |

These IDs intentionally omit validation-only tests, `functions/src/index.ts`, and documentation. The source-only `etsySuggestionRequests.ts` guard is included as F12; `rebuildTaxonomyMaterializationCallable` is retained because the excluded source-only callable is the separate `rebuildTaxonomyMaterialization` export.

## Complete export → closure → changed path → action table

| Export(s) | Direct module | Local closure paths | Changed-path IDs | Action |
|---|---|---:|---|---|
| upsertDevFixtureShow | `./upsertDevFixtureShow` | 7 | — | **EXCLUDE** |
| addPortalCatalogDesignToPrintRequest | `./addPortalCatalogDesignToPrintRequest` | 39 | F01, F30, F33 | **UPDATE** |
| cleanupAbandonedCustomerUploads | `./cleanupAbandonedCustomerUploads` | 7 | — | **RETAIN LIVE VERSION** |
| archiveStaleWorkingPrintRequests | `./archiveStaleWorkingPrintRequests` | 7 | — | **RETAIN LIVE VERSION** |
| clearPortalWorkingPrintRequest | `./clearPortalWorkingPrintRequest` | 16 | F03, F30, F33 | **UPDATE** |
| confirmCustomerUploadsAndAttachToRequest | `./confirmCustomerUploadsAndAttachToRequest` | 51 | F05, F30, F33 | **UPDATE** |
| confirmCustomerUploadsForDonation | `./confirmCustomerUploadsForDonation` | 19 | F06, F30, F33 | **UPDATE** |
| createCustomerWithPortalInvite | `./createCustomerWithPortalInvite` | 21 | — | **RETAIN LIVE VERSION** |
| createCustomerUploadBatch | `./createCustomerUploadBatch` | 21 | F07, F30, F33 | **UPDATE** |
| createPortalPrintRequest | `./createPortalPrintRequest` | 20 | F08, F30, F33 | **UPDATE** |
| duplicatePortalPrintRequestItem | `./duplicatePortalPrintRequestItem` | 37 | F11, F30, F33 | **UPDATE** |
| excludeCustomerUploadFromCatalog | `./excludeCustomerUploadFromCatalog` | 8 | F34 | **UPDATE** |
| finalizeCustomerUpload | `./finalizeCustomerUpload` | 40 | F13, F30, F33 | **UPDATE** |
| finalizeCustomerUploadZip | `./finalizeCustomerUploadZip` | 42 | F14, F30, F33 | **UPDATE** |
| getCustomerUploadDailyQuota | `./getCustomerUploadDailyQuota` | 15 | — | **RETAIN LIVE VERSION** |
| inventoryCatalogImageStorage | `./inventoryCatalogImageStorage` | 8 | — | **EXCLUDE** |
| promoteCustomerUploadToAiReview | `./promoteCustomerUploadToAiReview` | 13 | F46 | **UPDATE** |
| recordCustomerUploadHalftoneResponse | `./recordCustomerUploadHalftoneResponse` | 13 | F16, F30, F33 | **UPDATE** |
| recordCustomerUploadHalftoneStaffDecision | `./recordCustomerUploadHalftoneStaffDecision` | 9 | — | **RETAIN LIVE VERSION** |
| recordCustomerUploadArtworkBackgroundStaffDecision | `./recordCustomerUploadArtworkBackgroundStaffDecision` | 9 | — | **ADD** |
| restoreCustomerUploadCatalogEligibility | `./restoreCustomerUploadCatalogEligibility` | 8 | F38 | **UPDATE** |
| retryCustomerUploadProcessing | `./retryCustomerUploadProcessing` | 31 | — | **RETAIN LIVE VERSION** |
| getPortalShowPrintProgress | `./getPortalShowPrintProgress` | 6 | — | **RETAIN LIVE VERSION** |
| getPortalPrintRequestShowSchedules | `./getPortalPrintRequestShowSchedules` | 8 | — | **RETAIN LIVE VERSION** |
| listPortalAllocatableShows | `./listPortalAllocatableShows` | 12 | — | **RETAIN LIVE VERSION** |
| listPortalPublicShows | `./listPortalPublicShows` | 14 | — | **RETAIN LIVE VERSION** |
| listPortalShowCatalogDesigns | `./listPortalShowCatalogDesigns` | 7 | — | **RETAIN LIVE VERSION** |
| queuePortalPrintRequestToShow | `./queuePortalPrintRequestToShow` | 54 | F15, F30, F33 | **UPDATE** |
| allocateStudioPrintRequestToShow | `./allocateStudioPrintRequestToShow` | 36 | — | **ADD** |
| unqueuePortalPrintRequestFromShow | `./unqueuePortalPrintRequestFromShow` | 35 | F26, F30, F33 | **ADD** |
| unqueueStudioCustomerPrintRequestFromShow | `./unqueueStudioCustomerPrintRequestFromShow` | 28 | — | **ADD** |
| completeStaffGangSheetAndOpenNext | `./completeStaffGangSheetAndOpenNext` | 17 | — | **RETAIN LIVE VERSION** |
| convertCustomerPrintRequestToInternal | `./convertCustomerPrintRequestToInternal` | 19 | — | **RETAIN LIVE VERSION** |
| copyStudioPrintRequest | `./copyStudioPrintRequest` | 9 | — | **ADD** |
| createInitialStaffGangSheet | `./createInitialStaffGangSheet` | 10 | — | **RETAIN LIVE VERSION** |
| removePortalPrintRequestItem | `./removePortalPrintRequestItem` | 16 | F19, F30, F33 | **UPDATE** |
| updatePortalPrintRequestItemQuantity | `./updatePortalPrintRequestItemQuantity` | 25 | F28, F30, F33 | **UPDATE** |
| createTeamUser | `./createTeamUser` | 16 | — | **RETAIN LIVE VERSION** |
| registerCustomer | `./registerCustomer` | 9 | F17, F30, F33 | **UPDATE** |
| updateCustomer | `./updateCustomer` | 15 | — | **RETAIN LIVE VERSION** |
| updatePortalCustomerProfile | `./updatePortalCustomerProfile` | 15 | F27, F30, F33 | **ADD** |
| updateTeamUser | `./updateTeamUser` | 8 | — | **RETAIN LIVE VERSION** |
| submitEtsyRecommendationRequest | `./submitEtsyRecommendationRequest` | 14 | F23, F30, F33 | **UPDATE** |
| searchEtsyRecommendations | `./searchEtsyRecommendations` | 21 | F21, F30, F33 | **UPDATE** |
| staffSearchEtsyRecommendationApiResults | `./staffSearchEtsyRecommendationApiResults` | 19 | — | **RETAIN LIVE VERSION** |
| getEtsyRecommendationSearchQuota | `./getEtsyRecommendationSearchQuota` | 9 | — | **RETAIN LIVE VERSION** |
| completeEtsyRecommendationRequest, cancelEtsyRecommendationRequest | `./completeEtsyRecommendationRequest` | 10 | F04, F30, F33 | **UPDATE** |
| addEtsyRecommendationSuggestion, deactivateEtsyRecommendationSuggestion | `./etsyRecommendationSuggestions` | 13 | — | **RETAIN LIVE VERSION** |
| submitEtsySuggestionRequest, approveEtsySuggestionRequest, rejectEtsySuggestionRequest | `./etsySuggestionRequests` | 17 | F12, F30, F33 | **UPDATE** |
| submitAssistedCreationRequest, cancelAssistedCreationRequest, customerUpdateAssistedCreationRequest, customerSendAssistedCreationMessage, customerRespondToAssistedCreationProof, staffSendAssistedCreationMessage, staffUpdateAssistedCreationStatus, staffAddAssistedCreationProof, staffAddAssistedCreationFinalSource, staffSuggestAssistedCreationCatalogDesign | `./assistedCreationRequests` | 44 | F02, F30, F33 | **UPDATE** |
| customerGetAssistedCreationApprovedProofDownloadUrl | `./customerGetAssistedCreationApprovedProofDownloadUrl` | 13 | — | **RETAIN LIVE VERSION** |
| customerGetAssistedCreationApprovedProofFile | `./customerGetAssistedCreationApprovedProofFile` | 13 | — | **RETAIN LIVE VERSION** |
| customerAddAssistedApprovedProofToPrintRequest | `./customerAddAssistedApprovedProofToPrintRequest` | 70 | F09, F30, F33 | **UPDATE** |
| enqueueAiEnrichment | `./enqueueAiEnrichment` | 70 | — | **RETAIN LIVE VERSION** |
| resetAiEnrichmentForProcessing | `./resetAiEnrichmentForProcessing` | 7 | — | **RETAIN LIVE VERSION** |
| reprocessReadyDesignWithAi | `./reprocessReadyDesignWithAi` | 70 | — | **ADD** |
| testAiEnrichmentPlayground | `./testAiEnrichmentPlayground` | 60 | — | **EXCLUDE** |
| testAiEnrichmentSemanticReviewPlayground | `./testAiEnrichmentSemanticReviewPlayground` | 55 | — | **EXCLUDE** |
| getAiEnrichmentTrace | `./getAiEnrichmentTrace` | 9 | — | **ADD** |
| listAiEnrichmentTraces | `./listAiEnrichmentTraces` | 9 | — | **ADD** |
| clearAiEnrichmentTraces | `./clearAiEnrichmentTraces` | 9 | — | **ADD** |
| updateAiEnrichmentSettings | `./updateAiEnrichmentSettings` | 20 | — | **RETAIN LIVE VERSION** |
| updateSemanticReviewPlaygroundSetting | `./updateSemanticReviewPlaygroundSetting` | 20 | — | **NO ACTION** |
| refreshSmartProfileVocabSnapshotCallable | `./ai/refreshSmartProfileVocabSnapshot` | 16 | — | **ADD** |
| refreshSmartProfileVocabSnapshotScheduled | `./ai/refreshSmartProfileVocabSnapshot` | 16 | — | **NO ACTION** |
| updateCatalogWorkflowMode | `./updateCatalogWorkflowMode` | 20 | — | **ADD** |
| previewCatalogReprocessJob, startCatalogReprocessJob, pauseCatalogReprocessJob, resumeCatalogReprocessJob, retryCatalogReprocessJobFailures | `./catalogReprocess/catalogReprocessCallables` | 24 | — | **NO ACTION** |
| onCatalogReprocessJobWritten | `./catalogReprocess/onCatalogReprocessJobWritten` | 76 | — | **NO ACTION** |
| updateDesignSmartProfileDimensions | `./designs/updateDesignSmartProfileDimensions` | 30 | — | **ADD** |
| resetDesignSmartProfileDimension | `./designs/resetDesignSmartProfileDimension` | 30 | — | **NO ACTION** |
| updateEmailProviderSettings | `./updateEmailProviderSettings` | 6 | — | **RETAIN LIVE VERSION** |
| updateCustomerUploadQuotaSettings | `./updateCustomerUploadQuotaSettings` | 7 | — | **RETAIN LIVE VERSION** |
| updatePrintRequestLimitSettings | `./updatePrintRequestLimitSettings` | 7 | — | **RETAIN LIVE VERSION** |
| updateCustomerPrintRequestQuotaOverride | `./updateCustomerPrintRequestQuotaOverride` | 13 | — | **ADD** |
| updateStandardPrintSizesSettings | `./updateStandardPrintSizesSettings` | 12 | — | **ADD** |
| enhancePrintRequestArtwork | `./enhancePrintRequestArtwork` | 32 | — | **ADD** |
| setPrintRequestItemArtworkEnhanceMode | `./setPrintRequestItemArtworkEnhanceMode` | 35 | F22, F30, F33 | **ADD** |
| updatePortalSocialMetaSettings | `./updatePortalSocialMetaSettings` | 11 | — | **RETAIN LIVE VERSION** |
| updatePortalHelpSettings | `./updatePortalHelpSettings` | 7 | — | **RETAIN LIVE VERSION** |
| updatePortalMaintenanceState | `./updatePortalMaintenanceState` | 7 | F30, F32, F33 | **ADD** |
| getPortalMaintenanceState | `./getPortalMaintenanceState` | 5 | F29, F30, F33 | **ADD** |
| listPortalMaintenanceTestCustomers | `./listPortalMaintenanceTestCustomers` | 7 | F30, F31, F33 | **ADD** |
| requestCustomerUploadCatalogPermissionFollowUp | `./requestCustomerUploadCatalogPermissionFollowUp` | 13 | F36, F39, F41, F42, F44, F45 | **ADD** |
| getCustomerUploadCatalogPermissionFollowUp | `./getCustomerUploadCatalogPermissionFollowUp` | 8 | F35, F42, F44 | **ADD** |
| respondToCustomerUploadCatalogPermissionFollowUp | `./respondToCustomerUploadCatalogPermissionFollowUp` | 9 | F30, F33, F37, F42, F44 | **ADD** |
| getPortalAdminDailyShowQueue | `./getPortalAdminDailyShowQueue` | 10 | — | **ADD** |
| getPortalAdminUpcomingShowQueueDashboard | `./getPortalAdminUpcomingShowQueueDashboard` | 20 | — | **ADD** |
| getPortalAdminShowQueueRequestDesigns | `./getPortalAdminShowQueueRequestDesigns` | 24 | — | **ADD** |
| finalizeBrandLogoSlot | `./finalizeBrandLogoSlot` | 9 | — | **RETAIN LIVE VERSION** |
| updateBrandLogoDisplaySizes | `./updateBrandLogoDisplaySizes` | 6 | — | **RETAIN LIVE VERSION** |
| getPortalDesignShareOpenGraph | `./getPortalDesignShareOpenGraph` | 5 | — | **RETAIN LIVE VERSION** |
| getPortalGlobalOpenGraph | `./getPortalGlobalOpenGraph` | 8 | — | **RETAIN LIVE VERSION** |
| getPortalOgShareImage | `./getPortalOgShareImage` | 7 | — | **RETAIN LIVE VERSION** |
| wipeOperationalTestData | `./wipeOperationalTestData` | 8 | — | **EXCLUDE** |
| ownerDeleteUser | `./ownerDeleteUser` | 7 | — | **EXCLUDE** |
| previewCustomerAccountDeletion, tombstoneCustomerAccount | `./tombstoneCustomerAccount` | 6 | — | **RETAIN LIVE VERSION** |
| previewHardDeleteCustomerAccount, hardDeleteCustomerAccount | `./hardDeleteCustomerAccount` | 22 | — | **EXCLUDE** |
| disableCustomerAccount, restoreCustomerAccount | `./disableCustomerAccount` | 14 | — | **ADD** |
| previewDuplicateAccountResolution | `./previewDuplicateAccountResolution` | 28 | — | **ADD** |
| transferCustomerUsername | `./transferCustomerUsername` | 35 | — | **ADD** |
| previewCustomerAccountMerge | `./previewCustomerAccountMerge` | 36 | — | **ADD** |
| applyCustomerAccountMerge | `./applyCustomerAccountMerge` | 43 | — | **ADD** |
| getCustomerAccountMergeStatus | `./getCustomerAccountMergeStatus` | 40 | — | **ADD** |
| previewPrintRequestDeletion, deleteEligiblePrintRequest, archivePrintRequest | `./deleteEligiblePrintRequest` | 19 | — | **RETAIN LIVE VERSION** |
| previewUpcomingShowDeletion, deleteEligibleUpcomingShow | `./deleteEligibleUpcomingShow` | 9 | — | **RETAIN LIVE VERSION** |
| previewShowProductionRecovery, applyShowProductionRecovery | `./previewShowProductionRecovery` | 38 | — | **ADD** |
| previewShowQueueMove, applyShowQueueMove | `./previewShowQueueMove` | 27 | — | **ADD** |
| previewCustomerUploadDeletion, deleteEligibleCustomerUpload, previewPortalCustomerUploadDeletion, deletePortalCustomerUpload | `./deleteEligibleCustomerUpload` | 18 | F10, F30, F33 | **UPDATE** |
| previewCategoryArchive, archiveCategoryWithGuards, previewTagArchive, archiveTagWithGuards | `./archiveTaxonomyWithGuards` | 6 | — | **RETAIN LIVE VERSION** |
| onTagTaxonomySourceWritten, onCategoryTaxonomySourceWritten, rebuildTaxonomyMaterializationCallable | `./taxonomy/onTaxonomySourceWritten` | 10 | — | **RETAIN LIVE VERSION** |
| rebuildTaxonomyMaterialization | `./taxonomy/rebuildTaxonomyMaterialization` | 5 | — | **EXCLUDE** |
| syncPortalAccountEmail | `./syncPortalAccountEmail` | 8 | F25, F30, F33 | **UPDATE** |
| requestPortalAccountDeletion, cancelPortalAccountDeletionRequest | `./requestPortalAccountDeletion` | 8 | F20, F30, F33 | **UPDATE** |
| purgeArchivedDesignAssets | `./purgeArchivedDesignAssets` | 10 | — | **RETAIN LIVE VERSION** |
| deleteEligibleUnapprovedDesign | `./deleteEligibleUnapprovedDesign` | 10 | — | **RETAIN LIVE VERSION** |
| archiveStaleRejectedDesigns | `./archiveStaleRejectedDesigns` | 6 | — | **RETAIN LIVE VERSION** |
| purgeIdleCustomerUploadFullSize | `./purgeIdleCustomerUploadFullSize` | 8 | — | **RETAIN LIVE VERSION** |
| purgePromotedDonationFullSize | `./purgePromotedDonationFullSize` | 8 | — | **RETAIN LIVE VERSION** |
| purgeExpiredAssistedCreationProofs, purgeExpiredAssistedCreationProofsScheduled | `./purgeExpiredAssistedCreationProofs` | 10 | — | **RETAIN LIVE VERSION** |
| onPrintRequestItemCreated | `./onPrintRequestItemCreated` | 6 | — | **RETAIN LIVE VERSION** |
| onShowAllocationCreated | `./onShowAllocationCreated` | 9 | — | **RETAIN LIVE VERSION** |
| onPrintRequestEditingExitRestoreParked | `./onPrintRequestEditingExitRestoreParked` | 13 | — | **ADD** |
| syncPrintRequestQueueTab | `./syncPrintRequestQueueTab` | 11 | — | **RETAIN LIVE VERSION** |
| onPrintRequestItemQueueTabInputWritten, onShowAllocationQueueTabInputWritten | `./onPrintRequestQueueTabInputsWritten` | 8 | — | **RETAIN LIVE VERSION** |
| onPrintRequestStatusQueueTabInputWritten | `./onPrintRequestStatusQueueTabInputWritten` | 8 | — | **ADD** |
| onPrintRequestLifecycleRequestWritten | `./onPrintRequestLifecycleRequestWritten` | 4 | — | **ADD** |
| onPrintRequestLifecycleAllocationWritten | `./onPrintRequestLifecycleAllocationWritten` | 5 | — | **ADD** |
| backfillPrintRequestQueueTab | `./backfillPrintRequestQueueTab` | 12 | — | **EXCLUDE** |
| onCustomerFavoriteCreated, onCustomerFavoriteDeleted | `./onCustomerFavoriteChanged` | 3 | — | **RETAIN LIVE VERSION** |
| onEmailDeliveryJobCreated | `./onEmailDeliveryJobCreated` | 16 | — | **RETAIN LIVE VERSION** |
| registerWebPushSubscription | `./registerWebPushSubscription` | 6 | F18, F30, F33 | **UPDATE** |
| submitPortalDesignIssueReport | `./submitPortalDesignIssueReport` | 9 | F24, F30, F33 | **UPDATE** |
| resolveDesignIssueReport | `./resolveDesignIssueReport` | 8 | — | **RETAIN LIVE VERSION** |
| syncPortalCatalogDesignToAlgolia, reconcilePortalCatalogAlgoliaIndex, reconcilePortalCatalogAlgoliaIndexScheduled | `./algolia/algoliaFunctionExports` | 14 | — | **RETAIN LIVE VERSION** |

## Required exclusions

- `previewHardDeleteCustomerAccount` and `hardDeleteCustomerAccount` are both **EXCLUDE**. Their source and DEV-only UI remain available, but they are absent from the production baseline and remain outside any coordinated production Function allowlist.
- DEV/test/source-only destructive or fixture exports (`upsertDevFixtureShow`, `inventoryCatalogImageStorage`, `wipeOperationalTestData`, `ownerDeleteUser`, `rebuildTaxonomyMaterialization`, `testAiEnrichmentPlayground`, `testAiEnrichmentSemanticReviewPlayground`, `backfillPrintRequestQueueTab`) are **EXCLUDE**.
- Deferred scheduled/catalog/Smart Profile playground exports are **NO ACTION**; they are not silently promoted by this inventory.

## Signed-off child rerun overlay

The following rows are the complete current closure rows hit by F34–F46. They supersede the
changed-path cells for the corresponding historical rows above; the machine-readable audit is the
source of truth for the full 173-row table.

| Export(s) | Closure paths | Rerun changed-path IDs | Action |
|---|---:|---|---|
| `confirmCustomerUploadsAndAttachToRequest` | 51 | F05, F30, F33, F40, F42, F43, F46 | UPDATE |
| `confirmCustomerUploadsForDonation` | 19 | F06, F30, F33, F40, F42, F43, F46 | UPDATE |
| `createCustomerUploadBatch` | 21 | F07, F30, F33, F42 | UPDATE |
| `excludeCustomerUploadFromCatalog` | 8 | F34 | UPDATE |
| `finalizeCustomerUpload` | 40 | F13, F30, F33, F42 | UPDATE |
| `finalizeCustomerUploadZip` | 42 | F14, F30, F33, F42 | UPDATE |
| `getCustomerUploadDailyQuota` | 15 | F42 | UPDATE |
| `promoteCustomerUploadToAiReview` | 13 | F46 | UPDATE |
| `recordCustomerUploadHalftoneResponse` | 13 | F16, F30, F33, F42 | UPDATE |
| `restoreCustomerUploadCatalogEligibility` | 8 | F38 | UPDATE |
| `requestCustomerUploadCatalogPermissionFollowUp` | 13 | F36, F39, F41, F42, F44, F45 | ADD |
| `getCustomerUploadCatalogPermissionFollowUp` | 8 | F35, F42, F44 | ADD |
| `respondToCustomerUploadCatalogPermissionFollowUp` | 9 | F30, F33, F37, F42, F44 | ADD |
| `retryCustomerUploadProcessing` | 31 | F42 | UPDATE |
| `queuePortalPrintRequestToShow` | 54 | F15, F30, F33, F40, F46 | UPDATE |
| assisted-creation exports (10) | 44 | F02, F30, F33, F39, F41, F42, F45 | UPDATE |
| `customerAddAssistedApprovedProofToPrintRequest` | 70 | F09, F30, F33, F40, F42, F43, F46 | UPDATE |
| customer-upload deletion exports (4) | 18 | F10, F30, F33, F42 | UPDATE |
| `onShowAllocationCreated` | 9 | F40, F46 | UPDATE |

The response callable’s closure includes `assertPortalMaintenanceAllowsCustomerMutation`; the
read callable remains owner-scoped and returns the safe DTO without an upload ID or Storage path.
No broad Functions deployment is implied by this source inventory.

## Reconciliation result

| Action | Count |
|---|---:|
| ADD | 41 |
| UPDATE | 47 |
| RETAIN LIVE VERSION | 66 |
| EXCLUDE | 10 |
| NO ACTION | 9 |

The table is a closure inventory, not a deploy command. The child’s shared-path propagation was
mechanically rechecked; in addition to the direct rows above, F39–F46 update the existing upload,
notification, assisted-creation, queue, and lifecycle rows in the JSON audit output. A future M1
packet must convert this inventory to an explicit reviewed allowlist, preserve both hard-delete
exclusions, and re-run it at the eventual clean candidate SHA.
