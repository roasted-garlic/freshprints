# Formal Review: Machine-Enforced Pass 1 Visual Context Provider Contract

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Plan | `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-vcp-provider-response-contract-corrective-plan.md` |
| Evidence | `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-vcp-runtime-boundary-diagnostic-execution.md` |
| Verdict | **APPROVED FOR SEPARATE IMPLEMENTATION AUTHORIZATION; NO IMPLEMENTATION AUTHORIZED BY THIS REVIEW** |

## Review decision

The evidence-selected corrective is structured provider output at the existing raw
Gemini OpenAI-compatible Chat Completions boundary. The deployed diagnostic proved
that prose alone allowed a normal Gemini completion to omit VCP. Adding a required
JSON Schema response contract is the narrowest corrective that addresses that exact
boundary while retaining the existing parser as defense in depth.

## Required review answers

1. **Exact client:** native Node `fetch`; no Gemini/OpenAI SDK is installed.
2. **Exact endpoint:** Gemini OpenAI-compatible
   `/v1beta/openai/chat/completions`.
3. **Mechanism:** OpenAI-compatible `response_format` with `type=json_schema`,
   named schema, strict mode, and the catalog JSON Schema.
4. **VCP required:** YES, as a top-level required property.
5. **Version enforced:** YES, `version` enum exactly `visual-context-v1`.
6. **Nested objects/arrays:** YES; the documented Gemini structured-output subset
   supports object properties, nested objects, arrays/items, required fields, and
   string enums.
7. **Optional properties:** YES, optional catalog and VCP properties remain omitted
   from `required`; VCP itself is required.
8. **Full response fit:** The existing response is a bounded object of strings,
   bounded arrays, and small nested objects; the current 2500-token limit remains
   unchanged pending fixture/build validation.
9. **Schema limitations:** Avoid `$ref`, `oneOf`, and other unsupported keywords;
   use the documented subset only.
10. **Existing fields:** Preserved: title, description, category, tags, visibleText,
    Smart Profile fields, category alternatives/gap, halftone evidence, suggested
    tags, and VCP.
11. **OpenAI/Luna:** It uses the same shared Chat Completions request builder, so the
    same contract will be emitted without changing provider/model selection.
12. **Schema architecture:** A canonical schema module plus a provider envelope
    adapter is approved; the existing imperative parser remains the runtime semantic
    validator and a contract test prevents drift.
13. **Playground:** YES, same contract as Processing.
14. **Changed bundles:** Processing `enqueueAiEnrichment` and, unless mechanical
    bundle inspection excludes it, Playground
    `testAiEnrichmentSemanticReviewPlayground`.
15. **Extra AI call:** NO. Existing transient network retries remain; no response-
    quality or missing-VCP retry is permitted.
16. **Failure behavior:** Schema request failure or parser failure uses the existing
    truthful safe failure/review path; no default VCP and no silent success.
17. **Token limit:** NO change to 2500 tokens.
18. **Provenance:** No new persisted response-contract field in this narrow slice;
    `promptVersion` is not redefined. Revisit only under separate review if needed.
19. **Diagnostic telemetry:** YES, retain through the first post-corrective Y2
    verification; cleanup is a later decision.

## Scope and safety review

Approved scope is limited to the provider response contract, shared schema adapter,
parity tests, parser contract tests, and required runtime tests. Semantic Reviewer,
Pass 2, authority, lifecycle, category, WAA, tags, Studio UI, Settings data, Gate C,
Autonomous, WS6, migrations, backfills, and production remain out of scope.

Rules: **NO**. Indexes: **NO**. Migration/backfill: **NO**.

## Required implementation gate

Implementation may begin only after a new owner authorization using the exact scope
below. This Formal Review does not authorize code changes or deployment.

> Authorize implementation of the reviewed narrow machine-enforced Pass 1 VCP provider
> response contract. Use the existing canonical catalog/VCP contract, apply the same
> structured-output envelope to Processing and Playground, preserve one image call and
> the 2500-token limit, keep Semantic Reviewer and Autonomous OFF, and do not deploy,
> retry Y2, process other fixtures, execute Gate C, start WS6, or touch production.
