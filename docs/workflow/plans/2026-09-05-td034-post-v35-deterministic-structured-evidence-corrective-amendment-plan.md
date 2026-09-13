# Plan Amendment: TD-034 Post-v35 Deterministic Structured Evidence Corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | ready_for_review → **owner chose OPTION B** (Implement authorized separately) |
| Workflow | managed-phase |
| Type | **Amendment** to existing TD-034 corrective (does not replace parent Plan) |
| Parent Plan | `docs/workflow/plans/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-plan.md` |
| Parent Formal Review | `docs/workflow/reviews/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-review.md` |
| Parent IR | `docs/workflow/reviews/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-implementation-review.md` |
| Related Review | `docs/workflow/reviews/2026-09-05-td034-post-v35-deterministic-structured-evidence-corrective-amendment-review.md` |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `smart-profile-evidence-friction-runtime-metadata-and-model-evaluation` |
| FreshForge impact | Application (shared automation helpers + Functions enrichment) — **not Starter Surface** |
| Environment | `fresh-prints-dev` |
| This pass | **Plan amendment + Formal Review only — NO Implement** |

---

## Goal

After `catalog-enrich-v35` failed the cucumber owner QA benchmark, define the safest **deterministic** architecture for AI-generated `subjects` / `objects` that lack independent support in the approved evidence corpus — without softening hard blockers, without adding `searchConcepts` as evidence, without inventing circular evidence, and without relying on another prompt-only revision or model switch.

---

## Background / failure baseline

### Owner cucumber QA (recorded)

`TD-034 CUCUMBER: FAIL: catalog-enrich-v35 did not resolve the existing structured_evidence_gap:subjects:woman. The model still emits woman as a subject without supporting it in title, description, centralSubject, or visibleText.`

Checkpoint: `docs/workflow/reviews/2026-09-05-td034-v35-cucumber-owner-qa-checkpoint.md`  
Raw: `docs/workflow/reviews/_td034-v35-cucumber-qa-dev-results.json`

| Field | Fresh DEV result |
|-------|------------------|
| Design | `Y2IQuCgAPgnqrBIeJuap` |
| Model | `gemini-2.5-flash-lite` |
| Prompt | `catalog-enrich-v35` |
| Normalizer | `smart-profile-normalizer-v6` |
| Profile | `smart-profile-v1` |
| AI title | `When Life Gives You Cucumbers Go Fuck Yourself` |
| AI description | vintage illustration / distressed typography (**no “woman”**) |
| centralSubject | absent |
| subjects | `["woman"]` |
| objects | `["cucumber"]` (supported via title/visibleText) |
| Hard blocker | `structured_evidence_gap:subjects:woman` |
| Would Auto Approve | NO |
| Classification | **PROMPT SELF-CONSISTENCY NOT RELIABLY FOLLOWED** |

### Conclusion from v35

Prompt-only enforcement was tested on the exact TD-034 benchmark and **failed**. This amendment does **not** propose `catalog-enrich-v36` unless Formal Review finds a new enforceable prompt mechanism (none expected). Luna / Gemini 3.1 benchmark already showed model switch alone does not close TD-034.

ADR-FP-175 remains historical for v35; a future ADR would record any deterministic prune/omit decision **after** owner product choice + Implement.

### Handoff pack note

`references/project-chatgpt-handoff/` is **not present** in this checkout. Pipeline authority is repo source under `packages/shared/src/` and `functions/src/ai/`.

---

## Mechanical pipeline trace (current order)

| # | Stage | Module / function | Notes |
|---|-------|-------------------|-------|
| 1 | Raw model response | Provider (`geminiVisionEnrichmentProvider` / OpenAI Luna) → parse in `simpleCatalogEnrichmentResponse.ts` | Stamps `CATALOG_ENRICHMENT_PROMPT_VERSION` (`catalog-enrich-v35`) |
| 2 | Title/description suggestions | Enrichment candidate pipeline (`aiEnrichmentCandidateCore.ts`) | Catalog copy fields |
| 3 | Smart Profile build | `buildDesignSmartProfile` (`functions/src/ai/smartProfileBuilder.ts`) | Maps parse → dimensions + provenance |
| 4 | Normalization | `normalizeDesignSmartProfile` (`packages/shared/src/utils/smartProfileNormalization.ts`) → stamps `SMART_PROFILE_NORMALIZER_VERSION` (`smart-profile-normalizer-v6`) | Includes `promoteSubjectsWithTitleSpecificity` / `sanitizeSyntheticSubjectCompounds` (already **drops** some unsupported **multi-word** subject compounds) |
| 5 | Category resolve | `resolveThemeCategory` (candidate core) | Unchanged by this amendment |
| 6 | Automation decision (pre-persist) | `computeCatalogAutomationDecision` (`packages/shared/src/utils/catalogAutomationDecision.ts`) via `automationDecisionShadow.ts` | Calls `findStructuredEvidenceGaps` on **AI profile** subjects/objects |
| 7 | Evidence corpus | `findStructuredEvidenceGaps` / `tokenHasLexicalSupport` (`packages/shared/src/utils/catalogAutomationEvidence.ts`) | Corpus = **title + description + centralSubject + visibleText** only; **searchConcepts excluded** |
| 8 | Matcher | `corpusIncludesPhrase` | Case-insensitive substring + light singular/plural; **no** woman↔girl alias |
| 9 | Hard blockers | `isHardEvidenceCode` in decision | `structured_evidence_gap:*` and `subject_specificity_risk:*` are **hard** |
| 10 | Explicit | `classifyExplicitContentAutomation` (candidate) → write gated in `markAiSuccess` | Unrelated to evidence gap |
| 11 | Authority merge (persist) | `markAiSuccess` → `mergeReadyBackfillSmartProfile` / `mergeQueueSmartProfileWithImportPresets` (`smartProfileEnrichmentWrite.ts`) | **After** automation decision |
| 12 | Staff authority | `mergeAiSmartProfileWithStaffPreserved` + `staffEditedDimensionKeys` (**dimension-level**, not per-token) | Staff list **replaces** AI list for edited keys |
| 13 | Import presets | `mergeSmartProfileImportPresets` + `importPresetDimensionKeys` | Preset tokens **unioned**; AI extras kept |

