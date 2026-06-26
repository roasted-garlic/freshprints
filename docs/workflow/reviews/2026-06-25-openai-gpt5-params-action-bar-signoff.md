# Signoff: Fix OpenAI 400 on gpt-5.4-nano + Processing action bar

**Date:** 2026-06-25  
**Plan:** `docs/workflow/plans/2026-06-25-openai-gpt5-params-action-bar-plan.md`  
**Status:** approved — production deploy + manual QA pending

## Summary

- GPT-5 vision requests use `max_completion_tokens: 600` instead of unsupported `max_tokens`.
- `OpenAiRequestError` surfaces parsed OpenAI `error.message`; HTTP 400 maps to `openai_invalid_request`.
- Processing tab: primary actions left, Previous/Next right on one row; Auto advance on second row.
- **Retry All Failed** removed; per-design **Retry AI Processing** retained.

## Acceptance criteria

- [x] `max_completion_tokens` in provider; minimal payload
- [x] Error parsing + `openai_invalid_request` for 400
- [x] Action bar layout merged
- [x] Retry All Failed removed
- [x] Functions tests 19/19 pass; renderer typecheck + lint pass
- [ ] Manual: process one design end-to-end — **pending human**
- [ ] Manual: action bar layout on Processing + Needs Review — **pending human**
- [ ] Production functions deploy — **human approval required**

## Automated tests

| Command | Result |
|---------|--------|
| `cd functions && npm run build` | pass |
| `npx tsx --test src/ai/openAiRetry.test.ts src/ai/catalogTitleRules.test.ts` | 19/19 pass |
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |

## Manual test checkpoint

1. Deploy functions to dev/staging.
2. Process one design → Needs Review with title/description/tags.
3. Confirm Processing tab: Start AI / Retry left; Previous/Next right; Auto advance below.
4. If a 400 occurs, confirm UI shows OpenAI message (not only status code).

Reply: `PASS` / `PASS WITH NOTES` / `FAIL: …`

## Production deploy

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:onDesignAiEnrichmentQueued
```

Human approval required.

## Docs

- ADR-FP-017 in `DECISIONS.md`
- `WORKFLOWS.md`, `BACKEND.md` updated
