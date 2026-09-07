# Formal Review — AI Enrichment Inspector Trace-Store Firestore-Safety Corrective

**Date:** 2026-09-06  
**Plan:** `docs/workflow/plans/2026-09-06-ai-enrichment-inspector-trace-store-firestore-safety-corrective-plan.md`  
**Environment:** DEV planning only

## Verdict

**APPROVED FOR OWNER IMPLEMENTATION AUTHORIZATION — PLAN/REVIEW PHASE COMPLETE.**

This review approves only the narrow trace serialization/write-safety and bounded error-logging corrective. It does not authorize implementation yet, another provider request, deployment, schema/prompt/provider changes, Y2, Semantic Reviewer, Autonomous, Gate C, WS6, or production.

## Formal answers

1. **Nested undefined proven?** YES. The serializer reintroduces `undefined` into bounded `prompt` and `providerResponse` fields. A local Firestore SDK `.set()` validation proof reproduced rejection at `prompt.effectiveUser`.
2. **Exact Firestore error:** `Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "prompt.effectiveUser"). If you want to ignore undefined values, enable `ignoreUndefinedProperties`.`
3. **Why invisible?** `writeAiEnrichmentTrace` catches all errors with an empty catch, preserving fail-soft behavior but hiding the exception and collection.
4. **Safe cleanup:** Rebuild plain objects recursively after redaction/bounds, omit undefined properties, map arrays without mutation, and return Date/Timestamp-compatible non-plain objects unchanged.
5. **Existing utility reused?** NO, not as-is. The pipeline-local helper is not shared and would damage non-plain values. The corrective should extract a suitable shared utility rather than create divergent cleanup logic.
6. **Global `ignoreUndefinedProperties`:** NO. It would alter all Functions Firestore writes and could hide unrelated data-shape errors.
7. **Bounded/full coverage:** YES. Both serialized payloads pass through the same cleanup before their respective writes; each collection failure is independently logged.
8. **Safe logging:** Emit one bounded `ai_enrichment_trace.write_failed` event per failed collection write with operation, trace ID, bounded/full collection, safe error name/message, and project/environment. Never include trace content or secrets.
9. **Enrichment behavior:** unchanged and fail-soft. A trace write cannot change AI success/failure or provider behavior.
10. **Exact files:** Shared trace utility/tests, trace store/tests, and only mechanically required pipeline helper replacement; see Plan.
11. **Exact tests:** 16 focused cleanup, parity, safe logging, success, and invariance tests listed in the Plan.
12. **Future DEV inventory:** The five already authorized mechanically affected Functions: Playground, enqueue, Semantic Review Playground, reset, and reprocess.
13. **Rules:** NO.
14. **Indexes:** NO.
15. **Studio reload:** NO; storage-only change.
16. **Authorization phrase:** `IMPLEMENT THE APPROVED AI ENRICHMENT INSPECTOR TRACE-STORE FIRESTORE-SAFETY CORRECTIVE IN DEV ONLY; DO NOT RUN A PROVIDER REQUEST.`

## Acceptance and safety

- Exact runtime/write failure reproduced locally: YES.
- Existing silent catch confirmed: YES.
- Full/bounded parity covered: YES.
- Provider request unchanged: required.
- Retry unchanged: required.
- Zero extra AI calls: required.
- No global Firestore setting change: required.
- No provider-contract diagnosis selected: required.

## Remaining owner decision

Authorize implementation using the exact phrase above. After implementation and validation, a separate DEV deployment and one controlled provider verification checkpoint will still be required before attempting to capture Google’s actual complaint.
