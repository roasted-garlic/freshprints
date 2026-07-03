# Plan — AI Business-Context Prompt Line (DTF Apparel Framing)

- **Date:** 2026-07-02
- **Mode:** Managed Phase
- **Goal slug:** `ai-business-context-prompt`
- **Roadmap phase:** Phase 5 AI Processing maintenance, supporting the current Phase 6 accepted baseline
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a human checkpoint after approval and testing. No deploy is performed in this phase.
- **Independent of:** `suggested-tags-last-resort` (still open at test phase, pending manual smoke test) and `ai-tag-rerank-second-call` (still undeployed). This phase touches the first-call prompt only — the vision-only v20/v21 template — and does not modify tag resolution, the tag reranker, or suggestion authoring. Kept as a separate managed phase per the same "don't blend phases" guardrail applied to prior sessions.

---

## 1. Goal

User reported a real miscategorization: a design reading "Lashes longer than my Patience" (a sarcastic/funny quote, illustrated with eyelash line art in an elegant script font) was suggested as:

- **Category:** `Luxury & Fashion Inspired` — wrong; the design is a joke, not about fashion or luxury.
- **Title:** `Lashes Longer Patience Beauty Makeup Cosmetics` — "Beauty Makeup Cosmetics" was invented and doesn't reflect the design's actual subject (a sarcastic quote).
- **Tags:** `fashion, women, quote, funny` — `fashion` is a stretch; `funny` is correct but under-weighted relative to the wrong category.

Root cause: `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` (`shared/constants/aiEnrichment.constants.ts`) gives the model zero business context. It says only "Analyze the provided image and return only valid JSON" — no framing that this is a DTF (direct-to-film) transfer catalog for apparel printing, and no instruction to judge category/tags by the design's actual subject/message rather than its visual style (script font, color palette, incidental imagery like eyelashes/lipstick/heels). The model free-associates from visual similarity to "beauty/fashion" concepts instead of asking "what is this design fundamentally about."

Server-side category resolution (`catalogThemeCategoryResolver.ts`) is not at fault here and needs no change: per ADR-FP-039/041, when the model's raw category answer exactly matches an approved category name, that answer is trusted directly with no second-guessing — so "Luxury & Fashion Inspired" passed through verbatim because the model said it, not because a scoring bug picked it. The fix belongs entirely in the prompt that produces the model's raw judgment.

This phase adds one short business-context paragraph to the prompt so every future catalog run — category, title, tags, description — is graded against "is this genuinely about fashion/luxury/beauty," not "does it visually resemble fashion/luxury/beauty."

---

## 2. Current State (verified in code)

### 2.1 Prompt template today (`shared/constants/aiEnrichment.constants.ts:101-121`)

```
Analyze the provided image and return only valid JSON.

Return:
title: short natural searchable design title.
description: clear 1 to 2 sentence description of the design, including all readable text exactly as it appears, plus style, colors, and main visual elements.
category: the single best-fitting category name from this approved list, copied exactly as written. Only return a name that is not on the list if none of them genuinely fit.
tags: up to 12 searchable tag candidates.

Approved categories:
{{approved_category_names}}

Rules:
Tags may be single words or short phrases because they will be matched against an internal tag database later.
Use accurate searchable words for visible subjects, themes, audience, style, occasion, text, recognizable characters, brands, franchises, or properties.
Do not use filler tags like image, design, artwork, graphic, shirt, print, png, or dtf.
If readable text appears, include all of it in the description.
If a recognizable character, brand, franchise, logo, team, show, movie, game, celebrity, or known property is clearly visible, name it directly. Only avoid naming it when genuinely uncertain.
Do not use these tag words: {{excluded_tags}}

Return exactly this JSON shape and nothing else:
{"title":"...","description":"...","category":"...","tags":["tag candidate"]}
```

No sentence anywhere establishes: what business this is for, what these designs are used for (DTF transfers printed onto shirts/apparel), or that category/tag judgment should be about subject matter, not visual style. This is the identical gap across all of title/description/category/tags — not category-specific — since the whole first call shares one undifferentiated context.

