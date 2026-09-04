# Plan: Category descriptions in AI classification context

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related | Formal Review (same date); ADR-FP-041 (names-only precedent) |
| Prompt today | `catalog-enrich-v33` |
| Proposed next | `catalog-enrich-v34` |
| Normalizer | `smart-profile-normalizer-v6` (unchanged) |
| Schema | `smart-profile-v1` (unchanged) |

---

## Goal

Let the primary Gemini catalog-enrichment call receive **current active category names and their owner-written Firestore descriptions** when choosing the primary category, so the model can use buyer-intent definitions instead of names alone — without injecting tag taxonomy and without hardcoding category text into source.

## Background

Owner-refined taxonomy descriptions encode distinctions that names alone cannot carry (Faith & Worship vs Inspirational Quotes & Affirmations; Music & Bands vs Pop Culture & Characters). Prior calibration (ADR-FP-041) intentionally injected **names only**; descriptions already participate in the **server** `catalogThemeCategoryResolver` token path, but not in the model prompt.

Repo verification (2026-09-04):

- Default template uses `{{approved_category_names}}` only.
- Helper `formatCategoryContext` already supports `{{approved_categories}}` as `- Name — Description` (whitespace-collapsed).
- Live snapshot categories already include optional `description`.
- Descriptions are **not** sent to Gemini under the shipped default.

## Scope

### In Scope

- Switch (or dual-support) primary enrichment prompt to inject **active category name + description** from materialized taxonomy / FS fallback.
- Prompt version bump to **catalog-enrich-v34**.
- Instruction text nudging: choose by dominant **buyer intent** using category descriptions; return exact approved name.
- Preserve revision-aware taxonomy cache freshness.
- Keep server category resolver (validate + dominant-intent safeguards).
- Settings AI Playground + all enrichment/reprocess path parity.
- Cost measurement documentation + A/B quality plan.
- Update required-placeholder contract if default moves off `{{approved_category_names}}`.

### Out of Scope

- Implementation in this plan/review pass (plan + formal review only until owner authorizes).
- Tag list / aliases / preferredWhen injection.
- Hardcoded category precedence tables.
- Auto-summarizing/rewriting owner descriptions.
- Editing category descriptions as part of this change.
- Autonomous / WS5 / tag retirement / production / commit/push.

---

## Verified current payload (v33)

| Question | Answer |
|----------|--------|
| Where loaded? | `loadAiCatalogReferenceSnapshot` → materialization corpus (preferred) or FS `categories` where `isActive==true`; exposed via `loadCachedActiveCategories` |
| Fields on each category | `id`, `name`, optional `description` (+ snapshot `categoryNames`, `categoryIdsByName`) |
| Inserted into prompt today? | **Names only** via `{{approved_category_names}}` → `formatCategoryNamesOnly` → newline list `- Name` |
| Descriptions to Gemini? | **NO** (default). Resolver still reads descriptions server-side |
| Active DEV count | **23** (materialization revision **16**, ready) |
| Delimiter | Newline-separated `- {name}` |
| Playground | Same `buildSimpleCatalogEnrichmentUserPrompt` |
| Shared path | Gemini provider + candidate core used by Processing, Ready reprocess jobs, AI Review rerun/`enqueueAiEnrichment`, Design Library `reprocessReadyDesignWithAi` |

### Current payload example (names-only fragment)

```text
Approved categories:
- Animals
- Astrology & Zodiac
- Awareness & Causes
…
- Faith & Worship
- Inspirational Quotes & Affirmations
- Music & Bands
…
```

### Proposed payload example (existing helper format)

```text
Approved categories:
- Faith & Worship — Use this category when the buyer intent is Christian faith…
- Inspirational Quotes & Affirmations — Use this category when the buyer intent is encouragement…
- Music & Bands — Use for designs centered on music, bands, singers…
```

(`formatCategoryContext` already collapses whitespace; no second AI rewrite.)

---

## Cost measurement (live DEV taxonomy + repo pricing)

**Method**

