# Plan: AI Processing latency investigation + fixes

**Date:** 2026-06-25

## Goal

Restore fast, predictable AI processing on the Processing tab with measurable timings and targeted fixes.

## Investigation findings (code review)

| Bottleneck | Likelihood | Evidence |
|------------|------------|----------|
| OpenAI GPT-5 + reasoning `low` | **High** | ADR-FP-023 raised effort; dual call on empty-output retry |
| Firestore trigger cold start | **Medium** | No minInstances; gap enqueue → trigger → pipeline.started |
| Client perceived latency | **High** | No UI until Firestore `queued` stage arrives |
| Settings/categories per run | **Low** | 2 Firestore reads every pipeline |
| maxInstances=1 queue | **By design** | ADR-FP-017 |

**Dominant delay (pre-fix):** OpenAI reasoning `low` + client wait for Firestore stage. Cold start adds seconds on idle instances.

## Implementation (approved scope)

1. **Timing logs** — phase `durationMs`, `openai.request.started`, enriched `openai.completion.usage`
2. **Client optimistic enqueue** — immediate stepper / "Queuing…" before callable returns
3. **Reasoning `minimal` default** — `low` only on empty-output retry (ADR-FP-025)
4. **60s in-memory cache** — settings + active categories per function instance
5. **Vision model label** on Processing Status section
6. **No minInstances / no callable→pipeline merge** — human checkpoint deferred

## Benchmark

Document before/after in signoff after deploy (manual; not fabricated in agent session).
