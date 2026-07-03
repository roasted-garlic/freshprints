# Signoff - AI Settings Prompt Default Sync

- **Date:** 2026-07-03
- **Goal slug:** `ai-settings-prompt-default-sync`
- **Status:** PASS (implementation + local verification; deploy remains a separate human checkpoint)
- **Plan:** `docs/workflow/plans/2026-07-03-ai-settings-prompt-default-sync-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-03-ai-settings-prompt-default-sync-test-report.md`

## What changed

- Added `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20` and shared stale-default resolution in `shared/constants/aiEnrichment.constants.ts`.
- Updated the renderer Settings service to resolve a saved copy of the previous v20 default to the current v21 default before showing the prompt editor.
- Updated the Functions settings loader to use the same shared prompt resolution for actual AI Processing.
- Added `Use current default` to the unlocked Settings prompt editor so an owner/admin can deliberately load the current shipped prompt into the textarea before saving.
- Added focused renderer and Functions tests for stale default resolution, whitespace drift, invalid fallback, and custom-prompt preservation.

## Verification

- 13/13 targeted renderer/settings tests passed.
- 12/12 targeted Functions settings-loader tests passed.
- `npx tsc --noEmit` passed at the repo root.
- `npm run lint` passed.
- `npm --prefix functions run build` passed.
- `npx vite build` passed for renderer plus Electron main/preload bundles, with the existing manual-chunk circular warning.
- `git diff --check` passed with only standard Windows LF/CRLF warnings.

## Scope boundaries

- No Firebase Functions deploy was performed.
- No Firestore write or data migration was performed.
- No prompt wording change was made beyond the already-approved v21 default.
- No resolver, reranker, suggestion-authoring, category/tag data, secrets, rules, seed, Imports, Design Library, Print Requests, Print Runs, or Portal changes were made.
- Valid custom prompts are preserved and not silently overwritten.

## Outstanding human checkpoints

1. Firebase Functions deploy is required before the Functions runtime path uses this resolver in any deployed environment. Do not deploy without explicit human approval.
2. If the packaged desktop app is distributed separately from this working tree, the renderer change must be included in the next app build/release before other machines see the Settings UI update.

## Result

Signed off locally. Opening Settings on this code path will show the v21 business-context paragraph when the saved prompt is only a stale copy of the previous shipped default, and owners still have an explicit `Use current default` action for custom prompt cases.
