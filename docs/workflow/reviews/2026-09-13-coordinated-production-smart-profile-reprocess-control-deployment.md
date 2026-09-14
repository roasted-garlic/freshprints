# Production Smart Profile Reprocess Control Deployment

Date: 2026-09-13
Parent goal: `coordinated-production-promotion-release-readiness`
Project: `fresh-prints-prod`
Frozen candidate: `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`

## Owner authorization and preflight

The owner authorized the minimum reviewed production reprocess-control deployment while
maintenance remained ON. `HEAD` is the frozen candidate and the reprocess source/config paths have
no runtime/config working-tree deltas. Provider secret metadata confirms `GEMINI_API_KEY` and
`OPENAI_API_KEY` each exist with an enabled version; no secret values were read or displayed.
The selected provider/model remains Google `gemini-2.5-flash-lite`. Final Firestore Rules remain
released from ruleset `dbd35333-5156-4ebe-ae48-92cb7b829741`; autonomy and Pass 2 remain OFF.

## Minimum deployed allowlist

The following six reviewed Functions were deployed and verified ACTIVE in `fresh-prints-prod`:

- `previewCatalogReprocessJob`
- `startCatalogReprocessJob`
- `pauseCatalogReprocessJob`
- `resumeCatalogReprocessJob`
- `retryCatalogReprocessJobFailures`
- `onCatalogReprocessJobWritten`

`reprocessReadyDesignWithAi` was intentionally not deployed: the full Ready-catalog job executes
the reviewed enrichment pipeline through `onCatalogReprocessJobWritten` and its worker; the
single-design callable is not required for this bounded job. No broad Functions deployment occurred.

The deployment completed successfully with the repository Functions build. Existing Node 20 and
firebase-functions version warnings were emitted by the CLI; they were not deployment failures.

## Preview / APPLY boundary

The reviewed controls are present in the current Studio source. Route `/settings?tab=aiEnrichment`
opens the Settings page on **AI Enrichment**; select the **Catalog Reprocessing** subtab, then use
the **Ready Catalog → Preview** button. The same section owns the reviewed Start control and the
Recent jobs Pause, Resume, and Retry failures controls. The controls call the deployed Functions
listed above.

The owner subsequently completed the authenticated Studio preview and reported a PASS. The accepted
preview reconciles exactly to 2,734 eligible Ready designs: 0 already current, 2,734 requiring the
reviewed reprocess, no active job, and tag-density buckets of zero=0, low=151, high=2,583.
The read-only production job inventory also found zero `ready_catalog` jobs. No preview job was
created by this shell, no `startCatalogReprocessJob` call was made, and no provider call or design
write occurred.

The accepted read-only baseline remains:

- eligible Ready designs: 2,734;
- already-current Smart Profiles: 0;
- requiring reprocess: 2,734;
- malformed/unsafe: 0;
- target prompt: `catalog-enrich-v37`;
- target normalizer: `smart-profile-normalizer-v6`.

Maintenance remains ON throughout. A final read-only settings check found the selected provider
`gemini-2.5-flash-lite`, autonomy OFF, and Pass 2 OFF, but production Catalog Processing Mode
resolves to `manual` because `settings/aiEnrichment.catalogWorkflowMode` is absent. The reviewed
`startCatalogReprocessJob` callable requires production `shadow` mode before it will create a job
(`functions/src/catalogReprocess/catalogReprocessCallables.ts:54-60`; covered by
`catalogReprocess.slice5.contract.test.ts`).
This is a material precondition mismatch; changing production configuration is outside the current
authorization, so Start was not invoked and the reprocess remains blocked.

## Production boundary before owner Start

Before the owner-authenticated Start checkpoint, no Smart Profile APPLY, provider call, catalog
reprocess job, Algolia reconcile/clear/rebuild, Portal or Studio build, flag change,
autonomy/Pass 2 enablement, tag deletion, maintenance OFF, or unrelated production mutation
occurred. The subsequent job execution is recorded below under its explicit owner authorization.

## Owner-authenticated Ready Catalog reprocess monitoring — 2026-09-13

Owner-authenticated post-Shadow Preview PASS was followed by Start, creating job
`GB4fUzW0Om10xev21Yd4` for `ready_catalog`. The job reached terminal `completed`: original target
2,734; processed 2,736; retry count 2; 2,734 unique outcome documents, all `succeeded`; failed=0
and skipped=0. The +2 processed count is fully accounted for by retry attempts and does not
represent duplicate design population. Final job counters report hardBlocked=12 (successful
shadow-review classifications), anomalies=0, and preservationViolations=0.

Fresh read-only production inventory found 2,734 eligible Ready designs, all still
`status=ready` and `aiReviewStatus=approved`; no lifecycle demotion or unpublishing occurred.
Smart Profiles are present on all 2,734, with missing=0 and malformed/unsafe=0. Every profile is
stamped `catalog-enrich-v39` / `smart-profile-normalizer-v7`.

Frozen-source reconciliation resolves this as the authoritative target. At candidate
`7b8462a0fe60e484a937a7c88fc37e7c938fff6d` (and production merge
`f615c38dbe15c37c494ce057544463843ead866e`, with the relevant paths byte-identical):

- `packages/shared/src/constants/smartProfile.constants.ts` sets the active default prompt to
  `catalog-enrich-v39` and normalizer to `smart-profile-normalizer-v7`.
- `functions/src/ai/catalogTitleRules.ts` emits prompt `catalog-enrich-v39`; the Gemini provider
  stamps that constant.
- `packages/shared/src/utils/smartProfileNormalization.ts` stamps `SMART_PROFILE_NORMALIZER_VERSION`
  (`smart-profile-normalizer-v7`).
- The Ready Catalog worker invokes `runAiEnrichmentPipeline(..., { mode: "ready_backfill" })`, so
  it uses those active runtime constants; `onCatalogReprocessJobWritten` invokes that worker.
- `packages/shared/src/utils/resolveSmartProfilePipelineStatus.ts` declares a profile current
  only when it matches the active v39/v7 constants.

The v37/v6 values are stale reprocess snapshot labels in `catalogReprocess.constants.ts` and older
rollout evidence. Later accepted work explicitly advanced the Pass 1 prompt to v39 and the Studio
AI polish accepted normalizer v7 for category-alternative reason caps (see
`docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-pass1-contract-cleanup-review.md` and
`docs/workflow/reviews/2026-09-08-ai-processing-live-review-auto-process-and-ui-polish-signoff.md`).
Therefore the production reprocess is **COMPLETE** at authoritative v39/v7: current=2,734,
missing=0, stale=0 relative to the frozen source, failed=0, malformed/unsafe=0. No provider calls
or reprocess rerun occurred in this reconciliation. Autonomy remains OFF, Pass 2 OFF, Catalog
Processing Mode remains `shadow`, maintenance remains ON. No Algolia action, publication, flag
change, or unrelated production mutation was performed.

## Next checkpoint

The Smart Profile production reprocess is **COMPLETE** under authoritative frozen-source v39/v7.
The earlier v37/v6 completion expectation is explicitly superseded as historical-only. The exact
next owner checkpoint is **`OWNER AUTHORIZE PROD ALGOLIA SMART PROFILE SEARCH RECONCILE/APPLY`**.
