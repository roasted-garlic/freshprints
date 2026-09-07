# Semantic Review blocker semantics and canonical no-op corrective plan

**Date:** 2026-09-07
**FreshForge command:** Continue Workflow
**Parent goal:** `smart-catalog-intelligence-completion-and-legacy-tag-retirement`
**Workstream:** `two-pass-ai-enrichment-context-and-semantic-verification-implementation`
**Corrective:** Semantic Review blocker semantics and no-op result handling
**Environment:** DEV
**Status:** Proposed for Formal Review; implementation is not authorized by this artifact

## Gate and safety boundary

This is a corrective investigation and implementation plan only. The separate
Pass 2 request-observability corrective is already implemented and locally
validated. Its deployment remains separately gated under:

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 2 REQUEST OBSERVABILITY + OWNER RETEST]`

This plan does not reimplement or deploy that work. It does not invoke a
provider or Firebase callable, change a prompt/schema/parser/no-op behavior,
deploy anything, enable Semantic Reviewer or Autonomous, run Processing/Y2/
Gate C/WS6, touch production, or commit/push. Implementation requires a
separate owner authorization after this Plan and its Formal Review.

## Goal

Make the model-facing meaning of every Pass 2-eligible deterministic blocker
explicit, especially the fact that a `structured_evidence_gap` names a value
already present in the Smart Profile whose supporting evidence is insufficient.
Add a truthful, distinct classification for a provider response whose valid
patch map is canonically identical to the current field values.

The corrective must preserve deterministic Fresh Prints authority. A reviewer
cannot resolve a blocker merely by reporting it resolved, and a canonical
no-op cannot produce Ready.

## Decisive evidence

The decisive full-capture trace is:

- Pass 2 trace: `a32ae4d0-5f55-45b4-8efe-43ddff3bc64e`
- Parent Pass 1 trace: `df5712e1-f3d2-45f0-81f6-6cf83a5e0589`
- Provider/model: `google / gemini-2.5-flash-lite`
- Prompt: `catalog-semantic-review-v4`
- Original and effective `subjects`: `['Flowers', 'Nature']`
- Eligible blocker: `structured_evidence_gap:subjects:nature`

The provider returned valid JSON with the v4 patch-map shape:

```json
{
  "decision": "APPROVE_WITH_PATCH",
  "reason": "The original smart profile is missing 'nature' in the subjects.",
  "blockersResolved": [],
  "blockersUnresolved": ["structured_evidence_gap:subjects:nature"],
  "patches": { "subjects": ["Flowers", "Nature"] }
}
```

The existing validator rejected it with:

`Semantic review patch is a no-op after canonical normalization.`

The trace proves payload/state skew is **not** the cause: the provider was sent
the current subjects. It proves the model misunderstood blocker semantics. It
does not prove a parser, schema, validator, or no-op-validation defect. The
prior `musicians` no-op case is corroborating evidence, but the decisive trace
for this plan is the full-capture `Flowers`/`Nature` trace above.

## Read-only source findings

### Pass 2 eligibility

`packages/shared/src/utils/semanticReviewPolicy.ts` currently defines exactly
these eligible prefixes:

- `structured_evidence_gap:`
- `subject_specificity_risk:`

`getSemanticReviewEligibleBlockers` filters to those prefixes. Objective
blockers are excluded before the reviewer call. The reviewer is only callable
when it is enabled, objective blockers are absent, eligible semantic blockers
exist, and the VCP has the required summary and detailed description.

### `structured_evidence_gap`

`packages/shared/src/utils/catalogAutomationEvidence.ts` generates this code
from a value already present in the relevant Smart Profile dimension:

- subject: `structured_evidence_gap:subjects:<normalized value>`
- object: `structured_evidence_gap:objects:<normalized value>`

The helper builds bounded evidence corpora from title, description,
`centralSubject`, visible text, and the dimension-appropriate structured VCP
fields. Subject evidence can include VCP people/characters and animals;
object evidence can include VCP objects. Multi-word subjects additionally use
the independent-support and short identity-title rules in that helper.

The condition is therefore not “the value is absent from the field.” It is:
the value is present, but deterministic contextual checks do not find sufficient
approved evidence to retain it in that dimension. The named token is
normalized for the reason code; the source Smart Profile value itself remains
the authority for comparison.

### `subject_specificity_risk`

`detectSubjectSpecificityRisk` returns:

`subject_specificity_risk:<head>`

when subjects contain a generic/head value, the title/description/
`centralSubject` context yields an evidence-grounded specific phrase using the
existing promotable-specificity rules, and that specific phrase is not already
represented in subjects. The function canonicalizes phrase keys and uses the
last word of the grounded phrase as the code suffix. A generic subject is thus
already present; the risk is that the profile is underspecified relative to a
grounded, more specific subject phrase.

The existing Frankenstein/generic-monster regression is the appropriate
fixture family. No global denylist or new evidence algorithm is proposed.

### Current validation and authority

`validateSemanticReviewPatches` already rejects unsupported fields, stale
`from` values, and canonically identical `from`/`to` values. The canonical
no-op rejection must remain. `computeCatalogAutomationDecision` is rerun
after any accepted patch, and `deriveSemanticReviewBlockerResolution` derives
resolution from deterministic before/after blockers. Reviewer blocker arrays
remain audit-only. Objective/staff authority and final WAA remain outside the
model's authority.

## Exact blocker contracts for the reviewer

| Eligible kind | Generation condition | Named value already present? | Valid resolution | Must return `NEEDS_REVIEW` when |
| --- | --- | --- | --- | --- |
| `structured_evidence_gap` | Existing subject/object value lacks sufficient support in the bounded, dimension-specific evidence corpus. | **Yes**, in the named Smart Profile dimension. | Remove the unsupported value when the supplied evidence justifies removal, or replace it with a different evidence-supported value. | No safe evidence-supported removal or replacement is available. |
| `subject_specificity_risk` | Existing generic/head subject remains while a grounded, more-specific phrase is evidenced and absent from subjects. | **Yes**, the generic/head subject is already present; the missing part is the grounded specificity. | Add the grounded specific phrase when the source algorithm would retain the generic alongside it, or replace/remove the generic only when the supplied evidence and deterministic recomputation justify that result. | Specificity cannot be established safely, or the only proposed change is a duplicate/re-addition of the generic value. |

Rules for both kinds:

1. Raw reason-code wording is not the semantic contract; use the supplied
   blocker detail.
2. Compare the current effective field with the desired target before emitting
   a patch.
3. Adding a value already present, reordering values, or changing only case is
   never a resolution.
4. Do not invent evidence, perform cosmetic edits, or change unrelated
   dimensions.
5. Return `NEEDS_REVIEW` with no patches when no safe mutation can clear the
   deterministic blocker.
6. Fresh Prints recomputes blockers and WAA after an accepted patch; provider
   `blockersResolved`/`blockersUnresolved` arrays cannot override that result.

For the decisive example, removing `Nature` may be valid only if the supplied
evidence supports that removal. Re-emitting `['Flowers', 'Nature']` is always a
canonical no-op and must remain rejected.

## Narrow implementation design

### 1. Add model-facing blocker details without replacing raw codes

Add a small shared semantic-review blocker-detail type and pure descriptor
helper, preferably alongside the existing semantic-review policy utilities.
The descriptor must be derived from the existing reason code and current
effective Smart Profile; it must not duplicate or replace blocker generation.
It should expose, at minimum:

```json
{
  "code": "structured_evidence_gap:subjects:nature",
  "kind": "structured_evidence_gap",
  "field": "subjects",
  "value": "nature",
  "currentFieldValues": ["Flowers", "Nature"],
  "valueAlreadyPresent": true,
  "meaning": "The value is already present, but deterministic evidence does not sufficiently support retaining it.",
  "resolutionGuidance": "Remove or replace only when supplied evidence supports the change; otherwise return NEEDS_REVIEW."
}
```

For specificity risk, the descriptor must state that a grounded specific
phrase is evidenced but absent while the generic/head subject is already
represented. It must not claim an exact phrase unless that phrase is safely
available from the existing evidence helper. Raw `eligibleBlockers` remain in
the prompt for deterministic trace correlation.

### 2. Version the prompt, not the response schema

Bump the model-facing prompt version to:

`catalog-semantic-review-v5`

The prompt must explicitly say:

- never infer blocker meaning from raw code wording alone;
- read blocker semantics/details;
- `structured_evidence_gap` does not mean the value is absent;
- compare current field values with the desired target;
- never return `APPROVE_WITH_PATCH` with a canonical no-op target;
- remove/replace unsupported values only with evidence;
- return `NEEDS_REVIEW` with no patches when safe resolution is unavailable;
- do not make unrelated cosmetic edits;
- reviewer blocker arrays are audit-only;
- deterministic recomputation is final authority.

The system prompt and text-only/image-count-zero Pass 2 behavior remain
unchanged. The prompt version is independent of the provider response schema.

### 3. Give canonical no-op failures a truthful category

Choose Option A: retain canonical no-op as a terminal callable failure, but
classify it distinctly as `semantic_review_noop` (or the exact equivalent
approved by repository naming conventions). The provider response was valid
JSON and a supported v4 patch map, but the proposed mutation had no effective
change. It is not a malformed or unsupported provider response.

The category remains a failed-precondition-style outcome because no valid
mutation was available, and it must preserve these invariants:

- no mutation is applied;
- no Ready outcome is produced;
- deterministic blockers remain authoritative;
- the one-Pass-2-attempt limit is unchanged;
- the trace retains the sanitized response and canonical comparison evidence.

User-safe wording should be specific and repo-consistent, for example:

`Semantic Review proposed no effective change. No changes were applied.`

The current generic “unsupported Semantic Review response” copy must not be
used for this category. Option B (converting it into an ordinary
`NEEDS_REVIEW` result) is rejected as a broader pipeline semantic change that
would blur a valid-response validation failure and complicate the existing
one-attempt/error state handling.

### 4. Keep parser/schema/retry/observability behavior stable

No provider JSON Schema redesign is required. The existing v4 schema already
accepted the decisive response shape. No parser dialect broadening, retry
change, suppression of no-op validation, or new AI call is allowed. The
observability corrective remains separate; only a narrowly required trace type
field may be added if compilation proves it necessary.

## Proposed implementation files

Expected narrow file set after implementation authorization:

- `packages/shared/src/types/catalog/semanticReview.types.ts` — prompt-version
  constant and, if needed, the shared blocker-detail type.
- `packages/shared/src/utils/semanticReviewPolicy.ts` — pure blocker-detail
  descriptor and stable canonical no-op reason marker, if needed.
- `functions/src/ai/semanticReviewCore.ts` — v5 prompt composition only; keep
  parsing and v4 patch-map acceptance unchanged.
- `functions/src/ai/semanticReviewErrors.ts` — new no-op category and safe copy.
- `functions/src/ai/semanticReviewErrorMapping.ts` — map the new category to
  the existing failed-precondition transport.
- `functions/src/ai/semanticReviewProvider.ts` — classify the already-rejected
  canonical no-op without changing provider calls or retries.
- `functions/src/ai/semanticReviewPlayground.ts` — only if the diagnostic
  result needs the new category/detail represented explicitly; no separate
  observability redesign.
- `functions/src/ai/aiEnrichmentCandidateCore.ts` — only the narrowly required
  truthful failure propagation, if existing Processing persistence cannot carry
  the new category through the current error path.
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.ts`
  — distinct no-op user-facing copy.

