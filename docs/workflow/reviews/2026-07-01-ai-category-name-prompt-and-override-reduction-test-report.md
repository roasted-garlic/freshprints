# Test Report — AI Category-Name Prompt + Reduced Server Override

- **Date:** 2026-07-01
- **Goal slug:** `ai-category-name-prompt-and-override-reduction`
- **Plan:** `docs/workflow/plans/2026-07-01-ai-category-name-prompt-and-override-reduction-plan.md`

## Automated checks

| Check | Result |
|---|---|
| `functions/src/ai` + provider unit tests | 152/152 passed |
| `src/renderer/.../settings` unit tests (aiEnrichmentSettingsConstants) | 5/5 passed (rolled into 163/163 combined total below) |
| Combined `functions/src/ai` + settings unit tests | 163/163 passed |
| `npx tsc --noEmit` (root) | passed |
| `npm run lint` (root) | passed |
| `npm run build` (functions) | passed |
| `npm run build` (root, incl. Vite + Electron packaging) | passed |
| `git diff --check` | passed (only pre-existing benign LF/CRLF warnings) |

## Test/behavior changes made

- `catalogThemeCategoryResolver.test.ts`: added a new test for the exact-match short-circuit;
  updated 6 existing fallback-scorer tests to use a `rawCategory` that does not exactly match an
  approved category name, so they continue to exercise the token-overlap/priority-boost path
  instead of being satisfied by the new exact-match short-circuit.
- `catalogTitleRules.test.ts`: updated the tag-synonym test (renamed to reflect that tags are
  tokenized, not rewritten) and bumped the hardcoded prompt-version assertion from v19 to v20.
- `promptParity.test.ts` and `geminiVisionEnrichmentProvider.test.ts`: updated assertions to expect
  approved category names present in the resolved prompt (previously asserted absent under v19),
  while continuing to assert category descriptions and the full approved tag list are absent.
- `aiEnrichmentSettingsConstants.test.ts`: updated to assert both required placeholders
  (`{{excluded_tags}}`, `{{approved_category_names}}`) are present in the default template.
- `SettingsPage.tsx`: updated the prompt-template validation error copy to mention both required
  placeholders (no test asserted the old string).

## Manual verification not performed (human checkpoint)

- No Firebase Functions deploy was run. This prompt/resolver change only takes effect in
  production after `firebase deploy --only functions`.
- No authenticated Settings AI Playground before/after comparison was run in this phase — the plan
  documents this as a manual procedure available to run once deployed, not something executed here.
- The `funny` tag alias update (comedic/comedy/humor/humorous/joke/jokes/sarcastic/sassy/snarky/
  witty) was not applied to Firestore. It requires a manual edit to the existing `funny` tag via
  the Tag Management UI (bulk import would incorrectly try to create a duplicate `funny` tag and
  be rejected as a collision) — instructions were provided to the user separately, outside this
  report.

## Scope confirmation

No second AI call, no embeddings, no approved-tag-name injection, no Firestore migration/backfill,
and no production deploy were performed, matching the approved plan's explicit exclusions.
