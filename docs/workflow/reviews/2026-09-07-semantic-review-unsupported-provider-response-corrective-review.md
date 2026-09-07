# Formal Review — Semantic Review Provider-Response Reliability Corrective

| Field | Value |
| --- | --- |
| Date | 2026-09-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-07-semantic-review-unsupported-provider-response-corrective-plan.md` |
| QA checkpoint | `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md` |
| Environment | `fresh-prints-dev` |
| Production | not authorized |
| Verdict | **approved** |

## Evidence reviewed

The owner-reproduced failure is fully classified from the bounded Firestore trace and correlated Cloud Run log:

| Item | Proven value |
| --- | --- |
| Failed Pass 1 / Pass 2 traces | `4d41b3d9-59f4-4f1b-9911-59f49ee67bb6` / `6b4db3ca-1cd8-4b50-aefc-2749d928e874` |
| Function revision | `testaienrichmentsemanticreviewplayground-00013-wag` |
| Provider / model / prompt | Google / `gemini-2.5-flash-lite` / `catalog-semantic-review-v3` |
| Provider result | HTTP `200`; `finishReason: stop`; one string content choice |
| Tokens / calculated cost | `1338` input, `150` output, `$0.0001938` |
| Failure category / stage / fault | `patch_validation_failure` / `patch_validation` / `patch_validation_failed` |
| Exact rejection | `Unsupported semantic review patch field: subjects` |
| Returned patch | `{ "field": "subjects", "value": ["Flowers", "Nature", "Wildflowers"] }` |

The full trace is intentionally unavailable (`captureFullTrace: false`). That is not an evidence gap here: the bounded sanitized excerpt preserves the entire small JSON object needed to prove the response shape. `topLevelJsonKeys` was absent because its current diagnostic guard only attempts direct JSON parsing when extracted content begins with `{`; the actual content began with a Markdown code fence. The excerpt independently establishes the five top-level keys: `decision`, `reason`, `blockersResolved`, `blockersUnresolved`, and `patches`.

The comparison success `2e7e8047-18f1-439e-b1ca-0cba99816b3a` used the same Google/model OpenAI-compatible wrapper, returned HTTP 200 / `stop`, and completed with canonical patches. This rules out provider transport, callable availability, response extraction, malformed JSON, and image transport as the root cause.

## Root-cause decision

**Option A — Provider prompt/schema correction: approved.**

The failed object is valid JSON but is not a valid Semantic Review mutation contract. Current parser/validator behavior is correct: accepting `{ field, value }` as a direct patch array would bypass the explicit `from`/`to` freshness checks unless new normalization were introduced. The repository already supports a safer canonical patch-map form that derives `from` from the current profile and then applies all existing validation.

The provider request currently has only model, `max_completion_tokens`, and messages; it does **not** supply `response_format`. The exact same Google endpoint/model family uses the repository's strict `json_schema` response-format mechanism for Pass 1. Adding an equivalent bounded Semantic Review schema is therefore evidence-based and narrower than parser broadening.

## Binding implementation conditions

1. Add strict `catalog_semantic_review_v4` response format with `additionalProperties: false`, decision enum, non-empty reason, required blocker arrays, and optional patch **map** limited to existing patchable dimensions and string-array values.
2. Add it to `callSemanticReviewer` for both existing provider targets; retain `max_completion_tokens: 1200`, text-only messages, and the existing endpoint/model resolution.
3. State the patch-map contract directly in the v4 prompt. Do not alter Pass 1 v39.
4. Do **not** normalize or accept the observed `{ field, value }` patch-array dialect. Capture it verbatim as a fail-closed regression fixture.
5. Preserve the current parser/validator checks: allowed fields, staff/protected fields, source freshness, canonical no-op rejection, string arrays, and pre-application validation.
6. Include the effective response contract in the Pass 2 canonical trace. Preserve redaction; no raw response, secrets, or image content in bounded traces.
7. No structural-provider retry. Existing transient-only request retry remains unchanged.
8. Do not alter automatic Processing runtime or deploy Processing Functions in this corrective.

## Required review answers

| Question | Answer |
| --- | --- |
| Does it accept only proven legitimate response forms? | **YES.** It accepts the existing canonical patch map; the captured `{ field, value }` form remains rejected. |
| Does it broaden parser acceptance? | **NO.** Provider output is constrained more strictly; parser accepted forms do not expand. |
| Does it weaken protected/objective authority? | **NO.** Existing patch validation, objective blockers, deterministic blocker recomputation, and final WAA all remain authoritative. |
| Does it add retry? | **NO.** |
| Maximum additional provider cost | **$0**; no new provider calls or retry attempts. |
| Does Pass 2 remain text-only? | **YES.** `imageCount` remains zero. |
| Does deterministic WAA remain final? | **YES.** Reviewer arrays remain audit-only. |
| Does it affect automatic Processing? | **NO in deployed DEV runtime.** The shared provider source is imported by candidate core, but no Processing Function is deployed and `semanticReviewerEnabled` remains OFF. |
| Required DEV Function deployment | `testAiEnrichmentSemanticReviewPlayground` only. |
| Settings mutation required? | **NO.** |

## Test review

The plan's fixture strategy is sufficient and mandatory:

- exact captured `{ field, value }` regression remains a validation failure and applies no patch;
- strict schema request is asserted for Google and OpenAI targets;
- canonical patch-map success derives `from` from current profile and retains stale/no-op/protected-field tests;
- 200 structural failure executes one provider call, proving no automatic retry;
- trace contract, bounded diagnostics, provider/model/version, zero-image, and no-secret behavior are tested.

No live provider call is needed for implementation validation. A bounded owner Playground retest is required only after separate DEV deployment authorization.

## Deployment and safety review

| Area | Disposition |
| --- | --- |
| DEV inventory | `testAiEnrichmentSemanticReviewPlayground` only |
| Studio | no code/configuration change required; hard reload only for owner QA |
| Processing | not deployed; candidate-core runtime unchanged |
| Settings / Rules / indexes / migrations | none |
| Semantic Reviewer / Autonomous | remain OFF |
| Production | untouched and not authorized |
| Commit / push | not authorized |

## Verdict rationale

The failed output establishes a provider-contract reliability defect, not a parser defect. Strict response schema reuse is repository-proven, constrains exactly the disputed patch representation, retains fail-closed behavior, and avoids both retry cost and authority drift. The correction is narrow, deployable to the manual Playground callable only, and does not reopen the passed large-image corrective or the separate category-stability follow-up.

## Next checkpoint

Formal Review approval does not authorize implementation, deployment, provider/callable invocation, Settings mutation, commit, push, or production action.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT SEMANTIC REVIEW PROVIDER-RESPONSE RELIABILITY CORRECTIVE]`
