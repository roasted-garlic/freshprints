# Formal Review — Semantic Review blocker semantics and canonical no-op corrective

**Date:** 2026-09-07
**Plan reviewed:** `docs/workflow/plans/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-plan.md`
**FreshForge command:** Continue Workflow
**Workstream:** `two-pass-ai-enrichment-context-and-semantic-verification-implementation`
**Review type:** Corrective Plan + Formal Review only
**Environment:** DEV
**Verdict:** APPROVED AS A NARROW IMPLEMENTATION PLAN; implementation authorization is still required

## Review boundary

This review does not authorize code changes, deployment, provider/Firebase
calls, Semantic Reviewer enablement, Autonomous, Processing, Y2, Gate C, WS6,
production, commit, or push. The separate Pass 2 request-observability
corrective is already implemented and locally validated, but its deployment
remains separately gated under:

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 2 REQUEST OBSERVABILITY + OWNER RETEST]`

The reviewed corrective begins from the decisive full-capture evidence and
does not reopen the observability corrective.

## Evidence reviewed

The full-capture trace `a32ae4d0-5f55-45b4-8efe-43ddff3bc64e` with parent
`df5712e1-f3d2-45f0-81f6-6cf83a5e0589` shows:

- Google / `gemini-2.5-flash-lite` returned HTTP 200 and valid JSON.
- Prompt version was `catalog-semantic-review-v4`.
- Original and effective subjects sent to the provider were exactly
  `['Flowers', 'Nature']`.
- The eligible blocker was exactly
  `structured_evidence_gap:subjects:nature`.
- Gemini said Nature was missing and proposed
  `subjects: ['Flowers', 'Nature']`.
- The existing validator rejected the canonical no-op with
  `Semantic review patch is a no-op after canonical normalization.`

This classifies the incident as:

| Question | Finding |
| --- | --- |
| Payload/state skew | **DISPROVEN for this trace** |
| Provider v4 patch-map format defect | **DISPROVEN** |
| Parser defect | **DISPROVEN** |
| Validator/no-op validation defect | **DISPROVEN** |
| Model shown the current Nature value | **YES** |
| Model misunderstood `structured_evidence_gap` meaning | **PROVEN** |
| Pass 2 end-to-end result | **FAIL** |
| Current generic unsupported-response copy | **Misleading for this case** |

The prior `musicians` no-op case corroborates the pattern but is not used to
claim unobserved payload details.

## Formal answers

### 1. Exact semantics of every Pass 2-eligible blocker type

The source currently makes exactly two blocker families eligible:

1. `structured_evidence_gap:<field>:<value>` — the named subject/object value
   is already present in that Smart Profile dimension, but bounded contextual
   evidence does not sufficiently support retaining it. The checks use the
   existing title, description, central subject, visible text, and the
   dimension-specific structured VCP evidence, including the current
   multi-word subject support rules.
2. `subject_specificity_risk:<head>` — a generic/head subject is already
   present while the existing evidence helper finds a grounded, more-specific
   subject phrase that is not represented in the subject list. The code suffix
   is the grounded phrase head, not a request to add the same generic value.

No other raw blocker prefix is eligible for Pass 2. In particular,
`automation_policy_uncertainty` is not a Pass 2 semantic blocker under the
current policy.

### 2. Does `structured_evidence_gap` name a value already present?

**YES.** The generator iterates the current `subjects`/`objects` values and
emits a gap when evidence support is absent. The code does not mean the value
is absent from the field.

### 3. Valid resolution actions

For an evidence gap, remove the unsupported value only when the supplied
evidence justifies removal, or replace it with a different evidence-supported
value. For a specificity risk, add the grounded specific phrase when the
existing deterministic normalizer retains the generic value, or replace/remove
the generic only when evidence and deterministic recomputation justify that
result. Duplicate, case-only, reorder-only, and re-addition proposals are not
resolutions.

If safe evidence is insufficient, the model must return `NEEDS_REVIEW` with no
patches.

### 4. Structured model-facing blocker metadata approved?

**YES, narrowly.** Preserve raw `eligibleBlockers` for trace correlation and
add a pure descriptor derived from the existing code/current profile. It may
state the field, value, current field values, whether the value is already
present, the deterministic meaning, and resolution guidance. It must not
replace blocker generation, invent evidence, or assert a specific phrase that
the existing helper cannot safely provide.

### 5. Prompt version

**`catalog-semantic-review-v5`.** The prompt must explicitly describe the two
blocker contracts, current-field comparison, no-op prohibition, evidence
requirement, `NEEDS_REVIEW` fallback, audit-only reviewer arrays, and
deterministic final authority.

### 6. Response schema change required?

**NO.** The existing `catalog_semantic_review_v4` JSON Schema accepted the
decisive valid patch-map response. Prompt version and response schema version
are intentionally independent.

### 7. Parser change required?

**NO.** Do not broaden dialect acceptance or alter v4 patch-map parsing. A
narrow classification hook may identify the already-existing canonical no-op
validation result, but it is not a parser behavior change.

### 8. Does no-op mutation rejection remain?

**YES.** `validateSemanticReviewPatches` must continue rejecting stale and
canonically equivalent targets. No-op validation must not be suppressed or
converted into an applied patch.

### 9. No-op result/error classification

Choose **Option A**: retain the canonical no-op as a terminal callable failure
with a distinct `semantic_review_noop` category (or the exact equivalent
repo-consistent identifier). The provider response is valid, but no effective
mutation is available. Map it through the existing failed-precondition
transport and use:

`Semantic Review proposed no effective change. No changes were applied.`

Option B, converting this into a normal zero-patch `NEEDS_REVIEW` result, is
not approved because it would blur a valid-response validation failure and
require broader candidate-core state semantics. Either classification must
preserve no mutation, no Ready, deterministic WAA, and one-attempt behavior;
Option A satisfies those requirements with the smaller change.

### 10. Can a no-op produce Ready?

**MUST BE NO.** A no-op is not a resolved blocker. It must not mutate the
profile, clear the deterministic blocker, publish Ready, or allow reviewer
arrays to claim resolution.

### 11. Does deterministic WAA remain final authority?

**MUST BE YES.** Fresh Prints recomputes the automation decision after any
accepted patch. Reviewer blocker arrays remain audit-only, and objective/staff
authority remains protected.

### 12. Processing effect

**YES, when Semantic Reviewer is explicitly enabled.** Processing reaches the
shared semantic-review path through `enqueueAiEnrichment`,
`reprocessReadyDesignWithAi`, and the `onCatalogReprocessJobWritten` worker.
Those paths would use the v5 prompt and receive the truthful no-op category;
their deterministic profile, objective/staff authority, WAA, and one-attempt
rules do not change. Semantic Reviewer is currently OFF. No Processing
deployment or enablement is included in this Plan/Review.

### 13. Exact implementation files

The reviewed narrow set is:

- `packages/shared/src/types/catalog/semanticReview.types.ts`
- `packages/shared/src/utils/semanticReviewPolicy.ts`
- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewErrors.ts`
- `functions/src/ai/semanticReviewErrorMapping.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/ai/semanticReviewPlayground.ts` only if the existing trace
  projection needs the new category/detail represented explicitly
