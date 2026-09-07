# Implementation Review: VCP Runtime-Boundary Diagnostic

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Plan | `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-vcp-runtime-boundary-diagnostic-corrective-plan.md` |
| Base commit | `75c8a9ffb05bf5c54bec6d8fe972df7db32a3064` |
| Verdict | **IMPLEMENTED — VALIDATED; STOPPED BEFORE DEPLOYMENT** |

## Changed application files

- `functions/src/ai/vcpRuntimeDiagnostics.ts`
- `functions/src/ai/vcpRuntimeDiagnostics.test.ts`
- `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`

Earlier reviewed prompt-corrective files remain unchanged by this diagnostic implementation.
No behavioral corrective, provider schema, token limit, parser behavior, persistence behavior,
Settings, or data was changed.

## Diagnostic fields and boundaries

`vcpRuntimeDiagnostics.ts` is gated strictly by `GCLOUD_PROJECT === "fresh-prints-dev"`.

- Prompt boundary: SHA-256, `promptContainsVisualContextProfile`,
  `promptContainsVisualContextV1`.
- Provider/parser boundary: provider, model, exact provider `finishReason`, raw content length,
  `rawVisualContextProfileKeyPresent`, `parsedVisualContextProfilePresent`,
  `parsedVisualContextProfileValid`, and bounded `vcpResult` (`missing`, `invalid`, `valid`).
- Candidate boundary: `candidateVisualContextProfilePresent`.
- Persistence boundary: `writeBranch` and `persistenceVisualContextProfilePresent` for both
  `queue` and `ready_backfill` success writes.

No full prompt, raw model response, VCP text, image, API key, auth data, or customer/print-request
identifier is logged. The known design ID is used only through the existing pipeline correlation
field.

## Behavior review

- Provider/model selection: unchanged.
- Prompt contract, VCP schema, max completion tokens (`2500`): unchanged.
- Parser/normalizer: unchanged.
- Candidate mapping and Firestore writes: unchanged.
- Semantic Reviewer eligibility, Pass 2, WAA, authority, lifecycle, Autonomous, and tag-AI paths:
  unchanged.
- Additional AI calls: none.
- DEV data mutation: none.

## Validation

Focused command:

`npx tsx --test functions/src/ai/vcpRuntimeDiagnostics.test.ts functions/src/ai/simpleCatalogEnrichmentPrompt.test.ts functions/src/ai/simpleCatalogEnrichmentResponse.test.ts functions/src/ai/providers/geminiVisionEnrichmentProvider.test.ts functions/src/ai/catalogEnrichParityDiagnostic.contract.test.ts functions/src/ai/semanticReviewCore.test.ts packages/shared/src/utils/semanticReviewPolicy.test.ts`

Result: **59 tests passed, 0 failed**.

Coverage includes deterministic prompt hashing/marker booleans, no prompt/raw-content leakage,
DEV gating, finish-reason field shape, raw-key classification, parser classifications, prompt
parity, VCP response mapping, semantic fail-closed behavior, and tag-AI absence.

`npm run build --prefix functions`: **PASS**.

`git diff --check`: **PASS**.

The broader AI suite was not rerun in this instrumentation-only checkpoint. Previously documented
unrelated baseline exceptions remain accepted and were not repaired.

## Future deployment inventory

The diagnostic imports are bundled by the normal Processing path:

- `functions:enqueueAiEnrichment` — required.

The diagnostic helper is not imported by `aiEnrichmentPlayground.ts` or its callable, so
`functions:testAiEnrichmentSemanticReviewPlayground` is not required for this diagnostic deploy.
Re-evaluate if later changes share the diagnostic module with Playground.

Rules: NO. Indexes: NO. Migration/backfill: NO.

## Stop boundary and owner action

No deployment or Y2 retry occurred. The next checkpoint requires separate owner authorization for
DEV deployment of `functions:enqueueAiEnrichment` only, followed by a single Y2 diagnostic run.

Recommended authorization:

> Authorize DEV deployment of the reviewed VCP runtime-boundary diagnostic to
> `functions:enqueueAiEnrichment` only. Then authorize exactly one Y2 diagnostic Pass 1 run;
> keep Semantic Reviewer and Autonomous OFF, with no other fixture, Settings mutation, Gate C,
> WS6, or production action.
