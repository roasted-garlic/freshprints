# Test Report — Text-Only Gemini Tag Reranker (Second Call) + Playground Support

- **Date:** 2026-07-02
- **Goal slug:** `ai-tag-rerank-second-call`
- **Plan:** `docs/workflow/plans/2026-07-02-ai-tag-rerank-second-call-plan.md`

## Commands run and exit codes

| Command | Exit code | Notes |
|---|---|---|
| `npm run lint` | 0 | `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` — no output, clean. |
| `npx tsc --noEmit` (repo root) | 0 | Clean. |
| `npx tsc --noEmit` (`functions/`) | 0 | Clean. |
| `npm run build` (`functions/`) | 0 | `tsc` build to `functions/lib/` succeeded. |
| `npx tsx --test $(find functions/src -name "*.test.ts")` | 0 | **177/177 tests pass, 35 suites, 0 failures.** |
| `npm run build` (repo root) | 0 | `tsc && vite build && electron-builder` — full renderer + Electron main/preload build plus NSIS packaging succeeded. |
| `git diff --check` | 0 | Only standard Git CRLF conversion warnings (repo convention on Windows), no real whitespace errors. |

## New/updated test files

- `functions/src/ai/catalogTagResolver.test.ts` — added 5 new tests for `approvedTagCandidates`/`unmatchedCandidateCount` (matched-tag reasons, nearby-match surfacing for unmatched candidates, count accuracy, shortlist capping at scale, empty-candidate baseline). All 16 pre-existing tests in this file pass unmodified.
- `functions/src/ai/catalogTagRerankProvider.test.ts` (new) — request-shape test confirming no `image_url` content part is ever included (text-only enforcement), plus 5 `validateTagRerankTags` tests including the required **review note 5** mixed valid/invalid response case (valid tags kept, invalid discarded, not a whole-response rejection).
- `functions/src/ai/aiEnrichmentPipeline.test.ts` (new) — 6 tests on the exported `shouldRunTagRerank` heuristic, including the required **review note 6** case: `"off"` mode returns `false` unconditionally regardless of matcher signals, proving the reranker call is never constructed/attempted for the default mode (it is the sole gate before `callTagRerank` is invoked in the pipeline).
- `functions/src/testAiEnrichmentTagRerank.test.ts` (new) — 4 tests on the exported `assertOwnerAdminCaller` gate, including the required **review note 2** case: a non-owner/admin caller (`helper` role) is rejected with `permission-denied`, matching the existing `testAiEnrichmentPlayground`/`updateAiEnrichmentSettings` gate exactly.
- `functions/src/ai/loadAiEnrichmentSettings.test.ts` (new) — 4 tests on `resolveTagRerankMode` covering default-to-`off` for undefined/invalid/non-string input and acceptance of all three valid modes.

All new tests pass. No existing test files' assertions were changed — only additive extensions (new `describe` blocks / new fields on existing fixtures that don't affect prior `deepEqual` assertions, verified by the full pre-existing 163-test AI suite continuing to pass unmodified).

## Manual smoke testing

**Not performed in this session.** Per the plan's §7 manual smoke section (review note 7), the required end-to-end Playground comparison (first-call tags vs. shortlist sent vs. reranker output vs. discarded tags vs. second-call token/cost) and the non-owner/admin Playground rejection check both require an authenticated Studio session against a real or emulated Firebase project with `GEMINI_API_KEY` configured, which is outside this automated implementation session. This must be run by the user (or a follow-up session with app access) before signoff is finalized, per the plan's own acceptance criteria and per repo convention (`docs/AI_RULES.md`: "For UI or frontend changes ... test the feature in a browser before reporting the task as complete").

## Scope confirmation

- No Firebase Functions deploy was performed.
- No Firestore rules, seed data, or migration changes were made.
- No secrets were touched.
- The first AI call's prompt, model, and cost profile (v20) are unchanged — verified by `promptParity.test.ts` continuing to pass unmodified.
- `tagRerankMode` defaults to `"off"` everywhere it is read (settings loader, updateAiEnrichmentSettings validation, renderer constants) — verified by test and code inspection.