### Where unsupported AI-only tokens can be safely removed

**Recommended correction point:** after normalization / `buildDesignSmartProfile`, **before** `computeCatalogAutomationDecision`, on the **AI-owned** subjects/objects arrays only.

Rationale:

- Tokens at that stage are AI-emitted (staff/import not yet merged).
- Removing unsupported AI claims **before** validation means the claim never becomes a trusted persisted structured value and never becomes a hard blocker — distinct from accepting the claim.
- Precedent already exists for dropping unsupported **multi-word** subjects inside `sanitizeSyntheticSubjectCompounds` during normalize; single-token gaps currently survive into hard blockers instead.

**Do not** prune after staff/import merge for human-owned dimensions. **Do not** synthesize description text from the claim. **Do not** soften `structured_evidence_gap:*` hardness for surviving claims.

**Authority timing caveat (existing):** automation decision currently runs on the AI profile **before** staff/import merge. Staff/import tokens can be merged afterward without re-running evidence validation. That is existing authority behavior; this amendment must not worsen it and must not prune staff/import values.

---

## Scope

### In Scope (future Implement — only after Formal Review + **owner product choice**)

- Deterministic handling of unsupported AI-only `subjects` / `objects` per selected option (A or B below)
- Focused unit/contract tests (listed in Formal Review)
- Pipeline diagnostics for dropped tokens (prefer existing `logPipelineEvent` / soft reason codes; no schema unless Review requires)
- TD-034 / TECH_DEBT disposition update after DEV QA
- DEV redeploy of enrichment Functions allowlist (same class as v35) after Implement+IR

### Out of Scope

- Implementation in this Plan→Review pass
- Creating `catalog-enrich-v36` (unless Review finds a new enforceable prompt mechanism — **not expected**)
- Softening hard blockers / Model 2
- Adding `searchConcepts` (or other circular fields) to evidence corpus
- Synthetic description/title repair from the structured claim
- Second AI verification/repair call
- Changing default `visionModelId` / Phase 2 model registry
- WS6 / Autonomous enablement / production
- Customer Portal / print requests / DPI / show queue
- Data migration / Ready backfill / broad AI Review backlog
- Expanding prune to colors, interests, professionsGroups, themes, styles, searchConcepts, category (validator contract is subjects/objects only)

---

## Options (product + technical)

### OPTION A — Keep current hard-block (baseline)

Unsupported AI subject/object remains on profile → `structured_evidence_gap:*` → Needs Review / Would Auto Approve = NO.

| Impact | Assessment |
|--------|------------|
| Safety | Maximum conservatism; no omission of visually present entities from structured fields when model lists them |
| Catalog search | Keeps richer (but unvalidated) subjects/objects on Needs Review designs |
| Approval rate | Continues avoidable friction (cucumber still fails) |
| Observability | Existing hard reason codes |

### OPTION B — Conservative AI-only prune (primary candidate)

If a subject/object token is AI-owned, lacks staff dimension authority, lacks import-preset guarantee, and fails independent evidence support → **omit the token** before final validation/persistence. Do **not** invent evidence. Do **not** suppress blockers for tokens that remain.

Cucumber expectation under B: drop `woman`; keep `cucumber`; if no other hard blockers → Would Auto Approve may become YES in shadow **because the unsupported claim was removed**, not trusted. Lifecycle still governed by shadow/live gates (no Autonomous publication while shadow/false).

| Impact | Assessment |
|--------|------------|
| Safety | Does **not** accept unsupported claim; Model 2 still blocks surviving unsupported claims |
| Catalog search | May omit visually present subjects when model fails to describe them (SAFE OMISSION vs FALSE BLOCKING tradeoff) |
| Approval rate | Should reduce avoidable Needs Review on TD-034-class cases |
| Observability | Log dropped tokens; optional soft diagnostic codes (non-hard) |

