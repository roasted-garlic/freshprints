# Plan: v36 False Category-Gap Semantics Corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | **implemented** — Formal Review approved; Implement+Test+IR complete; **STOP before DEV deploy** |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related | TD-034 visual-first v36 (deployed); disposition **HOLD — FALSE CATEGORY GAP CORRECTIVE REQUIRED** |
| Environment | `fresh-prints-dev` |
| This pass | Diagnose → Plan → Review → Implement (if cleared) → Test → IR → **STOP before DEV deploy** |
| FreshForge impact | Application (prompt/version + contract tests) — **not Starter Surface** |

---

## Goal

Stop false `category_gap_suggested` hard blocks when the model selected a valid approved category but filled `categoryGapNote` with **category rationale** (why the category fits / why secondary concepts lose), not a true taxonomy gap.

Preserve short visual-first v36 philosophy. Keep genuine `category_gap_suggested` **hard**.

---

## Authoritative failure capture (DEV design `Y2IQuCgAPgnqrBIeJuap`)

| Field | Value |
|-------|-------|
| promptVersion | `catalog-enrich-v36` |
| Final / resolved category | **Funny & Sarcastic** (owner-correct) |
| `categoryGapSuggested` | **true** |
| `categoryGapEvidence` (stored) | `The design has a strong sarcastic and humorous message, making 'Funny & Sarcastic' the most appropriate category. While it features a cucumber, the food aspect is secondary to the provocative phrase. It uses vintage pin-up art, but the prim` |
| Evidence length | **240** chars (= `SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH`) |
| Hard blocker | `category_gap_suggested` |
| automationDecision | `needs_review` |
| Owner classification of category | Correct dominant fit |

### Pipeline (mechanical)

1. **Origin of gap text:** Model `categoryGapNote` (Gemini). Not invented by resolver. Builder maps note → gap.
2. **Parse:** `normalizeSimpleCatalogEnrichment` preserves `categoryGapNote` string.
3. **Builder:** `smartProfileBuilder.ts` — `categoryGapSuggested = Boolean(categoryGapNote.trim())`; evidence = note.
4. **Normalizer:** truncates evidence to **240** via `normalizeToken(..., SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH)` — explains mid-word `...prim`.
5. **Automation:** `catalogAutomationDecision.ts` — if `categoryGapSuggested` → hard `category_gap_suggested`.
6. **UI:** `AiReviewSmartProfileSection` shows `Category gap noted: {categoryGapEvidence}` — displays full **stored** (already truncated) text; not a separate Studio clip beyond 240.

### v35 vs v36 semantics

| Version | `categoryGapNote` guidance |
|---------|----------------------------|
| v35 (and prior defaults) | Explicit NL: `categoryGapNote: one short sentence only when no approved category is a reasonable fit; otherwise "".` |
| v36 visual-first | JSON skeleton retains `"categoryGapNote":""` only — **NL field semantics omitted** |

**Classification:** `V36 PROMPT SIMPLIFICATION REGRESSION — CATEGORY GAP SEMANTICS OMITTED`

No reliable server-side signal distinguishes “rationale” vs “true gap” without brittle text parsing → **prefer prompt-contract fix**. Do **not** soften the hard blocker.

---

## Product contract (lock)

- Valid approved category fit → `categoryGapNote = ""` even with secondary objects/themes/styles/weaker alternates.
- True gap → note only when **no** approved category reasonably fits; remains hard `category_gap_suggested`.
- `categoryGapNote` is **not** a rationale field. Do not add one.
- `categoryAlternatives` preserved for plausible alternates; soft `category_alternatives_present` unchanged; empty preferred when primary clearly dominant.

---

## Scope

### In scope

- Bump to next unused prompt version (**`catalog-enrich-v37`**).
- Archive v36 as previous-default; auto-upgrade + custom preserve.
- Add **one** concise general sentence to visual-first default (owner wording), no fixture examples.
- Contract tests: prompt semantics; automation Cases 1–4 (clear fit / secondary concepts / alternatives soft / true gap hard).
- Docs: ADR note, TECH_DEBT TD-034 disposition, IR.
- STOP before DEV deploy.

### Out of scope

- Softening `category_gap_suggested`
- Resolver / Model 2 / Option B / tag retirement / WS6 / registry
- Expanding 240 evidence limit (record as intentional; false-gap fix removes need for long rationale display)
- Thin-description / Explicit investigation as primary
- DEV deploy / production / commit/push

---

## Proposed prompt delta (exact)

Append after category-selection paragraph (or adjacent to schema instruction), **no fixture names**:

`Use categoryAlternatives only when another approved category is genuinely plausible. Use categoryGapNote only when no approved category is a reasonable fit; otherwise return "". Do not use categoryGapNote to explain or justify a valid category choice.`

---

## Test strategy

- Prompt contract: v37 pins; gap semantics present; no cucumber/Funny/Food examples.
- Automation unit tests Cases 1–4 via `computeCatalogAutomationDecision` / builder path as appropriate.
- Regressions: category resolver, evidence, Explicit, Model 2 unchanged.
- `cd functions && npm run build`; `git diff --check`.

---

## Human checkpoints

1. Formal Review → Implement if approved.
2. Owner DEV deploy auth after IR (separate).
3. Post-deploy: 5× cucumber reprocess + true-gap regression.

---

## Risks / rollback

| Risk | Mitigation |
|------|------------|
| Model still emits rationale | Prompt only; QA 5-run; no blocker soften |
| True gaps stop emitting | Case 4 hard-block test + post-deploy true-gap fixture |
| Auto-upgrade overwrites custom | Existing preserve contract |

Rollback: redeploy prior Function set; restore v36 default if needed.

---

## Next step

Formal Review. If approved → Implement → Test → IR → STOP.