Expected tests:

- `packages/shared/src/utils/semanticReviewPolicy.test.ts`
- `functions/src/ai/semanticReviewCore.test.ts`
- `functions/src/ai/semanticReviewProvider.test.ts`
- `functions/src/ai/semanticReviewErrors.test.ts`
- `functions/src/ai/semanticReviewErrorMapping.test.ts`
- `functions/src/ai/semanticReviewPlayground.test.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.test.ts`
- existing `catalogAutomationDecision` tests, only where a regression assertion
  is needed; do not alter the evidence algorithm.

## Required implementation validation

The eventual implementation must run the scoped shared, Functions, and Studio
tests/typechecks relevant to every changed file, plus the broader suite where
feasible. It must record exact commands, pass counts, and any unrelated
baseline failures without repairing unrelated work.

Required behavior coverage:

1. **Evidence-gap no-op:** current `['Flowers','Nature']`, blocker
   `structured_evidence_gap:subjects:nature`, provider target unchanged. Assert
   canonical no-op, no patch, no Ready, and `semantic_review_noop` copy/category.
2. **Evidence-gap useful mutation:** remove unsupported `Nature` only where the
   fixture's evidence justifies removal; assert validation succeeds and final
   blocker/WAA comes from deterministic recomputation.
3. **No safe resolution:** valid `NEEDS_REVIEW` with no patches; blocker stays
   unresolved and WAA remains Needs Review.
