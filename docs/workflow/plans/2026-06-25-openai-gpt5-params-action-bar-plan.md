# Plan: Fix OpenAI 400 on gpt-5.4-nano + Processing action bar

**Date:** 2026-06-25  
**Goal:** Fix GPT-5 API parameter error, surface OpenAI error details, merge action bar layout, remove Retry All Failed.

## Problem

1. `max_tokens` is unsupported on GPT-5 family → HTTP 400; retry helper discards response body.
2. Previous/Next on second row; user wants same row, right-aligned.
3. Bulk **Retry All Failed** obsolete with sequential one-at-a-time queue.

## Scope

### Functions
- `openAiVisionEnrichmentProvider.ts`: `max_completion_tokens: 600` (headroom for JSON); minimal payload.
- `openAiRetry.ts`: parse error JSON; `OpenAiRequestError` with status; log `openai.request.failed`; map 400 → `openai_invalid_request`.
- Unit test `openAiRetry.test.ts` for `resolveOpenAiErrorCode`.

### Renderer
- `AiReviewWorkspace.tsx` + `ai-review.css`: single row primary left / nav right; auto advance on second row.
- Remove Retry All Failed: workspace, page, inbox hook, enqueue service method.

### Docs
- `WORKFLOWS.md`, `DECISIONS.md` — per-design retry only.

## Out of scope

- Production deploy (human approval)
- Escalation to gpt-5.4-mini
- `temperature`, image detail changes

## Risks

| Risk | Mitigation |
|------|------------|
| 600 tokens insufficient for reasoning + JSON | Bump to 800 if QA fails |
| Error body contains sensitive data | Truncate 300 chars; never log API key |

## Testing

- `functions` build + `openAiRetry.test.ts` + `catalogTitleRules.test.ts`
- Renderer typecheck + lint
- Manual: process one design; verify action bar layout