### 2.2 Why this wasn't caught by ADR-FP-039/041's exact-match trust rule

`catalogThemeCategoryResolver.ts`'s `resolveThemeCategory` trusts an exact (case/punctuation-tolerant) match between the model's raw category answer and an approved category name directly (`findExactCategoryNameMatch`), skipping the token-overlap/priority-boost fallback scorer entirely in that case. `Luxury & Fashion Inspired` is (per the report) a real approved category name, so the model's answer matched exactly and was trusted as designed. The fallback scorer's `FAMILY_PRIORITY`/`FAITH_PRIORITY`/`TEACHER_PRIORITY` buyer-intent boosts (lines 57-115) never got a chance to run, and even if they had, there is no `HUMOR_PRIORITY` family today that would have pulled this design back toward a joke/quote category over a visually-fashion-adjacent one.

**This plan does not add a new priority family or touch the resolver.** The user's ask is specifically about giving the model better judgment up front, not about adding another server-side override layer. If the business-context prompt line alone doesn't sufficiently fix this class of miscategorization after real-world use, a follow-up phase can consider a resolver-side humor/sarcasm priority family — flagged as an explicit non-goal here, not a decision to skip it forever.

### 2.3 Prompt version / test dependencies

- `CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-v20"` / `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-dev-v20"` (`catalogTitleRules.ts`). Any prompt content change is a genuine behavior change and should bump to v21 per established repo convention (every prior prompt content change — v18/v19/v20 — bumped the version).
- No existing test asserts on the prompt's literal wording (verified: `promptParity.test.ts`, `catalogTitleRules.test.ts`, `simpleCatalogEnrichmentResponse.test.ts`, `geminiVisionEnrichmentProvider.test.ts`, `aiEnrichmentSettingsConstants.test.ts` all check placeholders/structure/version string, not prose content) — safe to edit prose without breaking existing assertions, but `catalogTitleRules.test.ts:26`'s exact version-string assertion must be updated to `v21`.

---

## 3. Scope

### In scope

- Add one short business-context paragraph to `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, placed before the `Return:` field instructions so it frames every subsequent judgment (title, description, category, tags). **Resolved (final wording, confirmed by user 2026-07-02):**

  > You are cataloging a DTF (direct-to-film) transfer design for an apparel print shop. These designs are printed onto shirts and similar garments. Judge the category, title, and tags by what the design is fundamentally about: its main subject, message, joke, buyer intent, occasion, role, or theme. Do not choose categories or tags only because of visual style, font choice, color palette, or decorative imagery. For example, lashes, lipstick, heels, or elegant script do not make a design Luxury & Fashion Inspired unless beauty, fashion, glam, or luxury is truly the subject. School supplies do not make a design School & Education unless school, teaching, students, or education is truly the subject. Religious-looking decoration does not make a design Faith & Inspirational unless faith, prayer, scripture, or inspiration is truly the subject.

  Deliberately generalized beyond the single reported case (lashes/fashion) to two additional blend-prone examples (school supplies, religious decoration) while keeping the core principle — subject/message/buyer intent over style/decoration — as one compact paragraph, not a growing list of category-specific rules (per user decision 2, §8 resolved).
- Bump `CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-v21`, `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-dev-v21`.
- Update the one test that hardcodes the version string (`catalogTitleRules.test.ts:26`).
- Add a regression-style test on the prompt content itself (new, since none exists today) asserting the business-context sentence is present in `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` and mentions DTF/apparel — guards against this context silently regressing in a future prompt edit.
- Update `docs/project/DECISIONS.md` with a new ADR, `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, and `CURRENT-STATE.md` to record the v21 bump and its rationale (matching the pattern of every prior version bump).

### Out of scope

