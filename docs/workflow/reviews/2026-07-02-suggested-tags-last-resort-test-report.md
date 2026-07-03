# Test Report — Suggested Tags as Last Resort + AI-Authored Suggestion Quality

- **Date:** 2026-07-02
- **Goal slug:** `suggested-tags-last-resort`
- **Plan:** `docs/workflow/plans/2026-07-02-suggested-tags-last-resort-plan.md`

## Commands run and exit codes

| Command | Exit code | Notes |
|---|---|---|
| `npm run lint` | 0 | `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` — no output, clean. |
| `npx tsc --noEmit` (repo root) | 0 | Clean. |
| `npx tsc --noEmit` (`functions/`) | 0 | Clean. |
| `npm run build` (`functions/`) | 0 | `tsc` build to `functions/lib/` succeeded. |
| `npx tsx --test $(find functions/src -name "*.test.ts") $(find src -name "*.test.ts")` | 0 | **412/412 tests pass, 91 suites, 0 failures** (full repo sweep; prior baseline was 375, net +37 from this phase after accounting for the earlier session's queue-fix/button-relabel work already included in that baseline). |
| `npx tsc` (repo root) + `npx vite build` | 0 | Renderer + Electron main/preload bundles built successfully. Full `electron-builder` NSIS packaging was not re-run this phase — no Electron main-process files changed, only backend (`functions/`), shared types, and Settings-page renderer files. |
| `git diff --check` | 0 | Only standard Git CRLF conversion warnings (repo convention on Windows), no real whitespace errors. |

## New/updated test files

- `functions/src/ai/catalogTagResolver.test.ts` — updated one pre-existing test ("limits suggested-new-tags to only the remaining gap") to assert the new correct behavior (0 suggestions, not 1) since it exercised exactly the 7-of-8-approved-matched real-world case the last-resort gate exists to fix. Added a new `describe` block, "suggested-tags last-resort gate," with 6 tests covering every boundary from plan §4.1: 0-2 approved matches (eligible), 3 matches with a strong match (never eligible), 3 weak matches with <2 unmatched (not eligible), 3 weak matches with 2+ unmatched (eligible — the edge case), 4+ matches regardless of quality/room (never eligible), and a match-strength-upgrade regression (a tag reached first via a weak match, later confirmed by a strong match, must report the strong reason).
- `functions/src/ai/catalogSuggestedTagAuthorProvider.test.ts` (new) — 15 tests: request-shape (no `image_url`), shared-instructions content (no full tag database), `selectCalibrationExampleTags` (determinism, 4-example cap, name+3-aliases+preferredWhen-only field cap, relevance-then-quality tiering, quality-only fallback fill, archived-tag exclusion, alphabetical tie-break), and `validateAuthoredSuggestions` (candidate-list enforcement, empty-`preferredWhen` rejection, 5-alias cap with dedup and self-alias rejection, non-array-input safety, space/slash name rejection, 300-char `preferredWhen` truncation).
- `functions/src/ai/catalogTagRerankProvider.test.ts` — added a new `describe` block, "merged suggestion-authoring prompt," with 2 tests confirming the `suggestions` response field and authoring instructions are present only when `suggestionAuthorInput` is provided, and absent otherwise (exported `buildCatalogTagRerankUserPrompt` for testability, matching the existing `buildCatalogTagRerankRequestBody` export pattern).
- `functions/src/ai/aiEnrichmentPipeline.test.ts` — fixed the shared `resolvedTags()` test factory to include the new required `allMatchesAreWeak` field (this file's tests are excluded from `tsc --noEmit` per `functions/tsconfig.json`, so this would only have surfaced at `tsx --test` runtime, not typecheck). Added a new `describe` block, "shouldRunSuggestionAuthor," with 5 tests: off-mode never triggers, auto-mode triggers on thin coverage (0-2), the 3-weak-vs-3-strong/unmatched-count boundary, never triggering at 4+ matches, and "always" behaving identically to "auto" (no separate trigger beyond the last-resort gate itself).
- `functions/src/ai/loadAiEnrichmentSettings.test.ts` — added a `describe` block for `resolveSuggestionAuthorMode` mirroring the existing `resolveTagRerankMode` coverage (default-to-off for undefined/invalid/non-string input, acceptance of all three valid modes), plus one test confirming the two mode resolvers are independent of each other.
- `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` — added 4 tests for the new `suggestionAuthorMode` client constants: default value, valid-mode acceptance, unknown-value fallback, and the `SUGGESTION_AUTHOR_MODE_OPTIONS` list shape.

All new tests pass on first correction (one test — calibration-example relevance tiering — initially failed due to an overly strict whole-phrase substring relevance check; fixed by switching to token-overlap matching, then passed). No existing test assertions were changed except the one last-resort-gate-affected case documented above.

## Manual smoke testing

**Not performed in this session.** Per the plan's §3/§7 (Playground support explicitly deferred this phase; manual verification happens in AI Review, not Playground), the required end-to-end check — re-running AI processing on a design with thin approved-tag coverage and confirming the resulting suggested tags carry a specific, AI-authored `preferredWhen`/aliases rather than the old generic template, plus confirming a well-tagged design (4+ solid matches) never surfaces suggestions — requires an authenticated Studio session against a real or emulated Firebase project with `GEMINI_API_KEY` configured, which is outside this automated implementation session. This must be run by the user (or a follow-up session with app access) before signoff is finalized.

## Scope confirmation

- No Firebase Functions deploy was performed.
- No Firestore rules, seed data, or migration changes were made.
- No secrets were touched.
- The first AI call's prompt, model, and cost profile (v20) are unchanged.
- The tag reranker's own behavior/prompt is unchanged when `suggestionAuthorMode` is off or not triggered — verified by the existing `shouldRunTagRerank`/reranker test suites continuing to pass unmodified, and by the new merged-prompt tests confirming the `suggestions` section is only appended when `suggestionAuthorInput` is explicitly provided.
- `suggestionAuthorMode` defaults to `"off"` everywhere it is read (settings loader, `updateAiEnrichmentSettings` validation, renderer constants, the new Settings UI selector) — verified by test and code inspection.
- No Playground surface was added for the suggestion author this phase, per explicit user decision.
- This phase's code sits on top of the still-undeployed `ai-tag-rerank-second-call` phase's code in the same working tree; neither phase has been deployed, and this phase's signoff/test artifacts are tracked separately from that phase's per the user's implementation guardrail.
