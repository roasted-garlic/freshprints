# AI Enrichment Inspector — Controlled DEV Playground Gemini 400 Diagnostic

**Date:** 2026-09-06  
**Environment:** `fresh-prints-dev` / `us-central1`  
**Workflow:** Owner QA — one controlled Playground request  
**Scope:** Evidence collection only; no implementation or deployment changes

## Authorization and safety

The owner authorized exactly one controlled DEV Playground request to diagnose the deployed Inspector/provider failure. The request was made through the deployed `testAiEnrichmentPlayground` callable using the repository's temporary DEV owner-account harness. The temporary Auth user and corresponding `users/{uid}` document were deleted in `finally`. No secrets were printed or persisted.

The request did not enable Semantic Reviewer or Autonomous, did not run Y2, Gate C, WS6, or production, and did not change settings, prompts, schemas, provider configuration, retry behavior, or application code.

## Exact execution

- Callable: `testAiEnrichmentPlayground`
- URL: `https://us-central1-fresh-prints-dev.cloudfunctions.net/testAiEnrichmentPlayground`
- Provider: Google
- Model: `gemini-2.5-flash-lite`
- Source intended: `PLAYGROUND`
- `captureFullTrace`: `true`
- Callable invocations: **1**
- Client result: HTTP `400`; callable status `INVALID_ARGUMENT`
- Public error: `AI vision request failed with status 400`
- Provider called: **YES — exactly one controlled Playground request reached the deployed provider boundary**

The first local custom-token attempt failed before authentication/provider invocation because local ADC could not mint a signing token. It was not a Playground/provider request and was not retried. The authorized request was then executed once using the established temporary DEV owner harness.

## Inspector/trace evidence

**Trace ID:** none returned.

An Admin SDK read of the latest `aiEnrichmentTraces` documents found no persisted `PLAYGROUND` trace for this request. Consequently, the Inspector could not automatically show this failed request, and the following requested trace sections are unavailable for this run: effective system/user prompts, response schema/`response_format`, request options, raw provider response, parser/normalizer result, VCP, candidate, blocker/WAA, persistence representation, and stage timings.

This is a diagnostic failure of the deployed failure path, not evidence that those fields were absent from the request. The deployed revision returned the error before persisting a bounded failure trace.

## Cloud logging evidence

The deployed Playground service emitted `vision.request.failed` events at:

| UTC timestamp | status | exposed provider error |
|---|---:|---|
| `2026-09-06T16:19:10.780674Z` | 400 | none beyond status |
| `2026-09-06T16:19:13.860298Z` | 400 | none beyond status |
| `2026-09-06T16:19:19.008941Z` | 400 | none beyond status |

The deployed logs exposed only `status: 400`; they did not expose a provider error code, provider error message, provider/model fields, response body, or attempt number. The three failure events are the complete observed transport evidence for the single authorized callable execution. The exact retry/attempt relationship cannot be reconstructed further from the deployed fields, so this review does not assert that they represent three provider attempts.

The local retry implementation logs the final non-retryable failure with status and sanitized message, but the deployed failure evidence does not contain a provider complaint beyond HTTP 400. No exact schema-field or request-option defect can therefore be concluded from this run.

## Diagnosis

The request fails at the deployed vision-provider request boundary with HTTP 400 and never reaches parsing, normalization, VCP, candidate formation, blocker/WAA evaluation, or persistence. The evidence is insufficient to identify whether the provider rejected a schema, request option, model capability, or another contract detail because the deployed path neither persisted the failure trace nor exposed the provider response body in logs.

The first narrow corrective required by this evidence is a separately authorized failure-path diagnostic corrective that persists a sanitized bounded Inspector trace and provider error for provider failures. A provider-contract change is not authorized by this checkpoint and must not be inferred from the generic 400.

## QA result

| Observation | Result |
|---|---|
| Exactly one controlled Playground request | PASS |
| No additional AI calls initiated by the harness | PASS |
| Trace automatically discoverable in Inspector | FAIL — no deployed failure trace persisted |
| Trace ID available | FAIL — none returned |
| Useful provider error visible | FAIL — only HTTP 400 was exposed |
| Source label/provider/model inspectable in trace | FAIL — no trace persisted; intended source `PLAYGROUND`, provider Google, model `gemini-2.5-flash-lite` |
| Parser/VCP/decision/persistence evidence | NOT REACHED / unavailable |
| Semantic Reviewer enabled | NO |
| Autonomous enabled | NO |
| Production touched | NO |

## Required next checkpoint

No code, deployment, schema, prompt, provider, token, retry, or settings corrective was performed. Any failure-path instrumentation or provider-contract corrective requires separate owner authorization based on this evidence.

[NEEDS OWNER AUTHORIZATION: PROVIDER CONTRACT CORRECTIVE BASED ON INSPECTOR EVIDENCE]
