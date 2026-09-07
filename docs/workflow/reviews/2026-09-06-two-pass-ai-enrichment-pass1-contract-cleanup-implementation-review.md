# Implementation Review — `catalog-enrich-v39` Pass 1 Contract Cleanup

**Date:** 2026-09-06  
**Plan:** `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-pass1-contract-cleanup-plan.md`  
**Formal Review:** `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-pass1-contract-cleanup-review.md`  
**Environment:** `fresh-prints-dev` source only  
**Status:** implementation and scoped validation complete; stopped before DEV deployment  
**Provider/model:** Google / `gemini-2.5-flash-lite`  
**Prompt versions:** `catalog-enrich-v39`, `catalog-enrich-dev-v39`

## Outcome

The reviewed Pass 1 corrective is implemented. The active request now uses the owner-approved visual-only v39 prompt, the cleaned strict `catalog_enrichment` schema, dynamic approved-category descriptions, canonical `visibleText`, retained Smart Profile/VCP fields, and no provider-side `maxItems` constraints.

The owner supplied the required direct-Gemini gate evidence: the no-`maxItems` request and fully cleaned v39 request both returned HTTP 200. Codex did not invoke Gemini, Firebase, or any deployed Function during this implementation.

## Implemented scope

- Installed the exact v39 default prompt and retained v38 as a recognized stock Settings prompt for read-only reconciliation. Genuine custom prompts remain custom.
- Removed active Pass 1 generation and UI/runtime handling for tags, suggested-new-tags, aliases, `preferredWhen`, suggested-tag reasons, and AI halftone assessment.
- Removed the dead Tag Rerank/Suggestion Author provider modules and candidate-core execution scaffolding. Historical tag resolver/type data remains inert compatibility code only.
- Removed obsolete Settings controls, Playground tag controls, suggested-tag inbox UI/handlers, tag telemetry, tag cost display, AI tag field mapping, and AI halftone review display. Manual/intake halftone authority remains unchanged.
- Retained `additionalTagExclusions` only as a compatibility read/preserve surface; it is not injected into the active v39 provider contract.
- Removed provider `maxItems`; deterministic parser/application caps remain in force.
- Preserved shared Playground/Processing prompt construction and dynamic category name/description expansion.
- Preserved one Pass 1 vision call, provider/model selection, retry behavior, VCP, Smart Profile normalization, explicit-content automation, and persistence authority ordering.
- Restored the shared hard-blocker classifier for category dominant-intent conflicts, structured evidence gaps, and subject-specificity risks so verifier confirmation cannot override objective blockers.
- Removed historical `design.tags` pass-through from the active candidate/observe input. Persisted historical fields are not migrated or destructively deleted.

## Primary implementation files

Shared and Functions:

- `packages/shared/src/constants/aiEnrichment.constants.ts`
- `packages/shared/src/constants/smartProfile.constants.ts`
- `packages/shared/src/utils/catalogAutomationDecision.ts`
- `functions/src/ai/simpleCatalogEnrichmentSchema.ts`
- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts`
- `functions/src/ai/providers/AiEnrichmentProvider.ts`
- `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`
- `functions/src/ai/providers/developmentAiEnrichmentProvider.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/aiEnrichmentObserve.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/ai/smartProfileBuilder.ts`
- `functions/src/ai/loadAiEnrichmentSettings.ts`
- `functions/src/updateAiEnrichmentSettings.ts`
- `functions/src/ai/catalogTitleRules.ts`

Studio:

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentSettings.ts`
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts`
- `apps/studio/src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts`
- `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx`
- `apps/studio/src/renderer/src/features/designs/utils/aiReviewDisplay.ts`
- `apps/studio/src/renderer/src/features/designs/utils/designAiFieldsMapper.ts`
- deleted obsolete suggested-tag inbox modules and Tag Rerank/Suggestion Author provider modules

## Contract metrics

Measured from the checked-in `SIMPLE_CATALOG_ENRICHMENT_SCHEMA` using compact UTF-8 JSON:

| Metric | Result |
|---|---:|
| Schema bytes | 2,178 |
| Top-level properties | 18 |
| Recursive properties | 40 |
| Maximum depth | 4 |
| Arrays | 23 |
| Required entries across root/nested objects | 8 |
| Enums | 1 |
| `additionalProperties` | 3 |
| `maxItems` | 0 |
| `$ref` / `oneOf` / `anyOf` / `allOf` | 0 / 0 / 0 / 0 |
| Numeric/string/array bound or format keywords | 0 |

The active top-level required fields are `title`, `description`, `category`, and `visualContextProfile`. The nested category-alternative item requires `name`; VCP requires `version`, `summary`, and `detailedDescription`.

## Validation

| Validation | Result |
|---|---|
| All non-live Functions AI tests (`functions/src/ai/**/*.test.ts`, excluding `aiEnrichmentTrace.live.test.ts`) | **383/383 PASS** |
| Focused shared AI/authority/semantic/visible-text tests | **142/142 PASS** |
| Focused Studio settings/design mapping/display tests | **19/19 PASS** |
| Functions `npx tsc --noEmit` | **PASS** |
| Functions `npm run build` | **PASS** |
| Prettier check on changed implementation files | **PASS** |
| `git diff --check` | **PASS** |
| Broader shared test sweep (202 test files) | **1,646/1,650 PASS; 4 accepted pre-existing failures** |
| Studio `npx tsc --noEmit` / Studio build | **33 accepted pre-existing type errors; build stops at the same errors** |

The live trace test was intentionally excluded because it writes live DEV trace state. No live provider, Firebase Function, emulator, deploy, or production action was run.

## `ACCEPTED PRE-EXISTING VALIDATION EXCEPTION`

Checkpoint baseline: `5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`.

The accepted broader failures are outside this AI-enrichment corrective. The previously recorded validation exception covers the Studio/shared legacy set, and the exact final results are:

Studio typecheck/build, 33 errors:

- `apps/studio/electron/ipc/import/pngValidator.ts:289` — `PersistedArtworkUpscalePassCount` not assignable to `0 | 1 | undefined`.
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts:127,143,176,209` — fixtures omit `printWidthInches` and `printHeightInches`.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts:533-534` — nullable `design` access.
- `apps/studio/src/renderer/src/features/designs/utils/companionSetHelpers.ts:96` — missing `CompanionSetStatusLabel`.
- `apps/studio/src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts:14` and `setPrintRequestItemArtworkEnhanceModeService.ts:17` — unsupported `feature` Firestore trace metadata property.
- `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160`, `staffInboxAlertDeliveryService.ts:2`, and `staffInboxSuppressionService.ts:5` — unused value/imports.
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:123` — unused `formatStaffGangSheetTitle`.
- Shared legacy errors in `gangSheetSectionPricingSettings.constants.test.ts:7`, `customerUploadTransparency.test.ts:8`, `explicitContentAutomation.test.ts:222,236,246,256,266`, `manualArtworkEnhance.test.ts:10`, `printRequestItemSource.test.ts:55`, `showProductionRecovery.test.ts:162`, and `showProductionRecoveryRequeue.test.ts:71,287,312,326,330,344,600,650,678` — unused imports, readonly/mismatched fixtures, nullability, and Timestamp fixture-shape errors.

Broader shared runtime tests, 4 failures:

- `packages/shared/src/constants/firestoreRulesPublicCatalogAlignment.test.ts:10-41`, subtest `defines resource-constrained public catalog helpers and uses them on reads` — `upcomingShows must not allow public read: if true`.
- `packages/shared/src/utils/printSizeMath.test.ts:212-213`, `218-222`, and `225-226`, subtests `returns null when width already meets or exceeds the aspect-locked 12in target`, `upscales a narrow image toward 12in @ 300dpi`, and `does not upscale a 12in @ 300dpi image further to 15in` — expected/actual pixel-size mismatch.

