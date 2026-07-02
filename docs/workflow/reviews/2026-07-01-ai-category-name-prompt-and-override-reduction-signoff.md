# Signoff — AI Category-Name Prompt + Reduced Server Override

- **Date:** 2026-07-01
- **Goal slug:** `ai-category-name-prompt-and-override-reduction`
- **Status:** PASS (implementation + local verification; deploy and manual accuracy comparison remain outstanding human checkpoints)
- **Plan:** `docs/workflow/plans/2026-07-01-ai-category-name-prompt-and-override-reduction-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-01-ai-category-name-prompt-and-override-reduction-test-report.md`
- **ADR:** ADR-FP-041 in `docs/project/DECISIONS.md`

## What changed

- `shared/constants/aiEnrichment.constants.ts`: `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` now
  instructs the model to pick a category from an injected approved category name list
  (`{{approved_category_names}}`), with an explicit escape hatch for when none genuinely fit.
  `{{approved_category_names}}` joins `{{excluded_tags}}` as a required prompt placeholder.
- `functions/src/ai/catalogThemeCategoryResolver.ts`: added `findExactCategoryNameMatch`, an
  exact-match short-circuit (case/punctuation tolerant, reusing `normalizeForAliasMatch` exported
  from `catalogTagResolver.ts`) that trusts the model's category choice directly when it copies an
  approved name. The existing token-overlap/priority-boost scorer (family/faith/teacher boosts,
  style-only and bare-quote exclusions) is now a fallback for non-exact cases only.
- `functions/src/ai/catalogTagResolver.ts`: exported `normalizeForAliasMatch` for reuse by the
  category resolver.
- `functions/src/ai/catalogTitleRules.ts`: removed `TAG_ALIASES` and `TAG_COMPANIONS` hardcoded
  synonym-folding/companion-tag logic from `pushNormalizedTag`. Tag normalization no longer rewrites
  or appends tags the model did not return. Bumped `CATALOG_ENRICHMENT_PROMPT_VERSION` /
  `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` from v19 to v20.
- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`: updated doc comment for v20 and the
  category-names-only / no-tag-injection cost rationale.
- `src/renderer/src/features/settings/pages/SettingsPage.tsx`: updated the prompt-template
  validation error message to mention both required placeholders.
- Updated tests: `catalogThemeCategoryResolver.test.ts` (new exact-match test; 6 existing
  fallback-scorer tests adjusted to use non-exact `rawCategory` values so they still exercise the
  fallback path), `catalogTitleRules.test.ts` (v20 version assertion; tag-tokenization test updated
  for removed synonym folding), `promptParity.test.ts` and `geminiVisionEnrichmentProvider.test.ts`
  (assert category names now present, descriptions/full tag list still absent),
  `aiEnrichmentSettingsConstants.test.ts` (asserts both required placeholders).
- Added ADR-FP-041 to `docs/project/DECISIONS.md` documenting the measured per-image cost data
  (baseline ~$128/1M, +category names ~$129/1M, +category names & tag names ~$565/1M) and the
  resulting decision to inject category names only for now.
- Updated `project-chatgpt-handoff/07-backend-and-ai-pipeline.md` and
  `project-chatgpt-handoff/CURRENT-STATE.md` for the v20 prompt state and ADR-FP-041.

## Verification

- 163/163 relevant unit tests passed (`functions/src/ai` + provider tests + settings constants
  test).
- `npx tsc --noEmit` (root) passed.
- `npm run lint` (root) passed.
- `npm run build` (functions) passed.
- `npm run build` (root, incl. Vite + Electron packaging) passed.
- `git diff --check` passed (only pre-existing benign LF/CRLF warnings).

## Scope boundaries (confirmed intact)

No second AI call, no embeddings, no approved-tag-name/alias/description injection into the
prompt, no Firestore migration/backfill, no Firebase Functions deploy, and no automated Firestore
write for the `funny` tag alias update. All match the approved plan's explicit exclusions.

## Outstanding human checkpoints

1. **Firebase Functions deploy** (`firebase deploy --only functions`) — required before this
   prompt/resolver change takes effect in production. Not performed in this phase per standing
   project convention (deploys require explicit human approval).
2. **`funny` tag alias update** — the intended replacement for the removed hardcoded synonym
   folding. Must be applied manually via the Tag Management UI's tag-edit form (not bulk import,
   which would reject a duplicate `funny` entry) by adding `comedic, comedy, humor, humorous, joke,
   jokes, sarcastic, sassy, snarky, witty` as aliases on the existing approved `funny` tag.
3. **Manual accuracy comparison** — run the documented before/after test (Settings AI Playground,
   same image set, category-names-off vs category-names-on) once deployed, to decide whether
   category accuracy improved as expected and whether tag-name injection is ever worth revisiting.

## Next recommended step

Deploy Functions when ready, apply the `funny` tag alias update in Tag Management, then run the
manual accuracy comparison before considering any further prompt-injection scope changes.
