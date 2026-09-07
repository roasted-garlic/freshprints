# Corrective Plan — Pass 2 Input-State Consistency and Playground Request Observability

**Date:** 2026-09-07  
**Workstream:** `ai-enrichment-inspector-and-live-trace-viewer`  
**Phase:** Read-only investigation → corrective Plan → Formal Review  
**Status:** Implemented; validation and deployment boundary are recorded in the
implementation review
**Scope:** DEV Playground Pass 2 diagnostics only

## Goal

Determine why the failed Pass 2 trace for the `musicians` case reported

`Semantic review patch is a no-op after canonical normalization.`

while the owner-facing evidence appeared to show that `musicians` was the
semantic blocker to resolve. The corrective must first make the complete
boundary state observable. It must not infer a business-logic defect from a
bounded trace that discarded the inputs needed to distinguish state skew,
provider behavior, and validator behavior.

This Plan also defines a narrow Playground diagnostic surface so a future
owner retest can inspect the exact relevant state without enabling full raw
trace capture or exposing secrets.

## Governing constraints

- This is an investigation and planning artifact. It does not authorize code,
  provider, Firebase, Settings, deployment, or data changes.
- Do not invoke Pass 1, Pass 2, Gemini, OpenAI, Luna, or a Firebase callable.
- Do not change prompts, schemas, provider/model, retry behavior, or business
  decision policy in this corrective.
- Do not enable Semantic Reviewer or Autonomous; do not run Y2, Gate C, or
  WS6; do not touch production.
- Do not commit or push.
- Preserve all existing uncommitted work.

## Evidence reviewed

The exact owner-supplied trace is the failed Pass 2 Playground trace
`6373e41f-1489-422b-b87d-09d82f8872cf`, with parent Pass 1 trace
`363da659-b873-4868-b75f-f9ada9cdeb88`. The trace was supplied in the owner
attachment `f994fac1-4588-4ed1-a2ec-4f4f04a9b92c/pasted-text.txt`; no matching
full JSON trace is checked into the repository.

The observed trace establishes:

- source `PLAYGROUND`, provider `google`, model
  `gemini-2.5-flash-lite`, and text-only Pass 2 (`imageCount: 0`);
- lifecycle `created → prompt_ready → request_sent → provider_response →
  failed`;
- HTTP 200, one provider choice, string response content, `finishReason:
  stop`, and the provider response diagnostic category
  `patch_validation_failure`;
- the sanitized provider result was a patch map with decision
  `APPROVE_WITH_PATCH` and `patches.subjects = ["beatles", "musicians"]`;
- the validator rejected it as a no-op after canonical normalization;
- `parsed`, VCP, candidate, persistence, and final result were not reached;
- `captureFullTrace` was false, `prompt` was `{}`, `requestOptions` was `{}`,
  and the displayed response schema had empty enum/items/properties details;
- the parent Pass 1 trace and exact outbound request/messages were not
  available in the supplied evidence.

The current checked-in source was inspected at the relevant boundaries:

- `functions/src/ai/semanticReviewPlayground.ts`
  - eligibility uses `request.originalSmartProfile`, title, description,
    visible text, VCP, and catalog decision state;
  - the prompt is built from the same request's original Smart Profile and
    effective Smart Profile;
  - patch validation ultimately receives a patch profile derived from the
    original Smart Profile.
- `functions/src/ai/semanticReviewCore.ts`
  - `buildSemanticReviewPrompt` renders the visual context, original profile,
    effective profile, eligible blockers, patchable fields, and decisions as
    JSON in the user message;
  - `parseSemanticReviewResult` accepts the current patch-map form and derives
    `from` from the current profile before validation.
- `functions/src/ai/semanticReviewProvider.ts`
  - the request body is built immediately before dispatch with `model`,
    `max_completion_tokens: 1200`, v4 `response_format`, and system/user
    messages; Pass 2 is text-only.
- `functions/src/ai/semanticReviewSchema.ts`
  - the v4 strict JSON Schema has explicit decision enums, blocker arrays,
    patchable-field properties, string-array items, and required fields.
- `packages/shared/src/utils/catalogAutomationEvidence.ts` and
  `packages/shared/src/utils/catalogAutomationDecision.ts`
  - a subject already present in Smart Profile can still produce a
    `structured_evidence_gap` when the evidence corpus does not lexically
    support it. Smart Profile presence alone is not proof that the blocker is
    stale.
- `packages/shared/src/utils/semanticReviewPolicy.ts`
  - canonical normalization rejects a patch when `from` differs from the
    current canonical list or when canonical `from` and `to` are equal.
- `packages/shared/src/utils/aiEnrichmentTrace.ts` and
  `functions/src/ai/aiEnrichmentTraceStore.ts`
  - bounded serialization intentionally removes prompt text and can lose
    deeply nested schema/request data; full trace capture is separately
    gated, and trace-store failures are fail-soft.

