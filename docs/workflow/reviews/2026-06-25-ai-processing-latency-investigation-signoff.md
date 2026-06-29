# Signoff: AI Processing latency investigation + fixes

**Date:** 2026-06-25
**Status:** implementation complete — manual QA and deploy pending

## Summary

Addressed slow perceived start and end-to-end AI processing on the Processing tab via timing instrumentation, optimistic client enqueue UI, `minimal` reasoning default (with `low` on empty-output retry), and 60s in-memory cache for settings/categories.

## Changes

| Area | Change |
|------|--------|
| Server timing | `PipelinePhaseTimer`, `loggedAtMs` on enqueue/trigger, OpenAI `durationMs` + token breakdown |
| Reasoning | Primary `minimal`; retry at 4000 tokens uses `low` (ADR-FP-025) |
| Cache | `loadCachedAiEnrichmentSettings` / `loadCachedActiveCategories` (60s TTL) |
| Client UX | `enqueueingDesignId` → optimistic stepper + "Queuing AI processing…" |
| Visibility | Active vision model label on Processing Status section |

## Tests (automated)

| Command | Result |
|---------|--------|
| `functions npm run build` | pass |
| `functions npx tsx --test src/ai/pipelineTiming.test.ts` | pass |
| `functions npx tsx --test src/ai/catalogTitleRules.test.ts` | pass |
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npx tsx --test src/renderer/src/features/ai-review/utils/*.test.ts` | pass |

## Benchmark

**Not executed in CI/agent session** — requires local/dev Firebase project with OpenAI key and imported designs. Human should record before/after timings after deploy.

## Manual Test Checkpoint

**Feature / area:** AI Processing latency (Processing tab)
**Environment:** local dev or dev Firebase project with OpenAI key
**Prerequisites:** 3+ imported designs with derivatives, AI Review Status pending

### Steps

1. Cold start: wait 15+ min idle (or redeploy functions), click **Process image with AI** on one design
   **Expected:** Immediate queuing/processing stepper; note time until stepper advances; total time to suggestions.
2. Warm run: immediately process second design
   **Expected:** Faster than cold run; document delta.
3. **Start AI** with Auto advance on 2–3 designs
   **Expected:** Sequential processing; no multi-minute dead air between click and first UI movement.
4. Check Firebase function logs for one run
   **Expected:** `trigger.fired`, `pipeline.started`, `openai.completion.usage` with `durationMs`, `reasoningEffort`, model.

### Pass criteria

- [ ] Dominant delay identified and addressed or documented with tradeoff
- [ ] Perceived start latency acceptable (immediate feedback)
- [ ] End-to-end faster than pre-fix baseline on same environment

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

## Deploy (human approval required)

```bash
firebase deploy --only functions:onDesignAiEnrichmentQueued,functions:enqueueAiEnrichment,functions:updateAiEnrichmentSettings
```

## Open follow-ups

- `minInstances: 1` on trigger if cold-start gap still dominates after deploy
- Callable→pipeline direct invoke (security/idempotency review)
- Staff "OCR quality" toggle for `low` reasoning on demand

## Signoff approval

- [ ] Automated tests pass (yes, this session)
- [ ] Manual test checkpoint completed
- [ ] Production deploy approved
