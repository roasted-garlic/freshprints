# Signoff: Switch OpenAI vision model to gpt-5.4-nano

**Date:** 2026-06-25  
**Plan:** `docs/workflow/plans/2026-06-25-openai-gpt-5-4-nano-plan.md`  
**Status:** approved — **production deploy + manual QA pending**

## Summary

Catalog vision enrichment uses `OPENAI_VISION_MODEL_ID = "gpt-5.4-nano"` from `aiEnrichmentConfig.ts` for Chat Completions requests and `aiSuggestions.model` metadata. Prompt remains `catalog-enrich-openai-v8`.

## Acceptance criteria

- [x] Shared config constant `OPENAI_VISION_MODEL_ID`
- [x] Provider uses constant (request + persisted `model` + `modelId`)
- [x] No `gpt-4o-mini` in `functions/` AI provider path
- [x] `functions` build + `catalogTitleRules.test.ts` — 14/14 pass
- [ ] Manual QA 10–15 diverse designs — **pending human**
- [ ] Production functions deploy — **requires human approval**

## Automated tests

| Command | Result |
|---------|--------|
| `cd functions && npm run build` | pass |
| `npx tsx --test src/ai/catalogTitleRules.test.ts` | pass 14/14 |

## Manual test checkpoint

**Environment:** dev/staging with `OPENAI_API_KEY` after functions deploy

### Designs to run (10–15 total)

1. Text-heavy slogan (verify no generic "Text" title)
2. Animal / character art
3. Logo / minimal text
4. Low-contrast text if available

### Compare

- Titles, descriptions, categories, single-word tags vs recent `gpt-4o-mini` runs on same images if available
- `aiSuggestions.model` === `gpt-5.4-nano`

### Please reply with

- `PASS` / `PASS WITH NOTES: …` / `FAIL: …`

## Production deploy

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:onDesignAiEnrichmentQueued
```

Human approval required before production per workflow rules.

## Docs

- ADR-FP-016 in `DECISIONS.md`
- `BACKEND.md`, `DATA_MODEL.md`, `WORKFLOWS.md` updated