- Live category text from `taxonomyMaterialization/chunk-0` (revision 16, 23 categories, **0** missing descriptions).
- Names-only / names+descriptions character counts; token estimate **chars÷4** (repo has no Gemini tokenizer; mark as estimate).
- Live enrichment `promptTokens` baseline from 30 Ready designs: **3385** every sample (`gemini-2.5-flash-lite`).
- Pricing from `VISION_MODEL_PRICING_USD_PER_1M` in `packages/shared/src/constants/aiEnrichment.constants.ts`: input **$0.10** / 1M, output **$0.40** / 1M.

| Variant | Chars | Est. tokens (÷4) |
|---------|------:|-----------------:|
| A. Names only | 432 | ~108 |
| B. Names + full descriptions (`—`) | 17,390 | ~4,348 |
| C. Same + whitespace normalize only | ≈ B (helper already collapses whitespace) | ≈ B |
| **Delta B−A** | **+16,958** | **~+4,240** |

| Cost impact (est.) | Value |
|--------------------|------:|
| Live current promptTokens | 3385 |
| Est. new promptTokens | ~7625 |
| **Input token increase** | **~+125%** |
| Delta input $/design | **~$0.000424** |
| Est. total $/design today (3385 in + ~480 out) | ~$0.000531 |
| Est. total $/design with descriptions | ~$0.000955 |
| **Total call cost increase** | **~+80%** |
| Delta / 100 designs | ~$0.042 |
| Delta / 1,000 designs | ~$0.42 |

**Interpretation:** Unlike ADR-FP-041 (+0.8% for names), full owner descriptions are **material**. Image tokens do **not** dominate enough to make this “free” — descriptions alone would roughly **double input tokens** on the measured baseline. Still far cheaper than historical full **tag** injection (~4.4×).

**[NEEDS OWNER DECISION]** before implement: accept ~+80% primary-vision call cost for description context, or defer / seek a narrower alternative (not auto-summarizing descriptions without explicit authorization).

---

## Architecture

```
Owner edits category description in Studio
  → taxonomy materialization revision bumps
  → loadAiCatalogReferenceSnapshot peekRevision invalidates process cache
  → next enrichment loads current categories[{id,name,description}]
  → prompt substitutes {{approved_categories}} (proposed)
  → Gemini proposes exact category name
  → catalogThemeCategoryResolver validates / dominant-intent safeguards
  → persist trusted category
```

### Authoritative source

Live Firestore taxonomy via **materialization** (revision-aware), FS active-categories fallback. **Do not** hardcode descriptions in prompt source.

### Freshness

Existing revision peek within TTL — no mandatory 15-minute wait when materialization revision advances. TTL remains secondary safety.

### Resolver

**Keep.** Descriptions in the model call are classification context, not license to invent categories.

### Prompt / normalizer / schema

| Field | Action |
|-------|--------|
| Prompt | **Bump to catalog-enrich-v34** |
| Normalizer | **Keep v6** |
| Schema | **Keep smart-profile-v1** |

If implement discovers normalizer/schema must change → **STOP [NEEDS OWNER DECISION]**.

### Path parity

All of: Settings Playground, AI Processing / enqueue, catalog Ready/AI Review reprocess worker, Design Library Reprocess with AI — share provider + `buildSimpleCatalogEnrichmentUserPrompt`. One template/placeholder change covers them when settings resolve to default/auto-upgraded template.

---

## Affected Areas

### Files / Modules (expected on implement)

- `packages/shared/src/constants/aiEnrichment.constants.ts` — default template, required placeholders, previous-default chain, auto-upgrade
- `packages/shared/src/constants/smartProfile.constants.ts` — `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` if coupled
- `functions/src/ai/catalogTitleRules.ts` — `CATALOG_ENRICHMENT_PROMPT_VERSION`
- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` — already has helpers; may only need tests / required-placeholder alignment
- Tests: prompt parity, constants, playground contracts
- ADR in `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: Prompt contract change only; taxonomy remains authoritative; no new modules.

