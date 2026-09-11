# Coordinated production promotion and release readiness

**FreshForge phase:** Managed Phase — Plan amended during Formal Review<br>
**Goal:** `coordinated-production-promotion-release-readiness`<br>
**Plan date:** 2026-09-10<br>
**Status:** Strategy B amendment accepted; implementation and production authorization are pending<br>
**Candidate SHA:** Not frozen in this Plan phase

## 1. Decision and stop boundary

This is the authoritative, evidence-based plan for promoting the accumulated `development` work. It is a plan, not an authorization to deploy. No production deployment, Portal rollout, Studio publish, backfill/reconcile apply, settings mutation, secret/Auth change, Function deletion, maintenance-mode implementation, merge to `production`, commit, or push was performed while creating it.

The Strategy B amendment is accepted. The next gate is M0 preparation; the implementation agent may
work only from this amended plan and the signed-off maintenance evidence. The maintenance capability
is a required component of the one frozen coordinated candidate; it is not a standalone production
release. Its Functions, Rules, Portal and Studio surfaces are deployed in the dependency-safe
sequence below and remain disabled by default. The first production mutation remains individually
owner-gated. A mandatory production-readiness GO/NO-GO checkpoint occurs immediately before that
first mutation; the workflow stops there unless the owner explicitly says GO.

### Formal Review amendments (2026-09-10)

The prior review verdict was `approved_with_changes`. The owner has now selected Strategy B and explicitly amended the sequencing decision: the signed-off maintenance implementation is part of the full frozen coordinated candidate, with no separately completed maintenance-only production release before candidate freeze. The remaining protections still apply: use the live Portal build-003 as the immediate rollback target and build-002 only as secondary; use Studio `v1.0.9` as the immediate rollback target and `v1.0.8` only as secondary; permit later documentation-only workflow commits only under a mechanically frozen runtime tree contract; keep both hard-delete callables excluded from this production candidate and apply the now-reviewed DEV-only Studio UI gate; require transitive Function dependency closure; prove index deployment is non-destructive and never use `--force`; make lifecycle/queueTab backfills conditional or deferred where compatibility readers make them unnecessary; and reduce owner QA to five DEV journeys and four production smoke checks.

### Strategy B amendment (2026-09-10)

The owner decision selects Strategy B: do not create a production-based hotfix branch/worktree and do not attempt a maintenance-only production release. The closed DEV prerequisite remains the authoritative implementation/QA evidence and is incorporated as a required layer of this parent candidate. The production setting remains absent/OFF; it must not be initialized merely to prepare the rollout. The maintenance-promotion child goal is closed as `superseded_by_coordinated_candidate`; that closure is not evidence of a production deployment.

## 2. Inherited investigation and evidence method

The continuation inherited the previous agent's completed read-only investigation: FreshForge instructions and state, architecture/security/deployment/testing documentation, Git graph and tree reconciliation, completed signoffs and deployment records, current source export/index/rules diffs, historical production records, and targeted live Firebase/GitHub/App Hosting inspection. It did not repeat broad scans.

Evidence priority is: live read-only service output; exact repository files at a recorded SHA; deployment/release records; completed signoffs; handoff summaries. If those disagree, the plan preserves the distinction and marks the item `[NEEDS REPO CHECK]` rather than guessing.

Primary evidence records include:

- `.cursor/workflow/state.md`, `references/project-chatgpt-handoff/CURRENT-STATE.md`, and `references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md`.
- `docs/standards/DEPLOYMENT.md`, `docs/standards/TESTING.md`, `docs/standards/SECURITY.md`, and the architecture/data/backend documents named by the handoff.
- `docs/workflow/reviews/2026-08-24-production-promote-portal-and-studio-signoff.md` and its Gate D/E, hotfix, and App Hosting rollout records.
- `docs/workflow/reviews/2026-08-24-portal-discover-show-rails-loading-and-order-polish-app-hosting-rollout-record.md`.
- The 61 dated post-baseline signoff records listed in Section 4.

## 3. Exact production baseline

### 3.1 Source and Git baseline

| Item | Evidence | Baseline interpretation |
|---|---|---|
| Production branch tip | `origin/production` = `36165096f09bef6817adb5b11d496dbb1502b34b` | Source revision used by the latest production promotion record. |
| Development tip | local `HEAD` = `origin/development` = `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa` | Current post-preparation development tip; not a frozen candidate because the working tree is dirty. |
| Shared source snapshot | merge-base/tree snapshot `6b023a4837a241a83b226b8b76734edf70fb3020` | Production's PR #90 second-parent development snapshot; production tree is identical to this snapshot even though merge history diverges. |
| History relationship | `origin/production..origin/development`: 124 commits; reverse: 8 merge-only production commits; merge-base is `6b023a48` | Do not treat merge-only divergence as runtime drift. Reconcile tree/source and deployed runtime separately. |
| Tree delta | production snapshot → current development: 1,860 files changed (+271,694/-15,652); groups: Docs 666, Functions 331, Studio 422, Portal 174, Shared 237, Handoff 13, Rules/index/release/other remainder | Large accumulated source delta; must be reduced to an explicit allowlist and frozen SHA. |
| Working tree | Runtime tracked tree was clean at inspection. Planning changed `.cursor/workflow/state.md`; two pre-existing untracked docs remain: `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md` and `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-signoff.md`. | Neither untracked document is silently included. The state edit is documentation only. Candidate freeze requires an explicit disposition for all three. |

The release candidate must be a new, exact, committed `development` SHA after the owner-approved scope is complete. It must be proved equal to `origin/development` (or the approved remote ref), have no unrelated tracked or untracked files, and be recorded before any RC build or deployment.

### 3.2 Live Portal baseline

- Firebase App Hosting backend: `fresh-prints-portal` in `fresh-prints-prod`, `us-central1`, repository connection rooted at `apps/portal`, Node.js 24 runtime.
- Live Cloud Run service: `fresh-prints-portal`; latest ready/created revision `fresh-prints-portal-build-2026-08-24-003`, serving 100% of traffic. Read-only `gcloud run services describe` verified this on 2026-09-10.
- Historical authoritative rollout record identifies source SHA `36165096f09bef6817adb5b11d496dbb1502b34b`, canonical origin `https://myprintrequest.com`, and release label `fresh-prints-portal-build-2026-08-24-003`. The immediate rollback target for the upcoming rollout is this currently live build-003; `fresh-prints-portal-build-2026-08-24-002` is an older secondary fallback at `f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`.
- The live revision binds 13 App Hosting secret references by name/metadata only (Firebase public configuration, portal origin, GA, Algolia feature/app/search/index values). Values were not exposed. The exact current secret version numbers and the final candidate's required names must be re-captured immediately before rollout.

### 3.3 Live Studio baseline

- Published stable release: tag `v1.0.9`, version `1.0.9`, GitHub release published 2026-08-24, target SHA `f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`.
- The release has eight uploaded Windows/Mac x64/arm64 installer/update assets. The release record and asset digests are authoritative for rollback; do not invent a next version. The immediate rollback/distribution target for the upcoming release is stable `v1.0.9`; `v1.0.8` remains a secondary historical fallback only.
- Existing workflow `.github/workflows/studio-release.yml` supports manual dispatch, explicit `ref`, `release_type`, internal-unsigned packaging, and validation-only prerelease artifacts from a non-production branch. Stable publication is a separate owner-gated action from a production-reachable SHA.

### 3.4 Live Firebase/backend baseline

- Project/alias: `fresh-prints-prod`; Functions region: `us-central1`; all 113 currently live Functions are ACTIVE Gen 2 `nodejs20`. `firebase functions:list --project fresh-prints-prod --json` was run read-only on 2026-09-10.
- The production source export surface at `origin/production` contains 120 exports, but seven are source-only and not deployed in the live project: `backfillPrintRequestQueueTab`, `inventoryCatalogImageStorage`, `ownerDeleteUser`, `rebuildTaxonomyMaterialization`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, and `wipeOperationalTestData`. This is intentional historical deployment drift until proven otherwise; a broad Functions deploy would change it.
- The M0 rerun at the current dirty development snapshot finds 170 current exports versus 120 in
  `origin/production` (51 additions and 1 removal). The deterministic export → transitive closure
  → changed path → action table is authoritative in
  `docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md` and must be
  regenerated at the clean frozen SHA before any deploy command is constructed. Historical
  pre-child counts below are superseded where they differ.
