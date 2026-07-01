# Test Report: AI Model Mini Override

Date: 2026-06-29
Goal: `ai-model-mini-override`
Status: PASS WITH NOTES

## Scope Verified

- Server allowlist now accepts all three model ids:
  - `gpt-5.4-nano-2026-03-17`
  - `gpt-5-nano-2025-08-07`
  - `gpt-5.4-mini-2026-03-17`
- Default remains `gpt-5.4-nano-2026-03-17`
- `/settings` constants and client resolution accept `gpt-5.4-mini-2026-03-17`
- AI Review one-off re-run override is validated server-side and passed through the callable path
- Pipeline/provider resolution prefers the one-off override for that run only
- Prompt version remains `catalog-enrich-openai-v16`
- Server-side OpenAI image payload keeps `detail: "high"`
- `aiSuggestions.model` remains the source of truth for the actual model used per run

## Automated Commands

1. `cd functions && npx tsx --test src/ai/aiEnrichmentConfig.test.ts src/ai/enqueueAiEnrichmentValidation.test.ts src/ai/providers/openAiVisionEnrichmentProvider.test.ts src/ai/providers/resolveAiEnrichmentProvider.test.ts`
   Exit code: `0`

2. `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`
   Exit code: `0`

3. `npm run lint`
   Exit code: `0`

4. `npx tsc --noEmit`
   Exit code: `0`

5. `npm run build`
   Exit code: `0`

6. `git diff --check`
   Exit code: `0`

## Test Evidence

- `functions/src/ai/aiEnrichmentConfig.test.ts`
  - proves default remains `gpt-5.4-nano-2026-03-17`
  - proves all three model ids are allowlisted
  - proves override wins over saved settings for a single run
- `functions/src/ai/enqueueAiEnrichmentValidation.test.ts`
  - proves `visionModelIdOverride` is accepted only for allowlisted ids
  - proves invalid override ids are rejected
- `functions/src/ai/providers/resolveAiEnrichmentProvider.test.ts`
  - proves one-off override resolves to `gpt-5.4-mini-2026-03-17`
  - proves configured default remains unchanged when no override is present
- `functions/src/ai/providers/openAiVisionEnrichmentProvider.test.ts`
  - proves the OpenAI image payload still includes `detail: "high"`
- `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`
  - proves the client settings list includes the mini option
  - proves saved settings selection can persist `gpt-5.4-mini-2026-03-17`

## Manual QA

Not run in this slice.

Reason:

- The approved scope did not include production deploy.
- Authenticated Studio smoke for saved settings persistence and live one-off re-run behavior requires a later human-approved deploy/test step.

## Notes

- The AI Review UI now exposes a one-off re-run model selector without writing to global settings.
- The queue stores transient `aiRequestedVisionModelId` metadata and clears it after success or failure.
