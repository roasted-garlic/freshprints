# Signoff: AI Processing queue fixes

**Date:** 2026-06-24  
**Status:** approved

## Summary

Fixed Start AI no-op (sync `runStateRef` + `shouldAutoQueueContinue` loop), selection skip (`resolveAdvanceIndexAfterProcessing`), misleading hints (`isQueueBusy` / waiting state), stage-specific status copy, and single-word AI tags (prompt v8 + `normalizeAiTags`).

## Acceptance criteria

- [x] Start AI loop runs (`runStateRef` set synchronously; `pauseRequestedRef` for pause)
- [x] Selection advance uses `findNextAwaitingIndex` — no skip after success
- [x] Idle hint hidden during `isQueueBusy` or active processing
- [x] Stage-specific processing messages
- [x] Single-word tags only; visible text not injected
- [x] `catalogTitleRules.test.ts` + `aiProcessingQueueSelection.test.ts` pass

## Tests

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `aiProcessingQueueSelection.test.ts` + `aiReviewInbox.test.ts` | 23/23 |
| `catalogTitleRules.test.ts` | 14/14 |

## Manual checkpoint

Process 3 designs (manual + auto); pause mid-run; verify status copy and Needs Review tags.

**Manual result:** pending human QA

## Docs

- ADR-FP-015 in `DECISIONS.md`
- `DATA_MODEL.md` tag section updated