- Live composite index count is 77 (`firebase firestore:indexes --project fresh-prints-prod --json` read-only on 2026-09-10), with no field overrides. The production source also has 77 entries; current development has 86.
- Production Firestore/Storage Rules are the rules deployed by the 2026-08-24 production promotion plus subsequent production records. An exact remote ruleset ID/hash was not exposed by the available read-only CLI and is therefore `[NEEDS REPO CHECK]` at the pre-mutation snapshot gate. The source baseline must be hashed and the currently deployed ruleset exported/recorded before any replacement.
- Auth providers are historically Email/Password + Google. Current console provider state must be read-only reverified before a candidate that touches auth-adjacent identity code; no Auth change is in this plan.
- Secret Manager values are never printed. Function bindings by secret NAME/METADATA (Gemini, OpenAI/Luna, Resend/Brevo, Etsy, Algolia and related documented providers) must be compared with the frozen source's declarations and the live service metadata immediately before rollout.

### 3.5 Search/Algolia baseline

- Portal uses Algolia in production (`NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`) with app ID metadata and index `portal_catalog_ready_prod`; the live App Hosting revision confirms those names without exposing secret values.
- The exact production record count, searchable attributes, facets, ranking settings, and last reconcile timestamp are `[NEEDS REPO CHECK]` and must be captured read-only before a candidate reconcile. The candidate must not assume that a DEV count or settings snapshot represents production.

## 4. Signoff reconciliation since the live baseline

The production baseline is the 2026-08-24 promotion. A mechanical inventory found 61 dated signoff records from 2026-08-25 through 2026-09-09; 60 are terminal approvals/approved-with-notes (including DEV-only approvals) and one 2026-09-05 owner checkpoint remains explicitly “AWAITING OWNER QA / SIGNOFF.” The latter is not treated as a completed release signoff. All records were checked for scope, deployment evidence, data work, and notes; no signoff alone authorizes production.

The complete inventory is grouped below so another agent can audit it without relying on memory:

