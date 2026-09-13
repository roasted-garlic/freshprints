# WS5 Autonomous DEV Canary Enablement Checkpoint

> **2026-09-05 narrow refresh:** See  
> `docs/workflow/reviews/2026-09-05-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-enablement-checkpoint-refresh.md`  
> for post–Explicit Content corrective revisions, settings, 4/2 replay reconfirmation, Explicit fixture gap, and readiness.  
> Historical pre-corrective findings below are preserved.

| Field | Value |
|---|---|
| Date | 2026-09-04 |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | WS5 Autonomous DEV Canary |
| Environment | `fresh-prints-dev` |
| Status | read-only preflight complete; enablement not authorized — **superseded for live revisions/settings by 2026-09-05 refresh** |
| Plan | `docs/workflow/plans/2026-09-04-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-plan.md` |
| Formal review | `docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-review.md` |
| Verdict | `approved_with_changes` for preflight/checkpoint only |

## A. Live Settings

Read-only DEV Firestore inspection of `settings/aiEnrichment` confirmed:

| Field | Current value |
|---|---|
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| `visionModelId` | `gemini-2.5-flash-lite` |
| `reasoningEffort` | `medium` |
| `tagRerankMode` | `auto` |
| `suggestionAuthorMode` | `auto` |
| `suggestedNewTagsPolicy` | `strict` |
| `updatedBy` | `4gxOZTsGmxfZIA28mxNF2Hh46fY2` |
| `updatedAt` | 2026-09-04T18:12:01.434Z |

Dual gate is mechanically confirmed in
`packages/shared/src/constants/catalogWorkflowMode.constants.ts` and
`functions/src/ai/loadAiEnrichmentSettings.ts`: live Autonomous publication requires
`catalogWorkflowMode === "autonomous"` and `catalogAutonomousLiveEnabled === true`.
Missing or invalid settings resolve fail-closed.

Settings storage and update path:

- Storage: Firestore `settings/aiEnrichment`.
- Supported mutation path: callable `updateCatalogWorkflowMode`.
- Owner-only guard: `functions/src/updateCatalogWorkflowMode.ts`.
- Live enable phrase: `ENABLE AUTONOMOUS`.

Proposed future mutations, not executed:

1. Call `updateCatalogWorkflowMode` with `catalogWorkflowMode: "autonomous"` and no live enablement.
2. Verify `settings/aiEnrichment.catalogWorkflowMode === "autonomous"` and
   `catalogAutonomousLiveEnabled === false`.
3. Call `updateCatalogWorkflowMode` with `catalogWorkflowMode: "autonomous"`,
   `catalogAutonomousLiveEnabled: true`, and `confirmationPhrase: "ENABLE AUTONOMOUS"`.
4. Verify both persisted values live from Firestore.

The callable clears runtime cache in-process after each update. Already-running
invocations may have loaded settings before rollback or enablement; future
canary execution must treat in-flight work as auditable rather than cancellable.

## B. Canary Table

Read-only current replay used persisted `aiSuggestions`, `smartProfile`, and
current automation source. It did not invoke Gemini, enqueue, or write Firestore.

| Order | ID | Title for decision | Lifecycle | Authority-bearing | Current/replayed class | Expected if live enabled | Hard blockers | Owner audit burden |
|---:|---|---|---|---|---|---|---|---|
| 1 | `At5hu7vLjWgduiyzZCfR` | `I Don't Do Matching Shirts` | `imported` / `needs_review` | NO | `shadow`; would auto approve | Ready / approved | none | full Ready + Algolia audit |
| 2 | `nff6PpkZF9TNitnpX2Mm` | `Boston Terrier With Floral Bow Tie` | `imported` / `needs_review` | NO | `needs_review` | remain Needs Review | `category_gap_suggested`, `structured_evidence_gap:objects:flowers` | blocker audit |
| 3 | `03cbj1cIFH7Bavt38XBX` | `Michael Jackson Dancing Silhouette` | `imported` / `needs_review` | NO | `shadow`; would auto approve | Ready / approved | none | full Ready + Algolia audit |
| 4 | `LYJcsxnfUyacRWtntEkd` | `Highland Cow Relaxing In Inner Tube With Sunglasses` | `imported` / `needs_review` | NO | `needs_review` | remain Needs Review | `subject_specificity_risk:cow` | blocker audit |
| 5 | `Dr8lcyPE8imTQlNESP8X` | `Fantasy Castle Opens From Enchanted Book` | `imported` / `needs_review` | NO | `shadow`; would auto approve | Ready / approved | none | full Ready + Algolia audit |
| 6 | `1Ws0T9fivryest6IUSbt` | `Just Hit It Cannabis Leaves` | `imported` / `needs_review` | NO | `shadow`; would auto approve | Ready / approved | none | full Ready + Algolia audit |

