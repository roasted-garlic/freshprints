# Production Maintenance-Mode Prerequisite — DEV Dependency Deployment

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** `fresh-prints-dev` only<br>
**Production:** untouched; no production deployment, setting mutation, or activation performed

## Root cause

The Owner DEV-QA failure was an environment/source mismatch, not a product QA failure. Portal and
Studio were running local source configured for `fresh-prints-dev`, while the two new maintenance
callables were absent from DEV and the maintenance-aware Rules had not been released there.

Evidence before deployment:

- `firebase functions:list --project fresh-prints-dev` found zero `getPortalMaintenanceState` or
  `updatePortalMaintenanceState` exports.
- `POST https://us-central1-fresh-prints-dev.cloudfunctions.net/getPortalMaintenanceState` returned
  HTTP 404.
- `apps/portal/.env.local` and `apps/studio/.env.local` both identify `fresh-prints-dev`.
- The local Portal Next process was serving port 3100 and the local Studio Vite/Electron process was
  running; both were the implemented maintenance source.

## Exact DEV resources deployed

### Functions

Command:

```text
firebase deploy --project fresh-prints-dev --only functions:getPortalMaintenanceState,functions:updatePortalMaintenanceState
```

These two reviewed exports were deployed first. The command reported **2 Functions Deployed**, **0
Functions Errored**, and **0 Function Deployments Aborted**. No broad Functions deploy was used.

| Function | Region | DEV state | Revision/service evidence |
|---|---|---|---|
| `getPortalMaintenanceState` | `us-central1` | **ACTIVE** | `getportalmaintenancestate-00001-sor` |
| `updatePortalMaintenanceState` | `us-central1` | **ACTIVE** | `updateportalmaintenancestate-00001-gor` |

The implementation also changes the customer-facing callable revisions that enforce the shared
guard. To prevent an ON-state bypass, the following explicit 34-function allowlist was deployed:

```text
addPortalCatalogDesignToPrintRequest, submitAssistedCreationRequest, cancelAssistedCreationRequest,
customerUpdateAssistedCreationRequest, customerSendAssistedCreationMessage,
customerRespondToAssistedCreationProof, completeEtsyRecommendationRequest,
cancelEtsyRecommendationRequest, clearPortalWorkingPrintRequest,
confirmCustomerUploadsAndAttachToRequest, confirmCustomerUploadsForDonation,
createCustomerUploadBatch, createPortalPrintRequest, customerAddAssistedApprovedProofToPrintRequest,
deletePortalCustomerUpload, duplicatePortalPrintRequestItem, submitEtsySuggestionRequest,
finalizeCustomerUploadZip, finalizeCustomerUpload, queuePortalPrintRequestToShow,
recordCustomerUploadHalftoneResponse, registerCustomer, removePortalPrintRequestItem,
registerWebPushSubscription, requestPortalAccountDeletion, cancelPortalAccountDeletionRequest,
searchEtsyRecommendations, setPrintRequestItemArtworkEnhanceMode,
submitEtsyRecommendationRequest, submitPortalDesignIssueReport, syncPortalAccountEmail,
unqueuePortalPrintRequestFromShow, updatePortalCustomerProfile,
updatePortalPrintRequestItemQuantity
```

Command:

```text
firebase deploy --project fresh-prints-dev --only functions:addPortalCatalogDesignToPrintRequest,functions:submitAssistedCreationRequest,functions:cancelAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest,functions:customerSendAssistedCreationMessage,functions:customerRespondToAssistedCreationProof,functions:completeEtsyRecommendationRequest,functions:cancelEtsyRecommendationRequest,functions:clearPortalWorkingPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:confirmCustomerUploadsForDonation,functions:createCustomerUploadBatch,functions:createPortalPrintRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:deletePortalCustomerUpload,functions:duplicatePortalPrintRequestItem,functions:submitEtsySuggestionRequest,functions:finalizeCustomerUploadZip,functions:finalizeCustomerUpload,functions:queuePortalPrintRequestToShow,functions:recordCustomerUploadHalftoneResponse,functions:registerCustomer,functions:removePortalPrintRequestItem,functions:registerWebPushSubscription,functions:requestPortalAccountDeletion,functions:cancelPortalAccountDeletionRequest,functions:searchEtsyRecommendations,functions:setPrintRequestItemArtworkEnhanceMode,functions:submitEtsyRecommendationRequest,functions:submitPortalDesignIssueReport,functions:syncPortalAccountEmail,functions:unqueuePortalPrintRequestFromShow,functions:updatePortalCustomerProfile,functions:updatePortalPrintRequestItemQuantity
```

The command completed successfully. A post-deploy `gcloud functions list --v2` check found all
**34/34** allowlisted revisions **ACTIVE** in `us-central1`; no unrelated Function was included.
Together with the two maintenance exports above, all **36/36** explicitly deployed Functions are
ACTIVE.

### Firestore and Storage Rules

Command:

```text
firebase deploy --project fresh-prints-dev --only firestore:rules,storage
```

- Firestore Rules compiled and released successfully to `cloud.firestore` (ruleset
  `a87aeadd-2928-4b25-aaec-1894d10ef869`).
- Storage Rules compiled and released successfully to
  `firebase.storage/fresh-prints-dev.firebasestorage.app` (ruleset
  `071bfc7a-d663-46a9-ba88-1ea22a3329c2`).
- No Firestore index deployment was performed.

The CLI emitted existing Rules compiler warnings (unused legacy helpers/invalid diagnostic names),
but both Rules files compiled and the deployment exited successfully.

## Post-deployment verification

- `gcloud functions describe` reports both maintenance Functions **ACTIVE** in `us-central1`.
- The private document remains absent: Firestore REST GET returned HTTP 404 for
  `settings/portalMaintenance`.
- The public callable now returns HTTP 200 with the expected safe absent/OFF state:
  `{"enabled":false,"message":"Fresh Prints Portal is temporarily in read-only maintenance mode. Please try again soon."}`
- Unauthenticated POST to `updatePortalMaintenanceState` returns HTTP 401 `UNAUTHENTICATED`.
  Direct client writes remain denied by the deployed Rules (`allow write: if false`); owner/admin
  callable authorization and customer/helper denial are covered by the targeted 5/5 emulator
  fixture and the source contract test.

## Local app recovery boundary

- Portal is already running the implemented local source against DEV. No process restart is needed;
  its maintenance provider polls and reacts to focus/visibility changes. A browser refresh/focus
  may be used to expedite convergence from the prior error state.
- Studio is already running the implemented local source against DEV. Its prior Firestore
  `onSnapshot` permission error is terminal for that subscription, so reload the Studio renderer or
  restart the local Studio process before checking Settings → Portal maintenance. No source rebuild
  or publication is needed.

## Owner QA status

The backend mismatch is resolved. Owner DEV QA may resume the reviewed seven-step journey. This
report does not perform that QA and does not advance Signoff.
