# Production maintenance-mode prerequisite — amendment DEV Deployment

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** `fresh-prints-dev` only<br>
**Production:** untouched

## Functions

After the Test gate passed, this explicit allowlist was deployed; no broad Functions deploy and no
`--force` were used:

```text
firebase deploy --project fresh-prints-dev --only functions:getPortalMaintenanceState,functions:updatePortalMaintenanceState,functions:addPortalCatalogDesignToPrintRequest,functions:submitAssistedCreationRequest,functions:cancelAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest,functions:customerSendAssistedCreationMessage,functions:customerRespondToAssistedCreationProof,functions:completeEtsyRecommendationRequest,functions:cancelEtsyRecommendationRequest,functions:clearPortalWorkingPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:confirmCustomerUploadsForDonation,functions:createCustomerUploadBatch,functions:createPortalPrintRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:deletePortalCustomerUpload,functions:duplicatePortalPrintRequestItem,functions:submitEtsySuggestionRequest,functions:finalizeCustomerUploadZip,functions:finalizeCustomerUpload,functions:queuePortalPrintRequestToShow,functions:recordCustomerUploadHalftoneResponse,functions:registerCustomer,functions:removePortalPrintRequestItem,functions:registerWebPushSubscription,functions:requestPortalAccountDeletion,functions:cancelPortalAccountDeletionRequest,functions:searchEtsyRecommendations,functions:setPrintRequestItemArtworkEnhanceMode,functions:submitEtsyRecommendationRequest,functions:submitPortalDesignIssueReport,functions:syncPortalAccountEmail,functions:unqueuePortalPrintRequestFromShow,functions:updatePortalCustomerProfile,functions:updatePortalPrintRequestItemQuantity
```

Post-deploy `firebase functions:list --project fresh-prints-dev` found **36/36 ACTIVE** in
`us-central1` (the two maintenance exports plus the 34 guard-bearing exports). No unrelated
Function was included.

The emulator-backed tester validation then found a Firestore write API misuse in the trusted save
path. After the source-only correction and passing 2/2 integration tests, the affected export was
redeployed with this explicit follow-up command:

```text
firebase deploy --project fresh-prints-dev --only functions:updatePortalMaintenanceState
```

The follow-up reported **1 Function Deployed**, **0 Errored**, **0 Aborted**. The resulting
`updatePortalMaintenanceState` service is **ACTIVE**, revision
`updateportalmaintenancestate-00003-zaf`, with latest traffic.

## Rules

```text
firebase deploy --project fresh-prints-dev --only firestore:rules,storage
```

- Firestore Rules released successfully as ruleset
  `projects/fresh-prints-dev/rulesets/df04e595-06e5-431e-91b7-5e8f2cf7777c`.
- Storage Rules released successfully as ruleset
  `projects/fresh-prints-dev/rulesets/bc703cdd-e977-45e7-9c37-31ed89b6c35f`.
- No Firestore indexes were deployed.
- Existing compiler warnings (unused legacy helpers/invalid diagnostic names) were warnings only;
  both Rules files compiled and released successfully.

## Post-deploy checks

- Public `getPortalMaintenanceState` callable returned HTTP 200 with
  `{"enabled":true,"message":"Fresh Prints Portal is temporarily in read-only maintenance mode. Please try again soon.","maintenanceTestAccessGranted":false}`.
- Unauthenticated `updatePortalMaintenanceState` returned HTTP 401.
- The live DEV `settings/portalMaintenance` document is currently present and **ON**, with no test
  customer configured (owner-controlled prior QA state). It was not changed or deleted. Therefore
  the live callable correctly reports ON/false; absent-document OFF semantics remain covered by the
  shared tests and Rules emulator suite. The owner should begin QA by turning maintenance OFF.
- Local Portal (`:3100`) and Studio (`:5173`) processes are still running against
  `fresh-prints-dev`. Portal may be refreshed/focused; Studio should reload its renderer (or restart
  the local Studio process) so its Firestore subscription reconnects after the earlier permission
  error.

## Owner QA gate

This deployment report does not perform Owner DEV QA and does not advance Signoff. Production and
the parent coordinated rollout remain forbidden.
