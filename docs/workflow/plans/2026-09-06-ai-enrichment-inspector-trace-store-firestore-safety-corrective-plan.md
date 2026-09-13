# AI Enrichment Inspector Trace-Store Firestore-Safety Corrective Plan

**Date:** 2026-09-06  
**Workstream:** `ai-enrichment-inspector-and-live-trace-viewer`  
**Phase:** Corrective Plan → Formal Review  
**Environment:** `fresh-prints-dev` only  
**Production:** Not authorized

## Goal

Make bounded and owner-full AI enrichment traces Firestore-safe and make trace-store failures observable without allowing diagnostics to alter enrichment behavior. This corrective exists to expose the actual provider error on the next separately authorized request; it does not change the provider contract.

## Mechanically proven diagnosis

The current `serializeAiEnrichmentTrace` first removes undefined values in `scrub`, then reintroduces explicit undefined members for bounded traces:

- `prompt.effectiveSystem = undefined`
- `prompt.effectiveUser = undefined`
- `providerResponse.raw = undefined`

Trace objects can also contain optional/top-level undefined values such as `completedAt` before finalization. The current `writeAiEnrichmentTrace` passes the serialized object directly to Admin Firestore and catches all errors without logging them.

The local Firestore SDK proof, using a representative nested value and no network write, produced exactly:

`Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "prompt.effectiveUser"). If you want to ignore undefined values, enable `ignoreUndefinedProperties`.`

`functions/src/lib/admin.ts` initializes the default Admin Firestore client without `ignoreUndefinedProperties`. The same invalid-value risk therefore affects both `aiEnrichmentTraces/{traceId}` and `aiEnrichmentTraceFull/{traceId}` when their payload contains undefined members. The write wrapper’s empty catch hides the exact error and makes the enrichment trace disappear.

The existing local `removeUndefinedFields` helper in `functions/src/ai/aiEnrichmentPipeline.ts` is not suitable for reuse as-is: it treats every object as an enumerable plain object and would not safely preserve `Date`/Firestore Timestamp-compatible values. It is also not shared with Playground. No existing repo-wide utility was found that satisfies the required preservation semantics.

## Narrow corrective

Add one shared, non-mutating Firestore-safe cleanup utility at the trace serialization/write boundary. The cleanup must:

- recursively remove object properties whose value is `undefined`, including top-level fields;
- preserve `null`, booleans, numbers, strings, arrays, nested objects, `Date`, and Firestore Timestamp-compatible/non-plain objects;
- preserve array order and avoid holes by mapping array entries; undefined array entries must be represented according to the Firestore SDK’s supported behavior or removed in a documented deterministic way;
- retain existing redaction, depth, length, and stage bounds;
- return a new value without mutating the canonical trace;
- run after redaction/bounds and before either bounded or full Firestore `.set()`.

Prefer a plain-object check: recursively rebuild plain objects, map arrays, and return non-plain values unchanged. Add explicit tests for Date and a Timestamp-shaped value rather than converting them through `Object.entries`.

Change `writeAiEnrichmentTrace` so both collection writes consume the same cleaned serialized payload. Keep writes fail-soft. Each failed collection operation should emit one bounded `logPipelineEvent("ai_enrichment_trace.write_failed", ...)` diagnostic containing only:

- `operation: "trace_write"`
- `traceId`
- `collection: "bounded" | "full"`
- safe error class/name
- safe message capped to a small bound
- `projectId`/environment from safe runtime metadata

Never log the trace, prompt, provider response, raw body, credentials, tokens, headers, images, or customer data. The log call itself must be fail-soft and must not replace the original trace-write catch behavior.

Do not enable global `ignoreUndefinedProperties`; that would silently change unrelated Firestore writes throughout Functions and could conceal data-shape defects outside the Inspector.

## Parity and behavior invariants

The same `serialize → Firestore-safe cleanup → write` boundary applies to Playground and Processing because both call `writeAiEnrichmentTrace`. No provider call, prompt, response schema, model, token limit, retry count/delay/classification, AI call count, Semantic Reviewer behavior, Autonomous behavior, design lifecycle, Rules, indexes, or settings changes are allowed.

## Exact expected files

- `packages/shared/src/utils/aiEnrichmentTrace.ts` — add/export the narrow recursive Firestore-safe cleanup and use it in serialization or expose it for the store boundary.
- `packages/shared/src/utils/aiEnrichmentTrace.test.ts` — cleanup preservation/redaction tests.
- `functions/src/ai/aiEnrichmentTraceStore.ts` — apply cleanup to bounded/full payloads and safe per-collection failure logging.
- `functions/src/ai/aiEnrichmentTraceStore.test.ts` — mocked Firestore write success/failure and bounded/full parity tests, if the repository’s test setup permits direct store injection.
- `functions/src/ai/aiEnrichmentPipeline.ts` — only if the existing local helper is mechanically replaced/reused to avoid duplicate cleanup semantics; no unrelated pipeline behavior changes.
- `functions/src/lib/pipelineLog.ts` — only if a bounded error-log helper is mechanically appropriate; otherwise keep the change in the trace store.

No schema, prompt, provider, retry, callable, Rules, index, migration, secret, or Studio files are expected to change. Studio reload is not required for this storage-only corrective.

## Focused tests

1. Nested undefined removed.
2. Top-level undefined removed.
3. Null preserved.
4. Arrays preserve order and expected Firestore-safe shape.
5. Nested objects preserved.
6. Date preserved.
7. Timestamp-compatible/non-plain value preserved.
8. Bounded trace payload is safe.
9. Full trace payload is safe.
10. Error logs contain no prompt/raw response/secrets.
11. Failed bounded/full writes remain fail-soft.
12. Safe write-failure event is emitted with required bounded metadata.
13. Successful writes remain unchanged.
14. Playground and Processing share the same store boundary.
15. Provider request/schema/prompt and retry invariance remain unchanged.
16. No extra AI calls are introduced.

## Later DEV deployment inventory

Because the store is imported by the already authorized five mechanically affected Functions, the later DEV deployment inventory remains exactly:

- `functions:testAiEnrichmentPlayground`
- `functions:enqueueAiEnrichment`
- `functions:testAiEnrichmentSemanticReviewPlayground`
- `functions:resetAiEnrichmentForProcessing`
- `functions:reprocessReadyDesignWithAi`

They must not be invoked as part of this corrective unless separately authorized. No Rules or index deployment is required. No Studio reload is required.

## Implementation authorization

Implementation must not begin until the Formal Review is approved and the owner provides:

`IMPLEMENT THE APPROVED AI ENRICHMENT INSPECTOR TRACE-STORE FIRESTORE-SAFETY CORRECTIVE IN DEV ONLY; DO NOT RUN A PROVIDER REQUEST.`