## Boundary-by-boundary classification

The following answers distinguish exact captured evidence from source-derived
inference. `UNPROVEN` means the historical trace does not contain enough data
to answer the question, not that the value was absent.

| Boundary | Exact answer from supplied historical evidence | Classification |
| --- | --- | --- |
| Subjects at blocker generation | The code reads `request.originalSmartProfile.subjects`; exact live values were not captured | **UNPROVEN** |
| Subjects in serialized Pass 1 context | Parent trace is unavailable | **UNPROVEN** |
| Subjects in the rendered Semantic Review prompt | The builder includes `original.smartProfile`; exact rendered content was stripped from the bounded trace | **UNPROVEN** |
| Subjects in the actual provider request | Request body/messages were not persisted | **UNPROVEN** |
| Subjects at patch validation | The code derives the current patch profile from `request.originalSmartProfile`; exact live values were not captured | **UNPROVEN** |
| Exact raw patch `from` | Not emitted by the trace; parser derives it from the current profile | **UNPROVEN** |
| Canonical patch `from` | The no-op rejection mechanically implies canonical equivalence to `to` under the executed validator | **INFERRED: equivalent to `["beatles", "musicians"]`** |
| Canonical patch `to` | The trace records `patches.subjects = ["beatles", "musicians"]` | **PROVEN** |
| Did the blocker-computation profile contain `musicians`? | Not exactly captured; same object path is used in source and validator no-op evidence strongly suggests canonical presence | **UNPROVEN live value; strong source-based inference** |
| Did Gemini receive `musicians`? | The exact user message/body is unavailable | **UNPROVEN** |
| Was the provider response a stale/incorrect patch? | No-op is proven; stale blocker versus absent lexical evidence is not | **UNPROVEN** |
| Is the validator wrong? | The validator's no-op behavior is deterministic and the observed result matches it | **NO defect proven** |
| Is the schema/request body empty? | Empty display is explained by bounded trace projection; actual sent body is not captured | **UNPROVEN; `{}` is not proof of an empty request** |

### Exact current semantic path

The blocker originates through:

`computeCatalogAutomationDecision` → `findStructuredEvidenceGaps` →
`structured_evidence_gap:subjects:musicians`.

The helper searches title, description, central subject, visible text, and
structured VCP subject evidence. Therefore the blocker may be valid even when
`musicians` is already in Smart Profile if the evidence corpus does not
support the subject. The supplied trace does not preserve the profile, VCP,
or evidence corpus needed to choose between those cases.

The current source path passes the same request's original profile into
eligibility and patch validation and does not mutate it between those steps.
That is a useful source-level consistency fact, but it cannot replace a
captured live request/input snapshot for the already-deployed run.

## Why the trace showed `{}`

The empty values are a diagnostic projection problem, not evidence that the
runtime sent empty data:

1. Bounded serialization removes `prompt.effectiveSystem` and
   `prompt.effectiveUser` unless full capture is enabled. Cleanup leaves an
   empty `prompt` object.
2. The deployed serializer's generic token-key redaction and shallow depth
   limit can remove `max_completion_tokens`, schema strings, enum values,
   array item details, and nested properties. Cleanup can leave `{}` or `[]`.
3. The provider request was constructed in memory immediately before fetch,
   but the exact body was not snapshotted into the bounded trace.

The current working tree includes related serializer changes, but those do not
by themselves establish that the historical trace is complete: prompt text is
still intentionally omitted for bounded capture, and a generic recursive
scrub remains unsafe for showing a contract whose meaningful data is nested.
The corrective must use explicit diagnostic projection rather than relying on
generic recursive scrubbing or requiring `captureFullTrace: true`.

## Corrective scope

### 1. Add an explicit bounded Pass 2 diagnostic projection

For DEV Playground Pass 2 only, emit a bounded, secret-safe diagnostic object
at the boundary where each value is known. The canonical trace should expose
these named sections when applicable:

```ts
pass2Diagnostics: {
  semanticReviewInput: {
    title,
    description,
    category,
    originalSmartProfile,
    effectiveSmartProfile,
    visualContextProfile,
    eligibleBlockers,
    objectiveBlockers,
    semanticBlockers,
    pass2Eligibility,
  },
  renderedPrompt: {
    promptVersion,
    systemMessage,
    userMessage,
  },
  providerRequest: {
    provider,
    model,
    textOnly,
    imageCount,
    max_completion_tokens,
    response_format,
    messages,
  },
  patchValidationInput: {
    currentSmartProfile,
    rawProviderPatch,
    parsedPatch,
    canonicalFrom,
    canonicalTo,
    validationResult,
  },
}
```

