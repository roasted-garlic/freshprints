# Signoff: Configurable OpenAI vision model switch

**Date:** 2026-06-25  
**Plan:** `docs/workflow/plans/2026-06-25-configurable-openai-vision-model-plan.md`  
**Status:** approved — deploy + manual QA pending

## Summary

Team vision model is stored in `settings/aiEnrichment.visionModelId` with server allowlist (`gpt-5-nano-2025-08-07` default, `gpt-5.4-nano-2026-03-17` alternate). Owner/admin changes model in Settings; pipeline resolves model per run; AI Processing shows read-only label.

## Acceptance criteria

- [x] Missing doc → default `gpt-5-nano-2025-08-07`
- [x] Callable `updateAiEnrichmentSettings` with allowlist enforcement
- [x] Settings dropdown (owner/admin route)
- [x] AI Processing read-only model label
- [x] `aiSuggestions.model` uses resolved per-run model
- [x] Firestore rules: staff read, no client write
- [x] Invalid stored model falls back to default
- [ ] Manual: switch models + process design — **pending human**
- [ ] Production deploy — **human approval**

## Automated tests

| Command | Result |
|---------|--------|
| `functions npm run build` | pass |
| `aiEnrichmentConfig.test.ts` + `openAiRetry.test.ts` + `catalogTitleRules.test.ts` | 22/22 pass |
| `tsc --noEmit` | pass |
| `npm run lint` | pass |

## Manual test checkpoint

1. Deploy functions + Firestore rules.
2. Settings → switch to `gpt-5.4-nano-2026-03-17` → Save.
3. AI Processing header shows new model.
4. Process one design → `aiSuggestions.model` matches selection.
5. Switch back to default; confirm next run uses `gpt-5-nano-2025-08-07`.

Reply: `PASS` / `PASS WITH NOTES` / `FAIL: …`

## Production deploy

```bash
firebase deploy --only functions:updateAiEnrichmentSettings,functions:enqueueAiEnrichment,functions:onDesignAiEnrichmentQueued,firestore:rules
```

Human approval required.

## Docs

- ADR-FP-018 in `DECISIONS.md`
- `BACKEND.md`, `DATA_MODEL.md`, `WORKFLOWS.md` updated
