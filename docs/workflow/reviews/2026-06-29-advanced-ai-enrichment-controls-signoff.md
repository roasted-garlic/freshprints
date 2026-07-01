# Signoff: Advanced AI Enrichment Controls

Date: 2026-06-29
Goal: `advanced-ai-enrichment-controls`
Recommendation: PASS WITH NOTES

## Decision

Sign off the local implementation as PASS WITH NOTES.

## Passed

- `/settings` now persists both `visionModelId` and `reasoningEffort` through the existing callable/settings document flow.
- Reasoning effort is limited to `none`, `minimal`, `low`, `medium`, and `high`, with `medium` as the default.
- Catalog enrichment keeps server-side `detail: "high"` behavior and now retries once with `low` if the selected reasoning effort is rejected by the current OpenAI request path.
- `/settings` now includes an owner/admin AI playground for one-off text + image testing through Cloud Functions only.
- Playground requests do not write to `designs`, do not mutate saved settings, and do not expose secrets to the client.
- AI Review now uses a compact `Re-run AI` action menu instead of a persistent visible model selector.
- One-off rerun overrides still do not mutate saved global settings.
- Prompt target remains `catalog-enrich-openai-v16`.
- Targeted tests, lint, renderer typecheck, Functions typecheck/build, app build, and `git diff --check` all passed locally.

## Notes

- Production Firebase Functions deploy was not run in this slice.
- Authenticated Studio smoke is still required to validate saved reasoning persistence, live playground behavior, and live one-off rerun behavior against deployed Functions.
- No prompt rewrite, automatic fallback routing system, Firestore rules weakening, secret exposure, or design-lifecycle pollution was introduced.