Evidence of non-causality:

- The `catalogAutomationDecision` and related shared test/source files were byte-identical to the checkpoint before the narrow hard-blocker restoration; their focused tests now pass.
- The `firestore.rules` delta in this worktree adds only owner-read trace collections; it does not touch `upcomingShows` or public catalog rules. The failing rule-alignment assertion is therefore unrelated.
- None of the listed Studio, print-request, export, companion-set, show, import, or legacy shared files is an implementation file for this corrective. They were not repaired or scope-expanded.
- Exact prior exception record: `docs/workflow/reviews/2026-09-05-two-pass-ai-enrichment-validation-exception.md`.

The broader suites are not reported as all-green; these remain explicitly accepted pre-existing exceptions under the owner’s Option 1 decision.

## Deployment boundary

No deployment, commit, push, Settings mutation, provider invocation, Y2 run, Semantic Reviewer enablement, Autonomous enablement, Gate C, WS6, migration, or production action was performed.

The reviewed DEV deployment inventory is limited to:

- `enqueueAiEnrichment`
- `testAiEnrichmentPlayground`
- `reprocessReadyDesignWithAi`

No Rules/index/migration deployment is part of this corrective. This review stops before that owner-controlled checkpoint.

## Post-review corrective: legacy Playground stock prompt reconciliation

### Root cause

The Playground's existing **Use prompt** action is intentionally not an auto-population path. Its handler in `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` calls `playground.setPrompt(selectedPromptTemplate)`. `selectedPromptTemplate` comes from `useAiEnrichmentSettings`, whose Firestore snapshot is normalized by `aiEnrichmentSettingsService.mapSettingsSnapshot()` through the shared `resolveAiEnrichmentPromptTemplate()` resolver.

The owner-observed stale prompt was not a component-local string. It was a persisted pre-v39 stock prompt variant that was not byte-identical to any previously recognized historical constant. The shared resolver therefore treated it as a genuine custom prompt and returned it unchanged. The Playground correctly remained blank before the owner clicked the button; only the inserted value was wrong.

### Corrective

Added the exact observed legacy stock copy as `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY` in `packages/shared/src/constants/aiEnrichment.constants.ts` and included it in the existing read-only historical reconciliation path. The resolver now returns the approved v39 default for that recognized variant while preserving genuine custom prompts unchanged. No Firestore Settings write or component-specific prompt duplication was added.

### Validation

- The observed legacy copy resolves to the v39 default.
- The resolved prompt contains the v39 visual-artwork opening, `{{approved_categories}}`, and `visualContextProfile`.
- The resolved prompt contains no active `tags`, `suggestedNewTags`, `preferredWhen`, `readableTextLines`, AI-halftone fields, or literal JSON example.
- Existing genuine-custom preservation tests remain green.
- Existing Playground/Processing prompt parity and dynamic category expansion tests remain green.
- Playground initial prompt state remains blank; this corrective does not auto-populate the text area.

### Deployment impact and disposition

The corrective changes shared source consumed by Studio and the Functions enrichment settings/prompt path. It is not Studio-only. The exact required DEV redeployment inventory is the already-reviewed three-Function set:

- `enqueueAiEnrichment`
- `testAiEnrichmentPlayground`
- `reprocessReadyDesignWithAi`

No deployment was authorized or performed for this corrective. The previously deployed Functions remain at the earlier checkpoint source hash until separately authorized for redeployment. The real-image Playground invocation count remains `0`; no Gemini/provider call, Y2 run, reprocess, Pass 2, Settings mutation, commit, push, or production action occurred.

`[NEEDS OWNER AUTHORIZATION: DEV DEPLOYMENT + ONE REAL-IMAGE PLAYGROUND V39 VERIFICATION]`
