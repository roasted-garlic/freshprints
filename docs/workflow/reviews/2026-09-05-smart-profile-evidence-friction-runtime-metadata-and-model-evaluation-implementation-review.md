# Implementation Review: Smart Profile Evidence Friction (TD-034) — catalog-enrich-v35

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Implementation Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-review.md` (reconciled **approved**) |
| Verdict | **approved_with_notes** |
| DEV deploy authorized | **NO** — STOP before deploy |

---

## Answers (required)

| # | Question | Answer |
|---|----------|--------|
| 1 | Prompt version before | **catalog-enrich-v34** |
| 2 | Prompt version after | **catalog-enrich-v35** |
| 3 | Self-consistency instruction added | **YES** |
| 4 | Title/description anti-OCR preserved | **YES** |
| 5 | Normalizer changed | **NO** (`smart-profile-normalizer-v6`) |
| 6 | Smart Profile schema changed | **NO** (`smart-profile-v1`) |
| 7 | Evidence corpus changed | **NO** |
| 8 | searchConcepts added as evidence | **NO** |
| 9 | Matcher changed | **NO** |
| 10 | Blocker hardness changed | **NO** |
| 11 | Model 2 changed | **NO** |
| 12 | Explicit changed | **NO** |
| 13 | Model/provider system changed | **NO** |
| 14 | Model registry implemented | **NO** (deferred next version) |
| 15 | Metadata footer changed | **NO** — already Profile + Normalizer (Luna follow-up); marked superseded |
| 16 | Test results | Focused **223 pass / 0 fail**; Functions `tsc` **PASS**; `git diff --check` clean (CRLF warnings only) |
| 17 | Known regressions / baseline | Prompt-only change cannot prove live cucumber until DEV deploy; model non-determinism remains |
| 18 | Source ready for DEV deploy | **YES** |
| 19 | Exact DEV deploy allowlist | see below |
| 20 | Targeted owner QA / canary | see below |
| 21 | TD-034 expected disposition after DEV QA | **partially resolved / close if cucumber + sample friction improve without raising false Ready**; else retain residual debt |
| 22 | WS6 remains blocked | **YES** until TD-034 DEV canary + Signoff |

---

## What shipped (source)

- Archived v34 template as `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V34`
- New `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` = v35 with **Structured evidence self-consistency** block
- Version pins: `CURRENT_CATALOG_ENRICH_PROMPT_VERSION`, `CATALOG_ENRICHMENT_PROMPT_VERSION`, reprocess snapshot → **v35**
- Previous-default auto-upgrade includes v34 → live default
- ADR-FP-175 recorded
- Contract tests for self-consistency + corpus exclusion of searchConcepts

### Exact self-consistency contract (summary)

Meaningful `subjects[]` / `objects[]` tokens must be clearly named in natural wording in at least one of **title, description, or centralSubject**. Prefer description/centralSubject; do not awkwardly glue nouns onto slogan titles; do not keyword-stuff/OCR-dump; omit minor props rather than list without support; **searchConcepts alone is not enough**.

---

## Files changed (primary)

- `packages/shared/src/constants/aiEnrichment.constants.ts` (+ test)
- `packages/shared/src/constants/smartProfile.constants.ts`
- `packages/shared/src/constants/catalogReprocess.constants.ts` (+ test)
- `functions/src/ai/catalogTitleRules.ts` (+ test)
- `functions/src/ai/catalogEnrichV35EvidenceSelfConsistency.contract.test.ts` (new)
- `functions/src/ai/smartProfileQuality.contract.test.ts`
- `functions/src/ai/categoryDescriptionsPromptParity.contract.test.ts`
- `functions/src/ai/explicitContentAutomation.contract.test.ts`
- `functions/src/catalogReprocess/catalogReprocess.slice5.contract.test.ts`
- `docs/project/DECISIONS.md` (ADR-FP-175)
- `docs/project/TECH_DEBT.md`
- Formal Review reconciled; this IR

No Studio / Portal / Rules / indexes / migration.

---

## Exact DEV deploy allowlist (owner authorization required later)

```text
functions:enqueueAiEnrichment
functions:reprocessReadyDesignWithAi
functions:onCatalogReprocessJobWritten
functions:startCatalogReprocessJob
functions:previewCatalogReprocessJob
functions:testAiEnrichmentPlayground
```

Project: `fresh-prints-dev` only.  
Do **not** deploy: Portal, App Hosting, Rules, Storage Rules, indexes, production, unrelated Functions.

Optional companion if Settings save path must force template rewrite beyond runtime resolve: `functions:updateAiEnrichmentSettings` — **not required** for runtime upgrade (load path already `resolveAiEnrichmentPromptTemplate`).

---

## Targeted owner QA / canary (after deploy)

1. Confirm Settings/runtime still shadow / Autonomous OFF; default model remains `gemini-2.5-flash-lite` unless owner chooses otherwise.  
2. Reprocess cucumber `Y2IQuCgAPgnqrBIeJuap` (or disposable clone per policy) under v35.  
3. Record: subjects/objects, title/description/centralSubject, evidence gaps, Would Auto Approve, title/description/visibleText quality, new blockers, hallucinations.  
4. Sample historical friction patterns (hat / flowers / cannabis leaves / stars) — look for **safer true approval**, not raw % lift.  
5. Confirm unsupported claims still Needs Review.

---

## Verdict rationale

**approved_with_notes** — narrow authorized scope implemented correctly; safety contracts preserved; ready for owner-authorized DEV deploy. Notes: live TD-034 disposition depends on post-deploy canary; Phase 2 registry stays next-version; WS6 still blocked.

---

## Next step

**STOP.** Await owner **APPROVE DEV DEPLOY** with the allowlist above. No commit/push in this pass.
