# Production Release — Final Cloud Functions Allowlist Report

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `production-release` (Goal #13) |
| Source enumerated | `functions/src/index.ts` (re-read fresh this pass, not copied from any earlier session) |
| Total exports | **105** |
| Included | **99** |
| Excluded | **6** |

No Function was deployed. This report prepares the exact future deployment command; it does not
execute it.

---

## 1. Enumeration Method

`functions/src/index.ts` was read in full this pass (134 lines) and its export statements were
parsed programmatically (a small Node script extracting every name inside `export { ... } from`
statements, including grouped multi-name exports) rather than hand-counted, to guarantee an exact,
reproducible total. Result: **105 distinct exported Cloud Function names.**

This is the same count arrived at in the prior Implementation-readiness pass (89 recommended
include + originally 5 flagged + 2 explicit exclude = 96 rows tabulated, but that earlier pass's
table undercounted — it listed 105 rows total but only explicitly excluded 2 outright and flagged 5
more, leaving 98 as "include" in that draft). **This pass supersedes that draft with owner decisions
now recorded for all previously-flagged functions**, arriving at the corrected final split below.

---

## 2. Excluded Functions (6 total) — Owner-Decided This Pass

| # | Function | Reason |
|---|---|---|
| 1 | `inventoryCatalogImageStorage` | Dev-only diagnostic (Goal #12). Confirmed via source: owner/admin-gated `onCall`, read-only Storage inventory — no production use case. |
| 2 | `wipeOperationalTestData` | Destructive dev/test operational callable. Server-side project-allowlist + owner-role gate exists, but exclusion is enforced here via the deployment allowlist itself, not solely by that runtime gate, per explicit instruction. |
| 3 | `testAiEnrichmentPlayground` | Test-only callable — one-off AI prompt/model testing surface (`functions/src/ai/aiEnrichmentPlayground.ts`), not part of any production user-facing or staff-operational workflow. |
| 4 | `testAiEnrichmentTagRerank` | Test-only callable — same category as above. |
| 5 | `ownerDeleteUser` | High-risk destructive account-management path. Documented in `docs/architecture/BACKEND.md` as "quarantined (no Studio UI)" — the product path is `tombstoneCustomerAccount` (included, §3). Not required for ordinary launch operation. |
| 6 | `backfillPrintRequestQueueTab` | Backfill/migration-shaped callable. Production is a cold-start project (§2.12 of the original Plan: "no data to migrate") — there is no historical `printRequests`/queue-tab data requiring backfill at launch. Excluded per explicit owner decision. |

---

## 3. Conditionally-Included Function — Source-Verified This Pass

### `rebuildCatalogSnapshots` — **INCLUDED**

Read `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` directly this pass
(lines 806–851) to verify all six required conditions:

| # | Condition | Finding |
|---|---|---|
| 1 | Exact authorization gate | `if (!request.auth?.uid) throw unauthenticated(); await assertOwnerAdmin(request.auth.uid);` — requires a signed-in Firebase Auth user, then an explicit owner/admin role check |
| 2 | Owner/admin restricted | **Yes**, exactly as above — no other role can invoke it |
| 3 | Intended operational mechanism for rebuilding catalog-reference + Portal catalog snapshots | **Yes** — the function body calls `markDirty("catalog-reference")`, `markDirty("portal-catalog")`, then `publishKind()` for both, which is precisely the generated-catalog-read-model publication mechanism documented in `docs/architecture/ARCHITECTURE.md` (ADR-FP-120: "manifests are the only mutable pointers and are written last with Storage generation preconditions") |
| 4 | Destructive behavior | **None found** — the function only writes new versioned snapshot content and updates coordination/manifest documents; it does not delete any Firestore document, Storage object, or user/customer data. Failure of either publish path is caught and mapped to a structured error (`mapPublicationFailure`), not left to corrupt state. |
| 5 | Whether new production catalog data requires this callable for initial or future snapshot generation | **Yes** — per `docs/standards/DEPLOYMENT.md`'s "Wave C dev snapshot checkpoint" section, this exact callable is the documented mechanism to "creates/updates exactly the two coordination documents and publishes both initial manifests" the first time a project's catalog-reference/Portal-catalog read model is bootstrapped, and remains the mechanism for any future full rebuild |
| 6 | Dev-only assumptions | **None found** — no project-id check, no dev-allowlist gate, no reference to `fresh-prints-dev` anywhere in the function body; purely owner/admin-gated, project-agnostic Firestore/Storage logic |

**All six conditions pass. `rebuildCatalogSnapshots` is included in the production allowlist.**

**Operational note (not a code concern, a process one):** this function should still be *invoked*
only as its own deliberate step during production settings/reference-data initialization (Plan §3
step 12 in the original Plan, restated in the Implementation-readiness checkpoint's Ordered
Deployment Sequence step 12) — being on the deployment allowlist does not mean it runs
automatically; it means an owner/admin can call it once production catalog data exists, exactly as
the dev project's own bring-up used it.

---

## 4. Complete Included List (99 functions)

```
addPortalCatalogDesignToPrintRequest
cleanupAbandonedCustomerUploads
archiveStaleWorkingPrintRequests
clearPortalWorkingPrintRequest
confirmCustomerUploadsAndAttachToRequest
confirmCustomerUploadsForDonation
createCustomerWithPortalInvite
createCustomerUploadBatch
createPortalPrintRequest
duplicatePortalPrintRequestItem
excludeCustomerUploadFromCatalog
finalizeCustomerUpload
finalizeCustomerUploadZip
getCustomerUploadDailyQuota
promoteCustomerUploadToAiReview
recordCustomerUploadHalftoneResponse
recordCustomerUploadHalftoneStaffDecision
restoreCustomerUploadCatalogEligibility
retryCustomerUploadProcessing
getPortalShowPrintProgress
listPortalAllocatableShows
queuePortalPrintRequestToShow
removePortalPrintRequestItem
updatePortalPrintRequestItemQuantity
createTeamUser
registerCustomer
updateCustomer
updateTeamUser
submitEtsyRecommendationRequest
searchEtsyRecommendations
staffSearchEtsyRecommendationApiResults
getEtsyRecommendationSearchQuota
completeEtsyRecommendationRequest
cancelEtsyRecommendationRequest
addEtsyRecommendationSuggestion
deactivateEtsyRecommendationSuggestion
submitEtsySuggestionRequest
approveEtsySuggestionRequest
rejectEtsySuggestionRequest
submitAssistedCreationRequest
cancelAssistedCreationRequest
customerUpdateAssistedCreationRequest
customerSendAssistedCreationMessage
customerRespondToAssistedCreationProof
staffSendAssistedCreationMessage
staffUpdateAssistedCreationStatus
staffAddAssistedCreationProof
staffAddAssistedCreationFinalSource
staffSuggestAssistedCreationCatalogDesign
customerGetAssistedCreationApprovedProofDownloadUrl
customerGetAssistedCreationApprovedProofFile
customerAddAssistedApprovedProofToPrintRequest
enqueueAiEnrichment
resetAiEnrichmentForProcessing
updateAiEnrichmentSettings
updateEmailProviderSettings
updateCustomerUploadQuotaSettings
updatePrintRequestLimitSettings
updatePortalSocialMetaSettings
updatePortalHelpSettings
finalizeBrandLogoSlot
updateBrandLogoDisplaySizes
getPortalDesignShareOpenGraph
getPortalGlobalOpenGraph
getPortalOgShareImage
previewCustomerAccountDeletion
tombstoneCustomerAccount
previewPrintRequestDeletion
deleteEligiblePrintRequest
archivePrintRequest
previewUpcomingShowDeletion
deleteEligibleUpcomingShow
previewCustomerUploadDeletion
deleteEligibleCustomerUpload
previewCategoryArchive
archiveCategoryWithGuards
previewTagArchive
archiveTagWithGuards
syncPortalAccountEmail
requestPortalAccountDeletion
cancelPortalAccountDeletionRequest
purgeArchivedDesignAssets
archiveStaleRejectedDesigns
purgeIdleCustomerUploadFullSize
purgePromotedDonationFullSize
purgeExpiredAssistedCreationProofs
purgeExpiredAssistedCreationProofsScheduled
onPrintRequestItemCreated
onShowAllocationCreated
onPrintRequestItemQueueTabInputWritten
onShowAllocationQueueTabInputWritten
onCustomerFavoriteCreated
onCustomerFavoriteDeleted
onEmailDeliveryJobCreated
registerWebPushSubscription
onCategorySnapshotSourceWritten
onPortalCatalogSnapshotSourceWritten
onTagSnapshotSourceWritten
rebuildCatalogSnapshots
```

(99 names, programmatically verified count.)

---

## 5. Verification That Every Included Function Is Required for Production Operation

Every included function falls into one of these operationally-necessary groups, each traced to a
still-active, non-deprecated product surface documented in `docs/architecture/BACKEND.md`'s
Serverless/Edge Functions table or `docs/architecture/DATA_MODEL.md`:

- **Portal customer-facing print request flow** (create/add/update/remove/duplicate/queue-to-show) —
  core product function, required.
- **Customer upload / donation intake and processing** (create batch, finalize, confirm, promote,
  retry, halftone) — core product function, required.
- **Team/customer account management** (create/update team user, register customer, tombstone,
  email sync, deletion requests) — core product function, required.
- **Etsy recommendations** (submit/search/complete/cancel/suggestions) — shipped Phase 9A feature,
  required.
- **Assisted Creation** (submit/cancel/update/messages/proofs/final source/catalog-share suggest) —
  shipped Phase 9C feature, required.
- **AI enrichment** (`enqueueAiEnrichment`, `resetAiEnrichmentForProcessing`,
  `updateAiEnrichmentSettings`) — core catalog-processing pipeline, required (excludes only the two
  test/playground variants, §2).
- **Settings management** (email provider, upload quotas, print-request limits, social meta, help
  content, brand logos) — Studio-facing owner/admin configuration surface, required for the
  cold-start settings initialization step in the Ordered Deployment Sequence.
- **Portal SEO/OG** (`getPortalDesignShareOpenGraph`, `getPortalGlobalOpenGraph`,
  `getPortalOgShareImage`) — required for the already-signed-off Portal SEO Foundations goal to
  function in production.
- **Owner/admin deletion and archive guards** (previews + eligible-deletion callables for print
  requests, uploads, upcoming shows, categories, tags) — required staff operational tooling.
- **Retention/purge maintenance** (archived design assets, idle upload full-size, promoted donation
  full-size, expired Assisted proofs — both callable and scheduled variants) — required ongoing
  Storage-cost-management operations per ADR-FP-084/086/093.
- **Firestore triggers** (print-request-item created, show-allocation created, queue-tab input
  written ×2, customer-favorite created/deleted, email-delivery-job created, catalog-snapshot source
  written ×3) — required reactive infrastructure with no manual invocation path; these must be
  deployed for their corresponding product features to function at all.
- **Web push registration** (`registerWebPushSubscription`) — required for the shipped
  browser-push-notification feature.
- **`rebuildCatalogSnapshots`** — required per §3 above.

**No test, dev-only, or destructive migration callable is included.** Cross-checked the included
list against the excluded list (§2) and the dev-only-tooling classification (reconciliation report
§7) — no overlap.

---

## 6. Exact Future Firebase Functions Deploy Command (prepared, NOT executed)

```
firebase deploy --project fresh-prints-prod --only functions:addPortalCatalogDesignToPrintRequest,functions:cleanupAbandonedCustomerUploads,functions:archiveStaleWorkingPrintRequests,functions:clearPortalWorkingPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:confirmCustomerUploadsForDonation,functions:createCustomerWithPortalInvite,functions:createCustomerUploadBatch,functions:createPortalPrintRequest,functions:duplicatePortalPrintRequestItem,functions:excludeCustomerUploadFromCatalog,functions:finalizeCustomerUpload,functions:finalizeCustomerUploadZip,functions:getCustomerUploadDailyQuota,functions:promoteCustomerUploadToAiReview,functions:recordCustomerUploadHalftoneResponse,functions:recordCustomerUploadHalftoneStaffDecision,functions:restoreCustomerUploadCatalogEligibility,functions:retryCustomerUploadProcessing,functions:getPortalShowPrintProgress,functions:listPortalAllocatableShows,functions:queuePortalPrintRequestToShow,functions:removePortalPrintRequestItem,functions:updatePortalPrintRequestItemQuantity,functions:createTeamUser,functions:registerCustomer,functions:updateCustomer,functions:updateTeamUser,functions:submitEtsyRecommendationRequest,functions:searchEtsyRecommendations,functions:staffSearchEtsyRecommendationApiResults,functions:getEtsyRecommendationSearchQuota,functions:completeEtsyRecommendationRequest,functions:cancelEtsyRecommendationRequest,functions:addEtsyRecommendationSuggestion,functions:deactivateEtsyRecommendationSuggestion,functions:submitEtsySuggestionRequest,functions:approveEtsySuggestionRequest,functions:rejectEtsySuggestionRequest,functions:submitAssistedCreationRequest,functions:cancelAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest,functions:customerSendAssistedCreationMessage,functions:customerRespondToAssistedCreationProof,functions:staffSendAssistedCreationMessage,functions:staffUpdateAssistedCreationStatus,functions:staffAddAssistedCreationProof,functions:staffAddAssistedCreationFinalSource,functions:staffSuggestAssistedCreationCatalogDesign,functions:customerGetAssistedCreationApprovedProofDownloadUrl,functions:customerGetAssistedCreationApprovedProofFile,functions:customerAddAssistedApprovedProofToPrintRequest,functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:updateAiEnrichmentSettings,functions:updateEmailProviderSettings,functions:updateCustomerUploadQuotaSettings,functions:updatePrintRequestLimitSettings,functions:updatePortalSocialMetaSettings,functions:updatePortalHelpSettings,functions:finalizeBrandLogoSlot,functions:updateBrandLogoDisplaySizes,functions:getPortalDesignShareOpenGraph,functions:getPortalGlobalOpenGraph,functions:getPortalOgShareImage,functions:previewCustomerAccountDeletion,functions:tombstoneCustomerAccount,functions:previewPrintRequestDeletion,functions:deleteEligiblePrintRequest,functions:archivePrintRequest,functions:previewUpcomingShowDeletion,functions:deleteEligibleUpcomingShow,functions:previewCustomerUploadDeletion,functions:deleteEligibleCustomerUpload,functions:previewCategoryArchive,functions:archiveCategoryWithGuards,functions:previewTagArchive,functions:archiveTagWithGuards,functions:syncPortalAccountEmail,functions:requestPortalAccountDeletion,functions:cancelPortalAccountDeletionRequest,functions:purgeArchivedDesignAssets,functions:archiveStaleRejectedDesigns,functions:purgeIdleCustomerUploadFullSize,functions:purgePromotedDonationFullSize,functions:purgeExpiredAssistedCreationProofs,functions:purgeExpiredAssistedCreationProofsScheduled,functions:onPrintRequestItemCreated,functions:onShowAllocationCreated,functions:onPrintRequestItemQueueTabInputWritten,functions:onShowAllocationQueueTabInputWritten,functions:onCustomerFavoriteCreated,functions:onCustomerFavoriteDeleted,functions:onEmailDeliveryJobCreated,functions:registerWebPushSubscription,functions:onCategorySnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:rebuildCatalogSnapshots
```

**This command was constructed but NOT executed.** It uses `--project fresh-prints-prod` (the
confirmed production project id) and an explicit, fully-enumerated `--only functions:...` list —
never a bare `--only functions`, per explicit repeated instruction. It must be re-verified against
`functions/src/index.ts` immediately before actual use, since Functions are added/removed frequently
in this repository and this list could drift between now and the actual deployment checkpoint.

---

## 7. Explicit Confirmation

No Function was deployed. No `firebase deploy` command of any kind was executed in this pass or any
prior pass of this goal.
