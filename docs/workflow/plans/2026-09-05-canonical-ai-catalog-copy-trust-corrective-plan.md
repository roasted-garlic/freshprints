# Plan: Canonical AI Title/Description Trust (Parity Corrective)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | **implemented** — Formal Review approved; Implement+Test+IR; **STOP before DEV deploy** |
| Workflow | managed-phase |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related | Playground vs Processing parity investigation; owner contract clarification |
| Environment | `fresh-prints-dev` |
| This pass | Plan → Review → Implement → Test → IR → **STOP before DEV deploy** unless owner already authorized |
| FreshForge impact | Application (`functions` enrichment post-parse) — not Starter Surface |

---

## Owner principle (authoritative)

> AI owns the semantic catalog copy. Application code validates the response structure and integrity but does not rewrite the AI's title or description.

This **overrides** prior “trust a good model title / rewrite bad titles” lean-title quality language on the active Processing path.

---

## Goal

Make Processing persist canonical AI `title` / `description` when structurally valid (parity with Playground semantic copy), and **fail closed** on structural corruption — never synthesize or slogan-rebuild substitute prose.

---

## Scope

### In scope

- Bypass `resolveLeanCatalogTitle` / `buildTitleFromReadableTextLines` / centralSubject append on active Processing persistence
- Bypass description semantic scrub/synthesize on active persistence (`sanitizeCatalogDescription`, `stripOcrDumpFromDescription`, `synthesizeSemanticCatalogDescription` as rewrite drivers)
- Remove pipeline `resolveCatalogDescription` placeholder repair that invents prose
- Add conservative `isStructurallyValidCatalogCopy` (+ throw on fail)
- Contract tests (owner list 1–12)
- Cucumber mutation QA (canonical vs final)
- ADR note; no prompt/version bump (v37 unchanged)

### Out of scope

- Prompt/model tuning
- Smart Profile / normalizer / evidence / Model 2 / automation hardness
- Tag retirement, WS6, Autonomous, production
- ASCII-only validators; Unicode rejection
- Softening category_gap_suggested

---

## Design

1. **`acceptCanonicalCatalogCopy(field, value)`** — trim whitespace; if structurally invalid → throw (existing enrichment failure path).
2. **Structural invalidity (conservative):** empty; JSON/object/fence leakage; control-char corruption; symbol-dominated garbage; known placeholder tokens (`-`, `N/A`, …). Allow punctuation, profanity, Unicode, slogans, quotes.
3. **`buildSimpleCatalogEnrichmentResult`:** `suggestions.title` / `.description` = accepted canonical strings only.
4. **Candidate core:** delete description fallback synthesis branch; if placeholder somehow present → throw, do not `resolveCatalogDescription`.

Helpers may remain in repo for legacy/dev providers/tests but must not rewrite Gemini Processing titles/descriptions.

---

## Files

- `functions/src/ai/simpleCatalogEnrichmentResponse.ts`
- `functions/src/ai/catalogTitleRules.ts` (export structural validator; leave lean helpers unused on live path)
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- Tests under `functions/src/ai/*.test.ts` / new contract test
- `docs/project/DECISIONS.md` (ADR)
- Workflow state / handoff

---

## Test strategy

Owner contract cases 1–12; update obsolete lean-rewrite expectations; focused `tsx --test`; cucumber mutation diag on `Y2IQuCgAPgnqrBIeJuap` (DEV) if credentials available — **no deploy this pass** unless already authorized.

---

## Risks

| Risk | Mitigation |
|------|------------|
| OCR-dump titles persist | Acceptable under owner contract; improve via prompt later |
| Fail-closed increases Needs Review | Intended vs silent bad rewrite |
| Legacy tests expect lean rewrite | Update to new contract |

---

## Human checkpoints

- DEV deploy authorization (after IR) if not yet granted
- Owner cucumber Studio confirm optional after deploy
