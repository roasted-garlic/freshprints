# Production maintenance-mode prerequisite — corrective amendment DEV Deployment

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** `fresh-prints-dev` only<br>
**Production:** untouched

## Function deployment

After the corrective Implement and Test gates passed, the shared trusted resolver change and the
new candidate-list callable were deployed with this explicit allowlist. No broad Functions target,
`--force`, Rules/indexes/hosting target, or production project was used:

```text
firebase deploy --project fresh-prints-dev --only functions:getPortalMaintenanceState,functions:updatePortalMaintenanceState,functions:listPortalMaintenanceTestCustomers,functions:addPortalCatalogDesignToPrintRequest,functions:submitAssistedCreationRequest,functions:cancelAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest,functions:customerSendAssistedCreationMessage,functions:customerRespondToAssistedCreationProof,functions:completeEtsyRecommendationRequest,functions:cancelEtsyRecommendationRequest,functions:clearPortalWorkingPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:confirmCustomerUploadsForDonation,functions:createCustomerUploadBatch,functions:createPortalPrintRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:deletePortalCustomerUpload,functions:duplicatePortalPrintRequestItem,functions:submitEtsySuggestionRequest,functions:finalizeCustomerUploadZip,functions:finalizeCustomerUpload,functions:queuePortalPrintRequestToShow,functions:recordCustomerUploadHalftoneResponse,functions:registerCustomer,functions:removePortalPrintRequestItem,functions:registerWebPushSubscription,functions:requestPortalAccountDeletion,functions:cancelPortalAccountDeletionRequest,functions:searchEtsyRecommendations,functions:setPrintRequestItemArtworkEnhanceMode,functions:submitEtsyRecommendationRequest,functions:submitPortalDesignIssueReport,functions:syncPortalAccountEmail,functions:unqueuePortalPrintRequestFromShow,functions:updatePortalCustomerProfile,functions:updatePortalPrintRequestItemQuantity
```

The allowlist contains **37 Functions**: the two maintenance state callables, the new owner/admin
candidate-list callable, and the 34 existing guard-bearing customer callable exports required by
the shared eligibility/guard change. Post-deploy `firebase functions:list --project
fresh-prints-dev` verification found **37/37 present and ACTIVE** in `us-central1` (0 missing, 0
non-ACTIVE). The key maintenance revisions are `getportalmaintenancestate-00003-kil`,
`updateportalmaintenancestate-00004-qub`, and `listportalmaintenancetestcustomers-00001-tez`.

## Rules and indexes

No Firestore Rules or Storage Rules deployment was performed because neither Rules source changed
in this corrective amendment. No Firestore indexes were deployed. The existing Rules behavior was
revalidated by the 182/182 emulator regression.

## Data and local processes

The live `settings/portalMaintenance` document was not created, changed, cleared, or initialized;
it remains owner-controlled and present/ON. The deployed public callable returned HTTP 200 with
the customer-safe ON projection `enabled: true`, the friendly default heading, the existing saved
message, and `maintenanceTestAccessGranted: false`; no private UID was returned. Absent-document
OFF semantics were verified by the shared/unit and emulator integration suites (the live document
was intentionally not mutated to manufacture an absent state). No production data operation occurred. The
localhost Portal (`:3100`) and Studio (`:5173`) continue to target `fresh-prints-dev`; after the
backend rollout, Studio should reload its renderer (or restart the local Studio dev process) so the
new callable subscription is loaded, and Portal can be refreshed. This is a local source reload,
not a hosting deployment.

Unauthenticated access to `listPortalMaintenanceTestCustomers` returned HTTP 401, confirming its
owner/admin gate at the deployed endpoint. Owner/admin candidate loading and customer/helper
mutation denial remain part of the owner-performed QA journey and automated Rules/callable tests;
Codex did not impersonate or perform that QA.

## Owner QA gate

This deployment record does not perform Owner DEV QA and does not advance Signoff. The next action
is the owner-performed revised QA journey; production and the parent coordinated rollout remain
forbidden.
