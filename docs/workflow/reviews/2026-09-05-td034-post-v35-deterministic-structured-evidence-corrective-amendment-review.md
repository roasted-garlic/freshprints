# Review: TD-034 Post-v35 Deterministic Structured Evidence Corrective (Amendment)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan (amendment) | `docs/workflow/plans/2026-09-05-td034-post-v35-deterministic-structured-evidence-corrective-amendment-plan.md` |
| Parent Plan | `docs/workflow/plans/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-plan.md` |
| Cucumber owner QA | `TD-034 CUCUMBER: FAIL` — checkpoint `docs/workflow/reviews/2026-09-05-td034-v35-cucumber-owner-qa-checkpoint.md` |
| Verdict | **approved_with_changes** |
| Implementation authorized | **NO** — blocked on owner product choice (OPTION A vs OPTION B) |

---

## Summary

Prompt-only `catalog-enrich-v35` failed the cucumber benchmark (Case A). Formal Review finds **conservative AI-only prune of unsupported subjects/objects before automation decision** technically feasible and Model-2-preserving — it removes the unsupported claim rather than accepting it. That choice is a **product tradeoff** (SAFE OMISSION vs FALSE BLOCKING) and requires an explicit owner decision before any Implement. Alternatives (aliases, corpus expansion, synthetic repair, second AI, v36, model switch) are rejected as primary fixes. No implementation, no WS6, no registry, no production this pass.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Subjects/objects evidence-gap only; no Implement |
| Architecture alignment | pass | Correction before decision on AI profile; authority merge unchanged |
| Security impact addressed | pass | No claim acceptance; Model 2 hardness retained for survivors |
| Data model impact addressed | pass | No migration; schema change not required |
| Backend impact addressed | pass | Shared helper + enrichment Functions consumers |
| Test strategy adequate | pass | Authority + prune + Model 2 cases listed |
| Human checkpoints identified | pass | **Owner A vs B required**; then deploy/QA later |
| Roadmap alignment | pass | Parent smart-catalog; WS6 blocked; registry deferred |
| Documentation plan | pass | Amendment + this Review; future ADR after owner choice |
| No silent scope expansion | pass | Explicit outs: v36, searchConcepts, soft blockers, second AI |

---

## Required answers (1–32)

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact pipeline location best suited for correction | After `normalizeDesignSmartProfile` / `buildDesignSmartProfile`, **before** `computeCatalogAutomationDecision` in `aiEnrichmentCandidateCore.ts` — prune AI subjects/objects only. Prefer a dedicated shared helper (not inside normalizer v6; avoids conflating vocab normalize with policy omit). Precedent: `sanitizeSyntheticSubjectCompounds` already drops some unsupported multi-word subjects. |
| 2 | Can AI-owned vs human-owned values be distinguished reliably? | **YES at dimension level** via `staffEditedDimensionKeys` and `importPresetDimensionKeys` / import seed merge. **Not per-token** today. Prune must run on **pre-merge AI profile** so all tokens there are AI-emitted; staff/import applied later must not be pruned. |
| 3 | Conservative AI-only prune technically feasible? | **YES** — reuse `findStructuredEvidenceGaps` outputs to omit gap tokens from AI `subjects`/`objects` before decision. |
| 4 | Does prune preserve Model 2? | **YES** — if interpreted as removing unsupported claims, not accepting them. Surviving unsupported claims still hard-block; `hardBlockers.length > 0` still never Ready; verifier still cannot clear evidence hard codes. |
| 5 | Does prune create circular evidence? | **NO** — no writing claim tokens into title/description/visibleText. |
| 6 | Schema change required? | **NO** preferred. Use `logPipelineEvent` + optional soft diagnostic reason codes (non-hard). New persisted field only if owner later requires staff-visible dropped-token UI. |
| 7 | Migration required? | **NO** — future enrichment/reprocess only. |
| 8 | Staff authority impact? | **None if correctly gated** — never prune staff-preserved dimension lists; merge order already replaces AI list for staff-edited keys. |
| 9 | Import-preset impact? | **None if correctly gated** — preset tokens unioned at merge; do not strip preset-guaranteed values. |
| 10 | Category resolver impact? | **NO** |
| 11 | Explicit impact? | **NO** |
| 12 | Objects included? | **YES** — same evidence validator contract (`structured_evidence_gap:objects:*`) |
| 13 | Subjects included? | **YES** |
| 14 | Other dimensions included? | **NO** — colors/interests/themes/styles/searchConcepts/category out of TD-034 evidence-gap contract |
| 15 | Diagnostic observability available? | **YES** — existing `logPipelineEvent` (`smart_profile.automation_decision` pattern); optional soft codes in `automationReasonCodes` (must not be hard) |
| 16 | New reason code required? | **OPTIONAL** — e.g. soft `ai_structured_token_pruned:subjects:woman` for QA; **not** a hard blocker |
| 17 | Evidence corpus change required? | **NO** |
| 18 | Matcher change required? | **NO** for cucumber; aliases do not solve missing evidence |
| 19 | Prompt change required? | **NO** — v35 remains; do not ship v36 as primary fix |
| 20 | Second AI required? | **NO** |
| 21 | Recommended option | **Technically recommend OPTION B (conservative AI-only prune)** *if* owner accepts SAFE OMISSION. **Do not implement until owner selects.** |
| 22 | Rejected alternatives | A retained as product alternative; C aliases insufficient for cucumber; D corpus expansion / searchConcepts rejected; E synthetic repair **unsafe**; F second AI rejected; G v36 insufficient; H model switch rejected (benchmark consumed; registry next-version) |
| 23 | Cucumber expected behavior (under B) | Drop unsupported AI `woman`; keep supported `cucumber`; no `subjects:woman` hard blocker from that claim; Would Auto Approve may become YES in shadow if no other hard blockers; lifecycle remains Needs Review unless Autonomous live (must stay shadow/false) |
| 24 | Broader TD-034 expected behavior (under B) | Avoidable evidence-gap friction reduced for AI-only unsupported subjects/objects; legitimate unsupported **surviving** claims still block; searchConcepts still non-evidence |
| 25 | False-Ready risk | **Low if** prune precedes decision, hardness unchanged for survivors, shadow/false gates held, staff/import not revalidated into unsafe acceptance of AI claims. Residual: existing pre-merge decision + post-merge authority (pre-existing). Must not add reintroduction of pruned AI tokens after approve without re-check. |
| 26 | Tests | See Plan amendment table + Model 2 / Explicit / authority / shadow contracts |
| 27 | Expected files | `packages/shared/src/utils/catalogAutomationEvidence.ts` (or new sibling helper); `catalogAutomationDecision.ts` consumers; `functions/src/ai/smartProfileBuilder.ts` and/or `aiEnrichmentCandidateCore.ts`; focused `*.test.ts` / contract tests; TECH_DEBT/ADR on Implement |
| 28 | DEV deployment surface | Same enrichment allowlist class as v35: `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`, `testAiEnrichmentPlayground` — `fresh-prints-dev` only; no rules/indexes/Portal/Studio release |
| 29 | Owner QA plan | After Implement+IR+owner deploy auth: reprocess cucumber; then 5–10 historical TD-034 samples only on PASS / PASS WITH NOTES; no backlog/Ready backfill |
| 30 | Verdict | **approved_with_changes** |
| 31 | Unresolved owner decisions | **OPTION A vs OPTION B** (required). Optional later: soft diagnostic code naming; staff-visible dropped-token UI |
| 32 | Implementation authorized? | **NO** |

