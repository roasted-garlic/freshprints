# Test Report: Advanced AI Enrichment Controls

Date: 2026-06-29
Goal: `advanced-ai-enrichment-controls`
Status: PASS WITH NOTES

## Scope Verified

- `/settings` now exposes a persisted AI enrichment reasoning-effort selector.
- Saved reasoning effort is validated server-side and loaded through the existing `settings/aiEnrichment` flow.
- Supported reasoning-effort values are limited to `none`, `minimal`, `low`, `medium`, and `high`.
- Default reasoning effort is now `medium`.
- Catalog enrichment keeps server-side `detail: "high"` image input behavior.
- If the current OpenAI Chat Completions path rejects a selected reasoning effort, the server retries once with `low` for that request only.
- `/settings` now exposes an owner/admin AI playground that sends text + image requests through a Cloud Function only.
- Playground requests do not write to `designs`, do not mutate saved settings, and fail safely when `OPENAI_API_KEY` is missing.
- AI Review now uses a compact `Re-run AI` menu button instead of a persistent visible model selector.
- One-off AI Review re-runs still preserve the existing override contract and do not mutate global saved settings.
- Prompt target remains `catalog-enrich-openai-v16`.

## Automated Commands

1. `cd functions && npx tsx --test src/ai/aiEnrichmentConfig.test.ts src/ai/providers/openAiVisionEnrichmentProvider.test.ts src/ai/providers/resolveAiEnrichmentProvider.test.ts src/ai/aiEnrichmentPlayground.test.ts`
   Exit code: `0`

2. `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`
   Exit code: `0`

3. `npx tsc --project functions/tsconfig.json --noEmit`
   Exit code: `0`

4. `cd functions && npm run build`
   Exit code: `0`

5. `npm run lint`
   Exit code: `0`

6. `npx tsc --noEmit`
   Exit code: `0`

7. `npm run build`
   Exit code: `0`

8. `git diff --check`
   Exit code: `0`
   Note: Git reported line-ending warnings only; no diff-check failures.

## Test Evidence

- `functions/src/ai/aiEnrichmentConfig.test.ts`
  - proves reasoning-effort allowlist is `none`, `minimal`, `low`, `medium`, `high`
  - proves default reasoning effort is `medium`
- `functions/src/ai/aiEnrichmentPlayground.test.ts`
  - proves playground request validation rejects unsupported reasoning values and image types
  - proves playground request payload keeps server-side `detail: "high"`
- `functions/src/ai/providers/openAiVisionEnrichmentProvider.test.ts`
  - proves catalog enrichment still sends `detail: "high"`
- `functions/src/ai/providers/resolveAiEnrichmentProvider.test.ts`
  - proves saved settings + one-off override provider selection still resolve correctly after the reasoning-effort contract change
- `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`
  - proves client options expose all three models
  - proves client reasoning-effort options expose `none`, `minimal`, `low`, `medium`, `high`

## Manual QA

Not run in this slice.

Reason:

- No production Firebase deploy was approved or executed.
- The new Settings playground and AI Review rerun menu still require authenticated Studio smoke after a human-approved Functions deploy.

## Notes

- Catalog enrichment uses the saved reasoning effort when available and retries once with `low` only if the OpenAI Chat Completions path rejects the requested effort.
- The Settings AI playground is intentionally stricter than the catalog development provider path: it requires a configured `OPENAI_API_KEY` secret and returns a safe unavailable error instead of fabricating a development response.
- The visible AI Review rerun selector was removed in favor of a compact button menu, but the backend override contract is unchanged.
