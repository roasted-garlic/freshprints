# Plan: Machine-Enforced Pass 1 Visual Context Provider Contract

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Status | **Proposed for Formal Review; implementation not authorized** |
| Governing ADR | ADR-FP-182 / `visual-context-v1` |
| Evidence | `2026-09-06-two-pass-ai-enrichment-vcp-runtime-boundary-diagnostic-execution.md` |
| Scope | Narrow Pass 1 provider response-contract corrective |

## Objective

Make `visualContextProfile` a machine-enforced part of the Pass 1 catalog response
contract. Preserve the existing VCP schema, parser, one-image-call architecture,
provider selection, token limit, lifecycle, authority, category, visible-text, and
tag-inert behavior. A successful model response must contain a genuine
`visual-context-v1` VCP; no default or synthetic VCP may be created.

## Proven diagnosis

The authorized DEV diagnostic reached the provider with both VCP prompt markers,
then observed `finishReason="stop"`, 1,315 raw characters, no raw
`visualContextProfile` key, no parsed VCP, no candidate VCP, and no persisted VCP.
The first failing boundary is therefore the provider response shape, not prompt
construction, candidate cleanup, or Firestore persistence.

## Repository/provider investigation

The exact current client is **no installed SDK**. The repository uses native Node
`fetch` in `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts` and
`functions/src/ai/aiEnrichmentPlayground.ts` against:

`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

The installed Functions dependencies contain neither `openai` nor `@google/genai`.
The exact request mechanism selected for implementation is the raw OpenAI-compatible
Chat Completions body:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "catalog_enrichment",
      "strict": true,
      "schema": { "type": "object", "properties": {}, "required": [] }
    }
  }
}
```

