# Review: Fix OpenAI 400 on gpt-5.4-nano + Processing action bar

**Date:** 2026-06-25  
**Plan:** `docs/workflow/plans/2026-06-25-openai-gpt5-params-action-bar-plan.md`  
**Status:** approved

## Assessment

Root cause for 400 is well-supported: GPT-5 Chat Completions use `max_completion_tokens` not `max_tokens`. Surfacing parsed `error.message` improves operator debugging without exposing secrets.

Layout and Retry All Failed removal align with ADR-FP-014 sequential queue.

## Required changes

None blocking.

## Security

- Truncate error messages before persist/log.
- Do not include Authorization header in logs.

## Approval

Proceed to implement.
