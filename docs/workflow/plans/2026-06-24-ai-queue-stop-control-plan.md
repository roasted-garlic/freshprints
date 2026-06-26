# Plan: AI Processing queue — Stop control, Start label, loading state

**Date:** 2026-06-24  
**Goal:** Enable Stop during auto-queue run; fix Start "Processing…" label; split loading flags.

## Scope

- `useAiReviewInbox.ts` — do not merge `isQueueBusy` into `isActionLoading`
- `useAiProcessingQueue.ts` — rename pause→stop; check stop at loop start
- `AiReviewWorkspace.tsx` — Stop/Processing… labels and disable logic
- `AiReviewPage.tsx` — wire renames
- Tests for stop-before-next-enqueue
