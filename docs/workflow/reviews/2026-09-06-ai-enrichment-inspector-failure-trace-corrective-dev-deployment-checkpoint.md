# AI Enrichment Inspector Failure-Trace Corrective — DEV Deployment and Controlled Verification

**Date:** 2026-09-06  
**Project:** `fresh-prints-dev`  
**Region:** `us-central1`  
**Production:** untouched

## Deployment

Exactly the five owner-authorized Functions were deployed. No Rules, indexes, TTL/config, or other Functions were deployed.

| Function | Revision | Source hash | State |
|---|---|---|---|
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00066-vaw` | `d1667ce2bf2e29cbf8ea29986482fb87e8ceda6e` | ACTIVE |
| `enqueueAiEnrichment` | `enqueueaienrichment-00111-fet` | `d1667ce2bf2e29cbf8ea29986482fb87e8ceda6e` | ACTIVE |
| `testAiEnrichmentSemanticReviewPlayground` | `testaienrichmentsemanticreviewplayground-00009-wuq` | `d1667ce2bf2e29cbf8ea29986482fb87e8ceda6e` | ACTIVE |
| `resetAiEnrichmentForProcessing` | `resetaienrichmentforprocessing-00045-fiq` | `a530441aac3918f246e70ef32811a975c37a3472` | ACTIVE |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00017-qac` | `d1667ce2bf2e29cbf8ea29986482fb87e8ceda6e` | ACTIVE |

The reset, reprocess, and Semantic Review Playground Functions were deployed for source consistency only and were not invoked.

## Preflight and safety

- Branch: `development`
- Project: `fresh-prints-dev`
- Region: `us-central1`
- `semanticReviewerEnabled`: `false`
- `catalogAutonomousLiveEnabled`: `false`
- Autonomous/workflow mode: shadow / OFF
- Unauthorized Functions deployed: NO
- Rules/indexes/TTL deployed: NO
- Production touched: NO

## Mock projection QA

The corrective shared projection tests passed and prove the persisted mock shape projects `fixture prompt`, `fixture-schema`, normalized `Fixture title`, expected/actual, and PASS. The broader Studio build remains blocked by the previously documented unrelated baseline errors; no corrective Inspector file is among those errors. No live provider request was made until the projection code path and focused tests were green.

## Exactly one controlled Playground verification

- Callable invocations: **1**
- Provider/model: Google / `gemini-2.5-flash-lite`
- Request used current DEV prompt and deployed request configuration with `captureFullTrace: true`
- Result: HTTP `400`, callable `INVALID_ARGUMENT`, public message `AI vision request failed with status 400`
- Temporary owner harness account/document: cleaned up
- The earlier local harness construction failures and wrong-host HTTP response occurred before any callable/provider invocation and do not count as Playground requests.

## Trace result

- Trace ID: none returned
- Automatic discovery: FAIL — no `PLAYGROUND` document was found in the recent `aiEnrichmentTraces` read
- Lifecycle visible: unavailable
- Effective prompt/response schema/provider error: unavailable in Inspector because no trace persisted
- Provider response: NOT REACHED / unavailable
- Parser: NOT REACHED
- VCP: NOT REACHED
- Candidate: NOT REACHED
- Persistence: NOT REACHED

## Provider/transport evidence

Three new `vision.request.failed` events were logged for the controlled request:

| Timestamp UTC | Status | Model | Exposed message |
|---|---:|---|---|
| `2026-09-06T17:26:08.595658Z` | 400 | `gemini-2.5-flash-lite` | `ai-pipeline` |
| `2026-09-06T17:26:11.725938Z` | 400 | `gemini-2.5-flash-lite` | `ai-pipeline` |
| `2026-09-06T17:26:16.848108Z` | 400 | `gemini-2.5-flash-lite` | `ai-pipeline` |

The deployed telemetry does not prove whether these are three provider attempts or another retry/log relationship. No provider code, type, message, field/path, request ID, or retryability detail was exposed.

## Evidence-based diagnosis

The provider still rejects the request at the HTTP 400 boundary, but the corrective’s trace persistence path remains non-diagnostic in production. The checked-in `writeAiEnrichmentTrace` catches all Firestore write errors without logging them. The serializer can produce explicit `undefined` members in bounded prompt/provider objects, while the Admin Firestore initialization does not configure `ignoreUndefinedProperties`; this is a mechanically identified write-failure risk, but the swallowed exception means the exact runtime write exception was not captured. No provider-contract defect can be selected from this run.

No corrective was made after the request. No schema, prompt, provider, model, token limit, retry behavior, or settings were changed. A new narrow observability corrective must first expose/resolve the trace-store write failure before another provider verification is authorized.

[NEEDS OWNER AUTHORIZATION: EVIDENCE-SELECTED GEMINI PROVIDER CONTRACT CORRECTIVE]