Authority inspection:

- `smartProfile.provenance.staffEditedDimensionKeys`: empty on all six.
- `smartProfile.provenance.importPresetDimensionKeys`: empty on all six.
- `smartProfileImportPresets`: absent on all six.
- Staff title/category authority fields: none identified in current source or documents.
- Root `updatedBy` exists on records but is not treated as title/category authority.

Important expectation change: the prior formal review expected two auto approvals
and four Needs Review outcomes. Current persisted replay expects four auto
approval candidates and two Needs Review candidates. This checkpoint therefore
requires owner acceptance of the revised expectation before live execution.

Fixture gaps remain:

- `[FIXTURE GAP - natural verifier-worthy case]`
- `[FIXTURE GAP - imported human/preset-authority case]`

## C. Deployed Runtime

Runtime baseline from settings and persisted candidate provenance:

- Current settings model: `gemini-2.5-flash-lite`
- Current intended prompt: `catalog-enrich-v34`
- Current intended normalizer: `smart-profile-normalizer-v6`
- Current schema: `smart-profile-v1`

Candidate provenance:

| ID | Prompt | Normalizer | Schema |
|---|---|---|---|
| `At5hu7vLjWgduiyzZCfR` | `catalog-enrich-v32` | `smart-profile-normalizer-v6` | `smart-profile-v1` |
| `03cbj1cIFH7Bavt38XBX` | `catalog-enrich-v32` | `smart-profile-normalizer-v6` | `smart-profile-v1` |
| `Dr8lcyPE8imTQlNESP8X` | `catalog-enrich-v34` | `smart-profile-normalizer-v6` | `smart-profile-v1` |
| `nff6PpkZF9TNitnpX2Mm` | `catalog-enrich-v32` | `smart-profile-normalizer-v6` | `smart-profile-v1` |
| `1Ws0T9fivryest6IUSbt` | `catalog-enrich-v34` | `smart-profile-normalizer-v6` | `smart-profile-v1` |
| `LYJcsxnfUyacRWtntEkd` | `catalog-enrich-v32` | `smart-profile-normalizer-v6` | `smart-profile-v1` |

Current active Cloud Run revisions in `us-central1`, all 100 percent traffic:

| Function/service | Revision |
|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00094-wuz` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00005-fud` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00016-han` |
| `previewCatalogReprocessJob` | `previewcatalogreprocessjob-00011-wul` |
| `startCatalogReprocessJob` | `startcatalogreprocessjob-00011-zon` |
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00058-bop` |
| `updateCatalogWorkflowMode` | `updatecatalogworkflowmode-00001-med` |
| `syncPortalCatalogDesignToAlgolia` | `syncportalcatalogdesigntoalgolia-00005-riw` |
| `reconcilePortalCatalogAlgoliaIndex` | `reconcileportalcatalogalgoliaindex-00004-foj` |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | `reconcileportalcatalogalgoliaindexscheduled-00004-rew` |

Active reprocess job preflight:

- `ai_review_queue`: none pending/running/paused.
- `ready_catalog`: none pending/running/paused.

## D. Publication Safety

Approval path source trace:

1. `functions/src/enqueueAiEnrichment.ts` validates individual rerun eligibility.
2. `functions/src/ai/aiEnrichmentPipeline.ts` runs enrichment and calls candidate generation.
3. `functions/src/ai/aiEnrichmentCandidateCore.ts` computes automation decision.
4. `packages/shared/src/utils/catalogAutomationDecision.ts` applies hard blockers and dual gate.
5. `functions/src/ai/aiEnrichmentPipeline.ts` writes Ready/approved when `publishReady` is true.
6. System actor is `system:catalog-autonomy`.
7. `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` observes Ready writes.
8. Ready designs are upserted to Algolia index `portal_catalog_ready_dev`.
9. Publication metadata is written back to the design.

Publication success metadata:

- `portalCatalogPublicationStatus: "synced"`
- `portalCatalogPublicationUpdatedAt`
- `portalCatalogPublicationError` absent/deleted

