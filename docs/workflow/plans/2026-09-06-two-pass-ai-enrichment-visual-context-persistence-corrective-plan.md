# Plan: Restore Pass 1 Visual Context Persistence in Normal Processing

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Scope | Narrow corrective for normal DEV Processing Pass 1 persistence |
| Governing implementation | ADR-FP-182 / two-pass AI enrichment implementation |
| Status | Proposed for Formal Review; implementation not authorized by this artifact |
| Environment | DEV only for later verification |

## Objective

Restore the approved Pass 1 contract so a successful normal Processing run persists the
validated model visual context at `designs/{designId}.aiAnalysis.visualContextProfile`,
matching the already-observed Settings Playground behavior. Preserve the existing shared
parser, VCP schema, provider, semantic-review gate, authority ordering, and lifecycle rules.

This corrective must not change the model, prompt version, VCP schema, semantic reviewer,
Autonomous mode, Gate C procedure, or historical data in bulk.

## Evidence and confirmed diagnosis

The source trace is:

`enqueueAiEnrichment` → `runAiEnrichmentPipelineInternal` →
`generateAiEnrichmentCandidateForDesign` → provider `enrichDesign` →
`buildSimpleCatalogEnrichmentResult` → `candidate.analysis` → `markAiSuccess`.

The current checked-in implementation proves the persistence leg is present:

- `functions/src/ai/simpleCatalogEnrichmentResponse.ts`,
  `buildSimpleCatalogEnrichmentResult`, maps `parsed.visualContextProfile` to
  `DesignAiAnalysis.visualContextProfile`.
- `functions/src/ai/aiEnrichmentCandidateCore.ts`,
  `generateAiEnrichmentCandidateForDesign`, passes the provider analysis through and removes
  only `rawTags`, `rawCategory`, `smartProfileEnrichmentParse`, and
  `explicitContentArtworkEvidence`; it does not remove VCP.
- `functions/src/ai/aiEnrichmentPipeline.ts`, `markAiSuccess`, applies
  `removeUndefinedFields(analysis)` and writes the resulting `firestoreAnalysis` as
  `aiAnalysis` in both queue success branches.
- `packages/shared/src/types/ai/aiProcessing.types.ts`, `DesignAiAnalysis`, declares the
  optional VCP field.

The confirmed parity defect is prompt-source divergence, not a Firestore allowlist or schema
strip:

- Settings Playground expands `validatedRequest.prompt` in
  `functions/src/ai/aiEnrichmentPlayground.ts`.
- Normal Processing expands `enrichmentSettings.promptTemplate` loaded from the persisted
  `settings/aiEnrichment` document in `functions/src/ai/aiEnrichmentCandidateCore.ts`.
- The existing diagnostic contract test
  `functions/src/ai/catalogEnrichParityDiagnostic.contract.test.ts` explicitly records this
  difference and also records that `promptVersion` is only the code constant
  `catalog-enrich-v38`, not a hash of the actual prompt text.

Therefore a Playground request containing the VCP instruction can produce a valid VCP while a
normal Processing run can stamp the same v38 version but receive no VCP when its persisted
Settings prompt is stale or lacks that instruction. The observed Y2/X6 results (v38, no VCP,
no Pass 2) are consistent with that failure: semantic review is correctly ineligible because
the required VCP is absent, while the write path has no evidence of dropping a present VCP.

## Approved narrow implementation

1. Add a shared, deterministic VCP-contract assertion/normalization at the prompt boundary so
   the normal Processing prompt always includes the approved VCP output requirement, even when
   the persisted editable prompt is legacy/stale. Keep owner-authored prompt text and all
   existing placeholders intact.
2. Keep the provider/parser path unchanged except for any mechanically necessary shared helper
   extraction. The response must continue through `normalizeSimpleCatalogEnrichment` and
   `buildSimpleCatalogEnrichmentResult`.
3. Add a focused contract test proving a legacy persisted prompt is augmented with the VCP
   requirement for Processing, while Playground and Processing use the same effective VCP
   contract.
4. Add a persistence contract test proving a valid parsed VCP survives candidate cleanup and
   reaches both `markAiSuccess` write shapes. Do not add a Firestore migration or backfill.
5. Add a regression test proving an absent/invalid VCP remains absent and does not invoke Pass 2;
   this preserves the existing fail-closed semantic-review behavior.

## Files expected to change

- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` or a narrowly scoped shared prompt-contract
  helper: effective VCP requirement for normal Processing.
- `functions/src/ai/aiEnrichmentCandidateCore.ts` only if required to call that helper.
- `functions/src/ai/aiEnrichmentPlayground.ts` only if required to consume the same helper.
- Focused tests adjacent to the above and/or `functions/src/ai/aiEnrichmentPipeline` tests.
- Later, the implementation review and state/handoff documents.

No Studio UI, Settings mutation, tag-retirement, semantic-review policy, provider, schema,
Firestore rules, index, or production file is in scope.

## Validation required after owner authorizes implementation

- Focused prompt parity tests.
- Parser/normalizer VCP tests.
- Candidate-core cleanup/persistence contract tests.
- Pipeline persistence tests for normal queue and ready-backfill write shapes.
- Semantic blocker → Pass 2 eligibility regression tests, including missing-VCP fail-closed.
- Functions typecheck/build and the scoped shared/Functions test suite.
- Broader validation where feasible, with unrelated pre-existing failures documented exactly.

## Later DEV deployment and verification boundary

After a separate implementation authorization and review of changed files, deploy only the
reviewed Processing function inventory. Because the normal path is the callable
`enqueueAiEnrichment` and the corrective is shared candidate/prompt code, the default proposed
allowlist is:

`functions:enqueueAiEnrichment`

If the implementation changes a shared module bundled by another reviewed callable, the final
Implementation Review must mechanically name that callable before deployment; no other Functions,
Studio surface, settings document, or production target may be deployed.

No Firestore rules or indexes are needed. No migration/backfill is needed. Later verification
may reprocess the already identified DEV fixture Y2 only, under the approved Gate C/owner-QA
procedure; that later data mutation is not authorized by this planning artifact.

## Stop boundary

This artifact authorizes diagnosis and planning only. Stop after Formal Review. Do not implement,
deploy, mutate Settings, reprocess designs, enable Semantic Reviewer, start WS6, run Gate C, or
touch production until a new owner authorization explicitly authorizes implementation.
