# AI Enrichment Inspector Failure Trace and Stage Projection Corrective Plan

**Date:** 2026-09-06  
**Workstream:** `ai-enrichment-inspector-and-live-trace-viewer`  
**Phase:** Corrective Plan → Formal Review  
**Environment:** `fresh-prints-dev` only  
**Production:** Not authorized

## Goal

Make failed provider attempts truthfully diagnosable in the Inspector and make the Inspector render canonical data already stored in trace stages. This corrective does not repair the Gemini 400 or alter any provider contract.

## Evidence and mechanically established defects

1. Trace `2fde9904-dcab-4829-9cb5-115f6ec6c483` contains useful values in `stages[].data`, including `prompt_ready.data.effectivePrompt`, `request_sent.data.responseFormat`, `provider_response.data`, `parsed.data.normalized`, and `complete.data.actual/testResult`. The deployed Inspector only reads top-level `prompt`, `providerResponse`, `normalized`, `decisions`, and `vcp`, so the persisted mock data is correct while the Studio projection is incomplete.
2. The controlled Playground request in `docs/workflow/reviews/2026-09-06-ai-enrichment-inspector-gemini-400-diagnostic.md` returned HTTP 400 without a trace. Current checked-in `runAiEnrichmentPlayground` creates a trace ID and writes an initial trace before its provider call, but the deployed observed behavior did not persist that record. The corrective must verify the deployed/source boundary and make the failure lifecycle explicit rather than relying on success-only finalization.
3. `fetchVisionWithRetry` currently reduces the upstream response to `VisionRequestError`; its safe message/status are insufficient to preserve provider code/type/path/request ID. The sanitizer must inspect the response while it is still available and never retain credentials or unrestricted bodies.
4. `runAiEnrichmentPipeline` currently writes a minimal `created` trace and a `complete` trace in `finally`; a failed call can therefore be represented as complete and lacks truthful provider-boundary stages. Processing parity is required without changing design lifecycle success/failure behavior.

## Scope

### A. Failure-path trace lifecycle

Introduce a narrow fail-soft trace execution context or equivalent helper shared by Playground and normal Processing. It owns the already-created trace ID and emits bounded stages in this order when applicable:

`created → prompt_ready → request_sent → provider_error → failed`

The provider call itself remains unchanged. `request_sent` is emitted immediately before the existing call. A caught provider error emits sanitized `provider_error`, then `failed` with `lifecycleState=failed`, `completedAt`, and timings. Parser, normalized, VCP, candidate, and persistence success fields are omitted; the Inspector renders them as `NOT REACHED`. Trace writes remain fail-soft and cannot turn an AI failure into a successful Processing result.

Playground must write the initial trace before provider execution and retain it through the catch path. Processing must use the same lifecycle principle and must never overwrite a failed trace with `complete` in `finally`. If an operation fails before a later stage, only reached stages are stored.

### B. Bounded provider-error sanitization

Add a provider-response sanitizer at the response boundary, before generic exception mapping. It parses only supported safe fields: HTTP status, provider error code/type/message, field/path, provider request ID, retryability, and an internal safe classification. Values are length/depth bounded and passed through the existing secret scrubber. Authorization headers, keys, tokens, credentials, Secret Manager values, raw image bytes, unrestricted headers, and unrelated nested response content are excluded.

Extend the internal error value only as needed to carry the sanitized diagnostic. The callable may continue returning the existing public `INVALID_ARGUMENT` message; adding a trace ID is optional and must not be required for Inspector discovery. No public error redesign is planned.

Retry behavior remains exactly as it is. If attempt metadata is added, it is observational only and must not change retry count, delay, or request body.

### C. Canonical stage projection

Add one shared/pure trace projection helper, preferably in `packages/shared/src/utils/aiEnrichmentTrace.ts`, returning display-ready sections. It merges owner full-trace top-level values with valid bounded stage data, with owner full values taking precedence and stage data serving as fallback. It maps at minimum:

- `prompt_ready.data.effectivePrompt` → Effective Prompt
- `request_sent.data.responseFormat` → Response Contract
- `provider_response.data` → Provider Response
- `provider_error.data` / top-level `providerError` → Provider Error
- `parsed.data.normalized` → Normalized Result
- `complete.data.expected/actual/testResult` and top-level equivalents → Expected, Actual, PASS/FAIL
- candidate, VCP, decisions, persistence where present

`AiEnrichmentTraceInspector` consumes this helper rather than scattering stage searches through React. The UI must label absent/unreached sections truthfully, including `NOT REACHED` for parser, VCP, candidate, and persistence after a provider failure. All four trace source labels remain unchanged.

### D. Discovery and parity

Use the existing `aiEnrichmentTraces` browser/subscription. Failed traces remain in the active/recent list with source `PLAYGROUND` or `LIVE PROCESSING`, lifecycle `failed`, and no manual trace ID requirement. Automatic discovery is sufficient; no callable error contract change is required unless implementation proves it is safe and useful without weakening security.

## Exact files expected to change

- `functions/src/ai/visionRequestRetry.ts` — preserve bounded upstream error details before mapping; no retry behavior change.
- `functions/src/ai/aiEnrichmentPlayground.ts` — emit request/failure stages and finalize failed traces.
- `functions/src/testAiEnrichmentPlayground.ts` — only if needed to preserve fail-soft trace correlation; no public API redesign by default.
- `functions/src/ai/aiEnrichmentPipeline.ts` — use truthful failed lifecycle and Processing parity.
- `functions/src/ai/aiEnrichmentTraceStore.ts` — only if a narrow failed-finalization helper is needed.
- `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts` — bounded provider-error/trace lifecycle types only if required.
- `packages/shared/src/utils/aiEnrichmentTrace.ts` — sanitizer-safe serialization support and canonical projection helper.
- `apps/studio/src/renderer/src/features/settings/components/AiEnrichmentTraceInspector.tsx` — render projection sections and unreached states.
- `apps/studio/src/renderer/src/features/settings/components/AiEnrichmentTraceBrowser.tsx` — only if failed active/recent selection needs a narrow correction.
- `functions/src/ai/visionRequestRetry.test.ts`
- new focused `functions/src/ai/aiEnrichmentFailureTrace.test.ts`
- new focused `functions/src/ai/providerErrorSanitizer.test.ts` only if existing coverage does not cover the expanded boundary
- new focused `packages/shared/src/utils/aiEnrichmentTrace.test.ts` cases for projection/precedence

No Firestore Rules, indexes, migrations, secrets, or environment changes are planned. No extra AI calls are introduced. Studio DEV reload/build is required after implementation for UI validation; Functions deployment is a later checkpoint.

## Required tests

Cover the 30 acceptance requirements from the corrective request through focused unit/contract tests: pre-call trace creation; Playground 400 failed trace; prompt/request/provider-error/final stages; sanitized safe fields and secret stripping; truthful NOT REACHED states; no fabricated success fields; active/recent discoverability; Processing parity; stage projection for every listed stage; full-over-bounded precedence; all source labels; unchanged request body/schema/prompt/retry behavior; no additional AI calls; Semantic Reviewer/Autonomous unchanged.

## Later DEV deployment inventory

After implementation approval and validation, deploy only the Functions containing the corrective, expected to be:

`testAiEnrichmentPlayground` and `enqueueAiEnrichment`

If the shared retry/sanitizer code is imported by another deployed Function, mechanically include only that Function in the reviewed inventory. No Rules/index deployment is required. Studio requires a DEV build/reload, not a production action.

## Explicit non-goals

Do not fix the Gemini 400, change response format/schema/strictness, simplify prompts, change provider/model/token limits, alter retry count/delay, run Y2 or Gate C, enable Semantic Reviewer or Autonomous, start WS6, or touch production.

## Implementation authorization

Implementation must not begin until the Formal Review is approved and the owner provides: **“IMPLEMENT THE APPROVED AI ENRICHMENT INSPECTOR FAILURE-TRACE AND STAGE-PROJECTION CORRECTIVE IN DEV ONLY.”**
