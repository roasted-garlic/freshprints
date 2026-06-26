# Plan: Fix GPT-5 nano empty response / reasoning token budget

**Date:** 2026-06-25  
**Goal:** Restore reliable catalog JSON from GPT-5 nano snapshots without reverting model switch.

## Root cause

`max_completion_tokens: 600` exhausted by hidden reasoning tokens; `message.content` empty on HTTP 200.

## Fix

1. `reasoning_effort: "minimal"` (fallback `"low"` on unsupported)
2. `OPENAI_VISION_MAX_COMPLETION_TOKENS = 2500` in config
3. Optional one-shot retry at 4000 when `finish_reason === "length"` and reasoning ≥ 90% of cap
4. Parse empty responses: log usage, user-safe error, `openai_empty_output` / `openai_token_budget_exhausted`

## Files

- `aiEnrichmentConfig.ts` — token + reasoning constants
- `openAiVisionCompletion.ts` (new) — response parsing, empty-content errors
- `openAiVisionEnrichmentProvider.ts` — request body + retry logic
- `openAiRetry.ts` — map new error types
- Docs: DECISIONS, BACKEND

## Testing

- Unit: empty content + finish_reason length → error message + error code
- Manual: 5+ designs per model after deploy