The real `schema` will be the reviewed catalog response contract below. This is not
a new dependency or an SDK migration. Google documents structured output for the
OpenAI-compatible endpoint and separately documents support for nested objects,
arrays, required properties, `additionalProperties`, and string enums:
[Gemini OpenAI compatibility — structured output](https://ai.google.dev/gemini-api/docs/openai#structured-output)
and [Gemini structured output JSON Schema support](https://ai.google.dev/gemini-api/docs/structured-output#json-schema-support).

## Contract design

Add one provider-neutral canonical JSON Schema object for the existing simple catalog
response, then use a narrow provider adapter to place it into the OpenAI-compatible
`response_format` envelope. The schema must preserve the current response fields:

- required `title`, `description`, `category`, and `tags`;
- existing visible-text and Smart Profile fields;
- existing category alternatives/gap and halftone evidence fields;
- existing `suggestedNewTags` shape;
- required `visualContextProfile` with `version` enum exactly `visual-context-v1`,
  required `summary` and `detailedDescription`, and the existing optional bounded
  VCP fields from `VisualContextProfile`.

The schema adapter must use only the provider-supported subset: object, array, string,
enum, required, `additionalProperties`, and bounded array/string constraints where
supported. It must not use unsupported JSON Schema keywords such as `$ref`, `oneOf`,
or nullable unions unless implementation evidence proves the endpoint accepts them.
Optional response properties remain optional; VCP itself is required. The schema
must set `additionalProperties` deliberately so the existing parser can continue to
ignore unknown provider keys without making them part of the canonical contract.

The existing parser/normalizer remains mandatory defense in depth. Because the current
parser is imperative normalization code rather than a JSON Schema library, the narrow
implementation will use a single canonical schema module plus a contract test that
asserts parity for every canonical response field, every required field, the VCP
version enum, and every VCP property accepted by `normalizeVisualContextProfile`.
The parser remains the authority for trimming, caps, tag filtering, and semantic
validity. This is the smallest safe anti-drift design without adding a schema library.

## Runtime and failure behavior

Structured output does not add a second model call. Existing transient 429/5xx retry
behavior remains the only network retry; no normal response-quality retry is added.
If the provider rejects the schema request or returns a response that still fails
server-side parsing, the existing provider/pipeline error path must fail truthfully
or route to the existing safe review/failure state. It must not synthesize a VCP,
silently treat missing VCP as successful semantic-review input, or issue another
vision request.

The current `2500` completion-token limit remains unchanged. The observed diagnostic
used only 417 completion tokens and ended with `stop`; there is no evidence for a
token-limit corrective.

## Playground and provider parity

The same canonical schema adapter must be applied to both normal Processing and the
Settings Playground request builder because both use the same Chat Completions
surface. This preserves the approved Playground/Processing parity contract.

Gemini and OpenAI/Luna use the same request-builder path today. The corrective will
apply the contract to both providers through that shared builder, while preserving
provider/model selection and Luna’s existing `reasoning_effort` handling. No provider
switch or model change is included.

## Provenance

Do not add a persisted provenance field in this narrow corrective. The existing
`promptVersion` describes prompt semantics, not transport enforcement; changing its
meaning would be misleading. The response-contract version will remain source/deploy
provenance for now and will be represented in tests/telemetry only if an existing
safe field is found during implementation. Adding a new persisted field is out of
scope unless implementation evidence shows it is required for truthful operation;
that would require a separate review.

## Exact proposed application files

- `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts` — attach the
  provider-specific structured-output envelope in the shared request builder.
- `functions/src/ai/aiEnrichmentPlayground.ts` — use the same schema envelope in the
  Playground request builder.
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts` — expose or align the
  canonical response-contract representation only as mechanically required; preserve
  parser behavior.
- New narrowly scoped schema/adapter module adjacent to the above, exact filename
  to be selected mechanically during implementation.
- Adjacent provider, Playground, parser, and contract tests.

No Studio, Portal, Settings document, semantic-review, Pass 2, tag-AI, category,
WAA, rules, indexes, migration, backfill, or production files are in scope.

## Required implementation tests

1. Gemini request contains `response_format.type=json_schema`.
2. The schema requires `visualContextProfile`.
3. VCP `version` is an enum containing only `visual-context-v1`.
4. Required VCP fields and accepted optional VCP fields are represented.
5. Existing title, description, category, tags, visible text, Smart Profile,
   explicit-content evidence, category, and halftone response fields remain represented.
6. Playground and Processing emit the same schema.
7. Provider schema and parser contract parity fails if either drifts.
8. Existing valid fixtures still normalize and persist VCP.
9. Missing/invalid VCP remains fail-closed; no fake VCP is synthesized.
10. No second AI call is introduced and one-image-call behavior remains unchanged.
11. Valid VCP reaches candidate, queue persistence, and ready-backfill persistence.
12. Provider/model selection, authority ordering, lifecycle, Pass 2 maximum-one,
    tag-inert behavior, and semantic eligibility remain unchanged.
13. Functions build passes.

## Later DEV verification and deployment

No deployment or fixture processing is authorized by this Plan. After separate
implementation authorization and review, deploy only functions that mechanically
bundle the changed modules:

- `functions:enqueueAiEnrichment`
- `functions:testAiEnrichmentSemanticReviewPlayground`

If implementation proves the Playground does not bundle the changed adapter, remove
it from the final reviewed inventory. No rules, indexes, migration, or backfill are
required. Later verification uses exactly Y2 once, with Semantic Reviewer and
Autonomous OFF, while retaining the current safe DEV diagnostic instrumentation.

## Stop boundary

This artifact authorizes planning and Formal Review only. It does not authorize
implementation, deployment, Y2 retry, any fixture processing, Settings mutation,
Semantic Reviewer enablement, Gate C, Autonomous, WS6, or production action.

Recommended implementation authorization after approval:

> Authorize implementation of the reviewed narrow machine-enforced Pass 1 VCP provider
> response contract. Use the existing canonical catalog/VCP contract, apply the same
> structured-output envelope to Processing and Playground, preserve one image call and
> the 2500-token limit, keep Semantic Reviewer and Autonomous OFF, and do not deploy,
> retry Y2, process other fixtures, execute Gate C, start WS6, or touch production.
