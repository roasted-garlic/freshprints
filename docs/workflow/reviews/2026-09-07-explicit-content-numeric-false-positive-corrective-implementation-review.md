# Implementation Review — Precision-First Explicit Content False-Positive Corrective

| Field | Value |
|---|---|
| Plan | `docs/workflow/plans/2026-09-07-explicit-content-numeric-false-positive-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-07-explicit-content-numeric-false-positive-corrective-review.md` |
| Environment | Local source / DEV preparation |
| Implementation | Complete |
| Deployment | **DEV complete — owner QA pending** |
| Provider calls / settings mutations | **0 / 0** |
| Commit / push / production | **No / No / No** |

## Files changed for this corrective

- `packages/shared/src/utils/explicitContentAutomation.ts`
- `packages/shared/src/utils/explicitContentAutomation.test.ts`
- `docs/project/DECISIONS.md`
- `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-owner-qa-checkpoint.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`

The workspace also contains earlier AI Review UI changes from the preceding task; those are unrelated to this corrective and were not modified by this implementation.

## Contract results

| Requirement | Result |
|---|---|
| Generic one-letter-hole retired | **YES** |
| Generic leetspeak retired | **YES** |
| Separator compaction retired | **YES** |
| Generic punctuation/digit reconstruction retired | **YES** |
| Literal whole-boundary matching preserved | **YES** |
| B-light aliases preserved | **YES** |
| Aliases independent of compact/hole logic | **YES** |
| `1559` / `1565` false positives fixed | **YES** |
| `A55` false positive fixed | **YES** |
| `P155` false positive fixed | **YES** |
| `C0CK` false positive fixed | **YES** |
| `D1CK` false positive fixed | **YES** |
| `5LUT` false positive fixed | **YES** |
| Intentional literal numeric vocabulary preserved | **YES** |
| Unrelated-word substring protection preserved | **YES** |
| Normal profanity detection preserved | **YES** |
| Human Explicit authority changed | **NO** |
| Category behavior changed | **NO** |
| Pass 1 behavior outside Explicit matcher changed | **NO** |
| Pass 2 behavior changed | **NO** |
| Tag behavior changed | **NO** |
| Autonomous changed | **NO** |

## Implementation details

`collectArtworkMatches()` and catalog surface collection now use only the existing case-insensitive boundary regex. `buildActiveExplicitContentMatchTerms()` still adds only the reviewed explicit B-light alias families. The generic leet map, separator collapse, compact reconstruction, token compact scan, and `isSingleLetterHole()` path were removed after repository search proved they had no live consumers outside the shared classifier/tests.

Exact numeric configuration remains intentional: vocabulary `1559` matches artwork `1559` but not `15590`.

## Automated validation

| Check | Result |
|---|---|
| Shared Explicit + Functions Explicit contract tests | **47 pass / 0 fail** |
| Pass 1 automation decision + Explicit contract tests | **9 pass / 0 fail** |
| Functions TypeScript build (`npm run build` in `functions`) | **PASS** |
| Targeted ESLint on matcher, tests, candidate core, pipeline, and contract | **PASS** |
| `git diff --check` | **PASS** |

Regression coverage includes the historical years, numeric controls, mixed alphanumeric false positives, missing-character forms, exact configured numeric terms, boundary controls, normal profanity, B-light aliases, and preview/projection behavior.

## DEV deployment inventory

The shared matcher is imported by `aiEnrichmentCandidateCore`, which is executed through these deployed Functions:

1. `enqueueAiEnrichment` — Processing / AI Review queue path.
2. `reprocessReadyDesignWithAi` — owner-ready reprocess path.
3. `onCatalogReprocessJobWritten` — catalog reprocess worker path, including AI Review queue and Ready backfill modes.

`aiEnrichmentObserve` also imports the candidate core in source, but it is not exported from `functions/src/index.ts` and is therefore not included in the deployed inventory. Manual Playground functions do not import this classifier path. This inventory is derived from the current source graph and was the exact inventory deployed to DEV.

## DEV deployment verification — 2026-09-07

Command used:

`firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten`

Firebase reported **3 Functions Deployed**, **0 Functions Errored**, and **0 Function Deployments Aborted**. All three are ACTIVE in `fresh-prints-dev`, `us-central1`, on `nodejs20`, with 100% traffic on the latest revision and the deployed source hash `e10ac48700628ac76eaa159cf8ec449ecc221cfe`.

| Function | Revision | Source hash | Runtime / region | Latest traffic |
|---|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00116-tul` | `e10ac48700628ac76eaa159cf8ec449ecc221cfe` | `nodejs20` / `us-central1` | 100% |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00022-lap` | `e10ac48700628ac76eaa159cf8ec449ecc221cfe` | `nodejs20` / `us-central1` | 100% |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00028-peq` | `e10ac48700628ac76eaa159cf8ec449ecc221cfe` | `nodejs20` / `us-central1` | 100% |

Deployment boundaries verified: unauthorized Functions deployed **NO**; Rules/indexes/migrations changed **NO**; settings mutated **NO**; Explicit vocabulary changed **NO**; provider calls by Codex **0**; commit/push **NO**; production touched **NO**.

The deployed source retains literal case-insensitive whole-token/whole-phrase matching and explicit B-light aliases, with generic one-letter-hole, leetspeak, separator compaction, punctuation/digit reconstruction, and approximate profanity inference retired. Existing automated source/test evidence covers intentional literal numeric configuration (`1559` matches only when configured) and prevents an unconfigured `1559` from being manufactured into another term.

Read-only post-deployment settings verification found `catalogWorkflowMode=shadow`, `catalogAutonomousLiveEnabled=false`, 43 explicit terms with neither `1559` nor `1565`, and `semanticReviewPlaygroundEnabled=true`. The Functions-only deployment did not mutate settings. The last value conflicts with the expected OFF/absent checkpoint and must be resolved or explicitly acknowledged by the owner before live QA; Codex did not change it.

## Owner DEV QA procedure after deployment

1. Resolve or explicitly acknowledge the current `semanticReviewPlaygroundEnabled=true` DEV setting; Codex must not mutate it as part of this corrective.
2. Re-run the Pensacola/St. Augustine artwork through Pass 1 Processing.
3. Confirm `1559` and `1565` are not listed as censored terms and Explicit Content is not auto-classified from those years.
4. Confirm the category outcome is independently truthful: `category_unresolved` may still route the design to Needs Review.
5. Run one genuine configured profanity fixture in artwork text and confirm it is detected and surfaced accurately.
6. Confirm human Explicit authority and the Explicit automation lock remain intact across reprocess.
7. Keep Autonomous OFF and automatic Pass 2 parked during QA.

## Stop marker

`[NEEDS OWNER QA: PRECISION-FIRST EXPLICIT CONTENT CORRECTIVE]`
