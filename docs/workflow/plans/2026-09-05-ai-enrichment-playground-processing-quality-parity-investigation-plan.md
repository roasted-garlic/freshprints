# Plan: AI Enrichment Playground vs Processing Quality Parity Investigation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | **complete** — Formal Review follows |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related | TD-034 visual-first / catalog-enrich-v37; diag `docs/workflow/reviews/_td034-playground-processing-parity-diag-results.json` |
| Environment | `fresh-prints-dev` |
| This pass | Diagnose → Plan → Formal Review → **STOP** (no implement unless Review clears mechanical fix + no product decision) |
| FreshForge impact | Application investigation only — **not Starter Surface** |

---

## Goal

Prove why Settings Playground and normal AI Processing produce **materially different title/description quality classes** under the same `catalog-enrich-v37` prompt/model/artwork — quality-class parity, not byte-identical wording.

---

## Background

Owner observation (cucumber `Y2IQuCgAPgnqrBIeJuap`): Playground repeatedly yields visual-subject-first titles (`Retro Pin-Up Woman Holding Cucumber` class); Processing often yields slogan-first titles with awkward subject append (`When Life Gives You Cucumbers Go Fuck Yourself Woman`) and thinner descriptions.

v37 false-category-gap corrective remains green; do not reopen unless directly relevant.

Auto-approve regression audit and tag retirement remain **blocked** until this investigation is dispositioned.

---

## Scope

### In scope

- Request parity (prompt, model options, schema, image, categories)
- Stage traces (Playground display stage vs Processing raw→final)
- Title/description post-processing call graph
- Controlled 5× Playground + 5× Processing runs (same Settings prompt + same preview asset)
- Profanity masking secondary trace
- Root-cause class + recommended narrow corrective options

### Out of scope

- Prompt tuning
- Auto-approve policy / evidence / Model 2 changes
- Tag/reranker retirement, WS6, Autonomous, production
- Implementation this pass unless Formal Review authorizes a zero-product-decision mechanical fix

---

## Affected areas (inspection)

| Area | Paths |
|------|--------|
| Playground | `functions/src/ai/aiEnrichmentPlayground.ts`, `functions/src/testAiEnrichmentPlayground.ts`, Studio Settings playground |
| Processing | `functions/src/ai/aiEnrichmentCandidateCore.ts`, `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`, `functions/src/ai/simpleCatalogEnrichmentResponse.ts` |
| Title/desc transforms | `functions/src/ai/catalogTitleRules.ts` (`resolveLeanCatalogTitle`, `buildTitleFromReadableTextLines`, `sanitizeCatalogDescription`), `packages/shared/src/utils/visibleTextQuality.ts` |
| Display masking | `packages/shared/src/utils/maskCensoredDesignText.ts` (not enrichment write) |

---

## Investigation method

1. Source audit of Playground vs Processing request builders and post-parse transforms.
2. Local proof: apply `resolveLeanCatalogTitle` to owner-class visual titles → slogan+Woman.
3. Controlled DEV diag script: same saved v37 Settings text + same preview bytes for Playground; simulate Processing transforms on Playground JSON; 5 Processing reprocesses for finals.
4. Classify titles/descriptions STRONG / ACCEPTABLE / THIN/AWKWARD / INCORRECT.

---

## Success criteria (investigation)

- Side-by-side request parity documented YES/NO per dimension.
- First divergence boundary for title and description identified with function names.
- Root-cause class A–E assigned with evidence.
- Corrective recommendation framed for owner decision; implement only if Review authorizes.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Mis-comparing stages | Explicit Playground stage = normalized canonical JSON; Processing final = lean-resolved `aiSuggestions` |
| Treating intentional lean-title policy as a bug | Formal Review separates mechanical divergence from product policy choice |
| Scope creep into prompt rewrite | Out of scope this pass |

---

## Human checkpoints

- Owner chooses corrective approach after Formal Review (title-policy vs Playground preview-only vs deferred).
- No DEV deploy in this pass.

---

## Test / evidence artifacts

- Proof script: `functions/scripts/_parity-lean-title-proof.ts`
- Controlled diag: `functions/scripts/td034-playground-processing-parity-diag.mjs`
- Results: `docs/workflow/reviews/_td034-playground-processing-parity-diag-results.json`
