# Corrective Plan — Semantic Review Provider-Response Reliability

| Field | Value |
| --- | --- |
| Date | 2026-09-07 |
| Status | DEV deployment complete — awaiting owner evidence-bearing QA retest |
| Workflow | managed-phase |
| Parent program | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | `two-pass-ai-enrichment-context-and-semantic-verification-implementation` |
| Environment | `fresh-prints-dev` |
| Production | NOT AUTHORIZED |
| Owner QA checkpoint | `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md` |
| Formal Review | `docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-review.md` (`approved`) |
| Implementation Review | `docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-implementation-review.md` |

## Goal

Make manual Playground Pass 2 Semantic Review reliably emit the already intended, safely validated response contract after the owner-reproduced unsupported-response failure. The correction is limited to provider contract enforcement and trace visibility for that contract. It does not change Pass 1 v39, VCP, category logic, retry policy, authority rules, Processing deployment, or Settings.

## Proven evidence

### Failed owner Pass 2

| Field | Evidence |
| --- | --- |
| Pass 1 trace | `4d41b3d9-59f4-4f1b-9911-59f49ee67bb6` |
| Pass 2 trace | `6b4db3ca-1cd8-4b50-aefc-2749d928e874` |
| Parent correlation | `parentTraceId` and `pass1TraceId` both equal the Pass 1 trace above |
| Cloud Run revision | `testaienrichmentsemanticreviewplayground-00013-wag` |
| Provider / model | `google` / `gemini-2.5-flash-lite` |
| Prompt version | `catalog-semantic-review-v3` |
| Source / lifecycle | `PLAYGROUND`; `created → prompt_ready → request_sent → provider_response → failed` |
| Text/image contract | `textOnly: true`; `imageCount: 0` |
| HTTP / finish reason | `200` / `stop` |
| Tokens / estimated cost | `1338` input / `150` output / `$0.0001938` using the current shared pricing helper |
| Terminal category | `patch_validation_failure` |
| Failure stage | `patch_validation` |
| Validation fault | `patch_validation_failed` |
| Exact validator message | `Unsupported semantic review patch field: subjects` |

The bounded trace's sanitized extracted provider content is sufficient to establish the returned JSON structure. The provider supplied a Markdown-fenced JSON object with the following top-level keys:

```json
{
  "decision": "APPROVE_WITH_PATCH",
  "reason": "…structured_evidence_gap:subjects:nature…",
  "blockersResolved": [],
  "blockersUnresolved": ["structured_evidence_gap:subjects:nature"],
  "patches": [
    {
      "field": "subjects",
      "value": ["Flowers", "Nature", "Wildflowers"]
    }
  ]
}
```

The owner-visible error therefore represents a valid HTTP 200, extractable JSON response that reached patch validation. It is neither a callable availability failure, malformed JSON, missing content, nor a provider transport failure.

### Expected versus observed patch representation

The parser currently accepts either:

1. a patch array whose every item is `{ field, from, to }`; or
2. a patch map such as `{ "subjects": ["Flowers", "Nature", "Wildflowers"] }`, from which the implementation deterministically derives `from` from the current profile.

The observed `{ field, value }` item is not either supported form. `validateSemanticReviewPatches` rejects it because `from` and `to` are absent, even though `field` itself is patchable. That exact guard produces the recorded message.

### Successful comparison

| Field | Failed `6b4db3ca-…` | Successful `2e7e8047-18f1-439e-b1ca-0cba99816b3a` |
| --- | --- | --- |
| Provider / model | Google / `gemini-2.5-flash-lite` | Google / `gemini-2.5-flash-lite` |
| Prompt version | `catalog-semantic-review-v3` | `catalog-semantic-review-v2` |
| Wrapper / content | `choices[0].message.content` string | same string wrapper |
| HTTP / finish reason | `200` / `stop` | `200` / `stop` |
| Tokens | `1338` / `150` | `1328` / `116` |
| Result | validation failed before projection | parsed `APPROVE_WITH_PATCH` and completed |
| Patch form | array item `{ field, value }` | canonical array item `{ field, from, to }` after parse |
| Image count | `0` | `0` |

The provider wrapper and transport contract are stable. The proven reliability gap is the Semantic Review response contract: it currently relies on natural-language JSON instructions and does not send the repository's existing strict JSON Schema `response_format` mechanism.

## Root-cause classification

**Chosen corrective decision: Option A — Provider prompt/schema correction.**

- The response is valid JSON but does not conform to the current accepted semantic patch schema.
- The parser is behaving correctly and safely rejects an incomplete mutation representation.
- The repository already proves the same Gemini OpenAI-compatible endpoint and model path accept strict `json_schema` output for Pass 1.
- The narrow correct remediation is to require the canonical Semantic Review contract at the provider boundary, rather than normalizing a newly observed array dialect.

Classification answers:

