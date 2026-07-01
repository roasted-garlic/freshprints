# Plan — Lean Vision Prompt + Server-Side Taxonomy Resolution

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `ai-lean-vision-prompt-server-taxonomy-resolution`
- **Roadmap phase:** Phase 5 AI Processing maintenance, supporting the current Phase 6 accepted baseline
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a human checkpoint after approval and testing. No deploy is performed in this phase.
- **Supersedes (prompt-size direction only):** ADR-FP-038. Keeps ADR-FP-037 (global approved tag library, tag resolver, `suggestedNewTags`) and ADR-FP-035/036 (single playground-style call, no `response_format: json_object`, tolerant JSON extraction) fully intact.
- **Review round 1 notes (addressed below, implementation still blocked):** see §4.1 (note 5), §4.2 (note 2), §4.3 (notes 1 and 3), §4.5.1 (note 4), and updated acceptance criteria / test list for all five review notes on category persistence, the Humorous-Quotes-with-family-tags failure case, buyer-intent override strength, safe suggested-tag normalization, and prompt-template backward compatibility.

---

## 1. Goal

Replace the current large taxonomy-aware vision prompt (full approved category list with descriptions, full approved tag list with aliases and preferred-when guidance, injected on every call) with a small, fixed-size, vision-only prompt. Move all taxonomy resolution — approved tag matching, `suggestedNewTags` generation, and category selection — to deterministic server-side code that runs after the model call, using the app's existing approved categories and approved tags data.

This directly addresses the reported high input-token cost: today's prompt scales with the size of the approved tag/category libraries; the new prompt is a small fixed size regardless of library size.

---

## 2. Current State (verified in code)

### 2.1 What already matches the target architecture (no change needed)

- **`functions/src/ai/catalogTagResolver.ts`** (`resolveAiCatalogTags`) already does almost exactly what the task wants:
  - Normalizes candidates (trim/lowercase/whitespace collapse) and a punctuation-tolerant alias form (`normalizeForAliasMatch`: `&`→"and", hyphens/apostrophes→spaces).
  - Matches full-string exact name/alias, then punctuation-tolerant alias, then per-word tokenization of multi-word candidates.
  - Emits `suggestedNewTags` only for candidates (or model-suggested tags) that don't match any approved name/alias, including an n-gram scan of `preferredWhen`/`reason` text to avoid duplicate suggestions.
  - Caps and dedupes.
  - It is already wired into `aiEnrichmentPipeline.ts:202-209`, called with `result.analysis.rawTags ?? suggestions.tags`.
- **`shared/types/catalogTag.types.ts`** already defines `CatalogTag { name, aliases, preferredWhen, status }` and `SuggestedNewTag { name, aliases, preferredWhen, reason, source }` — matches the target shape exactly. No type changes needed here.
- Tag exclusions (`aiTagExclusions.ts`, `BASE_AI_TAG_EXCLUSIONS`) already apply after normalization and are reused as-is.
- 8-tag cap, dedup, lowercase already enforced in `normalizeAiTags` (`catalogTitleRules.ts`) and reinforced by the resolver's `maxApprovedTags`.

### 2.2 What must change

