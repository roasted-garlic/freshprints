# Two-Pass AI Enrichment — Gate C DEV Semantic Reviewer Canary Plan

Date: 2026-09-06  
Status: **Planning only — execution not authorized**  
Parent: `smart-catalog-intelligence-completion-and-legacy-tag-retirement`  
Workstream: `two-pass-ai-enrichment-context-and-semantic-verification-implementation`  
ADR: `ADR-FP-182`

## Goal

Define the smallest controlled DEV canary for the automatic Processing-path Semantic Reviewer after Gate B manual callable signoff. This plan proves automatic Pass 2 eligibility, persistence, provenance, authority ordering, WAA recomputation, cost telemetry, and one-call behavior without enabling Autonomous processing or touching production.

This document authorizes planning and review only. It does not authorize setting mutation, processing, deployment, catalog mutation, Gate C execution, or production action.

## Verified source and runtime preconditions

Before execution, verify all of the following without mutation:

- Branch `development` equals `origin/development`.
- Corrective source SHA is present: `5a4de46ceeaf0aed76cc5298d57a9840621d397a`.
- DEV callable revision is ACTIVE: `testaienrichmentsemanticreviewplayground-00006-vic`, source hash `1af6dce02bac20066eb5031a21744cef0974a22d`.
- Prompt is `catalog-semantic-review-v2`.
- `semanticReviewerEnabled=false`, `catalogAutonomousLiveEnabled=false`, and Autonomous is OFF.
- No unrelated source or deployed resource drift exists.

If any precondition fails, STOP before settings mutation.

## Source findings

`loadAiEnrichmentSettings` reads `settings/aiEnrichment` and maps `semanticReviewerEnabled` strictly to `true` only when the stored value is boolean `true`; its fallback is disabled. `updateAiEnrichmentSettings` is owner/admin gated and writes the setting through the existing callable.

Automatic Pass 2 is invoked in `functions/src/ai/aiEnrichmentCandidateCore.ts`. The candidate first runs Pass 1 and deterministic automation analysis, then calls `canRunSemanticReview` with:

- `enabled: enrichmentSettings.semanticReviewerEnabled`
- `objectiveBlockers: automationDecision.hardBlockers`
- eligible semantic blockers from `getSemanticReviewEligibleBlockers`
- `result.analysis.visualContextProfile`

Only when that predicate is true does it call `callSemanticReviewer`. The call is text/context only; the image is not passed. After a valid result, permitted patches are applied to the AI Smart Profile, deterministic automation is recomputed, and the queue pipeline persists the effective profile and provenance. Processing is entered through `enqueueAiEnrichment` and the existing owner-only `reprocessReadyDesignWithAi`; no new entry point is proposed.

## Canary sample

Use a very small targeted DEV sample of three existing DEV designs, selected only after read-only fixture inspection confirms their current state and semantic blockers:

1. One known woman/girl or equivalent subject-specificity case with Visual Context and an eligible semantic blocker.
2. One genuinely unsupported subject case with an eligible structured-evidence blocker; expected to remain Needs Review.
3. One ineligible/objective-blocked case, or a design with no eligible semantic blockers, to prove no unnecessary Pass 2 call. Prefer an existing fixture already covered by the approved Gate I/automation evidence rather than importing a duplicate.

Do not use customer artwork, Print Request data, production data, or a broad Ready reprocess. If no existing fixture satisfies a role, STOP with `[NEEDS OWNER DECISION]` rather than importing a new design during execution.

## Controlled execution sequence (future checkpoint)

1. Capture current settings document and exact source/runtime preconditions.
2. Record the original `semanticReviewerEnabled` value; execution may proceed only if it is `false`.
3. Use the owner/admin-gated `updateAiEnrichmentSettings` callable to set only `semanticReviewerEnabled=true`, preserving the existing semantic reviewer model and all other settings. Record the returned settings and timestamp.
4. Process only the approved three-design sample through the existing DEV Processing entry point. Do not invoke `reprocessReadyDesignWithAi` against Ready designs unless a later owner approval names exact IDs.
5. Read each resulting design document and capture the fields listed below.
6. Immediately call `updateAiEnrichmentSettings` with `semanticReviewerEnabled=false`, verify the stored value and runtime cache state, and repeat the disable attempt if verification fails.
7. If any safety, authority, objective-blocker, duplicate-call, cost, or disable invariant fails, STOP further processing and disable the setting immediately.

## Expected persistence and provenance

For a processed design, inspect:

- `aiSuggestions.semanticReviewStatus`
- `aiSuggestions.semanticReviewDecision`
- `aiSuggestions.semanticReviewReason`
- `aiSuggestions.semanticReviewBlockersResolved`
- `aiSuggestions.semanticReviewBlockersUnresolved`
- `aiSuggestions.semanticReviewPatchesApplied`
- `aiSuggestions.semanticReviewPromptVersion`, provider, model, token counts, and estimated cost
- `aiAnalysis.visibleText` and `visualContextProfile`
- effective `smartProfile` dimensions and `smartProfileAiSnapshot`
- `smartProfile.provenance` automation decision, reason codes, verifier state, and semantic-review participation where present
- final `status`, `aiReviewStatus`, and `aiProcessingStage`

