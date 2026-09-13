# Formal Review: Restore Pass 1 Visual Context Persistence in Normal Processing

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Plan | `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-visual-context-persistence-corrective-plan.md` |
| Review type | Narrow corrective Formal Review |
| Verdict | **IMPLEMENTED — VALIDATED; STOPPED BEFORE DEV DEPLOYMENT** |

## Implementation checkpoint

- Base commit: `75c8a9ffb05bf5c54bec6d8fe972df7db32a3064`
- Working-tree implementation is intentionally uncommitted; no commit or deployment was made.
- Changed application files:
  - `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`
  - `functions/src/ai/simpleCatalogEnrichmentPrompt.test.ts`
  - `functions/src/ai/simpleCatalogEnrichmentResponse.test.ts`
- Workflow files updated:
  - `.cursor/workflow/state.md`
  - `references/project-chatgpt-handoff/CURRENT-STATE.md`
  - this review and the governing corrective Plan.

## Finding

The approved implementation's persistence path is structurally correct in the checked-in
source. `buildSimpleCatalogEnrichmentResult` carries a valid VCP into `DesignAiAnalysis`;
candidate cleanup does not delete it; and `markAiSuccess` writes `removeUndefinedFields(analysis)`
as `aiAnalysis` for both queue and ready-backfill success paths.

The confirmed defect is the Playground/Processing effective-prompt mismatch. Playground uses the
request-body prompt, while normal Processing uses the persisted Settings `promptTemplate`; both
stamp the code constant `catalog-enrich-v38`, which does not prove prompt parity. A stale Settings
prompt can therefore omit the VCP instruction, yielding no parsed VCP and consequently no persisted
VCP. The semantic policy then correctly fails closed and does not run Pass 2.

## Implemented mechanism

`ensureVisualContextPromptContract` is now called by the shared
`buildSimpleCatalogEnrichmentUserPrompt` builder. It appends the approved
`visualContextProfile` / `visual-context-v1` requirement to stale or legacy templates, preserves
the original template and placeholder substitutions, and does not append a duplicate when both
contract markers already exist. Because both Playground and Processing use this builder, their
effective prompts now share the same VCP contract. The prompt version remains `catalog-enrich-v38`.

The parser, `DesignAiAnalysis.visualContextProfile`, candidate cleanup, `removeUndefinedFields`,
`markAiSuccess`, semantic policy, authority ordering, lifecycle behavior, and tag-AI retirement
were not changed. A focused response test proves a valid VCP reaches `aiAnalysis`.

## Review of scope and safety

The proposed fix is narrow and preserves the architecture: enforce the approved VCP output
requirement at the shared prompt boundary, retain the existing parser and schema, and add tests
for prompt parity, persistence, and fail-closed semantic eligibility. It does not alter model
selection, provider behavior, VCP shape, semantic-review enablement, authority ordering, tag
behavior, lifecycle status, or Autonomous mode.

No Firestore rules, indexes, migration, or bulk backfill is required. The later DEV deployment
must be limited to the reviewed Processing callable inventory, initially proposed as
`functions:enqueueAiEnrichment`; the final implementation review must re-check the bundle and
name any additional callable only if a shared changed module requires it.

## Required implementation evidence

Before implementation is considered complete, the implementation review must include:

- exact changed-file inventory and source revision;
- focused prompt, parser, persistence, and semantic-eligibility test results;
- Functions/shared scoped typecheck/build results;
- exact unrelated baseline validation exceptions, if any;
- proof that no VCP is deleted by candidate cleanup or `removeUndefinedFields`;
- proof that missing/invalid VCP remains ineligible for Pass 2;
- exact DEV deployment inventory and runtime revision, after separate deployment authorization.

## Validation results

Passing focused command:

`npx tsx --test functions/src/ai/simpleCatalogEnrichmentPrompt.test.ts functions/src/ai/simpleCatalogEnrichmentResponse.test.ts functions/src/ai/catalogEnrichParityDiagnostic.contract.test.ts functions/src/ai/semanticReviewCore.test.ts packages/shared/src/utils/semanticReviewPolicy.test.ts`

Result: **51 tests passed, 0 failed**. This includes legacy prompt augmentation, duplicate
avoidance, owner text/placeholders, Playground/Processing parity, VCP normalization/mapping,
semantic fail-closed policy, and tag-AI absence diagnostics.

Functions build:

`npm run build --prefix functions` — **PASS**.

`git diff --check` — **PASS**.

The complete `functions/src/ai` test sweep was also run: **427 passed, 8 failed**. The eight
failures are accepted pre-existing validation exceptions and were not caused by the changed
prompt or response-test files:

1. `functions/src/ai/aiEnrichmentObserve.contract.test.ts` — candidate-core source scan sees
   the pre-existing `markAiSuccess` text in a comment; no implementation change added it.
2. `functions/src/ai/smartProfileQuality.contract.test.ts` — stale v37 expectation versus the
   already-current v38 prompt constant; unrelated to this corrective.
3. `functions/src/ai/catalogEnrichV37Prompt.contract.test.ts` — same pre-existing v37/v38
   expectation mismatch.
4. `functions/src/ai/catalogEnrichV37CategoryGap.contract.test.ts` — same pre-existing v37/v38
   expectation mismatch.

The remaining reported failures are duplicate subtest roll-ups from those same four underlying
failures. No changed file is implicated by those failures. They remain documented exceptions and
were not repaired in this workstream.

## Decision

The corrective implementation is complete and validated within the authorized source-only scope.
No Firestore Rules, Storage Rules, indexes, migration, or backfill are required. The reviewed
exact DEV deployment candidates are `functions:enqueueAiEnrichment` and
`functions:testAiEnrichmentSemanticReviewPlayground`; both bundle the changed shared prompt
builder, so both are required for truthful Processing/Playground parity. Neither was deployed.
The workflow stops before DEV deployment and data mutation.

## Owner action required

The next authorization should explicitly say:

> Authorize DEV deployment of the reviewed VCP persistence corrective to
> `functions:enqueueAiEnrichment` and `functions:testAiEnrichmentSemanticReviewPlayground` only. Keep Semantic Reviewer and Autonomous OFF; do not mutate
> Settings, process fixtures, execute Gate C, start WS6, or touch production.