4. **Specificity:** generic-monster/Frankenstein fixture; assert guidance leads
   to evidence-supported specificity rather than duplicate generic values.
5. **Metadata:** raw codes are preserved, current-field presence is explicit,
   and both eligible kinds carry correct meaning/guidance.
6. **Contract/authority:** prompt is v5, response schema remains
   `catalog_semantic_review_v4`, text-only `imageCount=0`, protected/staff and
   objective blockers remain hard stops, reviewer arrays are audit-only,
   deterministic WAA remains final, one provider call/no automatic retry.
7. **UI/error:** no-op copy is distinct from malformed/unsupported response
   copy and no unrelated callable error mapping regresses.

No test may make an extra AI call merely to capture diagnostics. Ordinary unit
tests remain Firestore-free.

## Processing effect and rollout boundary

Processing uses the shared candidate core through the following exported
entrypoints:

- `enqueueAiEnrichment`
- `reprocessReadyDesignWithAi`
- `onCatalogReprocessJobWritten` → `catalogReprocessWorker`

When Semantic Reviewer is explicitly enabled, those paths will use the v5
prompt and truthful no-op classification. Deterministic profile construction,
objective/staff authority, blocker recomputation, WAA, and one-attempt behavior
do not change. Semantic Reviewer is currently OFF, and this Plan authorizes no
deployment or enablement.