- `functions/src/ai/aiEnrichmentCandidateCore.ts` only if existing Processing
  persistence cannot carry the new failure category through its current error
  path
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.ts`

Tests are the corresponding existing shared, Functions, and Studio test files
listed in the Plan. `semanticReviewSchema.ts` is explicitly not a proposed
change.

### 14. Exact later DEV deployment inventory

No deployment is authorized now. After implementation review and a separate
owner deployment authorization, the first controlled semantic-review QA
inventory is exactly:

- Functions: `testAiEnrichmentSemanticReviewPlayground`
- Studio DEV build containing the reviewed callable-error copy/Inspector
  surface, if the UI mapping is included in the implementation build

The following are deliberately **not** in that first controlled inventory:

- `testAiEnrichmentPlayground` — Pass 1 is not changed by this corrective.
- `enqueueAiEnrichment`
- `reprocessReadyDesignWithAi`
- `onCatalogReprocessJobWritten`

The last three are shared-runtime consumers and are affected when Semantic
Reviewer is enabled, but candidate-core/Processing deployment is explicitly
out of scope here and requires a separately reviewed deployment inventory and
authorization. This separation prevents a Playground QA deploy from silently
activating the Processing path.

### 15. Owner QA procedure

After implementation and separate deployment authorization, the owner should
hard reload DEV Studio and run the controlled Playground Pass 2 reproduction
with full capture. Verify:

- v5 prompt version;
- raw blocker plus explicit metadata saying the value is already present and
  unsupported evidence is the issue;
- v4 response schema and text-only `imageCount=0` request;
- a canonical no-op is shown as `semantic_review_noop` with the specific copy;
- no mutation, no Ready, no retry, and deterministic blocker/WAA retained;
- a justified evidence-supported removal/replacement is recomputed
  deterministically;
- a no-safe-resolution response is `NEEDS_REVIEW` with no patches;
- staff/objective protections remain non-overridable;
- trace records provider/model, request count, result, and cost.

Semantic Reviewer must remain OFF unless a later approved canary explicitly
authorizes enabling it.

## Required implementation tests

The Plan's required tests are approved. At minimum they must cover:

- Flowers/Nature evidence-gap canonical no-op, no mutation, no Ready, specific
  category/copy;
- evidence-supported removal/replacement and deterministic blocker
  recomputation;
- valid `NEEDS_REVIEW` with no safe patch;
- Frankenstein/generic-monster specificity guidance;
- metadata correctness for both eligible blocker kinds;
- v5 prompt with unchanged v4 schema;
- parser acceptance unchanged;
- one provider call and no automatic retry;
- text-only/image-count-zero Pass 2;
- objective/staff authority and audit-only reviewer arrays;
- Processing/candidate-core failure propagation where mechanically required;
- Studio callable-error mapping.

No test may add an AI call merely for trace capture, and ordinary unit tests
must remain Firestore-free.

## Review conclusion

The proposed corrective is narrow, evidence-based, and preserves the existing
schema, parser, validator, deterministic authority, retry, and observability
boundaries. The proven defect is model-facing blocker semantics, not payload
skew or canonical no-op validation. The Plan is approved for a subsequent owner
implementation authorization; no implementation action is authorized by this
review.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT SEMANTIC REVIEW BLOCKER-SEMANTICS + NO-OP CORRECTIVE]`
