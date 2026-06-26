# Plan: Switch OpenAI vision model to gpt-5.4-nano

**Date:** 2026-06-25  
**Goal:** Replace `gpt-4o-mini` with `gpt-5.4-nano` for catalog AI enrichment via centralized config.

## Scope

- `aiEnrichmentConfig.ts` — `OPENAI_VISION_MODEL_ID`
- `openAiVisionEnrichmentProvider.ts` — use constant
- Docs: BACKEND, DATA_MODEL, DECISIONS, WORKFLOWS

## Out of scope

- nano → mini escalation, max_tokens, image detail changes

## QA

Manual 10–15 design comparison before production signoff.