- No change to `catalogThemeCategoryResolver.ts` — no new priority family, no scoring changes (see §2.2).
- No change to `catalogTagResolver.ts`, the tag reranker, or suggestion-authoring — this phase is the first-call prompt only.
- No change to the approved category list itself (e.g. renaming "Luxury & Fashion Inspired" or narrowing its intended use) — that's a Tag/Category Management data change, not a prompt change, and out of scope here.
- No owner-edited legacy prompt template migration — owners who have customized their prompt template keep their own wording; this only changes the shipped default template. (Matches existing precedent: `resolveAiPromptTemplate` already treats an owner-saved custom template as authoritative over the default.)
- No Firebase Functions deploy in this phase.
- No Playground-specific changes (the Playground already uses whatever prompt template is passed to it — no separate wiring needed).

---

## 4. Design Detail

### 4.1 Exact prompt diff

```diff
-Analyze the provided image and return only valid JSON.
+You are cataloging a DTF (direct-to-film) transfer design for an apparel print shop. These
+designs are printed onto shirts and similar garments. Judge the category, title, and tags by
+what the design is fundamentally about: its main subject, message, joke, buyer intent, occasion,
+role, or theme. Do not choose categories or tags only because of visual style, font choice,
+color palette, or decorative imagery. For example, lashes, lipstick, heels, or elegant script do
+not make a design Luxury & Fashion Inspired unless beauty, fashion, glam, or luxury is truly the
+subject. School supplies do not make a design School & Education unless school, teaching,
+students, or education is truly the subject. Religious-looking decoration does not make a design
+Faith & Inspirational unless faith, prayer, scripture, or inspiration is truly the subject.
+
+Analyze the provided image and return only valid JSON.

 Return:
 title: short natural searchable design title.
```

Rest of the template (field instructions, approved categories placeholder, rules, excluded tags, JSON shape) is unchanged.

### 4.2 Why one paragraph, not per-field rules

The miscategorization touched category (wrong), title (invented off-topic phrase), and tags (weak "fashion" tag) simultaneously — all symptoms of the same missing context, not independent bugs in three different instructions. A single upfront framing sentence fixes all three by changing what the model optimizes for from the first token of its reasoning, rather than requiring three separate patches (one per field) that could drift out of sync with each other over time.

### 4.3 Placement rationale

Placed as the very first thing the model reads, before "Analyze the provided image," so it's established context for the entire analysis — not a rule bolted onto the `Rules:` section after the model has already formed field-level judgments. This mirrors how `CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY` (the separate system-level prompt, unrelated to this template) already opens with role-setting framing before task instructions.

---

## 5. Files Touched (expected)

