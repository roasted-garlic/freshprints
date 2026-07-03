# Test Report - Tag Rerank Prompt Editor

- **Date:** 2026-07-03
- **Goal slug:** `tag-rerank-prompt-editor`
- **Plan:** `docs/workflow/plans/2026-07-03-tag-rerank-prompt-editor-plan.md`
- **Review:** `docs/workflow/reviews/2026-07-03-tag-rerank-prompt-editor-plan-review.md`
- **Commit reconciled:** `54272bc` (`Add owner-editable tag rerank prompt and fix false-positive tag matches`)

## Commands Run And Exit Codes

| Command | Exit code | Notes |
|---|---:|---|
| `npx tsx --test functions/src/ai/catalogTagRerankProvider.test.ts functions/src/ai/catalogTagResolver.test.ts functions/src/ai/loadAiEnrichmentSettings.test.ts` | 0 | 61 tests passed. Covered prompt-template fallback/custom substitution, fixed structural prompt sections, tag validation, false-positive short-token guard, last-resort suggestion gate, and settings resolution. |
| `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts src/renderer/src/features/ai-review/utils/aiReviewInbox.test.ts` | 0 | 35 tests passed. Covered Settings prompt constants/resolvers plus touched AI Review utility tests. |
| `npx tsc --noEmit` | 0 | Root TypeScript check passed. |
| `npm run lint` | 0 | Root ESLint check passed with `--max-warnings 0`. |
| `npx vite build` | 0 | Renderer plus Electron main/preload Vite bundles built successfully. Existing manual-chunk circular warning printed, but the command exited 0. |
| `npm --prefix functions run build` | 0 | Functions TypeScript build passed. |
| `git diff --check` | 0 | Passed with the standard Windows LF-to-CRLF warning for `.cursor/workflow/state.md`. |

## Changes Verified By Tests And Build

- `shared/constants/aiEnrichment.constants.ts`
  - Shared default tag-rerank prompt exists.
  - Missing/invalid saved rerank prompts resolve to the shipped default.
  - Custom rerank prompts are preserved.
- `functions/src/ai/catalogTagRerankProvider.ts`
  - Rerank calls accept an optional custom prompt template.
  - Structural sections for image analysis, approved candidates, and response shape remain server-owned.
  - The reranker still validates returned tags against `approvedTagCandidates`.
- `functions/src/ai/catalogTagResolver.ts`
  - Nearby approved-tag candidates are not surfaced from short/common shared tokens such as `ghost`.
  - Last-resort suggested-tag behavior remains covered.
- Settings renderer path
  - Client constants/resolvers preserve valid custom tag-rerank prompts and fall back safely for invalid input.

## Manual Verification

Not run in this reconciliation session.

Recommended manual checks before production deploy or live use:

- Open Settings as an owner and confirm the Tag rerank prompt editor opens, edits draft text, and saves through the existing Save AI enrichment settings button.
- Confirm "Use current default" restores the shipped reranker prompt in the draft.
- Open the Settings Playground tag-rerank override, edit it, run a one-off test, and confirm it does not mutate the saved Settings prompt.

## Scope Confirmation

- No Firebase Functions deploy was performed.
- No Firestore write, seed write, data migration, backfill, rules change, secrets change, dependency change, or external service setup was performed in this reconciliation session.
- The reconciled commit changed AI reranker/settings behavior and added an optional `settings/aiEnrichment.tagRerankPromptTemplate` field. Permanent data-model documentation for that field still needs cleanup in a future docs pass.