| Question | Answer |
| --- | --- |
| Prompt/schema defect | **YES** |
| Parser normalization required | **NO** |
| Validator bug | **NO** |
| Retry recommended | **NO** |
| Additional provider calls | `0` |

## Scope

### In scope

1. Add a provider-neutral strict Semantic Review JSON Schema and response-format builder, using only the JSON Schema subset already used by `simpleCatalogEnrichmentSchema.ts`.
2. Send that `response_format` in `callSemanticReviewer` to both supported provider targets.
3. Bump the Semantic Review prompt/schema contract from `catalog-semantic-review-v3` to `catalog-semantic-review-v4` and state the one canonical `patches` representation in the prompt: an optional patch map keyed only by patchable Smart Profile dimensions, where each value is the desired string array.
4. Preserve the current parser's existing canonical array and patch-map support, but add the captured `{ field, value }` response as a regression fixture that remains fail-closed. No new parser shape is accepted.
5. Include the applied response contract in the Pass 2 canonical trace so the Inspector can show the exact schema used for the run.
6. Add provider, parser, trace, text-only, authority, and no-retry tests.

### Out of scope

- Any parser normalization for `{ field, value }`.
- Automatic semantic-review retry, replay, or multiple attempts per Pass 1.
- Pass 1 v39, VCP `detailedDescription`, category stability/determinism, image handling, or Settings changes.
- Semantic Reviewer enablement, Autonomous enablement, Y2, Gate C, WS6, candidate-core or Processing deployment.
- Rules, indexes, migrations, secrets, production, commit, or push.

## Implementation approach

### Slice A — strict Semantic Review response contract

Create a `catalog_semantic_review_v4` response-format builder with:

- `response_format.type = "json_schema"`;
- `json_schema.strict = true`;
- a top-level object with `additionalProperties: false`;
- `decision` enum: `APPROVE`, `APPROVE_WITH_PATCH`, `NEEDS_REVIEW`;
- non-empty `reason` string;
- required `blockersResolved` and `blockersUnresolved` string arrays;
- optional `patches` object with `additionalProperties: false` and only the existing `SEMANTIC_REVIEW_PATCHABLE_FIELDS` as array-of-string properties; and
- no `from`, `to`, staff fields, title, description, category, visible text, image, provider key, or authority field in the provider schema.

The patch map is deliberately selected because the implementation can derive the source value from the immutable current Smart Profile and then still applies the existing stale/no-op/protected-field validation. This is already a supported parser representation; the schema only makes it the required provider output dialect.

### Slice B — prompt/version and provider request

Update the v4 prompt to refer to the schema and explicitly require the patch map when a patch is needed. Maintain JSON-only/text-only instructions and the existing eligible-blocker/audit-only language. Add the exact response format to the semantic provider request alongside the existing model, `max_completion_tokens: 1200`, and messages.

No new API mode is introduced: this reuses the existing repository-proven `response_format` shape from Pass 1 on the same Gemini endpoint.

### Slice C — trace and regression coverage

Record the v4 response contract in the Pass 2 trace's `responseContract` field and request stage, while retaining bounded redaction and `imageCount: 0`. The known failing fixture must assert `patch_validation_failure` under the legacy response; it must not be normalized into a patch or applied to a Smart Profile.

## Exact proposed files

| File | Change |
| --- | --- |
| `functions/src/ai/semanticReviewSchema.ts` | New strict v4 Semantic Review JSON Schema and response-format builder. |
| `functions/src/ai/semanticReviewSchema.test.ts` | New schema structure and constrained-property tests. |
| `functions/src/ai/semanticReviewProvider.ts` | Add the existing `response_format` mechanism to the actual provider body. |
| `functions/src/ai/semanticReviewProvider.test.ts` | Assert strict schema request, text-only/no image, captured failure classification, and no structural retry. |
| `functions/src/ai/semanticReviewCore.ts` | Bump/update the v4 contract instruction; preserve existing parser acceptance only. |
| `functions/src/ai/semanticReviewCore.test.ts` | Captured `{ field, value }` fail-closed fixture; canonical patch-map acceptance and authority guard regressions. |
| `functions/src/ai/semanticReviewPlayground.ts` | Include `responseContract` and response-format metadata in Pass 2 trace projection. |
| `functions/src/ai/semanticReviewPlayground.test.ts` | Trace contract and zero-image/one-attempt projection assertions. |
| `packages/shared/src/types/catalog/semanticReview.types.ts` | Version literal only: `catalog-semantic-review-v4`. |

`[NEEDS REPO CHECK]` applies to any additional file discovered while implementing; it must be added only if the compiler or mechanical import graph requires it.

## Tests and fixtures