| File | Change |
|---|---|
| `shared/constants/aiEnrichment.constants.ts` | Add business-context paragraph to `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`. |
| `functions/src/ai/catalogTitleRules.ts` | Bump `CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-v21`, `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-dev-v21`. |
| `functions/src/ai/catalogTitleRules.test.ts` | Update hardcoded version-string assertion to `v21`. |
| `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` (new test) | Assert `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` includes the business-context framing (DTF/apparel mention) — new regression guard. |
| `docs/project/DECISIONS.md` | New ADR documenting the v21 prompt change and its rationale. |
| `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, `CURRENT-STATE.md` | Update prompt version references from v20 to v21, document the business-context addition. |
| `.cursor/workflow/state.md` | Track phase through signoff, kept separate from `suggested-tags-last-resort`/`ai-tag-rerank-second-call`. |

---

## 6. Acceptance Criteria

- [ ] `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` includes a business-context paragraph naming DTF/apparel printing and instructing subject-over-style judgment, placed before the field instructions.
- [ ] `CATALOG_ENRICHMENT_PROMPT_VERSION`/`DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` bumped to v21.
- [ ] All required placeholders (`{{excluded_tags}}`, `{{approved_category_names}}`) remain present and functional — verified by existing `hasRequiredAiEnrichmentPromptPlaceholders`/`promptParity.test.ts` coverage continuing to pass unmodified.
- [ ] A new test guards that the business-context sentence stays present in the shipped default template.
- [ ] No change to category resolution logic, tag resolution logic, the tag reranker, or suggestion authoring.
- [ ] Owner-edited custom prompt templates are unaffected (only the shipped default changes) — verified by existing legacy-template backward-compatibility test coverage continuing to pass unmodified.
- [ ] Lint, root typecheck, functions typecheck, functions build all pass.
- [ ] All `functions/src/ai/*.test.ts` and renderer settings-constants tests pass.
- [ ] No Firebase Functions deploy performed.

---

## 7. Testing Plan

- `npm run lint`
- `npx tsc --noEmit` (root and functions)
- `npm run build` (functions)
- `npx tsx --test functions/src/ai/catalogTitleRules.test.ts` (version bump)
- `npx tsx --test functions/src/ai/promptParity.test.ts` (placeholder/structure regression)
- `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` (new business-context regression test)
- Full `functions/src/ai/*.test.ts` sweep for regressions
- Full root build

Manual smoke (documented, not executed against production): re-run AI on the exact reported design ("Lashes longer than my Patience") once deployed, and confirm the category lands in a humor/quote-appropriate bucket rather than "Luxury & Fashion Inspired," and the title/tags no longer invent "Beauty Makeup Cosmetics"/weak "fashion." This can only be verified after deploy, so it is documented as a required post-deploy check, not a pre-deploy blocker.

---

## 8. Open Questions — All Resolved (2026-07-02)

1. ~~Exact wording~~ **Resolved (§3/§4.1):** final paragraph locked in, covering subject/message/buyer intent/occasion/role/theme as the judgment basis, with three worked examples (fashion/luxury, school/education, faith/inspirational) rather than only the single reported case.
2. ~~Scope: general vs. category-specific list~~ **Resolved:** generalized to a compact principle (subject/message/buyer intent over style/decoration) illustrated by three examples, explicitly not a growing enumerated list of category-specific rules.
3. ~~v21 confirmation~~ **Resolved:** confirmed — `catalog-enrich-v21`/`catalog-enrich-dev-v21`, independent of the tag-reranker and suggested-tags phases' own prompt version constants.
4. **New guardrail added by user:** this phase is prompt-only. No changes to `catalogThemeCategoryResolver.ts`, `catalogTagResolver.ts`, the tag reranker, suggestion authoring, category data, or tag data — already reflected as an explicit non-goal in §2.2/§3 "Out of scope," now additionally confirmed as a hard constraint for this phase rather than a default assumption.

Plan approved in direction; all open questions resolved by user decision on 2026-07-02. Implementation may proceed under the FreshForge gate.

---

## 9. Risks

- **Prompt-engineering risk**: a single sentence may not be strong enough to overcome the model's visual-association bias for genuinely style-heavy designs (e.g. a design that really is elegant/fashion-y but not literally about fashion). Mitigated by keeping the instruction concrete and example-anchored rather than abstract, and by this being cheap to iterate on (a prompt string, not a code architecture) if real-world results still show drift.
- **Cost**: negligible — a few dozen extra tokens on every first call, similar in scale to the `{{approved_category_names}}` addition in ADR-FP-041 (~0.8% cost increase), not the ~4.4x full-tag-injection cost that stays gated.
- **Scope creep temptation**: the user's broader ask ("other things that might blend by accident") could balloon into an exhaustive list of category-disambiguation rules. This plan deliberately keeps to one general principle (subject over style) rather than enumerating every possible confusion, on the theory that a good general rule generalizes better than a growing list of special cases — flagged as a design choice for review, not an oversight.

---

## 10. Future Expansion (not this phase)

- If the general "subject over style" framing doesn't sufficiently fix this class of error after real-world use, consider a resolver-side `HUMOR_PRIORITY`/sarcasm buyer-intent family (mirroring `FAMILY_PRIORITY`/`FAITH_PRIORITY`/`TEACHER_PRIORITY` in `catalogThemeCategoryResolver.ts`) as a server-side backstop, independent of prompt wording.
- Consider whether "Luxury & Fashion Inspired" as a category name itself invites this confusion (the word "Inspired" suggests style-adjacent designs qualify) — a Tag/Category Management naming/description review, not an AI-prompt fix.
