# Plan: Smart Catalog Intelligence — WS5 Autonomous DEV Canary

> **Amendment (2026-09-05):** Primary canary acceptance criterion superseded by **MODEL 2 — SAFETY-INVARIANT** — see `docs/workflow/plans/2026-09-05-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-model-2-amendment-plan.md` and Formal Review `…-model-2-amendment-review.md` (ADR-FP-171). Historical Model 1 exact-class execution/stop remains valid history and is not erased.

| Field | Value |
|---|---|
| Date | 2026-09-04 |
| Author | Planning Agent |
| Status | complete — amended 2026-09-05 (Model 2) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | WS5 — Autonomous DEV Canary |
| Environment | `fresh-prints-dev` only |
| Authorization | Plan + Formal Review only |
| Runtime baseline | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` |

## Goal

Prove the unattended catalog decision path on the smallest inspectable DEV population: safe designs may become Ready, hard blockers remain in Needs Review, human-owned data and lifecycle contracts remain intact, publication is observable and recoverable, and every decision can be audited. This is not a broad rollout.

## Scope

### In scope after a separate owner enablement checkpoint

- Re-run exactly six existing `imported` + `needs_review` designs, one at a time, through the existing AI Review rerun callable.
- Exercise clear policy-eligible, hard-blocked, visible-text, no-visible-text, and category-sensitive cases.
- Inspect Firestore lifecycle/audit fields and Algolia publication state for every item.
- Disable both live gates immediately after the sixth enqueue, or sooner on any stop condition.

### Out of scope

- Any settings mutation or canary execution during this planning pass.
- Bulk AI Review reprocessing, Ready-catalog reprocessing, new AI calls beyond the normal existing enrichment call, source changes, deploys, Rules/index/migration changes, tag or reranker retirement, WS6, production, commit, or push.

## Source-locked architecture

The existing path is:

`enqueueAiEnrichment` → `runAiEnrichmentPipeline` → normalized/repaired model response → Smart Profile build → `computeCatalogAutomationDecision` → `markAiSuccess` → Firestore Ready transition → `syncPortalCatalogDesignToAlgolia`.

Key sources:

- Decision and blockers: `packages/shared/src/utils/catalogAutomationDecision.ts`
- Dual gate: `packages/shared/src/constants/catalogWorkflowMode.constants.ts`
- Settings read/mutation: `functions/src/ai/loadAiEnrichmentSettings.ts`, `functions/src/updateCatalogWorkflowMode.ts`
- Candidate/title ordering: `functions/src/ai/simpleCatalogEnrichmentResponse.ts`, `functions/src/ai/aiEnrichmentCandidateCore.ts`
- Persistence/approval: `functions/src/ai/aiEnrichmentPipeline.ts`
- Authority merges: `functions/src/ai/smartProfileEnrichmentWrite.ts`, `packages/shared/src/utils/smartProfileStaffEdit.ts`, `packages/shared/src/utils/smartProfileImportPresets.ts`
- Individual rerun: `functions/src/enqueueAiEnrichment.ts`
- Publication/recovery: `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts`, `functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts`

Live publication is permitted only when `catalogWorkflowMode === "autonomous"` **and** `catalogAutonomousLiveEnabled === true`. Missing or malformed values fail closed to Manual/live false. Hard blockers are evaluated before the dual gate and cannot be cleared by the verifier.

## Canary population and size

Use existing AI Review designs in `status=imported`, `aiReviewStatus=needs_review`; invoke the individual rerun path with `rerunFromReview=true`. Do not use the population-wide reprocess job and do not mutate already-approved Ready designs.

Recommended size: **6**. WS3 had 165 eligible items (50 policy-clear, 115 Needs Review), while WS4 had 359 Ready items (153 policy-clear, 206 Needs Review). Six is the minimum practical set covering two clear approvals, two explicit hard-block families, both visible-text states, category sensitivity, and a third blocked boundary case while keeping every mutation manually auditable.

| Order | Design ID | Last observed pre-state | Historical v32 class | Expected v34 class | Coverage |
|---:|---|---|---|---|---|
| 1 | `At5hu7vLjWgduiyzZCfR` | imported / needs_review | wouldAutoApprove | auto_approved → Ready | visible text; humor |
| 2 | `03cbj1cIFH7Bavt38XBX` | imported / needs_review | wouldAutoApprove | auto_approved → Ready | no visible text; Pop Culture |
| 3 | `Dr8lcyPE8imTQlNESP8X` | imported / needs_review | hard: `category_gap_suggested` | needs_review | explicit category hard block |
| 4 | `nff6PpkZF9TNitnpX2Mm` | imported / needs_review | hard: category gap + evidence gap | needs_review | Animals/category-sensitive |
| 5 | `1Ws0T9fivryest6IUSbt` | imported / needs_review | `structured_evidence_gap:objects:cannabis leaves` | needs_review | visible text; Cannabis boundary |
| 6 | `LYJcsxnfUyacRWtntEkd` | imported / needs_review | `subject_specificity_risk:cow` | needs_review unless v34 repairs evidence | no visible text; specificity boundary |

These are proposed IDs from repository-captured DEV evidence, not authorization to run them. Immediately before enablement, a read-only preflight must confirm each still exists, is `imported` + `needs_review`, has no staff-edited keys or import presets, has derivatives, and produces the stated current shadow class under v34. Replace rather than force any ineligible/mismatched row, document the replacement, and return to owner review.

`[FIXTURE GAP — natural verifier-worthy case]`: WS3 invoked zero verifiers; production emits no ordinary `automation_policy_uncertainty` case in the inspected sample. Do not fabricate one.

`[FIXTURE GAP — imported human/preset-authority case]`: WS3 found zero presets and zero staff-edited keys. Do not mutate Ready authority fixtures. WS4 already proved persistence preservation (staff 4/4, presets 13/13); the canary preflight deliberately excludes authority-bearing reruns because eligibility is currently calculated before authority merge.

## Execution sequence (future authorization only)

1. Read-only preflight: record exact settings, design snapshots, active jobs, function revisions, current v34 shadow decisions, authority markers, and Algolia baseline.
2. Present the completed enablement checkpoint to the owner and stop.
3. After explicit owner authorization, set mode to `autonomous`, then enable live Autonomous with owner-only callable and phrase `ENABLE AUTONOMOUS`.
4. Re-run one candidate at a time. Wait for terminal enrichment and publication state before the next.
5. Stop immediately on an unexpected Ready, hard-block bypass, loss of authority/lifecycle data, enrichment failure, publication `failed`, absent publication state after the observation window, or ambiguous audit evidence.
6. Restore `catalogWorkflowMode=shadow` and `catalogAutonomousLiveEnabled=false` immediately after the final enqueue (or stop condition).
7. Manually inspect all six records and the two successful Ready objects in Algolia; record owner disposition.

## Expected mutations

- All six temporarily move through AI processing fields (`pending`/active stage).
- Policy-clear rows may receive `status=ready`, `aiReviewStatus=approved`, `aiReviewed=true`, `aiReviewedBy=system:catalog-autonomy`, `aiReviewedAt`, `readyAt` when absent, and appended `approvalAudit`.
- Blocked rows return to `status=imported`, `aiReviewStatus=needs_review`, with decision/reason provenance.
- Ready writes trigger asynchronous Algolia upsert and publication metadata (`synced` or `failed`, attempts/error).
- Flag rollback prevents future autonomous approvals; it does not undo designs already made Ready.

## Audit evidence per design

Record design ID, before/after lifecycle, prompt/normalizer/schema, full automation decision and reason codes, hard blockers derived from reasons, verifier invocation/outcome, authority keys/preset seed, title outcome, approval actor/audit delta, `readyAt` delta, enrichment error/retry state, publication status/attempt/error, Algolia object presence/content, and owner disposition.

## Failure and recovery

- Enrichment failure leaves a queue design imported, `aiReviewStatus=pending`, `aiProcessingStage=failed`, records provider/error data, and increments failure health; staff rerun is the recovery path.
- Ready and approval are one Firestore update, but Algolia publication is a separate Firestore-triggered operation. Publication failure records `failed` metadata, increments attempts and Automation Health, then rethrows for platform retry. Reconciliation is the durable recovery path. The design remains Ready.
- Therefore “Autonomous success” for WS5 means both Ready lifecycle **and** publication `synced`/verified Algolia object. Ready alone is not a pass.

## Human/preset authority limitation

Persistence preserves staff-edited dimensions and preset seeds, but the current automation decision is computed from the fresh AI profile before those merges. WS5 must exclude authority-bearing reruns. Broader Autonomous/WS6 must not include them until this ordering is explicitly reviewed and, if necessary, corrected and tested.

## Tests required before owner enablement

- Existing shared decision/dual-gate/hard-blocker tests.
- Existing Functions enrichment, authority-merge, publication-failure, and retry tests.
- Typecheck/build per `docs/standards/TESTING.md` for the unchanged deployed baseline, or deployed-revision evidence matching the already tested WS1 baseline.
- Read-only current-shadow preflight for all proposed IDs.
- Manual post-run inspection of all six; Algolia verification for every auto-approved row.

No Rules, index, migration, backfill, or source implementation is required for this tightly excluded canary. The authority-order limitation is a mandatory WS6/broader-population gate.

## Rollback and stop procedure

Use the owner-only settings service/callable to select Shadow (which clears live) and verify the persisted result is exactly `catalogWorkflowMode=shadow`, `catalogAutonomousLiveEnabled=false`. Stop submitting reruns; allow an already-started callable to finish because settings are loaded during its processing and cancellation is not guaranteed. Inspect any in-flight result. Flag rollback affects future decisions only and does not demote already-approved designs; any Ready correction is a separate manual staff action.

## Owner checkpoint required before enablement

The checkpoint must show: final IDs and reasons; current shadow class per ID; current lifecycle/authority/version fields; exact settings; the two settings mutations; deployed Functions involved; expected mutations/publication; rollback and stop procedure; owner QA steps; and confirmation that production, tags, reranker, Rules, indexes, migration, commit, and push remain untouched.

## Acceptance criteria

- Dual gate is verified before and restored after the bounded run.
- Only six pre-approved IDs are submitted, sequentially.
- Every hard-blocked row remains Needs Review.
- Every auto-approved row has complete system audit/`readyAt` semantics and a verified Algolia publication.
- No human/preset fields are in mutation scope; no tags are used as an eligibility condition.
- No additional Autonomous-only AI call occurs.
- Any unexpected result stops the run and is documented; WS6 remains not started.