Pass 1 provenance remains the enrichment prompt/model/analysis metadata; Pass 2 provenance is the semantic-review fields above. The plan requires evidence that they are distinguishable and truthful, not inferred from status alone.

## PASS/FAIL criteria

- Eligible design: exactly one automatic Semantic Reviewer call, text/context only, valid result recorded.
- Ineligible or objective-blocked design: zero Pass 2 calls; objective blockers remain authoritative.
- Valid permitted patch: applied only to approved Smart Profile dimensions; effective Smart Profile is used for deterministic revalidation and WAA.
- Invalid/forbidden patch: fails closed and routes Needs Review; no title, description, category, visible text, colors, Visual Context, explicit, provenance, staff-owned, or import-preset-owned mutation.
- Staff/import authority: effective merge occurs before WAA and cannot be overridden by Pass 2.
- One-call maximum: no recursive semantic-review invocation in logs or persisted telemetry.
- Provenance: Pass 1 and Pass 2 prompt/provider/model/token/cost evidence is present and truthful.
- Cost: Pass 1, Pass 2, and combined costs are measurable; no Tag Rerank, Suggested Tags, or Suggestion Author path/cost appears.
- No unexpected approval/publication: objective or unresolved semantic blockers keep the design Needs Review.
- Setting is restored to `false` and verified immediately after the sample.
- Autonomous remains OFF and no production resource is touched.

Immediate STOP conditions: any human/import authority change, objective-blocker override, forbidden patch application, duplicate Pass 2 call, image sent to Pass 2, missing/contradictory cost telemetry, unexpected Ready/publication, setting-disable failure, or any production/resource scope violation.

## Rollback and fail-safe

The primary rollback is the owner/admin `updateAiEnrichmentSettings` call setting `semanticReviewerEnabled=false`, followed by a direct read-back of `settings/aiEnrichment`. No broad rollback or data rewrite is authorized. Designs changed by the canary remain in DEV for owner inspection; no production promotion or catalog-wide cleanup is part of this gate.

## Deployment determination

No deployment is currently required: the signed-off DEV runtime already contains the automatic candidate-core integration and the corrective shared parser. Before execution, verify the deployed revision/source against the preconditions. If source/runtime reconciliation proves otherwise, STOP and create a separate reviewed deployment amendment. Proposed Function allowlist: **none**.

## Required execution evidence

Capture source SHA, deployed revision/hash, settings before/after, exact design IDs, callable/request IDs where available, provider/model, Pass 1/Pass 2 tokens and costs, semantic decisions, patches, blocker state, WAA decision, persisted provenance, call counts, and final disabled setting. Do not capture secrets or auth tokens.

## Owner QA checkpoint

Owner must review the evidence and explicitly sign off before any subsequent Gate C phase. This plan does not authorize Gate C execution, Semantic Reviewer enablement, Autonomous processing, Playground UX work, WS6, or production.

## Read-only fixture-resolution checkpoint — 2026-09-06

The authorized read-only inspection did not establish an exact executable three-fixture set. `Y2IQuCgAPgnqrBIeJuap` remains the known cucumber/pin-up Gate B design, but its current persisted state is `imported` / `needs_review`, prompt `catalog-enrich-v37`, subjects `[woman, cucumber]`, reason code `shadow_would_auto_approve`, and no persisted Visual Context. It is therefore not currently proven eligible for automatic Pass 2 and cannot be used as the Role 1 Gate C fixture without mutation or new Pass 1 evidence.

`8m0KgJEel8kLpYlmZpFb` is a viable Role 2 candidate: current state `ready` / `approved`, subjects `[girl, dog, monster]`, and persisted blocker codes `structured_evidence_gap:subjects:dog`, `structured_evidence_gap:subjects:monster`, and `structured_evidence_gap:objects:bow`. It is a genuine unsupported-subject semantic candidate, but its current persisted state is not sufficient to prove fresh Gate C eligibility without processing-state mutation.

`AeITnDAFlHTdCZwyn4Es` is a viable Role 3 candidate: current state `imported` / `needs_review`, with current objective blocker `category_gap_suggested` plus semantic evidence gaps. It must not be processed until the exact Role 1 fixture is resolved and owner-approved.

The older `9bR7JWSWwv94Ofb7byC3` and retired-conflict fixture `5NVU91SMRiecLkZqdrN8` were not selected. Gate C remains blocked by `[NEEDS OWNER DECISION: EXACT GATE C DEV DESIGN IDS]` for Role 1, and no settings or designs were changed.
