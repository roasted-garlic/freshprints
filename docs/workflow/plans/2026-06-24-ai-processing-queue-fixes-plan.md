# Plan: AI Processing queue fixes

**Date:** 2026-06-24  
**Goal:** Fix Start AI no-op, selection skip, misleading hints, and phrase-heavy AI tags.

## Scope

| Area | Fix |
|------|-----|
| `useAiProcessingQueue.ts` | Sync `runStateRef`; loop condition; `findNextAwaitingIndex` for advance |
| `aiProcessingQueueSelection.ts` | Extracted selection helpers + tests |
| `AiReviewWorkspace.tsx` | Hide hint during busy/waiting |
| `aiProcessingOutput.ts` | Stage-specific status copy |
| `catalogTitleRules.ts` | Single-word tags only; prompt v8 |
| Docs | DECISIONS.md, DATA_MODEL.md |

## Out of scope

maxInstances, Needs Review sort, tag-length UI crash
