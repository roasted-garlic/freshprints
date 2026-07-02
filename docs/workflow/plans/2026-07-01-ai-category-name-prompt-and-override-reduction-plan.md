# Plan — AI Category-Name Prompt + Reduced Server Override

- **Date:** 2026-07-01
- **Goal slug:** `ai-category-name-prompt-and-override-reduction`
- **Status:** proposed, pending review approval

## Problem

Per-image vision cost testing (user-provided, Settings AI Playground):

| Prompt variant | Cost / image | Cost / 1M images |
|---|---|---|
| Current v19 lean prompt (no taxonomy) | ~$0.000128 | ~$128 |
| + approved category names | ~$0.000129 | ~$129 (+0.8%) |
| + approved category names + approved tag names | ~$0.000565 | ~$565 (+341%) |

Full-taxonomy injection measurably improves accuracy but costs ~4.4x more per image. Category names
alone cost almost nothing extra. The user wants the cheap accuracy win now and wants tag-name
injection gated behind a real test-set comparison, not assumed.

Separately, today's pipeline has server-side logic that overrides or rewrites explicit AI judgment
rather than just validating/capping it:

1. `catalogThemeCategoryResolver.ts` scores the AI's raw category guess against every approved
   category using token overlap plus hardcoded "priority family" boosts (family/faith/teacher,
   `PRIORITY_BOOST_WEIGHT = 4`) that can out-score and override what the AI explicitly said — while
   today the AI isn't even shown the approved category list, so it's guessing blind and then getting
   overruled by a heuristic.
2. `catalogTitleRules.ts` (`TAG_ALIASES` / `TAG_COMPANIONS`, lines 929-943) silently rewrites the
   AI's chosen tag word — e.g. `comedic`/`comedy`/`humor`/`humorous`/`joke`/`jokes` → `funny`, and
   `sarcastic`/`sassy`/`snarky`/`witty` get `funny` appended as a companion tag the AI never chose.
   This changes AI intent rather than just canonicalizing a known synonym via the existing
   alias-matching system.

## Scope (this phase)

1. Show the AI the **approved category names only** (no descriptions, no aliases, no tag names) in
   the default prompt template, using the existing `{{approved_category_names}}` placeholder
   (`AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER`) and `formatCategoryNamesOnly` helper — both
   already implemented in `simpleCatalogEnrichmentPrompt.ts` and unused by the current default
   template. No new prompt-building code needed for this part; only `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`
   in `shared/constants/aiEnrichment.constants.ts` changes, replacing the current single line
   `category: one broad reusable category or theme for the design.` with an instruction to pick from
   the provided approved category list (with a documented escape hatch for "none fit").
2. Do **not** inject approved tag names, aliases, descriptions, or preferredWhen text into the
   prompt in this phase — that stays a possible future phase, only after step 7 below.
