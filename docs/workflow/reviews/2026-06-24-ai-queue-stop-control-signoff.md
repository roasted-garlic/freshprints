# Signoff: AI Processing queue — Stop control, Start label, loading state

**Date:** 2026-06-24  
**Status:** approved

## Summary

Split `isActionLoading` from `isQueueBusy` so **Stop** stays enabled during auto-queue runs. Renamed Pause→Stop with **Processing…** / **Stopping…** labels. Added loop-start stop guard.

## Acceptance criteria

- [x] Stop clickable while queue runs (`disabled={!canStopAutoQueue}` only)
- [x] Stop finishes current design, advances, no next enqueue
- [x] Start shows **Processing…** disabled while running/pausing
- [x] Stop shows **Stopping…** when `queueRunState === "pausing"`
- [x] `isActionLoading` no longer includes `isQueueBusy`

## Tests

`tsc`, `lint`, `aiProcessingQueueSelection.test.ts` — 5/5 pass

## Manual checkpoint

Start queue on 5+ designs → Stop during 2nd processing → confirm only 2 complete.

**Manual result:** pending human QA
