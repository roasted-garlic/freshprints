# Formal Review — AI Enrichment Inspector Failure Trace and Stage Projection Corrective

**Date:** 2026-09-06  
**Plan:** `docs/workflow/plans/2026-09-06-ai-enrichment-inspector-failure-trace-and-stage-projection-corrective-plan.md`  
**Environment:** `fresh-prints-dev` only

## Verdict

**APPROVED FOR OWNER IMPLEMENTATION AUTHORIZATION — PLAN/REVIEW PHASE COMPLETE.**

This review approves the narrow observability and projection architecture described in the Plan. It does not authorize code changes, deployment, provider-contract changes, another Playground request, Y2, Gate C, Semantic Reviewer, Autonomous, WS6, or production.

## Formal answers

1. **Why was no failed Playground trace persisted?** The deployed failed request produced no discoverable record. Checked-in source creates a trace ID and writes the initial trace before the provider call, so the exact deployed loss boundary must be verified during implementation against the deployed artifact/runtime. The corrective makes the pre-call context and catch/finalization path explicit and fail-soft.
2. **Exact trace-loss boundary:** Between the deployed Playground execution's provider-failure path and `aiEnrichmentTraceStore.writeAiEnrichmentTrace`/the `aiEnrichmentTraces` document. The available evidence cannot distinguish deployed source drift, an omitted catch finalization, or a fail-soft write failure; implementation must mechanically prove which one applies before editing.
3. **Where is provider error lost?** `fetchVisionWithRetry` reads only a bounded message and status, then constructs `VisionRequestError`; the deployed logs exposed only status 400. Useful upstream body fields are lost at response parsing/generic error mapping.
4. **Can details be preserved safely?** Yes. Parse the provider response before generic mapping, retain only bounded status/code/type/message/path/request ID/retryability/classification, and run the result through secret/depth/length scrubbing.
5. **Why does Studio ignore stage data?** `AiEnrichmentTraceInspector` reads top-level `trace.prompt`, `trace.providerResponse`, `trace.normalized`, `trace.decisions`, and `trace.vcp`; it does not project `stages[].data`. The persisted mock stage data is correct.
6. **Canonical projection fix:** A pure shared selector/view-model helper in `packages/shared/src/utils/aiEnrichmentTrace.ts`, consumed by the Inspector. It provides stage fallback and owner-full precedence in one place.
7. **Automatic discovery:** Yes. Write the failed document using the existing trace ID before provider execution and update it through `failed`; the current active/recent browser already subscribes to the collection. No trace ID entry is required.
8. **Processing parity:** Yes. The same trace lifecycle applies to normal Processing, while design lifecycle failure handling remains unchanged and trace writes remain fail-soft.
9. **Provider behavior change:** No. Request URL, headers, body, schema, prompt, model, and provider call remain unchanged.
10. **Retry behavior change:** No. Retry count and delays remain unchanged. Attempt metadata is optional observational data only.
11. **Exact files:** As listed in the Plan: Playground, Processing, retry/error boundary, trace store/types/shared projection, Inspector, and focused tests. No unrelated surfaces are in scope.
12. **Tests:** The Plan’s focused failure lifecycle, sanitizer, projection/precedence, parity, no-fabrication, source-label, request-invariance, retry-invariance, and no-extra-call tests.
13. **Later DEV Functions:** Expected `testAiEnrichmentPlayground` and `enqueueAiEnrichment`; include another Function only if import analysis proves it consumes changed shared retry code. Deployment is a later owner checkpoint.
14. **Firestore Rules:** No.
15. **Indexes:** No; existing trace browser query is unchanged.
16. **Studio DEV reload/build:** Yes, after implementation, for Inspector projection validation.
17. **Implementation authorization phrase:** `IMPLEMENT THE APPROVED AI ENRICHMENT INSPECTOR FAILURE-TRACE AND STAGE-PROJECTION CORRECTIVE IN DEV ONLY.`

## Acceptance and safety review

- No extra AI calls: required and testable.
- No Firestore dependency added to ordinary unit tests: required; use in-memory sinks/fixtures.
- No secrets in traces: enforced by bounded sanitizer and existing scrubber tests.
- No fabricated parser/VCP/candidate/persistence results: required; display `NOT REACHED`.
- No provider-contract correction: explicitly out of scope.
- No Rules/index/migration/secret changes: planned none.
- Failed trace persistence cannot convert a failed AI call into success: required fail-soft writes and unchanged error mapping.
- Full-trace owner values take precedence, but bounded stage values remain visible: required projection behavior.

## Remaining owner decision

The only remaining decision is whether to authorize implementation in DEV using the exact phrase above. Until that authorization is provided, the repository must remain implementation-unchanged for this corrective.