3. Reduce `catalogThemeCategoryResolver.ts` server override strength now that the AI sees real
   category names:
   - When the AI's raw category candidate is an exact (case-insensitive) match to one of the
     approved category names it was shown, trust that match directly — skip token-overlap scoring
     entirely for that design.
   - Keep token-overlap scoring only as the **fallback path** for when the raw candidate doesn't
     exactly match an approved name (typos, paraphrases, or an owner-edited template that still
     doesn't send category names).
   - Keep `PRIORITY_BOOST_WEIGHT` family boosts only inside that fallback path, not as something
     that can outrank an exact AI-stated match to a category it was explicitly offered.
4. Reduce tag synonym rewriting in `catalogTitleRules.ts`:
   - Remove `TAG_COMPANIONS` entirely (sarcastic/sassy/snarky/witty auto-appending `funny`) — this
     adds a tag the AI never produced.
   - Remove `TAG_ALIASES` fold-to-`funny` behavior from the tokenization path.
5. Move the `funny` synonym relationship into tag aliases (the existing approved-tag alias system in
   `catalogTagResolver.ts`) instead of code constants: if an approved `funny` tag exists, add
   `comedic, comedy, humor, humorous, joke, jokes, sarcastic, sassy, snarky, witty` as aliases on
   that tag record so the existing alias-match path in `resolveAiCatalogTags` handles the
   canonicalization the same way it does for every other tag, and staff can edit the mapping without
   a deploy. Included in this phase: provide a bulk-import JSON snippet (matching the existing Tag
   Management bulk-import contract) for the user to paste in and apply to the `funny` tag's aliases.
   This is a manual UI action by the user, not an automated Firestore write performed by this
   phase.
6. Keep all existing deterministic server validation as-is: `MAX_TAG_LENGTH`, `MAX_AI_APPROVED_TAGS`
   / `SIMPLE_ENRICHMENT_MAX_TAGS` cap, `BASE_AI_TAG_EXCLUSIONS`, `GENERIC_CATALOG_TAGS`, dedupe,
   approved-tag exact/alias/n-gram matching in `catalogTagResolver.ts`. None of that changes.
7. Add a repeatable comparison test path: a documented manual procedure (Settings AI Playground,
   same image set, category-names-off vs category-names-on) staff can run to produce a real
   accuracy comparison before deciding whether to escalate to tag-name injection or a
   candidate-tag second pass. This phase does not run that test — it only makes the category-names
   prompt available to test against the current baseline.

## Explicitly out of scope

- No approved tag names, aliases, or descriptions added to the prompt.
- No second AI call / candidate-tag selection pass / embeddings.
- No change to `MIN_RESOLVE_SCORE`, `SIMPLE_ENRICHMENT_MAX_TAGS`, `MAX_AI_APPROVED_TAGS`, or any
  exclusion list.
- No Firebase Functions deploy (code + doc changes only; deploy remains a separate human checkpoint
  per existing project convention).
- No Firestore data writes/migrations. If the team wants the `funny`-alias data seeded (item 5), that
  is a manual Tag Management UI action by the user, not an automated script in this phase, unless the
  user asks for a bulk-import JSON to paste in.
- No change to `STYLE_ONLY_TOKENS` / `POP_CULTURE_CATEGORY_TOKENS` / `HUMOR_SIGNAL_TOKENS` /
  `QUOTE_ONLY_TOKENS` exclusion rules inside the fallback scorer — those stay as they are, since
  they only apply when there is no exact AI category match to trust.

## Files expected to change

- `shared/constants/aiEnrichment.constants.ts` — `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` gains
  approved-category-name instruction text using `{{approved_category_names}}`.
- `functions/src/ai/catalogThemeCategoryResolver.ts` — add exact-match short-circuit ahead of the
  token-overlap fallback scorer.
- `functions/src/ai/aiEnrichmentPipeline.ts` — pass the raw category candidate's exact-match check
  through to the resolver call (likely just passing `approvedCategories` through as already happens;
  confirm no signature change needed beyond the resolver itself).
- `functions/src/ai/catalogTitleRules.ts` — remove `TAG_ALIASES`, `TAG_COMPANIONS`, and their use in
  `pushNormalizedTag`.
- Tests: `catalogThemeCategoryResolver.test.ts` (new exact-match tests, keep existing fallback
  tests), `catalogTitleRules.test.ts` / `catalogEnrichmentResponse.test.ts` (remove/update tests
  asserting old synonym-folding behavior).
- `docs/project/DECISIONS.md` — new ADR entry recording the cost data and the exact-match-first /
  reduced-override decision.
- `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, `CURRENT-STATE.md` — reflect the new
  category-names-in-prompt state and prompt version bump.

## Decisions confirmed with user

1. `funny` alias seeding (item 5) is included in this phase as a bulk-import JSON snippet the user
   pastes into Tag Management — not an automated Firestore write.
2. The exact-match category short-circuit uses the same `normalizeForAliasMatch`-style punctuation
   normalization already used for tags, not a strict case-insensitive-only match.
3. Prompt version bump — this becomes `catalog-enrich-v20` / `catalog-enrich-dev-v20` per existing
   versioning convention in `catalogTitleRules.ts`.

## Verification plan

- Unit tests: functions/src/ai test suite (currently 159+ tests) updated and passing, including new
  exact-match category resolver tests and removed/updated synonym-folding tests.
- `npx tsc --noEmit` (root), `npm run lint` (root), `npm run build` (functions), `npm run build`
  (root).
- `git diff --check`.
- Manual Settings AI Playground comparison (human checkpoint, post-deploy): run the same test image
  set through old vs new prompt, spot-check category accuracy and confirm no tag regressions from
  removing synonym folding.
- Firebase Functions deploy remains a separate human-approved step after signoff, per existing
  project convention (this prompt/resolver change only takes effect in production after
  `firebase deploy --only functions`).