---

## Architecture Review

**Findings:**

- Distinguishing **ACCEPT unsupported claim** (unsafe: keep `woman` + suppress blocker) from **REMOVE unsupported claim** (potentially safe: omit AI-only `woman`, validate remainder) is correct and Model-2-compatible.
- Correction must not live inside the hard-blocker softener path.
- Prefer dedicated prune helper over normalizer bump (`smart-profile-normalizer-v6` stays unless Implement later chooses to colocate — Review prefers **no** normalizer bump for clarity).
- Note: `computeCatalogAutomationDecision` currently omits `centralSubject` when calling `findStructuredEvidenceGaps` even though the helper accepts it; cucumber had no centralSubject anyway. Out of scope to “fix” unless Implement touches that call — do not use as excuse to expand corpus.

**Required changes:**

- [x] Owner must select OPTION A or OPTION B before Implement
- [ ] If B: Implement per acceptance criteria; recompute nothing that re-adds pruned AI tokens post-decision without validation
- [ ] If A: no code; update TD-034 disposition to retain hard-block friction / residual debt

---

## Security Review

**Findings:**

- No client trust changes; server-side deterministic omit.
- Does not weaken Ready publication gates.
- Explicit / censored-term paths untouched.

**Required changes:**

- [ ] None beyond keeping Autonomous OFF during QA

**Human approval needed before production:**

- [x] Always — production not authorized this program slice

---

## Data Model Review

**Findings:** No migration. No schema required for MVP diagnostics. Dimension-level authority fields already exist.

**Required changes:**

- [ ] None for this Review pass

---

## Backend Review

**Findings:** Shared package change must ship with Functions that embed enrichment. Deploy allowlist must remain narrow.

**Required changes:**

- [ ] None until Implement authorized

---

## Distinction: accept vs remove (required)

| Operation | Meaning | Model 2 |
|-----------|---------|---------|
| Accept unsupported claim | Keep `woman` on profile despite no evidence; suppress/ignore gap | **UNSAFE** — rejected |
| Remove unsupported claim | Drop AI-only `woman` because unsupported; validate remainder | **Potentially SAFE** — Option B |

Formal Review affirms these are **not** the same operation.

---

## Owner decision checkpoint (STOP)

### OPTION A — Keep current hard-block / manual-review behavior

- **Safety:** Highest conservatism on structured metadata completeness vs omission.
- **Catalog search:** Unsupported AI tokens remain visible on Needs Review profiles.
- **Approval rate:** Cucumber-class avoidable friction continues.
- **Observability:** Existing `structured_evidence_gap:*` hard codes.

### OPTION B — Conservatively drop unsupported AI-only subjects/objects before final validation

- **Safety:** Does not trust unsupported claims; survivors still hard-block.
- **Catalog search:** May omit visually present entities when model fails to describe them (SAFE OMISSION).
- **Approval rate:** Expected reduction in avoidable Needs Review for TD-034-class cases.
- **Observability:** Pipeline logs / optional soft prune codes; claim not persisted as trusted subject/object.

**Do not implement either path until the owner replies with an explicit choice.**

---

## Blockers

1. **Owner product decision** OPTION A vs OPTION B — blocks Implement.
2. WS6 remains blocked until this corrective is deployed, owner-QA’d, and signed off (after Implement path if B).
3. Phase 2 model registry remains deferred to next version.

---

## Owner decision resolution

**Recorded 2026-09-05:** Owner selected **OPTION B** — conservatively prune unsupported AI-only subjects/objects before automation decision.

Implementation authorized for Option B only. See ADR-FP-176 and Implementation Review.

---

## Verdict rationale

**approved_with_changes** — amendment architecture is sound; primary open item is owner selection of OPTION A vs OPTION B. Technical preference is B if omission is accepted. Implementation is **not** authorized this pass.

---

## Next Step

Await owner: `OPTION A` or `OPTION B`. Then Plan Implement only if B (or disposition/docs-only if A). No code until then.
