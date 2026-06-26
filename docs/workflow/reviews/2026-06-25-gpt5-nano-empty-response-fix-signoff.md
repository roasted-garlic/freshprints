# Signoff: Fix GPT-5 nano empty response

**Date:** 2026-06-25  
**Plan:** `docs/workflow/plans/2026-06-25-gpt5-nano-empty-response-fix-plan.md`  
**Status:** approved — deploy + manual QA pending

## Summary

GPT-5 vision requests now use `reasoning_effort: "minimal"` (fallback `"low"`), `max_completion_tokens: 2500`, and optional one-shot retry at 4000 when reasoning exhausts the cap. Empty `message.content` responses log usage/reasoning tokens and throw user-safe errors with `openai_empty_output` or `openai_token_budget_exhausted`.

## Acceptance criteria

- [x] `reasoning_effort` + 2500 token cap in provider
- [x] Empty content diagnostics + error codes
- [x] One-shot higher-cap retry on reasoning budget exhaustion
- [x] Functions tests 28/28 pass
- [ ] Manual: 5+ designs per nano model — **pending human**
- [ ] Production functions deploy — **human approval**

## Automated tests

| Command | Result |
|---------|--------|
| `functions npm run build` | pass |
| AI unit tests (4 suites) | 28/28 pass |

## Manual test checkpoint

1. Deploy functions.
2. Process text-heavy, animal, minimal-text designs with default `gpt-5-nano-2025-08-07`.
3. Switch to `gpt-5.4-nano-2026-03-17` in Settings; repeat.
4. Confirm Needs Review populated; no generic "empty response".
5. Note latency vs prior gpt-4o-mini runs (informational).

Reply: `PASS` / `PASS WITH NOTES` / `FAIL: …`

## Production deploy

```bash
firebase deploy --only functions:onDesignAiEnrichmentQueued,functions:enqueueAiEnrichment
```

## Docs

- ADR-FP-019 in `DECISIONS.md`
- `BACKEND.md` updated
