# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-07

## FreshForge workflow

| Item | Value |
|---|---|
| Status | **DEV DEPLOY COMPLETE — awaiting owner QA** |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Child | Pass 1 semantic authority, parked Pass 2, and AI tag retirement release |
| Autonomous | **OFF** (`shadow`) |
| Semantic Reviewer | **OFF** |
| Production | untouched |
| Commit/push | **NO** |
| Deployment of this release | **DEV complete; owner QA pending** |

## Current DEV deployment and prior baseline (unchanged)

| Function | Revision | Hash | Project/Region |
|---|---|---|---|
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00072-wim` | `41072e3820d5c485849efeceae849e036639413d` | `fresh-prints-dev` / `us-central1` |
| `testAiEnrichmentSemanticReviewPlayground` | `testaienrichmentsemanticreviewplayground-00015-jur` | `b8ff05f45d26a59b1e52cff85b897d080b505974` | `fresh-prints-dev` / `us-central1` |

These revisions do **not** yet include the Pass 1-only / parked experimental
gate / AI-tag retirement source changes. Existing Semantic Reviewer remains
OFF; Autonomous remains OFF.

## Implementation status (source)

Local source now implements the approved release:

- Pass 1 is the only active Processing AI pass.
- Automatic Pass 2 is removed from candidate-core / Processing.
- Manual Pass 2 is gated by owner-only `semanticReviewPlaygroundEnabled`
  (default false).
- `structured_evidence_gap:*` and `subject_specificity_risk:*` are non-blocking
  semantic diagnostics.
- Active AI tag generation/rerank/Suggestion Author/suggested-new-tag approval
  and matched-tag authority are retired from the active path.
- Pass 2 provider/core, v5/v4 assets, Playground, Inspector, traces, staff
  tags, historical fields, taxonomy, and ordinary catalog discovery are
  preserved.

Implementation Review:

`docs/workflow/reviews/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-implementation-review.md`

Recovery: prior Codex IR turn aborted after reporting green scoped validation;
working tree preserved; no hung validation process remained; scoped validation
was re-run; one targeted ESLint unused binding was fixed.

## Required next action

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 1-ONLY RELEASE + PARKED PASS 2 EXPERIMENTAL GATE + OWNER QA]`

During this checkpoint: do not deploy, call providers or Firebase, enable
Semantic Reviewer, enable Autonomous, mutate settings, commit/push, or touch
production unless the owner explicitly authorizes the marker above.

## Release Plan / Formal Review

- Plan: `docs/workflow/plans/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-review.md`
- QA Checkpoint: `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md`

## Queued separately

`[NEEDS OWNER AUTHORIZATION: DEPLOY DORMANT CANDIDATE-CORE PASS 2 AUTHORITY PARITY]`

(superseded in intent by the Pass 1-only release above; retained as historical
queue marker only)

## Artifacts

- Release Implementation Review: `docs/workflow/reviews/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-implementation-review.md`
- QA Checkpoint: `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md`
- Pass 2 Observability Corrective Plan: `docs/workflow/plans/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-plan.md`
- Pass 2 Observability Corrective Formal Review: `docs/workflow/reviews/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-review.md`
- Pass 2 Observability Corrective Implementation Review: `docs/workflow/reviews/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-implementation-review.md`
- Unsupported-response Corrective Plan: `docs/workflow/plans/2026-09-07-semantic-review-unsupported-provider-response-corrective-plan.md`
- Unsupported-response Formal Review: `docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-review.md`
- Unsupported-response Implementation Review: `docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-implementation-review.md`
- Blocker Semantics + No-op Corrective Plan: `docs/workflow/plans/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-plan.md`
- Blocker Semantics + No-op Formal Review: `docs/workflow/reviews/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-review.md`
- Blocker Semantics + No-op Implementation Review: `docs/workflow/reviews/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-implementation-review.md`