Failure metadata:

- `portalCatalogPublicationStatus: "failed"`
- `portalCatalogPublicationError`
- `portalCatalogPublicationAttemptCount` incremented

Read-only health:

- Current Firestore designs with `portalCatalogPublicationStatus == "failed"`: 0.
- Current ready designs with `portalCatalogPublicationStatus in ["pending", "queued"]`: 0.
- Last 24h `syncPortalCatalogDesignToAlgolia` error/failure log query: no rows returned.
- Direct search-only Algolia query available: YES.
- Direct index: `portal_catalog_ready_dev`.
- Direct query result at preflight: OK, `nbHits=346`.

Retry/recovery:

- `syncPortalCatalogDesignToAlgolia` records failure metadata, increments
  Automation Health `publicationFailures`, and rethrows for Cloud Functions retry.
- `reconcilePortalCatalogAlgoliaIndex` and scheduled reconcile provide durable
  recovery by rebuilding current Ready records.

Publication health is clean for checkpoint purposes.

## E. Enablement

Do not execute until explicitly authorized.

Exact mutation #1:

- Path: callable `updateCatalogWorkflowMode`.
- Request: `{ catalogWorkflowMode: "autonomous" }`.
- Expected persisted result: `catalogWorkflowMode === "autonomous"`,
  `catalogAutonomousLiveEnabled === false`.

Exact mutation #2:

- Path: callable `updateCatalogWorkflowMode`.
- Request: `{ catalogWorkflowMode: "autonomous", catalogAutonomousLiveEnabled: true,
  confirmationPhrase: "ENABLE AUTONOMOUS" }`.
- Expected persisted result: `catalogWorkflowMode === "autonomous"`,
  `catalogAutonomousLiveEnabled === true`,
  `catalogAutonomousLiveEnabledAt` present,
  `catalogAutonomousLiveEnabledBy` present.

Live verification method:

- Read `settings/aiEnrichment` with Admin SDK or Firebase console.
- Verify both settings immediately before each individual enqueue.
- Do not submit candidate 1 until both values are confirmed.

## F. Rollback

Do not execute now.

Safest rollback path:

- Callable `updateCatalogWorkflowMode`.
- Request: `{ catalogWorkflowMode: "shadow", catalogAutonomousLiveEnabled: false }`.
- Expected persisted result: `catalogWorkflowMode === "shadow"`,
  `catalogAutonomousLiveEnabled === false`,
  `catalogAutonomousLiveEnabledAt` deleted,
  `catalogAutonomousLiveEnabledBy` deleted.

Rollback order is a single supported callable request selecting Shadow and false
live gate. Source behavior also clears live gate whenever mode is non-autonomous.

In-flight behavior:

- An invocation already past settings load may finish.
- Stop submitting additional reruns immediately.
- Audit any in-flight result to terminal lifecycle/publication state.

Already-approved behavior:

- Rollback prevents future autonomous approvals.
- Rollback does not demote designs already marked Ready.
- Any correction to a Ready design is a separate manual staff action.

## G. Stop Conditions

Future canary execution must stop immediately after any one of these:

- Any result differs from the owner-approved expected class in this checkpoint.
- A hard blocker reaches Ready.
- A policy-clear design remains Needs Review without an explained runtime failure.
- Any authority-bearing field is introduced or lost.
- `aiReviewedBy` is not `system:catalog-autonomy` for an auto-approved row.
- `approvalAudit`, if present, is malformed or inconsistent with system approval.
- `readyAt` is missing or anomalous on an auto-approved row.
- Publication metadata is `failed`, absent after the observation window, or inconsistent.
- Direct Algolia lookup/search fails for a Ready row.
- Any unexpected lifecycle mutation appears.
- Any runtime error occurs.

Stop procedure:

1. Stop submitting reruns.
2. Restore Shadow/live false through `updateCatalogWorkflowMode`.
3. Verify `settings/aiEnrichment` live.
4. Audit in-flight work to terminal state.
5. Record the anomaly before any further action.

## H. Owner Authorization

WS5 is ready only for an owner decision on the revised canary expectation:
four current replay auto-approval candidates and two hard-blocked Needs Review
candidates. It is not authorized to execute.

[NEEDS OWNER AUTHORIZATION - ENABLE WS5 AUTONOMOUS DEV CANARY]
