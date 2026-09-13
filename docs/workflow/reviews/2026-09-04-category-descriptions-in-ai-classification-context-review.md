# Formal Review: Category descriptions in AI classification context

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-category-descriptions-in-ai-classification-context-plan.md` |
| Verdict | **approved_with_changes** |
| Runtime context | `catalog-enrich-v33` / `smart-profile-normalizer-v6` / `smart-profile-v1` · shadow · Autonomous OFF |
| Taxonomy | 23 active categories · materialization revision **16** · ready |

---

## Summary

Gemini currently receives **category names only**. The repo already loads descriptions into the enrichment snapshot and already has a `{{approved_categories}}` formatter (`- Name — Description`); the shipped default simply does not use it (ADR-FP-041). Injecting **full** live owner descriptions is architecturally sound and taxonomy-authoritative, but cost is **material (~+80% primary vision call, ~+125% input tokens)** — not the +0.8% names-only precedent. Implement is recommended **only after owner cost acceptance**, with A/B quality gate and prompt **v34**.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Categories only; no tags; no hardcoding |
| Architecture alignment | pass | Prompt context + keep resolver |
| Security impact addressed | pass | No new auth/secrets |
| Data model impact addressed | pass | Existing description field |
| Backend impact addressed | pass | Prompt/version/constants; deploy later |
| Test strategy adequate | pass | A/B matrix + token confirm + unit/contracts |
| Human checkpoints identified | pass | Cost + implement auth + later DEV deploy |
| Roadmap alignment | pass | Smart catalog quality; WS5 still blocked |
| Documentation plan | pass | ADR on implement |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Formal answers (required)

| # | Question | Answer |
|---|----------|--------|
| 1 | Descriptions currently sent to Gemini? | **NO** |
| 2 | Exact current category payload format | `Approved categories:\n` + newline list `- {name}` via `{{approved_category_names}}` → `formatCategoryNamesOnly` |
| 3 | Current active category count | **23** |
| 4 | Names-only size | **432 chars** · **~108 tokens** (chars÷4) |
| 5 | Names+descriptions size | **17,390 chars** · **~4,348 tokens** (chars÷4, `—` format) |
| 6 | Token delta | **~+4,240** est. input tokens |
| 7 | Estimated cost delta | **~$0.000424 / design** input @ `gemini-2.5-flash-lite` $0.10/1M (repo `VISION_MODEL_PRICING_USD_PER_1M`) |
| 8 | Cost / 100 designs | **~$0.042** delta |
| 9 | Cost / 1,000 designs | **~$0.42** delta |
| 10 | Full vs compact formatting | Use existing `formatCategoryContext` (whitespace-collapsed full owner text). Compact ≠ summarize. Do **not** auto-rewrite descriptions. Colon vs em dash: either; prefer existing helper (`—`) for consistency |
| 11 | Authoritative source | Taxonomy materialization corpus / FS active categories — **not** prompt source hardcoding |
| 12 | Category edit freshness | Revision peek invalidates process cache; next enrichment loads new revision — **no mandatory 15‑min wait** when revision advances |
| 13 | Prompt version required | **Yes → catalog-enrich-v34** |
| 14 | Normalizer change required | **NO** (remain v6) |
| 15 | Schema change required | **NO** (remain smart-profile-v1) |
| 16 | Resolver changes required | **NO** for MVP — keep validate + dominant-intent safeguards |
| 17 | Settings Playground parity | **YES** — same `buildSimpleCatalogEnrichmentUserPrompt` |
| 18 | Reprocess-path parity | **YES** — Processing / enqueue / catalog reprocess worker / Design Library Reprocess with AI share provider + prompt builder |
| 19 | A/B test design | Plan § A/B (10 cases: inspirational×2, faith, music, music-vs-pop, pop fandom, humor animal, family, teacher, cannabis) |
| 20 | Regression risks | Overweighting description keywords; cost surprise; custom prompts missing new required placeholder |
| 21 | Benefits justify implementation? | **Conditionally YES** — quality goal matches owner taxonomy work; cost is the gate |
| 22 | Formal Review verdict | **approved_with_changes** |
| 23 | [NEEDS OWNER DECISION] | **YES** — cost acceptance (~+80% call) before Implement; then authorize Implement |

### Live baseline (not guessed)

- 30 Ready designs on DEV: `promptTokens` **3385** every sample (`gemini-2.5-flash-lite`).
- Est. new prompt ≈ 3385 + 4240 = **~7625** → **~+125% input tokens**, **~+80% total call $** (holding ~480 completion tokens).
- Image+template already dominate names-only (~3% of current prompt); full descriptions would become a large share of the new prompt — **not** “materially small.”

Token counts for the category block itself are **chars÷4 estimates** (no Gemini tokenizer in repo). Pricing is from repo constants (client estimate table). Recommend one Playground measurement of API `promptTokens` during implement to confirm delta.

---

## Architecture Review

**Findings:**

- Correct principle: owner taxonomy is source of truth; inject live descriptions; do not hardcode Faith/Inspirational/Music text into constants.
- Infrastructure largely exists: `AiEnrichmentCategoryOption.description`, snapshot categories, `formatCategoryContext`, `{{approved_categories}}`.
- Default + required placeholders still center on `{{approved_category_names}}` per ADR-FP-041 — intentional cost gate, now revisited with measured description cost.
- Resolver already uses descriptions for token overlap; keeping it is correct defense-in-depth.

**Required changes (on implement):**

- [ ] Default template uses `{{approved_categories}}` (or equivalent) with buyer-intent instruction.
- [ ] Update required-placeholder set + previous-default auto-upgrade chain v33→v34.
- [ ] Bump `CATALOG_ENRICHMENT_PROMPT_VERSION` / `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` to **v34**.
- [ ] ADR documenting cost tradeoff vs ADR-FP-041.
- [ ] Do **not** inject tags.

---

## Security Review

**Findings:** No new endpoints or permission model. Category text is staff-authored.

**Required changes:** None.

**Human approval needed before production:** Yes (later production deploy of Functions — not this pass).

---

## Cost Review (required)

| Variant | Recommendation |
|---------|----------------|
| A Names only | Current production contract |
| B Names + full descriptions | **Recommended target** if owner accepts cost |
| C Whitespace-normalized full text | **Same as B** via existing helper — prefer this; do not invent a third summarizer |

Compared to tag injection (~4.4× historical): description injection is large vs names-only but still in a different cost class than full tag corpus.

---

## Test strategy adequacy

Pass. Require on implement:

1. Unit/contract: placeholder substitution includes descriptions; required placeholders; version v34.
2. One Playground A vs B token measurement (API usage).
3. Owner/agent A/B quality on the 10-case matrix before declaring taxonomy description benefit proven.
4. Confirm materialization revision bump → next enrichment sees new description (cache revision path already tested historically).

---

## Required changes before Implement

1. Owner replies accepting cost envelope (or rejects / asks for alternative).
2. Owner authorizes Implement explicitly.
3. Implement must not summarize descriptions unless newly authorized.
4. Do not start WS5 / enable Autonomous.
5. Do not close WS4 (Faith/Music regression still pending; Inspirational retests noted pass-with-notes disposition retained).

---

## WS4 / WS5

| Stream | Status |
|--------|--------|
| WS4 | **PASS WITH NOTES** — keep open; Inspirational #5/#6/#15 retests may pass; Faith/Music taxonomy validation still pending |
| WS5 | **BLOCKED** |

---

## Verdict

**approved_with_changes** — plan is sound and measured. Implementation is **recommended after owner cost acceptance**, not blocked on architecture. No implementation in this pass.
