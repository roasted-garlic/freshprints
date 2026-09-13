# AI Enrichment Inspector Trace-Store Firestore-Safety Corrective — DEV Verification

**Date:** 2026-09-06  
**Project:** `fresh-prints-dev`  
**Region:** `us-central1`  
**Production:** untouched

## Deployment

Exactly the five authorized Functions were deployed. All are ACTIVE.

| Function | Revision | Source hash |
|---|---|---|
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00067-dod` | `c8ca6c4fbb6c5ea86dff6d62d9345f83b4d5dbc4` |
| `enqueueAiEnrichment` | `enqueueaienrichment-00112-caj` | `c8ca6c4fbb6c5ea86dff6d62d9345f83b4d5dbc4` |
| `testAiEnrichmentSemanticReviewPlayground` | `testaienrichmentsemanticreviewplayground-00010-tek` | `c8ca6c4fbb6c5ea86dff6d62d9345f83b4d5dbc4` |
| `resetAiEnrichmentForProcessing` | `resetaienrichmentforprocessing-00046-rem` | `fde04bd379a8b8c67e0157b751025c6bf9e38402` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00018-liy` | `c8ca6c4fbb6c5ea86dff6d62d9345f83b4d5dbc4` |

No Rules, indexes, TTL/config, other Functions, or production resources were deployed.

## Exactly one controlled Playground request

- Callable invocations: **1**
- Provider: Google
- Model: `gemini-2.5-flash-lite`
- Request: current DEV prompt/configuration, `captureFullTrace=true`
- Result: HTTP `400`; callable status `INVALID_ARGUMENT`; public message `AI vision request failed with status 400`
- Other deployed Functions invoked: **none**
- Temporary owner harness account/document: cleaned up

## Trace persistence

Trace ID: `f5ebb0b8-99a6-4974-9d03-8e5d0914c091`

Both documents persisted successfully:

- bounded: `aiEnrichmentTraces/f5ebb0b8-99a6-4974-9d03-8e5d0914c091`
- full: `aiEnrichmentTraceFull/f5ebb0b8-99a6-4974-9d03-8e5d0914c091`

The trace is automatically discoverable by the existing recent-trace browser query. Source is `PLAYGROUND`; lifecycle is `failed`; no trace-write failure event was emitted.

Stages persisted exactly as required:

`created → prompt_ready → request_sent → provider_error → failed`

Full trace capture contains the effective system/user prompt and response contract. Bounded capture correctly omits full prompt/raw response content. No provider response, parser, normalized output, VCP, candidate, or persistence success object was fabricated.

## Google provider evidence

| Field | Stored evidence |
|---|---|
| HTTP status | `400` |
| Code | unavailable |
| Type/status | unavailable beyond HTTP 400 |
| Message | unavailable; Google supplied no safe message in the captured response |
| Field/path | unavailable |
| Request ID | unavailable |
| Retryable | `false` |
| Internal classification | `vision_invalid_request` |

Three `vision.request.failed` events were mechanically observed for this one callable request:

- `2026-09-06T17:48:53.366613Z` — HTTP 400
- `2026-09-06T17:48:56.482129Z` — HTTP 400
- `2026-09-06T17:49:01.555612Z` — HTTP 400

The available fields do not prove whether these are three provider attempts or another retry/log relationship. Retry behavior was not changed.

## Downstream truthfulness

- Provider response: not reached/unavailable
- Parser: `NOT REACHED`
- Normalized result: `NOT REACHED`
- VCP: `NOT REACHED`
- Candidate: `NOT REACHED`
- Persistence: `NOT REACHED`

## Diagnosis

The trace-store corrective succeeded: failed Playground traces are now persisted, full capture is available to the owner, and automatic discovery works. The provider still rejects the unchanged request at the HTTP 400 boundary, but Google exposed no specific complaint beyond status. Therefore no exact schema keyword, response-format envelope, strictness, model capability, or other contract defect can be selected from this evidence.

The next step requires a separate evidence-selected provider-contract diagnostic/corrective plan. No provider fix was made and no second request is authorized by this checkpoint.

## Safety

- Semantic Reviewer: OFF
- Autonomous: OFF / shadow
- Y2: not processed
- Other designs: none processed
- Settings: unchanged
- Semantic Review Playground invoked: NO
- Reset invoked: NO
- Reprocess invoked: NO
- Gate C: not executed
- WS6: not started
- Production: untouched

[NEEDS OWNER AUTHORIZATION: EVIDENCE-SELECTED GEMINI PROVIDER CONTRACT CORRECTIVE]