## Later DEV deployment inventory

No deployment is authorized by this Plan or Review. After implementation and a
separate deployment authorization, the controlled first QA inventory is:

1. Functions: `testAiEnrichmentSemanticReviewPlayground` — required to verify
   the corrected prompt and no-op category with the owner-controlled DEV
   Playground.
2. Studio DEV build: the Inspector/AI-enrichment settings surface containing
   the distinct callable-error copy, if that UI change is included in the
   implementation build.

The Processing entrypoints (`enqueueAiEnrichment`,
`reprocessReadyDesignWithAi`, and `onCatalogReprocessJobWritten`) are affected
by the shared runtime code but are intentionally excluded from the first
controlled QA deployment because candidate-core deployment is explicitly out
of scope for this corrective. Any Processing deployment requires its own
reviewed inventory and owner authorization; it must not be implied by the
Playground deployment.

## Owner QA procedure after later authorization

1. Hard reload DEV Studio and verify Semantic Reviewer remains OFF unless a
   later approved canary explicitly enables it.
2. Run the controlled Playground Pass 2 case that reproduces the full-capture
   `Flowers`/`Nature` blocker. Confirm the v5 prompt contains the raw code and
   explicit “already present / insufficient evidence” semantics.
3. Confirm Gemini is not asked to add `Nature` merely because the blocker code
   contains `nature`. If it returns the same canonical target, confirm the
   trace reports a no-op category and specific copy, no mutation, no Ready, and
   no retry.
4. Run a fixture with a justified evidence-supported removal/replacement and
   verify deterministic recomputation, not reviewer arrays, decides resolution.
5. Run a no-safe-resolution fixture and verify `NEEDS_REVIEW` with no patches.
6. Verify protected/staff and objective blockers cannot be overridden and that
   Pass 2 remains text-only with `imageCount=0`.
7. Record trace IDs, exact prompt version, provider/model, request count, costs,
   final blocker arrays, WAA, and the separate observability state.

The owner must separately authorize implementation and then deployment. No
provider or Firebase call is made as part of this Plan/Review task.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| More descriptive blocker text accidentally becomes new business logic. | Keep deterministic generation and recomputation unchanged; metadata is explanatory only. |
| Model removes a valid generic subject while resolving specificity. | Require evidence-supported mutations and deterministic post-patch recomputation; unresolved cases return `NEEDS_REVIEW`. |
| A valid provider response is mislabeled as malformed. | Detect only the existing canonical no-op condition and use a distinct category/copy. |
| Prompt/schema versions drift. | Set prompt to v5 while explicitly retaining the v4 response schema and assert both in tests. |
| Processing changes reach DEV unexpectedly. | Exclude candidate-core deployment from first QA inventory and keep Semantic Reviewer OFF. |
| Diagnostic data leaks secrets. | Reuse existing bounded/sanitized trace projection; no new raw credentials or image bytes. |

## Next gate

After this Plan and Formal Review are accepted, the next action is still an
owner authorization checkpoint:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT SEMANTIC REVIEW BLOCKER-SEMANTICS + NO-OP CORRECTIVE]`
