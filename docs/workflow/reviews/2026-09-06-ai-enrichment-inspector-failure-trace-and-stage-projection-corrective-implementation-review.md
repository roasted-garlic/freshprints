# Implementation Review — AI Enrichment Inspector Failure Trace and Stage Projection Corrective

**Date:** 2026-09-06  
**Environment:** DEV source only; no deployment performed  
**Plan:** `docs/workflow/plans/2026-09-06-ai-enrichment-inspector-failure-trace-and-stage-projection-corrective-plan.md`

## Verdict

**IMPLEMENTATION COMPLETE — focused validation passed; STOP before DEV deployment.**

The approved corrective is implemented locally. No Playground provider request, Y2 run, Gate C, Semantic Reviewer, Autonomous, production action, or deployment was performed under this authorization.

## Root causes

1. **Failed trace loss:** The checked-in pre-corrective Playground path wrote a prompt-ready trace before the provider call but had no request-sent/provider-error/failed finalization path. The deployed revision used for the controlled 400 diagnostic was older than the checked-in Inspector trace instrumentation, mechanically establishing source/deployment drift; its failure path therefore returned the callable error without a discoverable trace. The corrective now awaits the initial trace write, records request-sent immediately before the unchanged provider call, and persists provider-error/failed in the catch path.
2. **Provider error loss:** `fetchVisionWithRetry` consumed the upstream response body only to extract a generic message, then constructed `VisionRequestError` with status/message. Safe code/type/path/request ID data was discarded at that boundary. It now travels as bounded `providerError` details before generic callable mapping.
3. **UI projection loss:** `AiEnrichmentTraceInspector` read only top-level fields and never projected `stages[].data`. Firestore retrieval/subscription and the canonical persisted mock stages were correct; the Studio projection was the defect.

## Implemented behavior

### Failure lifecycle

Playground now persists:

`created → prompt_ready → request_sent → provider_error → failed`

on a provider failure, with trace ID, source, provider/model, prompt/contract metadata, bounded error details, completed time, and stage data. Parser, normalized response, VCP, candidate, and persistence success fields are not fabricated. The shared projection reports them as `NOT REACHED`.

Normal Processing now writes a failed trace for provider failures instead of allowing the outer `finally` path to overwrite a failure with `complete`. Successful Processing retains the existing success behavior. Trace writes remain fail-soft.

### Sanitizer

The provider boundary preserves only bounded:

- HTTP status
- provider code
- provider type
- provider message
- field/path
- provider request ID
- retryability
- internal safe classification

The existing serializer plus sanitizer strip authorization, API keys, tokens, credentials, Secret Manager values, raw images, unrestricted headers, and unrelated nested content.

### Canonical projection

`projectAiEnrichmentTrace` in `packages/shared/src/utils/aiEnrichmentTrace.ts` provides one display model for prompt, response contract, provider response/error, normalized output, expected/actual/PASS, VCP, decisions, candidate, and persistence. Owner full-trace top-level values take precedence; bounded stage data remains visible as fallback.

The Inspector now consumes this helper and renders honest unavailable/unreached states rather than empty `{}` or `Not captured` when canonical stage data exists.

## Changed files

Corrective files:

- `functions/src/ai/visionRequestRetry.ts`
- `functions/src/ai/visionRequestRetry.test.ts`
- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentFailureTrace.test.ts`
- `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.test.ts`
- `apps/studio/src/renderer/src/features/settings/components/AiEnrichmentTraceInspector.tsx`

No Rules, index, migration, secret, prompt, schema, provider, model, token-limit, retry, or public callable contract changes were made.

## Validation

### Passed

- Functions TypeScript build: **PASS** (`npm --prefix functions run build`)
- Focused trace/sanitizer/failure tests: **13 tests, 13 passed, 0 failed**
- Targeted ESLint for all corrective source/tests/UI files: **PASS**
- `git diff --check`: **PASS**
- Existing trace-enabled mock test remained green.

Focused command:

```text
npx tsx --test packages/shared/src/utils/aiEnrichmentTrace.test.ts functions/src/ai/aiEnrichmentFailureTrace.test.ts functions/src/ai/visionRequestRetry.test.ts functions/src/ai/providerErrorSanitizer.test.ts functions/src/ai/aiEnrichmentTrace.live.test.ts
```

### Studio validation exception

`npm run build:studio` and `npx tsc -p apps/studio/tsconfig.json --noEmit` remain blocked by exact unrelated pre-existing errors. No corrective Inspector file appears in the error list. The reported failures are:

- `apps/studio/electron/ipc/import/pngValidator.ts:289` — `PersistedArtworkUpscalePassCount` not assignable to `0 | 1`.
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts:127,143,176,209` — missing `printWidthInches`/`printHeightInches`.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts:533-534` — possibly null `design`.
- `apps/studio/src/renderer/src/features/designs/utils/companionSetHelpers.ts:96` — missing `CompanionSetStatusLabel`.
- `apps/studio/src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts:14` and `setPrintRequestItemArtworkEnhanceModeService.ts:17` — unsupported `feature` metadata.
- `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160`; `staffInboxAlertDeliveryService.ts:2`; `staffInboxSuppressionService.ts:5`; `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:123` — unused declarations/imports.
- Existing shared test errors in `gangSheetSectionPricingSettings.constants.test.ts`, `customerUploadTransparency.test.ts`, `explicitContentAutomation.test.ts`, `manualArtworkEnhance.test.ts`, `printRequestItemSource.test.ts`, `showProductionRecovery.test.ts`, and `showProductionRecoveryRequeue.test.ts` — unused imports, readonly/mismatched fixture types, nullability, and Timestamp fixture shape.

These failures are outside the corrective file set, were present in the established baseline validation exception, and none is caused by the Inspector projection or trace corrective. They remain documented rather than repaired in this workstream.

## Invariance checks

- Extra AI calls: **NO**
- Provider request body/schema/prompt changed: **NO**
- Retry count/delay/classification changed: **NO**
- Semantic Reviewer/Autonomous behavior changed: **NO**
- Rules/indexes required: **NO**
- Automatic failed-trace discovery: **YES**, through the existing trace browser/listener

## Proposed DEV deployment inventory

Deploy only:

- `functions:testAiEnrichmentPlayground`
- `functions:enqueueAiEnrichment`

Include another Function only if deployment import analysis proves it bundles the changed retry/sanitizer runtime. No Rules or index deployment is required. Studio requires a DEV build/reload after the Functions deployment.

## Next owner checkpoint

Recommended authorization phrase:

`AUTHORIZE DEV DEPLOYMENT OF THE APPROVED AI ENRICHMENT INSPECTOR FAILURE-TRACE AND STAGE-PROJECTION CORRECTIVE, THEN RUN EXACTLY ONE CONTROLLED PLAYGROUND REQUEST FOR TRACE VERIFICATION.`

[NEEDS OWNER AUTHORIZATION: DEV DEPLOYMENT AND ONE CONTROLLED PLAYGROUND VERIFICATION]
