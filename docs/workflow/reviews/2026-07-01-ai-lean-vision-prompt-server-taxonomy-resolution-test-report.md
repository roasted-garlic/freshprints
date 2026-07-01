# Test Report — Lean Vision Prompt + Server-Side Taxonomy Resolution

- **Date:** 2026-07-01
- **Goal slug:** `ai-lean-vision-prompt-server-taxonomy-resolution`
- **Plan:** `docs/workflow/plans/2026-07-01-ai-lean-vision-prompt-server-taxonomy-resolution-plan.md`

---

## Commands Run and Exit Codes

| Command | Result |
|---|---|
| `npx tsc --noEmit` (root) | Exit 0, no output |
| `npm run lint` (root, ESLint) | Exit 0 |
| `npm run build` (functions: `tsc`) | Exit 0 |
| `npm run build` (root: `tsc && vite build && electron-builder`) | Exit 0, packaged successfully |
| `git diff --check` | Exit 0 (only benign LF/CRLF line-ending warnings, no whitespace errors) |
| `npx tsx --test` across all `functions/src/ai/*.test.ts` (17 files) | 147/147 pass |
| `npx tsx --test` across all `functions/src/ai/providers/*.test.ts` (4 files) | 12/12 pass |
| `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` | 7/7 pass |

**Combined functions/src/ai + providers total: 159/159 pass, 0 fail.**

---

## New Test Coverage

- `functions/src/ai/catalogThemeCategoryResolver.test.ts` (new, 9 tests): golden regression case
  (review note 1), Faith/Teacher priority resolution, pop-culture-style-only negative case,
  bare-quote negative case, genuine-character positive case, undefined-on-low-confidence case
  (review note 2), never-returns-unapproved-name case.
- `functions/src/ai/catalogTagResolver.test.ts` (+3 tests, review note 4): safe single-word
  reduction of an unmatched phrase candidate with the phrase retained as an alias; phrase-to-alias
  match takes precedence over suggestion; drop-when-no-safe-reduction case.
- `functions/src/ai/simpleCatalogEnrichmentPrompt.test.ts` (new, 2 tests, review note 5): legacy
  owner-edited template with `{{approved_categories}}`/`{{approved_tags}}` still builds and
  substitutes; modern template without those placeholders builds cleanly.
- `functions/src/ai/simpleCatalogEnrichmentResponse.test.ts` (updated): `buildSimpleCatalogEnrichmentResult`
  tests now assert `categoryName`/`categoryId` are left `undefined` and the raw candidate is carried
  only on `analysis.rawCategory` (review note 2); removed obsolete `resolveLeanCatalogCategory`
  describe block (function deleted).
- `functions/src/ai/promptParity.test.ts` (updated): asserts the default v18 prompt does **not**
  inject the full approved category/tag list; asserts `{{excluded_tags}}` is still substituted.
- `functions/src/ai/providers/openAiVisionEnrichmentProvider.test.ts` (updated): the one stale test
  asserting old taxonomy injection was rewritten to assert the v18 prompt excludes that context
  while still substituting exclusions.
- `functions/src/ai/catalogTitleRules.test.ts`: version assertion bumped to v18.
- `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`: removed
  assertions that the default template contains the retired placeholders; now asserts
  `hasRequiredAiEnrichmentPromptPlaceholders` still passes.

No existing test files' pre-existing passing assertions were weakened — only the tests whose
premise changed (taxonomy injected into every prompt; category resolved via exact match trusting
the model) were updated to match the new architecture; all failure-mode/regression coverage they
previously carried (Family-vs-Pop-Culture no-flip, alias matching, exclusions, dedup, caps) is
preserved or strengthened.

---

## Manual Smoke Notes (not executed against production — no deploy performed)

- **AI Playground:** Not run against a live OpenAI/Gemini key in this session (no secret
  provisioning performed). The new default prompt was verified to build and substitute correctly
  via automated tests (`simpleCatalogEnrichmentPrompt.test.ts`, `promptParity.test.ts`,
  `openAiVisionEnrichmentProvider.test.ts`).
- **AI Review re-run:** Not run end-to-end against Firestore/Storage in this session (pipeline uses
  `adminDb`/`adminStorage`, which requires emulators or a live project; no emulator infra exists in
  this repo per `docs/project/PROJECT_HEALTH.md`/`ROADMAP.md` open blockers). The re-sequenced
  pipeline logic (tag resolution → category resolution, transient `rawTags`/`rawCategory` deletion
  before Firestore write) was verified by full functions build success and by the pure-function
  unit tests covering each resolver in isolation.
- **Recommendation:** Authenticated AI Processing / AI Review / Settings smoke verification should
  be performed after human-approved Functions deploy, per existing repo convention (see
  `docs/workflow/setup/` and prior AI Processing deploy checkpoints).

---

## Scope Compliance

- No Firebase Functions deploy performed.
- No secrets, environment variables, or Firestore rules changed.
- No data migration or backfill.
- No design lifecycle status changes.
- No new dependencies added.
- No changes to Imports, Design Library, Print Requests, or Print Runs.

---

## Result

**PASS.** All required checks (lint, root typecheck, functions build, full root build including
Electron packaging, and the full `functions/src/ai` + provider test suite) succeeded with zero
failures. All five review-round-1 notes have corresponding passing test coverage.
