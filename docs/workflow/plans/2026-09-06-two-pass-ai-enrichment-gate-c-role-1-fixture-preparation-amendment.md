# Gate C Role 1 Fixture-Preparation Amendment

Date: 2026-09-06  
Parent Plan: `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-gate-c-dev-canary-plan.md`  
Status: **Planning only — preparation and Gate C execution not authorized**  
ADR: `ADR-FP-182`

## Purpose

Define one bounded, natural Pass 1-only preparation operation to produce the missing Gate C Role 1 woman/girl semantic fixture from an existing DEV design. This amendment does not authorize fixture preparation, settings mutation, Gate C execution, deployment, Autonomous processing, or production action.

## Seed selection

Preferred seed: `Y2IQuCgAPgnqrBIeJuap`.

Reason: it is the known Gate A cucumber/pin-up woman design, is DEV-only, has no recorded staff/import authority conflict, has normal imported/Needs Review lifecycle, and is the closest existing design to the intended woman/girl semantic case. Its current persisted result is not suitable as-is, so it must be naturally reprocessed to obtain current Pass 1 evidence.

Predetermined alternate: `X6sWDHZj9I6ovQhGIbM8`.

Reason: current DEV state is imported/Needs Review with subjects `[girl, dog, character]`, no objective blocker, no recorded staff/import authority conflict, and existing semantic evidence gaps. It is less ideal because its persisted provenance is older (`catalog-enrich-v32`) and it is not the known cucumber fixture, so it is attempted only if the preferred seed fails the natural qualification predicate.

The already resolved Role 2 (`8m0KgJEel8kLpYlmZpFb`) and Role 3 (`AeITnDAFlHTdCZwyn4Es`) fixtures are not altered by this amendment.

## Trusted operation

For each permitted attempt, use the existing owner/admin-gated `enqueueAiEnrichment` Processing callable with:

```json
{
  "designId": "<seed>",
  "rerunFromReview": true
}
```

This is the existing imported/Needs Review reprocessing path. Do not call reset, Ready reprocess, batch jobs, or direct Firestore writes. `semanticReviewerEnabled` must be read as `false` immediately before invocation and remain false throughout. With the reviewer disabled, this operation exercises Pass 1 and deterministic Processing only; Pass 2 must not run.

No model/provider override is required. Use the deployed/default Pass 1 configuration so the result is reproducible against the current reviewed runtime. No deployment is expected; if runtime/source inspection contradicts this, stop for a separate deployment review.

## Natural qualification predicate

After the attempt, accept the seed as Role 1 only if all conditions hold:

- valid current Visual Context Profile is persisted with the reviewed `visual-context-v1` contract;
- current Pass 1 provenance is present and reflects the current reviewed enrichment pipeline;
- zero objective blockers, including no `category_gap_suggested`, unresolved category/description/title/validation blocker, or other hard blocker defined by current automation policy;
- at least one current allowed semantic blocker (`structured_evidence_gap:*` or `subject_specificity_risk:*`);
- Smart Profile contains a woman/girl/person/female concept and the VCP provides relevant female-person evidence useful for semantic equivalence or specificity;
- no staff-edited or import-preset authority conflict is present;
- `semanticReviewStatus` is absent or `ineligible`, with no Pass 2 tokens/cost/call evidence;
- lifecycle remains DEV AI Review/Needs Review and does not become Ready or published.

Do not inject blockers, manually edit Smart Profile fields, manually create VCP, patch provenance, or select a result merely because it produces the desired semantic answer.

## Attempt bound and STOP behavior

- Maximum Pass 1 preparation attempts: **two total**—one on the preferred seed and, only if it fails qualification, one on the predetermined alternate.
- Never repeat either seed more than once in this amendment.
- Abandon preparation after the alternate fails; do not fish for a favorable model output.
- If either attempt creates an unexpected Ready/publication state, authority change, objective-blocker override, Pass 2 call, missing VCP, or setting drift, stop immediately and restore settings if needed.
- If no seed qualifies naturally, return to Plan/Review; do not broaden the sample or invent a Role 1 fixture.

## Mutation inventory and safeguards

The approved preparation may change only the selected design’s normal AI Processing fields: AI suggestions, AI analysis/VCP, effective Smart Profile and snapshot, provenance, telemetry, and workflow review state. It must not change unrelated designs, customer/Print Request data, staff/import authority, settings other than no change to the existing false reviewer state, or production.

Before each attempt capture the full design baseline relevant to those fields. After each attempt capture the same fields, call counts, provider/model/tokens/cost, VCP, blockers, lifecycle, authority state, and semantic-review telemetry. Confirm no Tag Rerank, Suggested Tags, Suggestion Author, or other retired tag-AI path ran.

Because the operation is a DEV review rerun, do not silently restore or delete the prepared design. Preserve the exact before/after evidence for owner inspection. Any rollback or cleanup requires a separate owner decision; the emergency safety action is to disable Semantic Reviewer if it is not already false and stop.

## Checkpoint separation

After a qualifying fixture is produced, stop and present its exact ID and evidence for owner approval. Gate C execution must be a separate checkpoint. If the preferred and alternate attempts both fail, stop with no Gate C execution.

## No deployment / safety

No deployment is expected because the existing reviewed DEV runtime contains the current Processing and Pass 1 integration. Semantic Reviewer remains OFF during preparation. Autonomous remains OFF. Gate C remains unauthorized. Production, WS6, Playground UX, migrations, rules, indexes, and broad reprocessing remain out of scope.

## Execution outcome

The authorized bounded execution attempted the preferred seed once and the predetermined alternate once. Both completed normally but produced no persisted Visual Context Profile, so the amendment did not produce a qualifying Role 1 fixture. The amendment is exhausted; further retries or fixture selection require a new Plan/Review decision.
