# Test Report — Business-Context Prompt Line (DTF Apparel Framing, v21)

- **Date:** 2026-07-02
- **Goal slug:** `ai-business-context-prompt`
- **Plan:** `docs/workflow/plans/2026-07-02-ai-business-context-prompt-plan.md`

## Commands run and exit codes

| Command | Exit code | Notes |
|---|---|---|
| `npx tsx --test functions/src/ai/catalogTitleRules.test.ts functions/src/ai/promptParity.test.ts src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` | 0 | Targeted pass: 50/50 tests, including the version-bump assertion and the new business-context regression test. |
| `npx tsx --test $(find functions/src -name "*.test.ts") $(find src -name "*.test.ts")` | 0 | Full repo sweep: **413/413 tests pass, 91 suites, 0 failures** (up from 412 — one new test this phase). |
| `npx tsc --noEmit` (repo root) | 0 | Clean. |
| `npx tsc --noEmit` (`functions/`) | 0 | Clean. |
| `npm run lint` (repo root) | 0 | Clean. |
| `npm run build` (`functions/`) | 0 | `tsc` build to `functions/lib/` succeeded. |
| `npx vite build` (repo root, renderer + Electron main/preload) | 0 | Renderer bundle + Electron main/preload bundles built successfully. Full `electron-builder` NSIS packaging not re-run — no Electron main-process files changed, only `shared/`, `functions/src/ai/`, and one renderer test file. |
| `git diff --check` | 0 | Only standard Git CRLF conversion warnings (repo convention on Windows), no real whitespace errors. |

## Changes made

- `shared/constants/aiEnrichment.constants.ts` — added the approved business-context paragraph (DTF/apparel framing, subject/message/buyer-intent judgment criteria, three worked examples: fashion/luxury, school/education, faith/inspirational) as the opening of `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, before the existing `Analyze the provided image...`/`Return:` instructions.
- `functions/src/ai/catalogTitleRules.ts` — bumped `CATALOG_ENRICHMENT_PROMPT_VERSION` v20→v21, `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` dev-v20→dev-v21.
- `functions/src/ai/catalogTitleRules.test.ts` — updated the one hardcoded version-string assertion to v21.
- `functions/src/ai/promptParity.test.ts`, `functions/src/ai/providers/geminiVisionEnrichmentProvider.test.ts` — removed two stale "v20" mentions in test titles/comments (prose only, no assertion changes) so they don't read as incorrect after the version bump.
- `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` — renamed the existing prompt-shape test's title from "(v20)" to "(v21)", and added a new test asserting the business-context paragraph is present (DTF/apparel/shirts mention, subject/message/buyer-intent phrase, the Luxury & Fashion Inspired worked example) and appears before the `Return:` field block — this is the first test in the repo that checks prompt *prose content*, not just structure/placeholders/version string.

## Manual smoke testing

**Not performed in this session — deferred until after deploy**, per the plan's §7: verifying the actual model behavior change (re-running AI on the exact reported "Lashes longer than my Patience" design and confirming it lands in a humor/quote-appropriate category rather than "Luxury & Fashion Inspired") requires the new prompt to actually be live against Gemini, which only happens after `firebase deploy --only functions`. This is documented as a required post-deploy check, not a pre-deploy blocker, consistent with how prompt-content changes were verified in prior phases (e.g. ADR-FP-039's golden-regression test covers structural logic, not live model behavior).

## Scope confirmation

- No Firebase Functions deploy was performed.
- No changes to `catalogThemeCategoryResolver.ts`, `catalogTagResolver.ts`, the tag reranker, or suggestion authoring — verified by `git diff --stat` showing only the 6 files listed above touched, and by the full test suite (including all resolver/reranker/suggestion-author test files) passing unmodified except for the two stale-comment edits noted above.
- No change to category or tag data.
- No Firestore rules, seed data, secrets, or migration changes.
- Owner-edited custom prompt templates are unaffected — only the shipped default template changed; `resolveAiPromptTemplate` already treats an owner-saved custom template as authoritative, unchanged by this phase.
