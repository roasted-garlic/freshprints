# Test Report - AI Settings Prompt Default Sync

- **Date:** 2026-07-03
- **Goal slug:** `ai-settings-prompt-default-sync`
- **Plan:** `docs/workflow/plans/2026-07-03-ai-settings-prompt-default-sync-plan.md`

## Commands run and exit codes

| Command | Exit code | Notes |
|---|---:|---|
| `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` | 0 | Targeted renderer/settings coverage: 13/13 tests passed. Includes stale v20 default -> current v21 default, whitespace drift, and custom-prompt preservation. |
| `npx tsx --test functions/src/ai/loadAiEnrichmentSettings.test.ts` | 0 | Targeted Functions settings-loader coverage: 12/12 tests passed. Includes stale v20 default -> current v21 default, custom-prompt preservation, and invalid fallback. |
| `npx tsc --noEmit` | 0 | Root TypeScript check passed. |
| `npm run lint` | 0 | Root ESLint check passed with `--max-warnings 0`. |
| `npm --prefix functions run build` | 0 | Functions TypeScript build passed. |
| `npx vite build` | 0 | Renderer plus Electron main/preload Vite bundles built successfully. The existing manual-chunk circular warning still printed, but the command exited 0. |
| `git diff --check` | 0 | Passed with only standard Windows LF/CRLF conversion warnings. |

## Changes verified

- `shared/constants/aiEnrichment.constants.ts` now keeps a known v20 default prompt constant and resolves stale saved copies of that exact previous default to the current v21 default prompt.
- `src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts` now uses the shared prompt resolver, so Settings displays the v21 business-context paragraph when Firestore contains only the old shipped default.
- `functions/src/ai/loadAiEnrichmentSettings.ts` now uses the same shared prompt resolver, so actual AI Processing also resolves stale saved old-default content to the current v21 default.
- `src/renderer/src/features/settings/pages/SettingsPage.tsx` now adds an explicit `Use current default` action in the unlocked prompt editor. It only updates the draft text; the existing save flow remains the only write path.
- Focused tests prove stale old-default content is updated, custom valid prompt text is preserved, and invalid prompt values still fall back to the current default.

## Scope confirmation

- No Firebase Functions deploy was performed.
- No Firestore writes, data migrations, seed writes, rules changes, secrets changes, or external service setup were performed.
- No category resolver, tag resolver, tag reranker, suggestion-authoring, category data, tag data, Imports, Design Library, Print Requests, Print Runs, or Portal behavior was changed.
- Custom owner-authored prompts remain authoritative unless the owner explicitly uses `Use current default` and saves.