### `[NEEDS OWNER DECISION]`

Choosing A vs B is a **product tradeoff** (SAFE OMISSION vs FALSE BLOCKING), not a pure safety defect. Formal Review must not silently pick for the owner.

---

## Rejected / non-preferred alternatives (planning view)

| Alt | Summary | Disposition |
|-----|---------|-------------|
| C — Narrow deterministic aliases | woman↔girl etc. | Does **not** solve cucumber (no approved evidence wording for woman/girl). Optional later residual only; not primary. |
| D — Expand evidence corpus | Add other fields | `searchConcepts` forbidden; no other independent safe field identified for this contract. |
| E — Synthetic description repair | Insert “woman” into description from subjects | **Unsafe circular evidence** — reject. |
| F — Second AI call | Repair/verify | Cost, latency, non-determinism; conflicts with preferred deterministic path — reject unless separately approved later. |
| G — catalog-enrich-v36 | Stronger wording | v35 already failed on benchmark — **insufficient** as sole fix. |
| H — Model switch | Change default vision model | Benchmark already consumed; registry next-version — reject for this corrective. |

---

## Authority rules (must hold for Option B)

| Source | Representation (repo) | Prune? |
|--------|----------------------|--------|
| AI-only | Tokens on pre-merge AI Smart Profile | Eligible if unsupported |
| Staff | `provenance.staffEditedDimensionKeys` → entire dimension replaced from prior at merge | **Never prune** staff-owned dimension values |
| Import preset | `importPresetDimensionKeys` + seed union at merge | **Never prune** preset-guaranteed tokens |

Human authority remains: **latest staff edit > durable import preset > AI**.

Ownership today is **dimension-level**, not per-token. Implement must:

1. Prune only on the AI profile **before** decision/merge; and/or
2. When merging presets, never remove preset tokens; when staff dimension is preserved, never overwrite staff list with pruned AI list.

---

## Acceptance criteria (future Implement of Option B)

1. Unsupported AI-only subject must not survive as trusted structured metadata without evidence (omit or hard-block — under B: omit).
2. Same for AI-only objects (in scope).
3. No synthetic evidence from the claim.
4. Staff-owned dimension values never pruned.
5. Import-preset values never pruned.
6. Supported AI values remain.
7. Unsupported surviving claims still hard-block.
8. Model 2 unchanged (`hardBlockers.length > 0` → never Ready; verifier cannot clear evidence hard blockers; confidence cannot bypass).
9. Evidence corpus unchanged unless separately approved.
10. `searchConcepts` remains excluded from evidence.
11. No fuzzy matching / semantic denylist.
12. No second AI call unless separately approved.
13. Explicit unchanged.
14. Category resolver unchanged.
15. `catalog-enrich-v35` may remain current prompt (no v36 required for B).
16. Cucumber must not fail solely because unsupported AI-only `woman` was preserved.
17. No unsafe false Ready (shadow/false gates remain; surviving hard blockers still block).

---

## Test strategy (future Implement)

| Case | Expected under Option B |
|------|-------------------------|
| AI subject `woman`, no evidence | Token omitted; no `structured_evidence_gap:subjects:woman`; soft/diagnostic prune record OK |
| AI subject `woman` + description supports woman | Keep; no subject gap |
| AI object `hat`, no evidence | Omit |
| AI object `cucumber` + title/visible support | Keep |
| Staff subjects include woman, no AI evidence | Staff list preserved; not pruned |
| Import preset subjects include woman | Preset retained |
| Unsupported claim somehow survives | Still hard-blocks Ready |
| Model 2 invariant suite | PASS |
| Explicit / visibleText / title / authority merge / shadow decision contracts | Unchanged |

---

## Migration

- **None preferred.** Behavior applies on future enrichment/reprocess after DEV deploy.
- No automatic catalog reprocess / Ready backfill.
- If Implement discovers migration need → STOP for owner checkpoint.

---

## Human checkpoints

1. **This pass:** Owner product choice OPTION A vs OPTION B (required before Implement).
2. After Implement+IR: owner-authorized DEV deploy.
3. Cucumber re-QA + small targeted secondary sample (5–10) only after cucumber PASS / PASS WITH NOTES.
4. Signoff decides TD-034 disposition (RESOLVED / PARTIALLY RESOLVED / NOT RESOLVED).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Search richness loss (omit visible woman) | Owner-facing tradeoff; diagnostics retain dropped token |
| False Ready if other blockers missed | Keep Model 2 suite; shadow gate |
| Accidental prune of staff/import | Dimension authority gates + tests |
| Scope creep to other dimensions | Lock subjects/objects only |
| Prompt v36 temptation | Explicitly out unless new mechanism found |

---

## Rollback

- Feature-flag optional only if Review requires; otherwise revert shared prune helper + redeploy Functions.
- Prompt remains v35; no corpus/matcher rollback needed if unchanged.

---

## Next step this pass

Formal Review of this amendment → STOP. **No Implement.** Await owner OPTION A / OPTION B.