The exact field names may be adapted to existing trace types, but the four
boundary meanings must remain distinct. Values are captured at construction,
immediately before provider dispatch, and immediately before/after patch
validation. On provider/parser/validation failure, already captured sections
must remain available and later sections may be marked `NOT_REACHED`.

The provider request snapshot must be a safe body representation, not headers.
It must contain the exact rendered messages and complete v4 response contract
as sent by the existing request builder, including request options. It must
not contain authorization, API keys, credentials, raw image bytes, image data
URIs, or other secrets. Pass 2 is text-only, so the diagnostic should make
`imageCount: 0` and `textOnly: true` explicit.

### 2. Preserve boundedness without losing contract meaning

- Use explicit per-field limits for prompt text, descriptions, profile lists,
  VCP values, provider content excerpts, and arrays.
- Include a visible truncation marker/count when a limit is reached.
- Preserve schema names, types, required fields, enum values, property names,
  array item schemas, `additionalProperties`, and other meaningful keywords.
- Keep secrets and image payloads redacted by construction, not by hoping a
  key-name scrub catches them.
- Continue fail-soft trace writes; diagnostics must never alter the
  enrichment result or make Firestore required for ordinary unit tests.

### 3. Make the Inspector boundary-readable

Add distinct Inspector sections/cards for:

- Semantic Review Input
- Rendered Prompt / Messages
- Provider Request / Response Contract
- Provider Response
- Patch Validation
- Deterministic Result / Decision

The existing Inspector visual requirements remain in force: readable cards,
vertical-only overflow for large content, no horizontal layout breakage, and
clear `PLAYGROUND`, `PASS 1`, and `PASS 2` labels. Mock/fixture traces must
remain visibly distinct from live-provider traces.

### 4. Test the observability contract

Add focused unit/contract tests for:

- exact blocker-generation Smart Profile, VCP, evidence, and eligibility
  snapshots;
- exact rendered system/user message presence and prompt version;
- complete bounded response schema, including enums, required fields,
  properties, array items, and `additionalProperties`;
- exact provider model, text-only metadata, request options, messages, and
  response format;
- raw provider patch versus parsed patch versus canonical `from`/`to` and
  no-op validation result;
- failure preservation with later stages marked `NOT_REACHED`;
- explicit truncation markers and secret/image redaction;
- unchanged no-op rejection semantics;
- no extra AI calls and no Firestore dependency for ordinary unit tests.

Tests involving important pipeline boundaries may opt into the same canonical
trace shape through an in-memory trace sink and, when explicitly requested,
write bounded JSON artifacts. Ordinary unit tests should not persist traces by
default. Repository inspection confirmed the existing safe temporary artifact
path is `.tmp/ai-enrichment-traces/`, provided by
`functions/src/ai/aiEnrichmentTraceArtifacts.ts`; the repository's existing
`.tmp/` ignore rule excludes it. Generated traces must never be committed.

## Non-goals

- No change to the evidence-gap algorithm, blocker policy, patch validator,
  prompts, v4 schema, provider/model, or retry policy in this corrective.
- No automatic retry or second AI call.
- No Firestore requirement for ordinary automated tests.
- No generalized analytics product or server.
- No change to Processing, candidate-core behavior, Settings, production, or
  deployment inventory unless a later implementation review proves a shared
  type-only dependency requires it.
- No raw secret/provider-header capture.

## Future implementation/deployment boundary

This Plan is not a deployment authorization. After a separate implementation
authorization, the first deployment inventory should be limited to the
Playground Semantic Review callable (`testAiEnrichmentSemanticReviewPlayground`)
and the Studio Inspector surface if its built frontend is part of the reviewed
DEV deployment. The implementation review must mechanically re-check imports
before adding any Functions or Studio surface. No Processing or production
deployment is implied.

## Acceptance criteria

The corrective is complete only when a controlled DEV Playground failure can
show, without manual reconstruction:

1. the exact blocker-generation input profile and VCP;
2. the exact eligible/initial blocker and authority decisions;
3. the exact rendered system and user messages;
4. the exact provider model, request options, messages, and complete response
   contract as sent;
5. the sanitized provider response and error;
6. the raw/parsed/canonical patch-validation inputs and result;
7. explicit `NOT_REACHED` stages after the failure;
8. no secrets or image bytes;
9. no extra provider call and no behavior change caused by tracing; and
10. a bounded Inspector presentation that remains usable with large content.

The owner can then classify the `musicians` event as state skew, valid
evidence-gap behavior, provider patch error, or validator defect using
evidence rather than inference. Until those fields are captured, business
logic changes are not justified.

## Required next authorization

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 2 INPUT-STATE CONSISTENCY AND PLAYGROUND REQUEST OBSERVABILITY CORRECTIVE]`