1. **Prompt** (`shared/constants/aiEnrichment.constants.ts:94-142` `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, plus `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`): currently injects `{{approved_categories}}` (every active category name + description) and `{{approved_tags}}` (every approved tag name + aliases + preferredWhen) into every request. This is the token cost driver and must be replaced by a small, fixed vision-only prompt with no taxonomy placeholders.
2. **Category resolution** (`functions/src/ai/simpleCatalogEnrichmentResponse.ts:240-261` `resolveLeanCatalogCategory`): currently an **exact case-insensitive string match only** against the model's raw category candidate. This only works today because the model is handed the exact approved category list. Once the prompt no longer contains that list, the model's raw category is a freeform guess (e.g. "Motherhood / Family Humor") that will almost never exact-match an approved name. This function must become a real taxonomy-aware resolver: score approved categories using the raw candidate, title, description, visible text (if any), matched approved tags, and approved category descriptions — with explicit priority rules so theme/buyer-intent categories (Family, Faith, Teacher/Education) outrank generic art-style/character categories (Pop Culture & Characters) and outrank a bare "Humorous Quotes" match.
3. **Response parsing** (`functions/src/ai/simpleCatalogEnrichmentResponse.ts` `normalizeSimpleCatalogEnrichment`): the raw `category` field becomes an unconstrained free-text theme string from the model rather than a value expected to match the approved list. Parsing/validation must treat it as a raw candidate string, not a final value.
4. **Existing rich resolver reuse**: `functions/src/ai/catalogCategoryResolver.ts` (`resolveCatalogCategory`) already contains keyword-overlap scoring (theme/visibleText/subject vs. category name tokens) but is not wired into the live v17 lean path (superseded intentionally per code comments, because the old rich schema starved it of real signal). We will **not** resurrect this exact function as-is; we will write a new, purpose-built resolver (see §4.3) that scores against approved **category descriptions** (not just category name tokens) plus title/description/matched-tags, and encodes the explicit priority rules the task requires. The old `catalogCategoryResolver.ts` stays untouched and unused by the new lean path (existing tests for it keep passing since we don't modify it).

### 2.3 Prompt versioning

Current: `OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-openai-v17"` (`catalogTitleRules.ts:27`), dev variant `catalog-enrich-dev-v17`. Per repo convention this is a manual bump. This phase bumps to **v18** (`catalog-enrich-openai-v18` / `catalog-enrich-dev-v18`) since the prompt contract and category semantics change materially.

---

## 3. Scope

### In scope

- Replace `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` with a small, fixed vision-only prompt (adapted from the prompt supplied in the task) that asks only for `title`, `description`, `category` (freeform theme string), and `tags` (up to 12 raw candidates, phrases allowed).
- Remove the `{{approved_categories}}` and `{{approved_tags}}` placeholders and their required-placeholder validation (`AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS`, `hasRequiredAiEnrichmentPromptPlaceholders`) from the production prompt contract. Keep `{{excluded_tags}}` — exclusions are still small/fixed-size and useful to the model (e.g. steering away from "skull"/"death" toward "spooky"/"funny").
- Update `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` so the shipped default template no longer references `{{approved_categories}}`/`{{approved_tags}}`. Per review note 5, **keep** `formatCategoryContext`/`formatTagContext` in place (not removed) so any owner-edited legacy template that still contains those placeholders continues to substitute correctly instead of breaking — they simply go unused by the new default template.
- Update the Settings prompt-template validation (wherever `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` is enforced for owner-edited templates) to require only `{{excluded_tags}}`.
- Add a new pure server-side category resolver function (new file `functions/src/ai/catalogThemeCategoryResolver.ts` or extend `simpleCatalogEnrichmentResponse.ts` — final naming decided during implementation, see §4.3) that:
  - Takes the raw model category string, title, description, matched approved tag names, and the full approved category list (`{ id, name, description }`).
  - Scores each approved category using token overlap against its own name + description vs. tokens from (raw category, title, description, matched tags), with weighted priority boosts for theme/buyer-intent keyword families (motherhood/mom/parenting/family/dad/fatherhood → Family; faith terms → Faith; teacher/school/education terms → Teacher/Education) that outweigh generic art-style signals (skeleton/skull/cartoon/mascot/illustrated-person alone) and outweigh a bare "quote" match unless humor is the dominant signal.
  - Returns `{ categoryName?, categoryId? }`, undefined when no category clears a minimum confidence threshold (staff sets it manually in AI Review, same fallback behavior as today).
- Update `normalizeSimpleCatalogEnrichment` / `buildSimpleCatalogEnrichmentResult` in `simpleCatalogEnrichmentResponse.ts` to call the new resolver instead of `resolveLeanCatalogCategory`, passing matched approved tags (post `resolveAiCatalogTags`) as an input signal. This requires re-ordering: category resolution must happen **after** tag resolution in the pipeline (currently category resolution happens inside `buildSimpleCatalogEnrichmentResult`, before the pipeline's tag-resolution step at `aiEnrichmentPipeline.ts:202`). See §4.4 for the exact re-sequencing.
- Bump prompt version to `catalog-enrich-openai-v18` / `catalog-enrich-dev-v18` in `catalogTitleRules.ts`.
- Update `functions/src/ai/providers/developmentAiEnrichmentProvider.ts` only as needed to keep it consistent with the new prompt version constant (it does not call the model, so no prompt text changes there beyond the version string it already reads from the shared constant).
- Add/update unit tests:
  - New tests for the category resolver covering: skeleton-motherhood sample resolves to Family (not Pop Culture & Characters); Faith terms prefer Faith; Teacher/school terms prefer Teacher/Education; bare "quote" does not force Humorous Quotes without humor as dominant intent; illustrated/cartoon/mascot alone does not force Pop Culture & Characters.
  - Update `promptParity.test.ts` to assert the new small prompt still has parity between playground and AI Processing, and no longer asserts presence of full category/tag injection.
  - Update `simpleCatalogEnrichmentResponse.test.ts` `resolveLeanCatalogCategory` tests — replace with tests for the new resolver's exported function name and richer input shape.
  - Update `catalogTagResolver.test.ts` only if the raw-candidate contract changes (expected: no change, since `rawTags` already flows into it unchanged).
- Update `docs/project/DECISIONS.md` with a new ADR (ADR-FP-039) documenting this change and its relationship to ADR-FP-037/038.
- Update `docs/architecture/*` / `project-chatgpt-handoff/07-backend-and-ai-pipeline.md` prompt version references from v17 to v18 (docs-sync, since coding standards require docs to stay in sync with behavior changes).

### Out of scope

- No AI Review UI changes.
- No changes to Imports, Design Library, Print Requests, or Print Runs.
- No additional model call for taxonomy matching — category and tag resolution stay deterministic, in-process, single-pass.
- No embeddings.
- No automatic category creation from AI output.
- No persistence of raw tag candidates as final design tags (only `aiSuggestions.tags` — approved names only — is persisted; `rawTags` remains a transient resolver input, deleted before Firestore write, same as today).
- No changes to `catalogCategoryResolver.ts` (the older rich resolver) — left as dead code for a possible future cleanup, not touched here to avoid scope creep and avoid breaking its existing passing tests.
- No Firebase Functions deploy. Deploy remains a human checkpoint after this phase's plan is approved, implemented, and tested.
- No changes to model/reasoning-effort allowlists, settings persistence, or the Settings AI Playground UI beyond the shared prompt template/version it reads.

---

## 4. Design Detail

### 4.1 New prompt (adapted from task spec, kept compact)

Replaces `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` in `shared/constants/aiEnrichment.constants.ts`. Exact text finalized during implementation but will follow this shape:

```
Analyze the provided image and return only valid JSON.

Return:
title: short natural searchable design title.
description: clear 1 to 2 sentence description of the design, including all readable text exactly as it appears, plus style, colors, and main visual elements.
category: one broad reusable category or theme for the design.
tags: up to 12 searchable tag candidates.

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

Only `{{excluded_tags}}` remains as a placeholder. `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` shrinks to `[AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER]`. Owner-edited Settings prompt templates are still supported — validation just no longer requires the two removed placeholders. If an existing saved custom template still contains `{{approved_categories}}`/`{{approved_tags}}`, `buildSimpleCatalogEnrichmentUserPrompt` will still substitute them (backward compatible, harmless) but the shipped default no longer does.

**Review note 5 — backward-compatibility test for legacy placeholders in owner-edited templates.** Add a test to `simpleCatalogEnrichmentPrompt.test.ts` (existing file if present, otherwise a new focused test alongside `promptParity.test.ts`) that builds the user prompt from a template string containing `{{approved_categories}}` and/or `{{approved_tags}}` (simulating an owner-saved template from before this phase) plus `{{excluded_tags}}`, and asserts:

- The build succeeds without throwing.
- The placeholders are still substituted with the formatted category/tag context (using the existing `formatCategoryContext`/`formatTagContext` helpers, kept in the codebase specifically to serve this legacy path even though the shipped default template no longer references them).
- No regression: an owner who saved a custom v17-style template before this phase continues to get a working (if larger/costlier) prompt after deploy, rather than a broken one with literal unreplaced `{{approved_categories}}` text sent to the model.

### 4.2 Response contract change

`raw.category` is no longer expected to equal an approved category name. `normalizeSimpleCatalogEnrichment` keeps requiring it as a non-empty string (same validation as today) but documentation/comments update to reflect it's a **raw theme candidate**, not a final value. `raw.tags` continues to allow short phrases (already true today — `normalizeRawAiTags` preserves phrases, `normalizeAiTags` tokenizes for the fallback single-word list). No change needed to `suggestedNewTags` input parsing since the model no longer computes those (see §4.5) — the model can still emit them optionally, but the primary generation path becomes 100% server-side per the task's design ("Add suggestedNewTags only for useful raw candidates" is already `catalogTagResolver`'s job).

**Review note 2 — raw category is transient input only, never a persisted fallback value.** The raw model category string flows through `parsed.category` → `buildSimpleCatalogEnrichmentResult` → the pipeline's `resolveThemeCategory` call purely as a *scoring signal*, the same way `title`/`description`/`visibleText`/`matchedTags` are signals. It is never written to `aiSuggestions.categoryName`/`categoryId` directly, and there is no code path that falls back to "persist the raw string if no approved category scores high enough." Concretely:

- `buildSimpleCatalogEnrichmentResult` sets `suggestions.categoryName` to the **raw candidate** only as a transient carrier value passed to the pipeline step (see §4.4) — it is explicitly not the final value at that point in the flow, and the field is documented as such in a comment at the assignment site.
- The pipeline's `resolveThemeCategory` call is the single point that decides the *final* `categoryName`/`categoryId`. If no approved category clears the minimum score threshold, the pipeline sets `suggestions.categoryName = undefined` and `suggestions.categoryId = undefined` — it does **not** leave the raw model string in place. This is a behavior change from a hypothetical "leave whatever's there" default and will be covered by a unit/integration test asserting that a low-confidence resolution clears both fields rather than leaking the raw candidate into Firestore.
- AI Review's existing "staff sets category manually when undefined" UX is unchanged — this is the same fallback shape as today, just reached via a scoring failure instead of an exact-match failure.

### 4.3 New category resolver

New pure function, e.g. `resolveThemeCategory(input, categoryIdsByName)` in a new file `functions/src/ai/catalogThemeCategoryResolver.ts`:

```ts
interface ResolveThemeCategoryInput {
  rawCategory?: string;
  title: string;
  description: string;
  visibleText?: string[];
  matchedTags: string[];
  approvedCategories: { id: string; name: string; description?: string }[];
}
interface ResolveThemeCategoryResult {
  categoryName?: string;
  categoryId?: string;
}
```

Algorithm:
1. Build a combined signal-token set from `rawCategory`, `title`, `description`, `visibleText`, and `matchedTags` (reuse `normalizeComparableTitle` tokenization from `catalogTitleRules.ts` for consistency with existing stopword/normalization behavior).
2. For each approved category, tokenize its `name` + `description` and score overlap with the signal tokens (base weight per matched token, similar to existing `scoreCategoryMatch` pattern in `catalogCategoryResolver.ts` — reused as inspiration, not imported, since inputs differ).
3. Apply priority keyword families as score boosts, not hard overrides, so behavior stays data-driven (works whether or not the exact category names in the task's examples exist in a given install):
   - Family/parenting/motherhood/fatherhood keyword hits add a large boost to any approved category whose name/description matches "family" or similar parenting/relationship theme language.
   - Faith/religious keyword hits add a large boost toward an approved "Faith" category.
   - Teacher/school/education keyword hits add a large boost toward an approved "Teacher"/"Education" category.
   - Generic art-style-only signals (skeleton, skull, cartoon, mascot, illustrated character) **do not** by themselves add any boost toward a "Pop Culture & Characters"-style category — they only count toward it if combined with an actual character/franchise/brand name signal (i.e. remove art-style tokens from contributing score to that category family, or weight them at zero for it specifically). This is implemented as a small denylist of "style-only" tokens that are excluded from scoring against categories whose name/description matches "pop culture" / "character" language.
   - A bare "quote" token does not by itself add score toward a category matching "humor"/"humorous quotes" language unless a separate humor/funny/joke signal is also present among the tokens.
4. Pick the highest-scoring category; require a minimum score threshold (mirrors existing `MIN_REMAP_SCORE` pattern) to avoid forcing a weak/wrong category; return `{}` (undefined) below threshold, same as today's "leave it for staff" behavior.
5. Deterministic and pure — no I/O, no model call, easily unit tested with the skeleton-motherhood example from the task spec as a golden test case.

This keeps category creation impossible (only picks from `approvedCategories`), keeps behavior data-driven off real category descriptions (so it adapts if categories are renamed) while still encoding the specific buyer-intent priority the task calls out.

**Review note 3 — the resolver must be able to override the raw model category outright, not just outscore it at the margin.** The family/faith/teacher priority boosts (step 3 above) apply as additive score contributions against **every** approved category's total, including whatever category the raw model candidate names. This means a raw category of `"Humorous Quotes"` or `"Pop Culture & Characters"` carries no special weight or default-winner status in the scoring loop — it is just one more approved category competing on the same token-overlap + priority-boost basis as all the others. When motherhood/mom/parenting/family tokens are present (from tags, title, or description), the boost applied to an approved "Family"-type category is large enough to clear and exceed a Pop-Culture/Humor category's score even when that raw candidate is what the model returned, because art-style tokens (skeleton, cartoon) are explicitly zero-weighted toward Pop Culture (per the denylist in step 3) and a bare "quote" token is zero-weighted toward Humor without a co-occurring humor/funny/joke signal. This is not a hardcoded string override of "if raw category is Humorous Quotes, force Family" — it is a natural consequence of scoring all categories equally and boosting the correct one strongly enough. Verified directly by the review note 1 test case below.

**Review note 1 — golden regression test for the exact reported failure shape.** Add a dedicated test case to `catalogThemeCategoryResolver.test.ts`:

- Input: `rawCategory: "Humorous Quotes"`, `title` containing "Motherhood Rocks", `description` containing the rock-on/motherhood quote text from the task's worked example, `matchedTags: ["motherhood", "skeleton", "quote", "funny", ...]`, `approvedCategories` including both a `Family` category and a `Humorous Quotes`/`Pop Culture & Characters` category.
- Expected: `categoryName` resolves to `Family` (or the closest available motherhound/family-themed approved category), not `Humorous Quotes` and not `Pop Culture & Characters`, despite the raw model candidate literally being `"Humorous Quotes"` and `"skeleton"` being present among matched tags.
- This is listed explicitly as its own acceptance-criteria line (not folded into the general skeleton-motherhood case) because it is the literal real-world failure this task exists to fix — the model returning a plausible-sounding but wrong freeform category string that must not survive server-side resolution.

### 4.4 Pipeline re-sequencing

Today: `buildSimpleCatalogEnrichmentResult` (inside the provider response path) resolves category **before** the pipeline's tag resolution step. The new design needs matched approved tags as a category-scoring input, so category resolution must move **after** tag resolution.

Planned sequencing change in `aiEnrichmentPipeline.ts`:
1. Provider returns raw suggestions/analysis with `categoryName` left as the **raw candidate string** (not resolved) and `tags`/`rawTags` as today.
2. Pipeline resolves tags via `resolveAiCatalogTags` (unchanged call, `aiEnrichmentPipeline.ts:202-209`).
3. Pipeline then calls the new `resolveThemeCategory` using the raw category candidate + title + description + `result.analysis.visibleText` + the just-resolved `suggestions.tags`, and sets `suggestions.categoryId`/`categoryName` from that result (replacing the current `buildSimpleCatalogEnrichmentResult`-internal resolution and the existing `if (suggestions.categoryName && !suggestions.categoryId)` id-backfill block at `aiEnrichmentPipeline.ts:194-197`, which becomes unnecessary).
4. `buildSimpleCatalogEnrichmentResult` in `simpleCatalogEnrichmentResponse.ts` stops calling `resolveLeanCatalogCategory` entirely; it passes through the raw category string on `suggestions.categoryName` for the pipeline to resolve, with `categoryId` left undefined until the pipeline step runs.

This is a real control-flow change but stays within `functions/src/ai/` and does not change the public Cloud Function contracts (`enqueueAiEnrichment`, `updateAiEnrichmentSettings`, `testAiEnrichmentPlayground`) or Firestore write shape (`aiSuggestions` fields are unchanged).

### 4.5 suggestedNewTags generation stays server-only

Per the task's design goal ("Generate suggestedNewTags server-side only for useful unmatched candidates"), and since `catalogTagResolver.resolveAiCatalogTags` already builds `suggestedNewTags` from unmatched candidates today, we simplify the prompt to **not ask the model for `suggestedNewTags` at all** (removed from the JSON contract in §4.1). `normalizeSuggestedNewTags` parsing of `raw.suggestedNewTags` in `simpleCatalogEnrichmentResponse.ts` can be left in place defensively (tolerant of a model that still includes the field) but the pipeline's own `resolveAiCatalogTags` call already treats `suggestions.suggestedNewTags` as informational context (via the n-gram dedupe check) and is fully capable of generating the field from scratch when the model returns none. Net effect: `catalogTagResolver.ts` becomes the single source of truth for `suggestedNewTags`, matching the task's intent exactly.

### 4.5.1 Review note 4 — safe normalization for server-generated suggestedNewTags names/aliases

Since `suggestedNewTags` generation is now fully server-side (§4.5), the existing `catalogTagResolver.ts` logic that builds suggestions from unmatched raw candidates must guarantee that any suggested `name` is a **clean, single-word, reusable tag** — never a raw multi-word phrase leaked straight through. Concretely, for a raw candidate like `"messy bun"`:

1. First, `resolveAiCatalogTags` attempts alias/name matching (exact, punctuation-tolerant, then per-word tokenization) exactly as it does today — if `"messy bun"` matches an approved alias (e.g. an approved tag `hair` with alias `messy bun`), it resolves to the approved tag name and is never considered for `suggestedNewTags` at all. This part is unchanged.
2. If unmatched, before adding it to `suggestedNewTags`, the resolver must normalize the candidate name into single-word form using the same tokenization approach `normalizeAiTags`/`catalogTitleRules.ts` already uses for approved tags (split on non-alphanumeric, drop stopwords, take the most meaningful remaining token, or reject if no safe single-word reduction exists).
3. If a raw multi-word candidate cannot be safely reduced to one clean reusable word (e.g. it would collapse to a stopword, an empty string, or a word that already duplicates an approved tag name after normalization), it is **dropped** rather than suggested — this matches the existing `isSingleWordTagName` guard already present in `simpleCatalogEnrichmentResponse.ts` (`normalizeSuggestedTagName`/`isSingleWordTagName`), which is reused/ported into `catalogTagResolver.ts`'s own suggestion-building path so the same single-word/length/character rules apply regardless of whether the suggestion originated from the model or purely from server-side candidate normalization.
4. Suggested `aliases` for a newly suggested tag also pass through the same safe-alias normalization already used for approved tag aliases (trim, lowercase, collapse whitespace, drop duplicates of the name itself, length cap) so a suggested tag can carry phrase-form aliases (aliases are allowed to be phrases; only the tag `name` itself must be single-word) without letting malformed input through.
5. New unit test in `catalogTagResolver.test.ts`: a raw candidate `"messy bun"` with no approved alias match produces either (a) a suggested tag with a clean single-word `name` such as `"bun"` or `"messybun"`-style safe reduction with `"messy bun"` retained as an alias, or (b) no suggestion at all if no safe single-word reduction exists — but never a suggestion whose `name` field itself contains a space or fails `isSingleWordTagName`.

### 4.6 Firestore/data model impact

None. No new fields on `designs`, `settings/aiEnrichment`, `categories`, or `tags`. No migration. `DesignAiSuggestions`/`DesignAiAnalysis` shapes (`shared/types/ai/aiProcessing.types.ts`) are unchanged.

### 4.7 Security impact

None. No new secrets, no new external calls, no rules changes. OpenAI/Gemini calls remain inside Cloud Functions only.

---

## 5. Files Touched (expected)

| File | Change |
|---|---|
| `shared/constants/aiEnrichment.constants.ts` | Replace `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`; shrink `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` to just excluded-tags. |
| `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` | Default template no longer references `{{approved_categories}}`/`{{approved_tags}}`; `formatCategoryContext`/`formatTagContext` kept (not removed) for legacy owner-edited template backward compatibility (review note 5). |
| `functions/src/ai/simpleCatalogEnrichmentPrompt.test.ts` (new or existing) | Backward-compatibility test: legacy template with old placeholders still builds and substitutes correctly (review note 5). |
| `functions/src/ai/catalogTagResolver.ts` | Add safe single-word normalization/rejection guard for server-generated `suggestedNewTags` names, reusing `isSingleWordTagName`-style validation (review note 4). |
| `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | `resolveLeanCatalogCategory` removed from the result-building path; `buildSimpleCatalogEnrichmentResult` passes through raw category candidate; comments updated. |
| `functions/src/ai/catalogThemeCategoryResolver.ts` (new) | New deterministic theme/category resolver + priority rules. |
| `functions/src/ai/catalogThemeCategoryResolver.test.ts` (new) | Unit tests incl. skeleton-motherhood golden case, Faith, Teacher/Education, quote-alone, pop-culture-alone negative cases. |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Re-sequence: resolve tags first, then resolve category using resolved tags; remove now-redundant id-backfill block. |
| `functions/src/ai/catalogTitleRules.ts` | Bump `OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION` to v18 (and dev v18). |
| `functions/src/ai/promptParity.test.ts` | Update assertions for the smaller prompt; remove assertions about full taxonomy injection. |
| `functions/src/ai/simpleCatalogEnrichmentResponse.test.ts` | Remove/replace `resolveLeanCatalogCategory` tests. |
| `functions/src/ai/aiEnrichmentPlayground.ts` / tests | No behavior change expected beyond shared prompt builder; verify playground still shares the same builder (parity preserved). |
| `docs/project/DECISIONS.md` | Add ADR-FP-039. |
| `docs/architecture/*`, `project-chatgpt-handoff/07-backend-and-ai-pipeline.md` | Update prompt version references v17 → v18 and pipeline description of category resolution timing. |
| `.cursor/workflow/state.md` | Track phase through signoff. |
| `docs/workflow/reviews/2026-07-01-ai-lean-vision-prompt-server-taxonomy-resolution-test-report.md` | Test report. |
| `docs/workflow/reviews/2026-07-01-ai-lean-vision-prompt-server-taxonomy-resolution-signoff.md` | Signoff. |

---

## 6. Acceptance Criteria

- [ ] The model prompt no longer includes the full approved category list or full approved tag list.
- [ ] The model can return phrase tag candidates such as "mom life", "rock on", and "messy bun".
- [ ] Server-side resolver (`catalogTagResolver.ts`, unchanged) maps phrase candidates to approved tag names through aliases.
- [ ] Final persisted tags are approved tag names only, lowercase, deduped, exclusion-filtered, and capped at 8.
- [ ] `suggestedNewTags` are created only for useful unmatched candidates after approved tag and alias matching fails, generated server-side.
- [ ] Category is resolved from the approved category list server-side, after tag resolution, using raw category + title + description + visible text + matched tags + approved category descriptions.
- [ ] Family/motherhood designs do not get assigned to Pop Culture & Characters just because the artwork includes a skeleton or illustrated character (unit test).
- [ ] The skeleton-motherhood sample from the task spec resolves to a Family/motherhood-appropriate approved category when one exists (unit test).
- [ ] A bare "quote" signal does not force a Humorous Quotes category without a separate humor signal (unit test).
- [ ] Faith and Teacher/Education priority rules covered by unit tests.
- [ ] **(Review note 1)** Dedicated golden test: raw model category `"Humorous Quotes"` with matched tags including `motherhood`/`skeleton`/`quote` resolves to `Family` (or closest available family/motherhood approved category), not `Humorous Quotes` and not `Pop Culture & Characters`.
- [ ] **(Review note 2)** When no approved category clears the minimum confidence threshold, `aiSuggestions.categoryName` and `categoryId` are left undefined — the raw model category string is never persisted as a fallback final value (unit/integration test).
- [ ] **(Review note 3)** Resolver test confirms the family/faith/teacher priority boost can outweigh and override a raw model category candidate of `"Humorous Quotes"` or `"Pop Culture & Characters"` when buyer-intent tags clearly indicate motherhood/mom/parenting/family — not via a hardcoded string override, but via scoring that treats the raw candidate as just one competing signal.
- [ ] **(Review note 4)** Server-generated `suggestedNewTags` names are always safe single-word reusable tags (or the candidate is dropped entirely if no safe reduction exists); phrase candidates like `"messy bun"` either resolve to an approved alias, become a clean single-word suggestion with the phrase retained as an alias, or are dropped — never persisted as a suggested tag `name` containing a space.
- [ ] **(Review note 5)** An owner-edited prompt template still containing `{{approved_categories}}`/`{{approved_tags}}` continues to build and substitute correctly (backward-compatibility test), even though the shipped default template no longer includes those placeholders.
- [ ] Existing `catalogTagResolver` tests continue passing unmodified (architecture reused, not rebuilt).
- [ ] `promptParity.test.ts` updated and passing for the new smaller prompt.
- [ ] Prompt version bumped to v18 and reflected in docs.
- [ ] Lint passes.
- [ ] Root TypeScript typecheck passes.
- [ ] Functions typecheck/build passes (commands confirmed at implementation time — see open question in §8).
- [ ] Relevant `functions/src/ai/*.test.ts` files pass via `npx tsx --test`.
- [ ] Manual smoke notes added for AI Playground and AI Review re-run; production deploy explicitly not performed without human approval.

---

## 7. Testing Plan

Run and record exact commands and exit codes at implementation/test phase:

- `npm run lint`
- `npx tsc --noEmit`
- Functions typecheck command (confirm exact script in `functions/package.json` — likely `npm run build --prefix functions` or `cd functions && npx tsc --noEmit`; will document actual command used)
- Functions build command (likely `npm run build --prefix functions`)
- `npx tsx --test functions/src/ai/catalogThemeCategoryResolver.test.ts` (includes review note 1 golden case and review note 3 override-strength case)
- `npx tsx --test functions/src/ai/catalogTagResolver.test.ts` (includes review note 4 safe suggested-tag normalization case)
- `npx tsx --test functions/src/ai/simpleCatalogEnrichmentResponse.test.ts` (includes review note 2 undefined-category-on-low-confidence case)
- `npx tsx --test functions/src/ai/simpleCatalogEnrichmentPrompt.test.ts` (review note 5 backward-compatibility case)
- `npx tsx --test functions/src/ai/promptParity.test.ts`
- `npx tsx --test functions/src/ai/aiEnrichmentPlayground.test.ts`
- Full `functions/src/ai/*.test.ts` sweep to check for regressions in unrelated AI tests.

Manual smoke (documented, not executed against production — no deploy in this phase):
- AI Playground: paste the new small prompt, confirm valid JSON with `title`/`description`/`category`/`tags` only.
- AI Review re-run (local/dev provider or emulator if available): confirm resolved tags and category populate as expected end-to-end through the re-sequenced pipeline.

Do not claim tests passed unless actually run; exit codes recorded in the test report before signoff.

---

## 8. Open Questions / Confirmations Needed Before Implementation

1. **Exact functions typecheck/build commands** — `project-chatgpt-handoff/11-testing-commands.md` lists root commands but marks the functions-specific commands as `[NEEDS REPO CHECK]`. Will inspect `functions/package.json` at implementation start and record actual commands in the test report; not a blocker to plan approval.
2. **New resolver file location/name** — proposing `functions/src/ai/catalogThemeCategoryResolver.ts` to avoid confusion with the existing unused `catalogCategoryResolver.ts`. Open to a different name if reviewer prefers reusing/renaming the existing file instead of adding a new one — flagging so the review step can decide before implementation.
3. **Priority keyword lists** — the task specifies example keyword families (motherhood/mom/parenting/fatherhood/dad/family; faith; teacher/school/education) as score boosts rather than hardcoded category-name overrides, so the resolver keeps working correctly regardless of exact category naming in a given install. Confirming this data-driven approach (boost approved categories whose name/description semantically matches the family) is acceptable versus a stricter literal hardcoded mapping — proceeding with the data-driven approach unless told otherwise.

None of these block starting implementation once the plan itself is approved; flagging for visibility per FreshForge review gate norms.

---

## 9. Risks

- **Category resolution behavior change is the highest-risk part of this phase.** Moving from exact-match-trust-the-model to server-side scoring changes real category assignment behavior for every future AI run. Mitigated by: deterministic pure-function design, explicit unit tests for the exact scenarios called out in acceptance criteria, and keeping the "leave undefined below threshold" fallback so staff can always correct in AI Review — no worse than today's failure mode (undefined category), and better than today's silent exact-match failures once the small prompt stops guaranteeing the model knows real category names.
- **Pipeline re-sequencing** touches `aiEnrichmentPipeline.ts` control flow directly. Mitigated by keeping the change narrowly scoped to reordering two already-existing resolver calls, not rewriting the orchestrator.
- **Prompt version bump** affects nothing except display/tracking (`aiSuggestions.promptVersion`, `aiReviewVersion`) — no migration needed, verified from `designAiFields.ts`/pipeline code.

---

## 10. Future Expansion (not this phase)

- If token cost or latency pressure returns even with the small prompt, consider retrieval/chunking for very large tag libraries — explicitly deferred per task instructions, not implemented here.
- Possible later cleanup: delete the now fully-dead `catalogCategoryResolver.ts` (old rich resolver) in a dedicated tech-debt phase, once confirmed nothing references it.
