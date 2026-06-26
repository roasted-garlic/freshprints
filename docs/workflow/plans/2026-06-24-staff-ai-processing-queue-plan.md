# Plan: Staff-controlled sequential AI processing queue

**Date:** 2026-06-24  
**Goal:** Stop auto-enqueue on import; staff manually start sequential AI processing from Processing tab to avoid OpenAI 429 rate limits.

## Scope IN

| Area | Change |
|------|--------|
| Import | Remove `enqueueAfterImport` after derivatives |
| Client queue | `useAiProcessingQueue` state machine; Processing tab controls |
| UI | Start/Pause (auto advance ON), Process image with AI (OFF), retry only on failed |
| Display | Idle designs: "Waiting for AI"; in-progress pipeline unchanged |
| Server | `AI_ENRICHMENT_MAX_INSTANCES = 1` |
| Docs | WORKFLOWS.md, DECISIONS.md ADR |

## Scope OUT

- Multi-user global queue lock
- Removing Cloud Function trigger
- Needs Review / tag fixes

## Acceptance criteria

See user request checklist — manual batch test required at signoff.

## Test strategy

- Unit: queue state machine, eligibility, output status for idle imports
- Manual: 15+ design batch with Start AI
