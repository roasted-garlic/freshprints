# Production Maintenance-Mode Prerequisite — Implementation Inventory

Generated from the reviewed source inventory on 2026-09-10 after owner acceptance. The mechanical
guard check is pinned by `tests/portalMaintenance.contract.test.ts`; rerun it with:

```text
npx tsx --test tests/portalMaintenance.contract.test.ts
```

## Customer mutation boundaries

| Boundary | Customer mutation sources | ON behavior | Enforcement |
|---|---|---|---|
| Print request and queue | `addPortalCatalogDesignToPrintRequest.ts`, `clearPortalWorkingPrintRequest.ts`, `createPortalPrintRequest.ts`, `duplicatePortalPrintRequestItem.ts`, `queuePortalPrintRequestToShow.ts`, `removePortalPrintRequestItem.ts`, `setPrintRequestItemArtworkEnhanceMode.ts`, `unqueuePortalPrintRequestFromShow.ts`, `updatePortalPrintRequestItemQuantity.ts` | Blocked before quota/transaction/business writes | Trusted callable guard; Firestore `/printRequests` and `/printRequestItems` direct-write guards |
| Uploads and donation | `createCustomerUploadBatch.ts`, `confirmCustomerUploadsAndAttachToRequest.ts`, `confirmCustomerUploadsForDonation.ts`, `finalizeCustomerUpload.ts`, `finalizeCustomerUploadZip.ts`, `recordCustomerUploadHalftoneResponse.ts`, `deleteEligibleCustomerUpload.ts` | Blocked before upload attachment, deletion, or donation side effects | Trusted callable guard; Storage `/customer-uploads/{uid}/...` guard |
| Assisted Creation | `assistedCreationRequests.ts`, `customerAddAssistedApprovedProofToPrintRequest.ts` | Blocked before request/message/proof mutation | Trusted callable guard; Storage pending-delete guard |
| Etsy recommendations | `completeEtsyRecommendationRequest.ts`, `etsySuggestionRequests.ts`, `searchEtsyRecommendations.ts`, `submitEtsyRecommendationRequest.ts` | Blocked before request/search/complete writes | Trusted callable guard |
| Account and identity | `registerCustomer.ts`, `registerWebPushSubscription.ts`, `requestPortalAccountDeletion.ts`, `syncPortalAccountEmail.ts`, `updatePortalCustomerProfile.ts` | Blocked before customer/account/subscription writes | Trusted callable guard; Firestore customer preference and favorites guards |
| Design issue reports | `submitPortalDesignIssueReport.ts` | Blocked before report intent/quota/write | Trusted callable guard |
| Direct notification markers | `/customerNotifications/{notificationId}` `readAt`/`updatedAt` update | Blocked; customer reads remain available | Firestore ownership/field allowlist plus maintenance guard |

The grouped files are intentionally listed once even when they export multiple customer callables.
The source-level contract test fails if any frozen customer-mutation file loses the shared guard.

## Intentionally available surfaces

Public catalog/list/progress/schedule/quota/preview reads, proof download/read paths, sign-in,
sign-out, password reset, and owner/admin/staff operational paths remain on their existing auth and
Rules gates. The public maintenance-state callable returns only `enabled`, bounded `message`, and
optional `updatedAt`; the private `settings/portalMaintenance` document is owner/admin-readable and
client writes are denied.

## Direct-write Rules coverage

- Firestore: customer profile opt-in fields, favorites create/delete, customer print-request notes,
  customer print-request-item sizing/notes, and notification read markers.
- Storage: customer source and ZIP uploads plus assisted-creation pending deletes (customer branch).
- Missing state is OFF; present `enabled:true`, non-boolean `enabled`, or malformed bounded-message
  state denies customer direct writes. The helper is deliberately kept on the existing fast paths;
  the allowed absent/OFF fixture passes the measured emulator expression budget.
