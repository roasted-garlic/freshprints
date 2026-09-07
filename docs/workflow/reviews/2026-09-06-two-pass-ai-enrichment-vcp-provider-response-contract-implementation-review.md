# Implementation Review: Machine-Enforced Pass 1 VCP Provider Response Contract

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Plan | `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-vcp-provider-response-contract-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-vcp-provider-response-contract-corrective-review.md` |
| Verdict | **IMPLEMENTED — FOCUSED VALIDATION PASS; STOPPED BEFORE DEV DEPLOYMENT** |
| Deployment | **Not authorized and not performed** |

## Implementation

The corrective adds the provider-neutral canonical response schema in
`functions/src/ai/simpleCatalogEnrichmentSchema.ts`. It uses only object, properties,
required, arrays/items, strings, enum, `additionalProperties`, and supported bounded
array constraints.

Both request builders now emit the OpenAI-compatible strict envelope:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "catalog_enrichment",
      "strict": true,
      "schema": "SIMPLE_CATALOG_ENRICHMENT_SCHEMA"
    }
  }
}
```

`visualContextProfile` is required at the top level. Its `version` is constrained by
the enum `["visual-context-v1"]`; `summary` and `detailedDescription` are required.
All VCP fields accepted by the current normalizer are represented. No VCP defaults or
synthetic values are generated.

`additionalProperties=false` is used for the canonical top-level response, VCP object,
and nested suggested-tag/category-alternative objects. The existing parser remains
authoritative for trimming, bounds, tag filtering, and semantic validity.

## Changed files for this corrective

- `functions/src/ai/simpleCatalogEnrichmentSchema.ts`
- `functions/src/ai/simpleCatalogEnrichmentSchema.test.ts`
- `functions/src/ai/catalogEnrichmentResponseSchemaParity.contract.test.ts`
- `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`
- `functions/src/ai/providers/geminiVisionEnrichmentProvider.test.ts`
- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/ai/catalogEnrichSchemaParity.contract.test.ts`
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts` (documentation only)
- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` (documentation only)

Earlier diagnostic and prompt-corrective changes remain in the working tree but were
not behaviorally altered by this corrective.

## Parity and architecture

- Processing and Playground emit the same canonical response schema; a test deep-compares both envelopes.
- Gemini uses the reviewed OpenAI-compatible `response_format` mechanism.
- OpenAI/Luna uses the same request construction and retains `reasoning_effort`.
- `extractJsonObject` and `normalizeSimpleCatalogEnrichment` remain mandatory.
- Missing/invalid VCP remains fail-closed; no fake VCP, VCP retry, or second model call was added.
- One-image-call architecture, provider/model selection, prompt version, and output limit `2500` are unchanged.
- DEV diagnostic telemetry remains enabled only for `fresh-prints-dev`.

## Validation

Focused schema/provider/parity/VCP/semantic suite: **73 passed, 0 failed**.

Additional contract regression suite: **19 passed, 0 failed**.

`npm run build --prefix functions`: **PASS**

`git diff --check`: **PASS**

## Broader validation exception

The full Functions AI sweep ran with **436 passed, 8 failed**.

**ACCEPTED PRE-EXISTING VALIDATION EXCEPTION**

Exact failures:

1. `functions/src/ai/aiEnrichmentObserve.contract.test.ts:64` — candidate-core source scan sees the pre-existing `markAiSuccess` comment; candidate-core was not changed by this corrective.
2. `functions/src/ai/catalogEnrichV36VisualFirst.contract.test.ts:14` — stale v36 visual-first expectation.
3. `functions/src/ai/catalogEnrichV37CategoryGapSemantics.contract.test.ts:17` — stale v37 category-gap expectation.
4. `functions/src/ai/categoryDescriptionsPromptParity.contract.test.ts:58` — existing legacy v36 prompt-path parity expectation.
5. `functions/src/ai/explicitContentAutomation.contract.test.ts:67` — existing source wiring expectation.
6. `functions/src/ai/promptParity.test.ts:86` — existing Playground/Processing prompt parity expectation.
7–8. `functions/src/ai/smartProfileQuality.contract.test.ts:16` and `:149` — existing Smart Profile source-quality expectations.

These failures do not involve the new schema module, response-format envelope,
provider request integration, Playground integration, or parser behavior. No unrelated
failures were repaired.

## Safety and deployment boundary

- Semantic Reviewer changed: **NO**
- Autonomous changed: **NO**
- Settings mutated: **NO**
- Designs processed: **NO**
- Y2 retried: **NO**
- Gate C executed: **NO**
- WS6 started: **NO**
- Production touched: **NO**
- Rules/indexes/migration/backfill: **NO**

Exact future DEV deployment allowlist:

- `functions:enqueueAiEnrichment`
- `functions:testAiEnrichmentSemanticReviewPlayground`

Both changed request paths import the shared schema helper. No deployment occurred
under this authorization.

## Next checkpoint

> Authorize DEV deployment of the reviewed machine-enforced Pass 1 VCP provider response
> contract to `functions:enqueueAiEnrichment` and
> `functions:testAiEnrichmentSemanticReviewPlayground` only. Then authorize exactly one
> Y2 verification run; keep `semanticReviewerEnabled=false` and Autonomous OFF, with no
> other fixture, Settings mutation, Gate C, WS6, or production action.