### Security Impact

- [x] None material — categories already staff-owned; no new secrets; do not log full prompt with PII beyond existing pipeline policy.

### Data Model Impact

- [x] None — uses existing category `description` field.

### Backend Impact

- [x] Details: Functions prompt/version constants; DEV Functions deploy of enrichment entrypoints after implement (separate auth).

### UI / UX Impact

- [x] None required for MVP (optional Settings copy that descriptions are now in enrichment context).

### Migration Impact

- [x] None. Saved Studio prompts that are previous-defaults auto-upgrade; custom owner prompts must include the chosen placeholder(s) per required-placeholder rules.

---

## Implementation approach (when authorized)

1. Change default template `Approved categories:` block to `{{approved_categories}}` (or keep names placeholder unused and require categories).
2. Add lean instruction: choose the approved category whose **description** best matches dominant buyer intent; return exact name.
3. Update `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` accordingly (likely require `{{approved_categories}}`; decide whether to keep `{{approved_category_names}}` optional for legacy).
4. Bump prompt version → **v34**; wire previous-default auto-upgrade from v33.
5. Do **not** change resolver algorithm for this feature.
6. Measure one Playground A/B with **API-reported** `promptTokens` to confirm chars÷4 estimate before broad Ready reprocess.
7. Run targeted A/B quality set (below).
8. Deploy only the Functions that ship the new prompt/provider bundle (inventory at implement time — do not broad-deploy).

---

## A/B quality plan

Same artwork, A = names-only (v33), B = names+descriptions (v34). Record proposed category + alternatives.

| # | Case | Expected (B) |
|---|------|--------------|
| 1 | Non-religious inspirational Dolly quote | Inspirational Quotes & Affirmations |
| 2 | Stephen Hawking motivational quote | Inspirational Quotes & Affirmations |
| 3 | Obvious scripture/cross | Faith & Worship |
| 4 | Obvious band/music | Music & Bands |
| 5 | Musician/celebrity Music vs Pop competitive | Judgment call; record both |
| 6 | Obvious non-music fandom | Pop Culture & Characters |
| 7 | Humorous animal | Protect current acceptable dominant-intent (Funny vs Animals) |
| 8 | Family golden | Family |
| 9 | Teacher/occupation golden | Occupations (or current golden label) |
| 10 | Cannabis golden | Cannabis & 420 |

Pass criteria: improve owner distinction cases **without** regressing goldens 7–10 beyond ADR-FP-163 tolerance.

---

## Human checkpoints

1. **Cost acceptance** — owner acknowledges ~+80% primary vision call cost (est.) before implement.
2. **Authorize Implement** after Formal Review.
3. **DEV deploy** after implement+test (separate).
4. Do **not** start WS5 / Autonomous from this workstream.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Cost higher than chars÷4 estimate | Confirm with one Playground token usage before bulk runs |
| Model overweights description keywords vs image | Keep resolver; A/B goldens; ADR-FP-163 |
| Custom saved prompts miss new placeholder | Required-placeholder validation + auto-upgrade previous defaults |
| Long descriptions crowd context | Accept owner full text (no silent rewrite); revisit only with owner auth |

## Rollback

Revert default template to `{{approved_category_names}}`, bump or revert version label per versioning policy, redeploy enrichment Functions. Taxonomy data unchanged.

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Documentation | Yes — plan/review/ADR |
| App code (on implement) | shared constants + Functions AI prompt path |

---

## Open questions → owner

1. Accept estimated **~+80%** primary enrichment call cost for full descriptions?
2. Authorize Implement after Formal Review?
3. Prefer requiring `{{approved_categories}}` only, or keep both placeholders with default using descriptions?

---

## Success criteria

- Gemini receives current active name+description from taxonomy (not hardcoded).
- Taxonomy edit → materialization revision → next enrichment sees new text without deploy.
- Resolver retained.
- Prompt **v34**; normalizer **v6**; schema **v1**.
- Cost + A/B documented; no tag injection; no WS5.
