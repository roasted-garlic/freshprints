# Review: Smart Profile Evidence Friction + Runtime Metadata + Model Evaluation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Updated | 2026-09-05 — **reconciled** after Luna Phase 1 Signoff + owner sequencing |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-plan.md` |
| Prior verdict | `approved_with_changes` (parked) |
| Verdict | **approved** |
| Implementation authorized | **YES** — narrow Workstream A prompt self-consistency only (this pass) |

---

## Summary

Owner resumes TD-034 now. Luna Phase 1 three-model DEV benchmark is **consumed**: Luna does **not** close evidence friction; Gemini 3.1 helps only partially; model switch alone is insufficient. Preferred fix remains **prompt self-consistency** (`catalog-enrich-v35`), with **no** corpus/matcher/validator/Model 2 changes, **no** searchConcepts-as-evidence, **no** normalizer bump, **no** Phase 2 registry (deferred to next version), and **no** metadata UI work (already satisfied by Luna follow-up: Profile + Normalizer footer).

---

## Reconciliation (owner + Luna)

| Prior open item | Resolution |
|-----------------|------------|
| Sequencing (benchmark vs prompt) | **RESOLVED** — implement TD-034 prompt corrective **now**; Luna benchmark already done |
| Phase 2 model registry | **DEFERRED TO NEXT VERSION** — do not plan/implement this release |
| searchConcepts as evidence | **NO** — confirmed |
| Provider footer optional | **OUT** — not TD-034; no add |
| Metadata footer (Prompt/Normalizer/Model) | **SUPERSEDED / SATISFIED** by Luna Phase 1 UI follow-up (Profile + Normalizer). No further UI in this corrective |
| Broad 20–50 model competition | **NOT required** to start this corrective; use existing 8-design Luna benchmark + focused fixtures + post-deploy canary |
| Luna / OpenAI feasibility | **RESOLVED** — Luna live on DEV; still does not eliminate TD-034 |

### Benchmark conclusion (no contradiction)

From `2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-model-benchmark-report.md`: Luna **5/8** gap runs (worse than Gemini); cucumber still blocked on Luna; Gemini 3.1 partial only. Aligns with “prompt primary / model secondary.” **No STOP for contradiction.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Prompt v35 only; UI/model/registry out |
| Architecture alignment | pass | Prompt contract; validators unchanged |
| Security impact addressed | pass | Hard blockers stay hard; Model 2 unchanged |
| Data model impact addressed | pass | No schema/migration |
| Backend impact addressed | pass | Prompt/version constants + Functions consumers |
| Test strategy adequate | pass | Prompt contract + evidence + quality regressions |
| Human checkpoints identified | pass | DEV deploy + owner canary after IR (not this pass) |
| Roadmap alignment | pass | Parent smart-catalog; WS6 still blocked |
| Documentation plan | pass | ADR/TECH_DEBT/version notes on Implement |
| No silent scope expansion | pass | Explicit outs recorded |

---

## Required Changes

- [x] None blocking Implement — owner decisions resolve prior `approved_with_changes` list

---

## Blockers

None for Implement of Workstream A (prompt). DEV deploy remains **owner-gated** after IR.

---

## Verdict Rationale

**approved** — narrow prompt self-consistency corrective is authorized. Metadata UI and model-registry/benchmark sequencing are reconciled. Hard-blocker / searchConcepts / normalizer / schema / Model 2 policies locked as NO-CHANGE.

---

## Next Step

IMPLEMENT → TEST → IMPLEMENTATION REVIEW → **STOP before DEV deploy**.