1. Use the exact captured, sanitized provider fixture above. It must fail with `patch_validation_failure`, `patch_validation_failed`, and no patch application.
2. Test a v4 schema-compliant patch map against the exact current profile shape; `from` is deterministically derived before existing patch validation.
3. Assert every schema field restriction: decision enum, non-empty reason, arrays, patchable keys only, `additionalProperties: false`, and strict response format.
4. Assert Gemini and OpenAI request bodies contain the same v4 response format, no image content, and `max_completion_tokens: 1200`.
5. Assert a 200 structural validation failure makes one provider call; existing transient-only `fetchVisionWithRetry` behavior remains unchanged.
6. Retain malformed JSON, invalid decision, empty reason, invalid blocker arrays, protected/staff-owned, stale `from`, canonical no-op, objective blocker, deterministic WAA, and one-attempt tests.
7. Assert the bounded trace exposes v4 response contract, provider/model/version, token/cost evidence, `imageCount: 0`, and sanitized diagnostics without raw provider body or secrets.

## Retry decision

**No retry.** `callSemanticReviewer` currently configures `fetchVisionWithRetry({ maxRetries: 1 })`, but that helper retries only transient transport statuses/errors. The observed HTTP 200 structural validation failure occurs after the request returns and receives no retry. This corrective keeps that behavior: a schema-conforming request is the primary reliability fix; a second provider call would increase cost and undermine the single manual Pass 2 attempt semantics without evidence that it is necessary.

Maximum additional provider calls: **0**. Maximum additional provider cost: **$0**.

## Safety and authority preservation

- Pass 2 stays text-only with `imageCount: 0`.
- Provider output is validated before any patch application.
- Original Smart Profile stays immutable; the effective profile stays separate.
- Patch map values are still checked against current state, canonical no-op rejection, protected/staff-owned restrictions, and allowed dimensions.
- Objective blockers remain non-overridable.
- Reviewer blocker arrays remain audit-only; deterministic blocker recomputation and final WAA remain authoritative.
- Truly malformed or schema-nonconforming output remains fail-closed.
- No AI call is introduced by trace capture or test execution.

## DEV deployment inventory

After implementation review and separate owner authorization, deploy only:

1. `testAiEnrichmentSemanticReviewPlayground` in `fresh-prints-dev` / `us-central1`.

No Studio change is planned; the Inspector already projects the canonical response-contract field. Do not deploy `testAiEnrichmentPlayground`, `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, Rules, indexes, migrations, or any production surface.

`callSemanticReviewer` is also imported by the dormant Processing candidate core. The source change will compile through that consumer, but no Processing Function is in this corrective deployment inventory. With `semanticReviewerEnabled` OFF, current automatic Processing does not invoke Pass 2 in any case.

## Owner QA after an authorized DEV deploy

1. Hard-reload DEV Studio and open Playground plus Inspector.
2. Run a normal Pass 1 only until one genuinely eligible result is available; do not repeat a Pass 2 for the same Pass 1.
3. Run Pass 2 once. Confirm a v4 trace shows strict `json_schema`, text-only input, zero image count, provider/model/version, response shape, token/cost data, and full lifecycle.
4. Confirm a schema-compliant patch map produces the existing safe effective-profile/deterministic-WAA projection, or a truly invalid output fails closed with a specific diagnostic.
5. Verify no automatic Semantic Reviewer or Autonomous activity occurred, Processing was not invoked, and no provider retry occurred.

## Stop conditions

Stop implementation and seek a new owner decision if any of these occurs:

- Gemini rejects the existing repo-proven strict response-format mode for this exact text-only provider path.
- The v4 schema cannot express the intended patch map using the currently supported JSON Schema subset.
- A required source change would force a Processing deployment or change active Processing behavior.
- Captured behavior contradicts the safety/authority rules above.

## Implementation disposition

Owner implementation authorization was received through the approved
authorization prompt. The corrective implementation and scoped validation were
complete before the separate deployment checkpoint, with no provider/callable
invocation, deployment, Settings mutation, commit, push, or production action
performed at that implementation checkpoint.

The owner subsequently authorized and completed the exact manual Playground DEV
deployment. No provider/callable invocation was performed by Codex.

## DEV deployment disposition

The authorized command was:

`firebase deploy --only functions:testAiEnrichmentSemanticReviewPlayground --project fresh-prints-dev`

Deployment evidence:

- Function: `testAiEnrichmentSemanticReviewPlayground`
- Project/region: `fresh-prints-dev` / `us-central1`
- State: **ACTIVE**
- Revision: `testaienrichmentsemanticreviewplayground-00014-wof`
- Firebase source/deployment hash: `aeb2e287d9d5748de9d2b6852dfc6c95fbda7c33`
- Runtime: Node 20, 512 MiB, 60 seconds, concurrency 80, CPU 1
- Traffic: 100% on latest revision
- Semantic Reviewer: **OFF**; Autonomous: **OFF**; workflow mode: `shadow`
- Processing, Rules, indexes, migrations, Settings, and production: untouched

The next human checkpoint is the bounded owner manual Playground DEV retest:

`[NEEDS OWNER QA: SEMANTIC REVIEW V4 RESPONSE CONTRACT RETEST]`