| Date | Signoff records |
|---|---|
| 2026-08-25 | `smart-catalog-intelligence-slice-3-signoff.md`; `smart-catalog-intelligence-slice-4-signoff.md`; `smart-profile-quality-canonicalization-and-import-background-signoff.md` |
| 2026-08-26 | `smart-catalog-intelligence-slice-5-signoff.md`; `smart-catalog-intelligence-slice-6-signoff.md` |
| 2026-08-27 | `portal-customer-username-change-signoff.md`; `show-queue-gang-sheet-three-mode-refinement-signoff.md` |
| 2026-08-28 | `customer-account-identity-management-ws1-signoff.md`; `show-queue-past-show-failsafe-and-owner-override-signoff.md` |
| 2026-08-29 | `customer-account-identity-management-ws2-signoff.md`; `customer-account-identity-management-ws3-signoff.md`; `print-request-standard-size-presets-signoff.md`; `show-queue-dev-override-and-allocation-permission-repair-signoff.md` |
| 2026-08-30 | `customer-account-identity-management-ws4-signoff.md`; `show-queue-needs-attention-did-not-print-recovery-signoff.md` |
| 2026-08-31 | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-signoff.md` |
| 2026-09-01 | `pre-smart-profiling-print-request-and-gang-sheet-polish-signoff.md` |
| 2026-09-02 | `ai-review-stuck-processing-recovery-signoff.md`; `cross-app-lightbox-previous-next-navigation-signoff.md`; `customer-specific-temporary-print-request-and-show-quota-override-signoff.md`; `customer-upload-artwork-quality-gate-signoff.md`; `portal-editing-request-parks-current-draft-signoff.md`; `portal-upcoming-shows-calendar-polish-and-performance-signoff.md`; `show-queue-move-and-combine-requests-signoff.md`; `studio-companion-design-card-title-truncation-signoff.md`; `studio-delete-first-action-latency-signoff.md`; `studio-design-library-archive-search-consistency-signoff.md`; `studio-history-newest-first-ordering-signoff.md`; `studio-print-request-editing-tab-signoff.md` |
| 2026-09-03 | `ai-enrichment-visible-text-and-catalog-copy-quality-signoff.md`; `ai-processing-hard-delete-failure-feedback-signoff.md`; `ai-processing-queue-multi-select-signoff.md`; `firestore-rules-print-request-item-resize-expression-budget-signoff.md`; `portal-modal-dont-show-again-and-import-smart-profile-presets-signoff.md`; `smart-profile-subject-canonicalization-and-derivative-suppression-signoff.md` |
| 2026-09-04 | `category-dominant-intent-and-humor-reliability-signoff.md`; `cute-whimsical-dominant-intent-signoff.md`; `music-vs-pop-dominant-intent-corrective-signoff.md`; `smart-catalog-intelligence-completion-ws4-signoff.md`; `visual-catalog-title-specificity-signoff.md` |
| 2026-09-05 | `canonical-ai-catalog-copy-trust-corrective-signoff.md`; `catalog-explicit-content-automation-signoff.md`; `portal-show-queue-unqueue-busy-overlay-signoff.md`; `restore-openai-gpt-5-6-luna-ai-enrichment-signoff.md`; `smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-signoff.md`; `standard-size-preset-and-add-to-request-default-recalibration-signoff.md`; `restore-openai-gpt-5-6-luna-ai-enrichment-owner-signoff-checkpoint.md` *(not terminal; awaiting owner QA/signoff)* |
| 2026-09-06 | `ai-enrichment-inspector-owner-qa-signoff.md`; `two-pass-ai-enrichment-owner-qa-signoff.md` |
| 2026-09-07 | `pass2-toggle-auth-token-readiness-fix-signoff.md` |
| 2026-09-08 | `ai-processing-live-review-auto-process-and-ui-polish-signoff.md`; `atomic-reprocess-automation-state-reconciliation-signoff.md`; `customer-upload-intake-load-more-and-search-signoff.md`; `hide-add-to-show-for-archived-converted-requests-signoff.md`; `portal-show-price-commitment-ack-signoff.md`; `print-request-direct-export-gangsheet-and-copy-signoff.md`; `print-request-upload-library-consent-detail-signoff.md`; `staff-inbox-queued-alert-glance-metrics-signoff.md` |
| 2026-09-09 | `legacy-tag-operational-retirement-and-smart-profile-search-parity-signoff.md`; `portal-admin-daily-show-queue-signoff.md`; `user-info-print-request-lifecycle-activity-ordering-signoff.md` |

Important reconciliation notes: lifecycle indexed-reader activation is DEV-approved but production remains gated on mirror population; the 2026-09-09 DEV backfill created two historical duplicate lifecycle events classified safe to leave, which must not be “cleaned up” in production; the Portal admin signoff is explicitly included as approved-with-notes evidence for the scoped read-only admin runtime; the request-design order-parity plan is explicitly excluded and retained for separate review; autonomous AI/Pass 2 remains OFF. M0 whole-file Rules, additive index-union, Portal build-input, Studio build-input, Function-closure, and configuration/data dispositions are recorded in the dated reconciliation artifacts linked by the M0 report.

## 5. Development-to-production reconciliation and master manifest

### 5.1 Function export reconciliation

The export comparison below is from `functions/src/index.ts` at the current development tip versus `origin/production:functions/src/index.ts`; it is a planning inventory, not permission to deploy. The final allowlist must be regenerated at the frozen SHA and dependency-audited.

**Historical pre-child 48-addition inventory (superseded by the M0 closure artifact):**

`allocateStudioPrintRequestToShow`, `applyCustomerAccountMerge`, `applyShowProductionRecovery`, `applyShowQueueMove`, `clearAiEnrichmentTraces`, `copyStudioPrintRequest`, `disableCustomerAccount`, `enhancePrintRequestArtwork`, `getAiEnrichmentTrace`, `getCustomerAccountMergeStatus`, `getPortalAdminDailyShowQueue`, `getPortalAdminShowQueueRequestDesigns`, `getPortalAdminUpcomingShowQueueDashboard`, `hardDeleteCustomerAccount`, `listAiEnrichmentTraces`, `onCatalogReprocessJobWritten`, `onPrintRequestEditingExitRestoreParked`, `onPrintRequestLifecycleAllocationWritten`, `onPrintRequestLifecycleRequestWritten`, `onPrintRequestStatusQueueTabInputWritten`, `pauseCatalogReprocessJob`, `previewCatalogReprocessJob`, `previewCustomerAccountMerge`, `previewDuplicateAccountResolution`, `previewHardDeleteCustomerAccount`, `previewShowProductionRecovery`, `previewShowQueueMove`, `recordCustomerUploadArtworkBackgroundStaffDecision`, `refreshSmartProfileVocabSnapshotCallable`, `refreshSmartProfileVocabSnapshotScheduled`, `reprocessReadyDesignWithAi`, `resetDesignSmartProfileDimension`, `restoreCustomerAccount`, `resumeCatalogReprocessJob`, `retryCatalogReprocessJobFailures`, `setPrintRequestItemArtworkEnhanceMode`, `startCatalogReprocessJob`, `testAiEnrichmentSemanticReviewPlayground`, `transferCustomerUsername`, `unqueuePortalPrintRequestFromShow`, `unqueueStudioCustomerPrintRequestFromShow`, `updateCatalogWorkflowMode`, `updateCustomerPrintRequestQuotaOverride`, `updateDesignSmartProfileDimensions`, `updatePortalCustomerProfile`, `updateSemanticReviewPlaygroundSetting`, `updateStandardPrintSizesSettings`, `upsertDevFixtureShow`.

Candidate disposition:

- **Deploy only after approved compatibility/data gates:** lifecycle writers (`onPrintRequestLifecycle*`, `onPrintRequestStatusQueueTabInputWritten`, `onPrintRequestEditingExitRestoreParked`), atomic Studio allocation, Portal/Studio queue and request correctives, customer identity/profile callables, artwork enhancement/background decisions, Smart Profile/catalog reprocess controls, and the Portal admin dashboard callables.
- **Keep owner/admin gated and deploy only if the corresponding feature is in the approved scope:** trace inspection/clear/list, catalog workflow mode, quota override, show move/recovery, merge preview/status/apply, standard-size settings, and unqueue/copy functions.
- **Do not deploy in this promotion:** `upsertDevFixtureShow`; `hardDeleteCustomerAccount` and its apply path unless a separate destructive-account plan is reviewed; `testAiEnrichmentSemanticReviewPlayground` and semantic playground setting unless a separate owner-approved Pass 2 plan authorizes them. Autonomous enrichment remains OFF.

**Hard-delete disposition (mandatory):** ADR-FP-151 is explicit: `hardDeleteCustomerAccount` Apply is allowlisted to `fresh-prints-dev` and fails closed elsewhere; `previewHardDeleteCustomerAccount` remains excluded from production. The reviewed child `studio-hard-delete-production-ui-gate` now applies the existing `isOperationalWipeUiEnabled()` helper at `CustomerDirectoryTable`, so production-mode Studio cannot render or invoke the hard-delete path while allowlisted DEV retains it. This promotion still excludes both hard-delete callables from the production Function allowlist. Reversible `disableCustomerAccount`/`restoreCustomerAccount`, tombstone, transfer and merge-preview behavior remain separately classified; no production hard-delete authorization is inferred here.

**52 common exports whose defining module changed (updates requiring explicit allowlisting):**

`addPortalCatalogDesignToPrintRequest`, `archivePrintRequest`, `archiveStaleWorkingPrintRequests`, `cancelAssistedCreationRequest`, `clearPortalWorkingPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`, `convertCustomerPrintRequestToInternal`, `createCustomerWithPortalInvite`, `createInitialStaffGangSheet`, `customerAddAssistedApprovedProofToPrintRequest`, `customerGetAssistedCreationApprovedProofDownloadUrl`, `customerGetAssistedCreationApprovedProofFile`, `customerRespondToAssistedCreationProof`, `customerSendAssistedCreationMessage`, `customerUpdateAssistedCreationRequest`, `deleteEligibleCustomerUpload`, `deleteEligiblePrintRequest`, `deleteEligibleUnapprovedDesign`, `deleteEligibleUpcomingShow`, `deletePortalCustomerUpload`, `duplicatePortalPrintRequestItem`, `enqueueAiEnrichment`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `getPortalDesignShareOpenGraph`, `listPortalShowCatalogDesigns`, `onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`, `previewCustomerUploadDeletion`, `previewPortalCustomerUploadDeletion`, `previewPrintRequestDeletion`, `previewUpcomingShowDeletion`, `promoteCustomerUploadToAiReview`, `purgeArchivedDesignAssets`, `queuePortalPrintRequestToShow`, `rebuildTaxonomyMaterialization`, `registerCustomer`, `removePortalPrintRequestItem`, `resetAiEnrichmentForProcessing`, `retryCustomerUploadProcessing`, `staffAddAssistedCreationFinalSource`, `staffAddAssistedCreationProof`, `staffSendAssistedCreationMessage`, `staffSuggestAssistedCreationCatalogDesign`, `staffUpdateAssistedCreationStatus`, `submitAssistedCreationRequest`, `testAiEnrichmentPlayground`, `updateAiEnrichmentSettings`, `updateCustomer`, `updatePortalPrintRequestItemQuantity`, `updatePrintRequestLimitSettings`, `wipeOperationalTestData`.

`testAiEnrichmentPlayground`, `wipeOperationalTestData`, and other operationally hazardous exports above are source-defined but not live; they are **not** deployment targets. The remaining direct updates require per-function change review, provider/secret compatibility, and safe-client compatibility before inclusion.

**67 common exports with no direct defining-module diff:**

`addEtsyRecommendationSuggestion`, `approveEtsySuggestionRequest`, `archiveCategoryWithGuards`, `archiveStaleRejectedDesigns`, `archiveTagWithGuards`, `backfillPrintRequestQueueTab`, `cancelEtsyRecommendationRequest`, `cancelPortalAccountDeletionRequest`, `cleanupAbandonedCustomerUploads`, `completeEtsyRecommendationRequest`, `completeStaffGangSheetAndOpenNext`, `confirmCustomerUploadsForDonation`, `createCustomerUploadBatch`, `createPortalPrintRequest`, `createTeamUser`, `deactivateEtsyRecommendationSuggestion`, `excludeCustomerUploadFromCatalog`, `finalizeBrandLogoSlot`, `getCustomerUploadDailyQuota`, `getEtsyRecommendationSearchQuota`, `getPortalGlobalOpenGraph`, `getPortalOgShareImage`, `getPortalPrintRequestShowSchedules`, `getPortalShowPrintProgress`, `inventoryCatalogImageStorage`, `listPortalAllocatableShows`, `listPortalPublicShows`, `onCategoryTaxonomySourceWritten`, `onCustomerFavoriteCreated`, `onCustomerFavoriteDeleted`, `onEmailDeliveryJobCreated`, `onPrintRequestItemCreated`, `onShowAllocationCreated`, `onTagTaxonomySourceWritten`, `ownerDeleteUser`, `previewCategoryArchive`, `previewCustomerAccountDeletion`, `previewTagArchive`, `purgeExpiredAssistedCreationProofs`, `purgeExpiredAssistedCreationProofsScheduled`, `purgeIdleCustomerUploadFullSize`, `purgePromotedDonationFullSize`, `rebuildTaxonomyMaterializationCallable`, `reconcilePortalCatalogAlgoliaIndex`, `reconcilePortalCatalogAlgoliaIndexScheduled`, `recordCustomerUploadHalftoneResponse`, `recordCustomerUploadHalftoneStaffDecision`, `registerWebPushSubscription`, `rejectEtsySuggestionRequest`, `requestPortalAccountDeletion`, `resolveDesignIssueReport`, `restoreCustomerUploadCatalogEligibility`, `searchEtsyRecommendations`, `staffSearchEtsyRecommendationApiResults`, `submitEtsyRecommendationRequest`, `submitEtsySuggestionRequest`, `submitPortalDesignIssueReport`, `syncPortalAccountEmail`, `syncPortalCatalogDesignToAlgolia`, `syncPrintRequestQueueTab`, `tombstoneCustomerAccount`, `updateBrandLogoDisplaySizes`, `updateCustomerUploadQuotaSettings`, `updateEmailProviderSettings`, `updatePortalHelpSettings`, `updatePortalSocialMetaSettings`, `updateTeamUser`.

These are retained at their live versions unless the final dependency graph proves that a shared-module change requires an update. The generator must classify transitive changes before deployment.

**Transitive closure requirement:** Direct defining-module comparison is insufficient. At the frozen SHA, resolve every exported Function's local import closure (including `functions/src/**` and imported `packages/shared/src/**` modules, path aliases, generated `lib` inputs, and provider/config modules). Emit a deterministic `export → closure → changed path → action` manifest. Any live or added export whose closure intersects a changed path is an update candidate even when its defining file is unchanged; unchanged closures remain excluded. If the repository has no existing closure tool, the review packet must contain a reproducible read-only resolver/audit script or command before any Functions deploy. The final deploy command must enumerate only the approved names and must never be a broad `firebase deploy --only functions`.

**One source deletion:** `testAiEnrichmentTagRerank` is removed from development. It is not currently live, so no production deletion is needed. Do not use an unscoped deploy that attempts to delete it or any other source-only export. Any future deletion requires a separate compatibility review.

### 5.2 Rules and indexes

| Layer | Mechanical delta | Action in this promotion |
|---|---|---|
| Firestore Rules | +558/-81 lines; additive lifecycle events/mirrors, queue-tab editing, parking/recovery, identity/merge, AI trace/catalog-reprocess, standard settings, internal gang sheet, staff inbox, move lineage, dev fixtures and owner/admin controls | Candidate Rules must be reviewed against the live ruleset. Deploy the complete reviewed candidate only after additive index/schema support is ready. Run the full Rules suite first. Preserve all owner/admin and DEV-only guards. |
| Storage Rules | +14/-4 lines; staff read/delete of interactive originals while direct client create/update remains blocked; upload source contract narrows to PNG-only | Deploy only if the candidate's uploads/background/upscale paths are in scope and compatibility is proven. Run Storage Rules tests and a staff-only/read-only smoke. |
| Firestore indexes | 77 live/source baseline → 86 development source entries; nine net additions and one removed `designs(status ASC, updatedAt ASC)` entry. Added families cover catalog reprocess jobs, Smart Profile/AI review queries, lifecycle events, and `printRequests(customerId,lastLifecycleActivityAt DESC)`, plus queue-related combinations. | Build a reviewed union of the 77 live definitions plus required additions; retain the removed legacy index during this release. Historical duplicate-remediation evidence says `firebase deploy --only firestore:indexes` without `--force` did not delete remote indexes absent from file, while `--force` is forbidden. Do not run the current development index file blindly; prove the exact CLI behavior against the union and stop if a deletion is proposed. Physical cleanup is a separate reviewed action. |

### 5.3 Portal, Studio, shared packages, configuration

- **Portal:** The accumulated Portal source changes cover customer request/upload/editing, search/catalog/Smart Profile UI, show discovery/price acknowledgement, identity/profile, lightbox, and owner/admin Show Queue. App Hosting is a build-time deployment; it cannot be the maintenance toggle. It must be built from the frozen SHA only, after backend compatibility and required data prerequisites.
- **Studio:** The accumulated Studio changes cover catalog/AI review, uploads/backgrounds/upscale, Print Request editing/history/order parity, show queue allocation/move/recovery, gang-sheet/export, settings, and identity. Stable publication is after RC packaging and safe-environment QA from the frozen SHA. No version number is invented here.
- **Shared packages:** Shared sizing/DPI, lifecycle ordering, schemas, identity and catalog contracts are a compatibility surface for both apps and Functions. Build/typecheck them from the frozen SHA; no package is independently promoted from a different commit.
- **Settings/runtime flags:** AI autonomy and Pass 2 remain OFF. Indexed lifecycle reader may be enabled only after production mirror coverage is verified. Standard-size defaults, quota overrides, catalog workflow mode, and semantic-review settings are owner decisions; no production setting write is implied.
- **Secrets/Auth/config:** No new secret/Auth binding is proven by this Plan. Compare names/metadata only; if a missing binding or provider is found, stop for a separate human checkpoint.

### 5.4 Goal-to-layer master manifest

This is the execution manifest at the goal-family level. The exact Function names are in Section 5.1; the exact source revision is the eventual frozen SHA. “Already live” means verified in the current production runtime, not merely present on the production branch.

| Originating goal/signoff evidence | Component/source | Production action and current state | Order, risk, compatibility, data, rehearsal, verification and rollback |
|---|---|---|---|
| 2026-08-25/26 Smart Catalog slices 3–6; 2026-09-03/04/05/09 Smart Catalog/Smart Profile signoffs | Functions `functions/src/ai/**`, `functions/src/algolia/**`, catalog UI in `apps/studio`/`apps/portal`; current catalog indexes and Rules | Update reviewed AI/catalog Functions; add Smart Profile indexes; keep AI autonomy/Pass 2 OFF. Do not expose DEV fixtures or playground apply paths. | After Rules/indexes, before Smart Profile data reconcile and Portal; high provider/data risk; additive schema with compatibility fields. Rehearse bounded DEV provider calls only when authorized; verify provenance/content policy/Algolia parity; rollback Function revisions and forward-repair data. |
| 2026-08-27/28/29/30 customer identity WS1–WS4; 2026-08-27 username signoff | `functions/src/*CustomerAccount*`, `transferCustomerUsername`, `updatePortalCustomerProfile`, identity UI/shared contracts | Deploy reviewed identity/profile Functions and Rules; do not run merge, hard-delete, or tombstone operations as part of promotion. | Backend before Portal; high privacy risk; additive audit/identity fields. Preview-only DEV QA; production smoke uses safe profile edit only if owner approves. Roll back Functions/Rules; data repair from audit snapshots, not destructive reversal. |
| 2026-08-29/31/2026-09-05 print sizing/upscale/default signoffs; 2026-09-03 Rules expression-budget signoff | Shared sizing/DPI package, `enhancePrintRequestArtwork`, `setPrintRequestItemArtworkEnhanceMode`, Storage Rules and print-request Functions | Deploy shared/Function/Storage changes after Rules tests; preserve effective-DPI floor and legacy-art compatibility. Settings reset is optional and separately gated. | Storage/Functions before Portal/Studio; medium image/data risk; additive fields, no required migration if existing readers preserved. DEV D1/D3; verify dimensions and download paths; rollback packages/Functions/Storage Rules and restore prior settings. |
| 2026-08-27/28/29/30 and 2026-09-02/05/08/09 Show Queue/gang-sheet/recovery signoffs | `allocateStudioPrintRequestToShow`, queue/move/recovery/copy/unqueue Functions, `functions/src/showQueue/**`, Studio/Portal queue UI, Rules/indexes | Deploy explicit queue/recovery Functions and Rules; retain compatibility readers; no broad Function deploy. | Indexes/Rules before Functions, then Studio/Portal; highest operational risk because allocations are production state. D3 validates remove→Editing→re-add, move, DNP recovery, totals/gang-sheet. Stop on partial allocation; rollback Function/Rules, then forward-repair allocations. |
| 2026-09-02 Studio Print Request editing/history/order signoffs; 2026-09-09 lifecycle signoff | Lifecycle writer Functions, `printRequestLifecycleEvents`/mirror indexes, Studio history reader, backfill tooling | Deploy lifecycle writers and additive indexes. **Preferred minimum-operation path:** keep the compatibility reader in the production Studio candidate and defer mirror backfill. If the frozen candidate retains `PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED=true`, mirror backfill becomes REQUIRED before Studio publication; there is no runtime fallback in the current constant-driven reader. | Indexes → Rules → writers → (conditional backfill) → Studio; high ordering/data risk but additive. DEV rehearsal demonstrated idempotency; verify coverage/order/duplicates; rollback to compatibility reader only if the candidate actually contains that source path, otherwise revert Studio to the prior release and forward-repair mirrors. |
| 2026-09-02 Portal editing/park, upload/library/consent, and show calendar signoffs; 2026-08-24 Portal rollout record | Portal routes/components, upload/print-request Functions, `apps/portal` App Hosting build | Roll out Portal only after compatible backend, indexes and required data; current live build-003 is the immediate rollback, with build-002 secondary. | After backend/data; high customer UX/cache risk; build-time secret names must match. D1/D4 and small production smoke; rollback traffic to build-003 and retain compatible backend. |
| 2026-09-02 lightbox/navigation and 2026-09-08 Portal price/commitment signoffs | Shared/Portal UI and related read callables | Include in frozen Portal build; no independent rollout. | Portal order; low/medium read risk; no data migration. D1/read-only smoke; rollback App Hosting revision. |
| 2026-09-09 Portal admin daily Show Queue signoff (untracked evidence file) | `getPortalAdminUpcomingShowQueueDashboard`, `getPortalAdminShowQueueRequestDesigns`, admin UI in `apps/portal` | Disposition the untracked signoff before freeze; deploy only after auth/rules review. | Backend then Portal; high access-control risk. D4 verifies owner/admin only and no customer exposure; rollback Functions/Portal, not by opening public access. |
| 2026-09-03–09 AI review recovery, live review, explicit-content, visible-text and canonical-copy signoffs | AI review/reprocess Functions/UI, Storage Rules | Deploy reviewed behavior with autonomy OFF; reprocess only approved bounded data. | After backend compatibility; high provider/content risk. D2 and bounded DEV rehearsal; verify no staff-decision overwrite; pause/retry or forward-repair. |
| 2026-09-08 staff inbox metrics and 2026-09-01 gang-sheet polish signoffs | Studio/Portal read models and UI; shared queue metadata | Include with queue/backend release; no standalone production data write unless dependency audit finds one. | After Functions/Rules; medium read risk; D3/D4; rollback app revision. |
| 2026-09-07 Pass2 toggle token-readiness signoff and 2026-09-06 inspector/playground QA | AI trace/playground exports and settings | Keep trace access owner/admin-gated; do not enable Pass 2 or deploy semantic-review playground apply paths without a separate authorization. | Excluded/deferred; high security/provider risk; no production data action; retain existing live compatibility. |
| Existing 2026-08-24 production Portal/Studio signoff and release records | GitHub Studio workflow, `apps/studio`, App Hosting connection | Build RC from frozen SHA before production; publish stable only after backend/Portal checks and explicit approval. | Final after backend/Portal; high release irreversibility. Verify exact SHA/assets/checksums; immediate Studio rollback is `v1.0.9`, with `v1.0.8` secondary; immediate Portal rollback is build-003, with build-002 secondary. |

## 6. Data operations and rehearsal manifest

The following table distinguishes required release data work from optional or deferred maintenance. Any production apply is separately owner-gated. Where the current code is DEV-pinned or lacks a dry-run contract, the plan does not invent one.

| Operation | Disposition | Rehearsal and production method | Safety/verification/repair |
|---|---|---|---|
| Print Request lifecycle mirror population (`lastLifecycleActivityAt`, mirror fields) | **CONDITIONAL:** REQUIRED only when the frozen Studio candidate keeps `PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED=true`; otherwise **DEFERRED** and production keeps the compatibility reader | Existing DEV backfill was corrected and rehearsed: two dry runs, 11 inspected, 8 eligible, 8 proposed, 3 trusted mirrors preserved, 0 writes; bounded DEV apply wrote only three mirror fields on 8 requests and post-run proposed 0. The script is DEV-pinned by name/source; production-safe target/guard and exact scope are `[NEEDS REPO CHECK]`. Preferred path is to keep the compatibility reader for this release; if the indexed reader is chosen, the missing production-safe runner is a blocker, followed by dry-run → canary → batches → zero-diff post-run. | Idempotent mirror-only writes; no event fabrication. Partial completion is safe only while compatibility reader remains active. Verify coverage, monotonic order, no duplicate logical cards, and indexes. Data rollback is not a blind restore; forward repair or field-level restore from a pre-run export is required. Keep the two known DEV historical duplicate events as precedent, do not clean them in prod. |
| Queue-tab editing backfill for historical Print Requests | **NOT REQUIRED for initial release; DEFERRED** | Existing Studio filtering explicitly admits documents with absent `queueTab` as pre-backfill legacy rows, and `backfillPrintRequestQueueTab` is source-only/not live while the runner is DEV-pinned. Do not invoke it against prod. Revisit only if a targeted production audit proves a customer/staff correctness defect; then create a separate production-safe plan. | New writes/triggers maintain queueTab; no historical field mutation is needed for the compatibility path. Verify D3/D4 queries with a legacy-shaped fixture. No rollback burden because no production write occurs. |
| Portal Algolia catalog reconcile/reindex | **CONDITIONAL:** REQUIRED when Smart Profile/legacy-tag search parity is promoted; otherwise keep the existing index contract and **DEFER** | The existing callable has a read-only `dryRun` path. Its apply path clears the production index and rewrites all ready records in 100-record chunks; it is **not** a bounded canary or alias swap. Rehearse DEV dry run, then a read-only production dry run, review counts/settings, and only then owner-approve one full clear/rebuild under maintenance. A second dry run/independent Firestore-vs-Algolia audit must expect zero drift. | Idempotent rebuild by stable design ID, but the clear step makes apply operationally disruptive. Verify count, IDs, facets, searchable attributes, and Portal queries. Roll back by restoring recorded index settings/records or switching to a prior index only if the service supports it; otherwise forward-repair from Firestore. |
| Smart Profile ready-design reprocess/backfill | **REQUIRED only for retiring legacy tag authority in production; otherwise DEFER tag retirement** | The current source has `startCatalogReprocessJob`, `previewCatalogReprocessJob`, `reprocessReadyDesignWithAi`, pause/resume/retry controls. Confirm which are preview-only versus provider-calling applies and confirm production provider budgets. Rehearse with a bounded DEV ready-design sample, with autonomy OFF and explicit owner approval for any provider calls; then production canary/batches. | Do not enable autonomous AI or Pass 2. Verify Smart Profile fields, provenance, explicit-content policy, no overwriting of staff edits, and Algolia parity. AI/data rollback is forward repair or restore from a field-level snapshot, not an assumed transaction rollback. |
| Taxonomy materialization/rebuild | **OPTIONAL / conditional**; required only if the final catalog/search dependency audit proves stale materialization | Existing callable is source-defined but not live as `rebuildTaxonomyMaterialization`; preview/dry-run and production support `[NEEDS REPO CHECK]`. Rehearse DEV read-only diff, then bounded apply if approved. | Verify category/tag source-to-materialization counts and no customer-visible taxonomy regression. Restore from source-of-truth taxonomy by forward repair; no destructive cleanup. |
| Standard print-size setting transformation/reset | **OPTIONAL / owner decision** | Read current production setting and compare with candidate defaults. Do not reset or mutate automatically. If needed, create a separate reviewed settings operation with a dry-run diff and explicit owner approval. | Verify effective-DPI floor, 11-inch default, 15-inch upscale, and legacy-art handling in a safe canary. Roll back by restoring the exact prior setting document. |
| Generated asset cleanup, historical tag physical deletion, account hard-delete/merge, operational test-data wipe | **DEFERRED / NOT REQUIRED for this release** | No apply, cleanup, hard delete, merge, or wipe. Existing cleanup scripts/callables remain separately gated. | These are destructive or hard to reverse. Preserve compatibility fields and old assets until a separate plan proves necessity, inventory, retention, and recovery. |

Universal rehearsal pattern: dry run → sanity review → bounded/canary apply → full apply in bounded batches → post-apply dry run expecting zero. Record operator, SHA, command, scope, counts, failures, retries, and verification artifact. Stop on any unexpected write, duplicate, permissions error, provider drift, or non-idempotent second run.

## 7. Maintenance capability as the first coordinated safety layer

The signed-off DEV prerequisite is now incorporated into the full candidate; no standalone
production maintenance release is required or implied. The implementation and DEV-QA record is
`docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-signoff.md`.
Its audited production surfaces are:

- shared maintenance contract and defaults;
- `getPortalMaintenanceState`, `updatePortalMaintenanceState`, and
  `listPortalMaintenanceTestCustomers`;
- the 34 guard-bearing customer callable exports in 28 source files;
- Firestore and Storage Rules customer-write enforcement;
- Portal runtime provider, full-screen experience, tester banner and auth/navigation behavior;
- Studio Settings control, separate heading/message fields and eligible tester selection; and
- the reviewed Admin Show Queue recovery/denial surface.

The production contract is unchanged: an absent `settings/portalMaintenance` document means OFF;
the document is not initialized for rollout preparation; owner/admin control is protected; merged,
disabled and otherwise ineligible customer accounts are excluded; stale-client customer callables
and direct Firestore/Storage customer writes are blocked when ON; the configured tester retains
normal Portal access with the testing banner; and staff recovery paths remain available. The
public read path is runtime-based, not a build-time flag, and its failure behavior remains the
reviewed safe contract.

At candidate freeze, every maintenance source path must appear in the generated transitive
Function closure, Rules/Storage Rules manifest, Portal manifest and Studio package manifest. The
maintenance exports/guards are explicit entries in the full candidate allowlist; DEV revision IDs
are never reused in production. The complete candidate is deployed from one frozen SHA, while the
maintenance setting remains absent/OFF until the separate ON checkpoint below.

## 8. Lean DEV journey QA

Automated tests provide breadth. Owner DEV QA is limited to these five journeys on the frozen RC (or the approved maintenance DEV build), with exact fixture IDs recorded in the QA report. The identity/admin read checks are combined because both are read-only authorization and cross-app identity risks; merge/hard-delete applies remain preview-only or excluded.

| Journey | Short steps and expected outcomes | Accumulated risk covered |
|---|---|---|
| D1 — Portal customer request lifecycle | Sign in as a DEV customer → open Design Library/search and a show → add one catalog design → upload a PNG and accept the artwork consent/quality path → edit the working request, verify effective DPI/size and 15-inch upscale behavior → save/park → return and submit/acknowledge the show price commitment → verify one working request and correct card state. | Portal catalog/search, upload intake, sizing, upscale, editing park/restore, show commitment, Algolia contract, customer-safe mutations. |
| D2 — Studio catalog intake to Ready/search | In Studio DEV, import/promote one controlled PNG → inspect AI Review (autonomy remains OFF) → make the approved staff decision → mark/observe Ready → search the Design Library and Portal catalog → verify Smart Profile/facet/title provenance and preview derivative. | Import/background, AI review/reprocess, Smart Profile/tag retirement, Portal/Studio parity, storage access, provider/config safety. |
| D3 — Studio request/show production path | Use a DEV fixture request → edit/remove to Editing → re-add through the atomic callable → allocate to an upcoming show → move/recover a Needs Attention/DNP allocation → create/export the appropriate gang-sheet mode → verify totals, allocation lineage, queueTab, and no partial/stuck state. | Rules expression budget, lifecycle writers/mirrors, atomic allocation, show move/recovery, gang-sheet/export, rollback/partial-write risk. |
| D4 — User Info, identity and owner/admin queue | Update a DEV customer's profile/username through Portal → inspect Studio User Info and request history newest-to-oldest → run duplicate/merge previews only (no destructive apply) → as owner/admin open Portal `/admin/show-queue`, inspect one show/request/design modal and compare one request with Studio. | Identity/profile, username cooldown, lifecycle reader, merge safety, new admin callables/UI, auth boundaries, customer-name resolution, performance and cross-app parity. |
| D5 — Maintenance gate | Enable the DEV maintenance toggle → guest and authenticated customer sessions see the maintenance/read-only state; attempt one customer mutation and receive the stable maintenance error → owner/admin can still inspect/recover → disable toggle and verify normal flow resumes without rebuild or stale-cache persistence. | Maintenance control plane, callable guard coverage, caching/fail-closed behavior, staff recovery. |

DEV journey stop conditions: any permission error, missing index, partial allocation, duplicate logical request, unexpected provider call, stale maintenance bypass, unsafe destructive prompt, or mismatch between Portal/Studio result. Record evidence; do not “work around” a failed journey by changing production.

## 9. Small production smoke checklist

Run only after the ordered deployment steps and with owner-approved, named accounts/fixtures. Keep this materially smaller than DEV QA.

1. **Public read + safe customer proof:** open `https://myprintrequest.com` in a clean session; load home, one public show, Design Library, one search/filter and one design detail. Then, with the designated smoke customer, add one existing public design to the existing working request (or create the explicitly approved smoke request), verify one harmless edit, and remove/clear it using the documented cleanup callable. Expected: public reads work, one correct request, no duplicate, no data outside the named fixture. If owner declines a production write, mark this check NO-GO rather than claiming backend correctness.
2. **Owner/admin read-only:** open `/admin/show-queue`, inspect one upcoming show and request/design modal, verify identity labels and no unauthorized customer access.
3. **Studio packaged smoke:** install/launch the exact RC on the approved operator machine; sign in, open Design Library and User Info, inspect one request/history and search. Do not allocate or mutate a real production show unless separately approved.
4. **Maintenance toggle:** only at the coordinated window, enable briefly, verify public/customer block and staff recovery, then disable and recheck the public read. Record timestamps and cache behavior.

## 10. Frozen release-candidate verification

Candidate freeze is a gate, not a suggestion:

1. Complete the owner-approved scope and disposition the state edit plus both untracked planning/review files. No runtime work, unrelated docs, or secrets may be silently included.
2. On `development`, fetch/verify the exact remote commit, record `git rev-parse HEAD`, `git status --short --untracked-files=all`, branch/upstream, and `git diff --check`. Confirm candidate is the intended descendant of `origin/development` and that the production tree delta is the reviewed one.
3. Re-run the Function export diff, Rules/index diff, Portal/Studio/shared package file inventory, dependency graph, secret-name/config inventory, and DEV-only exclusion audit at that exact SHA. Save the generated allowlists in the review packet.
4. Run the strongest practical automated suite from that SHA:
   - `npm ci` in the clean validation environment.
   - `npm run lint`.
   - Portal typecheck (`npm run typecheck --workspace @fresh-prints/portal`) and `npm run build:portal`.
   - Functions build (`npm --prefix functions run build`).
   - Studio typecheck (`npx tsc --noEmit` from the Studio package) and `npx vite build`/the documented Studio build command.
   - Full Rules tests (`npm run test:rules`, Java 21+ available) and the focused Function/Portal/Studio contract suites.
   - Release policy tests such as `.github/scripts/publish-studio-stable-github-release.test.ts` and `.github/workflows/studio-release-signing-policy.test.ts`.
   - `git diff --check` and package/release metadata checks.
5. Record pass/fail counts and distinguish documented baseline failures. The known Windows Portal `.next/trace` EPERM build issue and prior unrelated Studio typecheck failures remain blockers only if reproduced outside the documented environment or worsened by the candidate.
6. Once the RC report is accepted, freeze the runtime candidate tuple: exact SHA, runtime tree hash/manifests, lockfile, generated assets, build configuration, and approved deploy/data allowlists. Later workflow documentation is permitted only in explicitly documentation-only paths (`docs/**`, `.cursor/workflow/**`, and the handoff state/review records); it must not alter the frozen SHA, runtime tree, package/config/secret inputs, generated assets, or manifests. Mechanically verify every post-freeze commit with `git diff --name-only <frozen-sha>..<post-doc-sha>` and reject any path outside the documented documentation-only allowlist. Release/test/deployment/signoff records may therefore be written after freeze while all deployed runtime layers still resolve to the one exact frozen SHA. Any application, Function, Rules, index, Portal, Studio, shared package, lockfile, build config, secret/config, or generated-asset change invalidates the freeze and repeats the gates.

No test result is claimed by this Plan; the above are required future gates.

## 11. Studio RC-before-production strategy

From the frozen SHA, dispatch the existing release workflow with `release_type=prerelease`/validation-only semantics on `development` to create non-published Actions artifacts. Install the exact Windows/Mac architecture packages in the safe DEV/approved validation environment and complete D2–D4 plus installer/update checks. Verify package version, tag/release metadata, source SHA, asset count, architecture, and checksums. Do not publish the prerelease as stable.

Compatibility finding for the maintenance controls: Studio calls the three maintenance Functions and
uses the shared contract; it has no dependency on the Portal bundle. A Studio-before-Portal release
is therefore technically compatible only after the reviewed backend Functions/Rules are live and
the owner commits to keep the setting absent/OFF. It is not required for Portal compatibility and
would expose a live toggle while the old Portal still cannot render maintenance. The recommended
order is one coordinated Studio release after the Portal candidate has passed its smoke, with no
maintenance-only Studio release. If an owner later requires Studio-before-Portal, that is a separate
checkpoint requiring the same frozen SHA, backend probes, and an explicit OFF hold.

Only after backend compatibility is deployed, Portal smoke passes, and production readiness GO is recorded: dispatch the stable workflow from the exact frozen production-reachable SHA, verify the draft release and all eight assets, obtain the separate owner publish approval, then publish. Record the published tag/SHA; immediate Studio rollback is `v1.0.9`, with `v1.0.8` secondary. A runtime source or version change after RC verification requires a new RC and review; documentation-only records may follow the frozen-runtime contract above.

## 12. Portal rollout strategy

1. Backend compatibility (Rules, indexes, Functions, required data prerequisites) is verified before the Portal build that calls new contracts. Keep compatibility readers and legacy fields while data catches up.
2. Enable maintenance only through the runtime toggle included in the same coordinated candidate; do not bake it into App Hosting environment variables. The absent production document remains OFF.
3. Roll out App Hosting from the frozen SHA through the existing Git-connected backend, verify build status, revision, 100% traffic, canonical origin, Firebase/Algolia secret-name bindings, and smoke checks. The immediate rollback is the currently live `fresh-prints-portal-build-2026-08-24-003`; record the new revision before changing traffic. Keep `build-2026-08-24-002` only as a secondary fallback.
4. Handle stale client chunks deliberately: use the documented hard-refresh/cache-busting response if a stale chunk appears; do not publish a corrective Portal build from a different SHA without re-freezing.
5. Roll back traffic to the recorded prior revision if the smoke fails and preserve backend compatibility until the Portal rollback is confirmed. Forward-repair data only after the UI/backend pair is stable.

**Backend/Rules-before-Portal exposure finding:** between the Rules/Functions deployment and the new
Portal rollout, production may still serve the old Portal client. Because the approved state is
absent/OFF, that interval has no customer-facing maintenance behavior change. Turning maintenance
ON in that interval would make stale clients receive conservative callable failures without the
reviewed full-screen wall/banner, which is a degraded emergency mode and is not part of this plan.
The owner must keep maintenance OFF until `FULL MAINTENANCE CAPABILITY READY`; any emergency ON
decision requires a separate explicit checkpoint.

## 13. Dependency-safe deployment order and gates

The following is the reconciled Strategy B execution order. Every row is an independent owner
checkpoint; exact commands must be substituted only after the frozen-SHA manifest is generated.
The proposed Functions-before-Rules order was not adopted: indexes and Rules precede Functions so
direct customer writes and callable guards become enforceable as one compatible backend layer. The
setting remains absent/OFF throughout these steps.

| Order | Prerequisite/action | Verify and rollback | STOP / owner checkpoint |
|---|---|---|---|
| M0 | Resolve the working tree and inherited untracked documents; implement only the owner-approved coordinated scope on `development` through the normal reviewed path. | Every included/excluded path is recorded; no production action. | STOP on unresolved scope, unreviewed hard-delete UI, or unrelated runtime drift. |
| M1 | Create one immutable committed candidate, push through the normal reviewed source path, mechanically generate the full deployment manifest and transitive Function closure, then freeze the exact SHA/tree. | Record SHA, upstream proof, clean status, closure, Rules/index/Portal/Studio manifests and documentation-only continuation allowlist. Any runtime/config/package change invalidates freeze. | Owner approves “FREEZE MAIN CANDIDATE SHA.” |
| M2 | Capture immutable production rollback baselines keyed to the frozen SHA: Git, Portal build-003, Studio `v1.0.9`, all live Function IDs/revisions/hashes, Firestore/Storage Rules exports and hashes, indexes, settings, Algolia, Auth and secret-name/version metadata. | Store remote Ruleset IDs/hashes and exports before mutation; never print secret values. | STOP if any baseline or export is incomplete. Owner approves “BASELINE SNAPSHOT ACCEPTED.” |
| M3 | Run the automated RC suite, Studio prerelease package/install/update checks, five DEV journeys, and only the approved bounded/read-only rehearsals. | Reports are attached and unchanged baseline failures are identified. | STOP on any new failure, missing binding, failed idempotency, provider drift or hard-delete leakage. Owner approves “RC READY FOR MAIN RELEASE.” |
| M4 | **Main production-readiness GO/NO-GO checkpoint** with the packet in Section 15. | Explicit GO names the frozen SHA and this coordinated sequence; maintenance is still absent/OFF. | STOP unless the owner says “GO — execute the approved production-readiness sequence for candidate `<SHA>`.” |
| M5 | Add only the reviewed union of Firestore indexes; retain the legacy `designs(status ASC, updatedAt ASC)` index; use no `--force`; wait for required indexes READY. | Query probes for lifecycle/catalog/queue paths; no missing-index errors or deletion proposal. Roll back by retaining indexes; cleanup is separate. | STOP on index error, unexpected deletion, or capacity issue. Owner approves “INDEXES READY.” |
| M6 | Deploy the reviewed Firestore Rules and Storage Rules candidate, including the maintenance direct-write guards, compatibility readers, hard-delete exclusions and DEV-only guards. | Rules tests/probes and Storage staff-read/direct-client-denial probes; restore the snapshotted rulesets/source if needed. | STOP on any permission regression, public write exposure or hard-delete path exposure. Owner approves “RULES READY.” |
| M7 | Deploy the reviewed Functions by explicit transitive-closure allowlist of additions/updates, including the three maintenance control callables and all 34 guard-bearing exports required by the frozen client. No broad `--only functions`, deletion or hard-delete pair. | List live IDs/revisions/hashes; callable auth probes, logs/error rate and compatibility-reader state. Roll back each Function to its recorded prior revision/source; forward-repair side effects. | STOP on failed deploy, provider/auth mismatch, source-only Function appearing or unapproved export. Owner approves “BACKEND READY.” |
| M8 | Apply only explicitly approved settings/config changes and non-disruptive data prerequisites; keep AI autonomy and Pass 2 OFF and do not create `settings/portalMaintenance`. Maintenance-dependent data operations wait for the ON checkpoint. | Read back settings and secret-name metadata; verify the maintenance document remains absent/OFF. Restore prior setting version if required. | STOP on any unapproved flag, secret, Auth, billing or production write. Owner approves each mutation. |
| M9 | Roll out the Portal App Hosting candidate from the frozen SHA after backend compatibility and required data checks. | Revision/traffic, origin, bindings, stale-client handling and Portal smoke. Immediate rollback is build-003; build-002 is secondary. | STOP if Portal smoke/backend compatibility fails. Owner approves Portal traffic. |
| M10 | Publish the one coordinated Studio stable release built/tested from the same frozen SHA after Portal smoke; no maintenance-only Studio release. | Tag/assets/checksums, install/update, Settings access and small Studio smoke. Immediate rollback is `v1.0.9`; `v1.0.8` is secondary. | STOP if metadata/SHA/assets differ. Owner approves “PUBLISH STUDIO.” |
| M11 | **FULL MAINTENANCE CAPABILITY READY (OFF)**: confirm Studio owner/admin control and eligible tester list, Portal OFF/normal mode, runtime public-safe state read, 34 callable guards, and direct Firestore/Storage enforcement are all present from the same SHA. | Read the absent document as OFF; verify no customer wall/banner or mutation block while OFF; record that ON behavior is available but not activated/tested. | STOP if any surface is missing, malformed, stale, unauthorized or fails safe. Owner approves “FULL MAINTENANCE CAPABILITY READY.” No ON transition before this row. |
| M12 | Separate owner checkpoint: optionally turn maintenance ON for the remainder of the rollout, using the approved configured tester and reviewed reversible safe-write fixture. If not approved, continue with maintenance OFF and do not claim ON behavior was production-tested. | Verify ON state/readback, ordinary customer wall, tester normal access/banner, guarded callable and direct-write denial. | STOP unless the owner explicitly says “GO — enable production maintenance for the rollout.” |
| M13 | Continue remaining coordinated release/data sequence. Run only selected lifecycle/Smart Profile/Algolia operations under their conditional gates; maintenance-dependent or disruptive operations run only while ON and owner-approved. QueueTab backfill, hard-delete, physical cleanup and source-only Function deletion remain deferred. | Canary/zero-diff reports where supported; full Algolia rebuild has no bounded-canary claim. Forward-repair or restore snapshots; data rollback is not assumed transactional. | STOP on nonzero diff, duplicate/event fabrication, provider drift or unsafe partial state. Owner approves each apply. |
| M14 | Run the four production smoke checks, including the owner-approved reversible customer mutation if authorized; verify Studio/admin recovery and maintenance behavior. | Smoke report, logs, no duplicate/partial state; honest NO-GO for any declined write proof. | STOP on any smoke failure; owner approves final release completion. |
| M15 | Ensure maintenance is OFF, read back the absent/OFF contract (or restore the exact prior OFF document if one existed), and declare the rollout complete only after normal Portal/customer reads and writes recover. | Record final OFF readback and toggle audit. Re-enable only for containment; roll back Portal/Functions/Studio as appropriate. | STOP if OFF cannot be proved. Owner approves “RELEASE COMPLETE.” |
| M16 | Leave compatibility cleanup, physical tag deletion, source-only Function deletion, hard-delete production enablement and destructive data cleanup deferred. | Open separate plans with inventory/retention/recovery. | STOP; no cleanup is part of this promotion. |

## 14. Rollback and forward-repair matrix

| Surface | Record before mutation | Rollback/repair |
|---|---|---|
| Git/source | Candidate SHA, production SHA, tree/status, manifests | Revert traffic/deploy to the prior reviewed SHA; never reset a user's worktree. Any source change reopens freeze. |
| Portal | Current serving revision `build-2026-08-24-003`, older secondary `build-2026-08-24-002`, traffic and binding metadata | Route traffic to immediate prior build-003 for the upcoming rollout; use build-002 only if the new revision and build-003 both require fallback. Retain compatible backend until verified. Address stale chunks with documented cache response. |
| Studio | Published stable `v1.0.9` target/assets; secondary historical `v1.0.8` | Stop publication/update distribution or restore immediate prior stable `v1.0.9`; use `v1.0.8` only as secondary fallback. A corrective build requires a new frozen SHA/RC. |
| Functions | Every live ID, revision, source hash, runtime, and allowlist | Redeploy the prior revision/source per function; do not delete. For event-trigger side effects, verify and forward-repair data. |
| Firestore/Storage Rules | Export source, deployed ruleset ID/hash, tests and release record | Restore prior ruleset/source after owner approval; re-run rules probes. Keep compatibility fields. |
| Indexes | 77 live definitions, new index IDs/status, retained legacy index | Leave additive indexes; route clients to compatibility readers. Delete only via separate reviewed cleanup. |
| Settings/flags | Exact prior documents/values and secret names/versions (never values in logs) | Restore prior setting version; never rotate/mutate secrets as an emergency workaround without checkpoint. |
| Algolia | Index name, count, settings, searchable attributes/facets/ranking, sample IDs, prior index/alias | Restore settings or switch to prior index if supported; otherwise idempotent upsert/delete forward repair from Firestore source. |
| Backfills/mirrors | Pre-run export/counts, batch ledger, canary IDs, post-run report | Mirror/field writes are not assumed reversible. Keep compatibility reader, restore from field snapshot where safe, or forward-repair with idempotent script. |
| AI/reprocess | Design IDs, provider/model/config, provenance and field-level before snapshot | Pause/retry/repair; do not bulk overwrite staff decisions or enable autonomous Pass 2. |
| Maintenance | Prior disabled state, implementation revision, toggle audit | Re-enable for containment, restore prior backend/Portal revision, and verify staff recovery. |

## 15. Mandatory final production-readiness checkpoint

Immediately before Order M5 in the execution table (the first **main coordinated-release** production
mutation), present the owner one packet containing:

- frozen candidate SHA and clean-tree/upstream proof;
- exact production baseline and source/runtime drift, including Portal revision, Studio release, Functions 113/120 distinction, Rules/Storage Rules, 77 indexes, Algolia, settings, Auth and secret metadata;
- complete generated Function/Rules/Storage/index/Portal/Studio/config/data manifest, including every addition/update/deletion and all explicit exclusions;
- exact ordered production actions/commands with per-step verification and rollback targets;
- automated RC results, documented baseline failures, DEV journey QA results, and every data rehearsal report;
- the signed-off maintenance implementation/DEV QA, its complete source/guard manifest, production
  readiness evidence and disabled-by-default state; this is a layer of the same candidate, not a
  separately promoted prerequisite;
- the exact `FULL MAINTENANCE CAPABILITY READY` evidence plan and the separate ON checkpoint; no ON
  authorization is implied by this packet;
- Studio RC package/SHA/metadata verification and Portal rollout/rollback target;
- unresolved risks, `[NEEDS REPO CHECK]` items, owner-approved fixture/write scope, and explicit GO/NO-GO recommendation.

The default recommendation is **NO-GO** until all required evidence is attached and every blocker below is closed. The owner must say **“GO — execute the approved production-readiness sequence for candidate `<SHA>`”** (or **“NO-GO”**). If GO is not explicit, STOP and do not mutate production.

## 16. Known blockers and `[NEEDS REPO CHECK]` items

- The Studio hard-delete production UI gate is now closed by the child Plan/Review/Signoff
  (`docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md`). Both
  hard-delete Function exports remain excluded from the production allowlist; the child source and
  focused test evidence must be included in the frozen-SHA audit.
- Exact remote Firestore/Storage Ruleset IDs/hashes and an immutable pre-mutation export.
- Exact production Algolia record count/settings/sample IDs and reconcile dry-run/batching/alias capabilities.
- Production-safe (not DEV-pinned) lifecycle mirror and queueTab backfill targets, dry-run flags, batch limits, and repair/export behavior.
- Whether Smart Profile reprocess is required for the intended production tag retirement; provider cost/quotas and field-preservation proof.
- Current production settings documents/flags, especially lifecycle indexed-reader state, standard sizes, catalog workflow mode, AI/Pass 2, and customer quotas.
- Current Auth provider metadata and all candidate-required secret names/versions; values must remain hidden.
- Exact transitive Function dependency graph and generated deploy allowlist from the frozen SHA.
- Production reconciliation of the signed-off maintenance manifest at the frozen SHA, including the
  transitive Function closure, Rules/Storage Rules whole-file diff, Portal/App Hosting build inputs,
  Studio package inputs and the absent/OFF production setting. The DEV revisions are evidence only,
  not production rollback targets.
- Exact production-safe reversible customer mutation fixture and operator/owner approval for a
  later safe-write smoke; no production write is performed without that approval.
- Verify the explicit Portal admin signoff inclusion and request-design parity exclusion in the
  frozen packet, and decide whether the current state documentation continuation is committed
  before freeze.
- Node.js 20 Functions migration deadline (2026-10-30) and `sharp` 0.33.5 vulnerability are tracked risks; neither is silently expanded into this promotion.
- Documentation drift: older Firebase/Workflow text says Gemini-only/OpenAI removed while current ADR/backend source restores OpenAI Luna; older architecture catalog text says Algolia pending while current runtime uses Algolia. Resolve before final review.

## 17. Plan acceptance checklist

- [x] Exact Git/source, Portal, Studio, Functions, index and live runtime baselines recorded.
- [x] Merge/history-only divergence separated from source/runtime drift.
- [x] Post-baseline signoffs inventoried and deployment notes reconciled.
- [x] Every Function addition, direct update, source-only export, and deletion classified.
- [x] Firestore Rules, Storage Rules and indexes classified, including the unsafe index deletion.
- [x] Portal, Studio, shared package, settings, secret metadata, Auth and search dependencies classified.
- [x] Required/optional/deferred data operations and bounded rehearsal pattern defined.
- [x] Signed-off DEV maintenance implementation and QA are incorporated as a required layer of the
  same frozen candidate; no standalone maintenance-only production release is required.
- [x] Lean DEV journeys and smaller production smoke checklist provide exact steps/outcomes.
- [x] Frozen-SHA automation, Studio RC-before-production and Portal rollout/rollback are defined.
- [x] Dependency order, per-step verification, STOP conditions, owner checkpoints, rollback/forward repair and final GO/NO-GO packet are defined.
- [x] No production resource or application code was changed by this Plan.

**Review-phase stop:** Formal Review is `approved_with_changes` and the owner has accepted this
Strategy B amendment. M0 preparation may proceed, but do not freeze the candidate, apply rehearsal
data, begin production readiness, or deploy from this artifact until the remaining M0 clean-candidate
and immutable-manifest blockers are closed. The hard-delete child gate is signed off and the
maintenance-promotion child is recorded as
`superseded_by_coordinated_candidate`, not as a standalone production deployment.
