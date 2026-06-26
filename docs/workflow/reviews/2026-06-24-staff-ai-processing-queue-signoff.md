# Signoff: Staff-controlled sequential AI processing queue

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-staff-ai-processing-queue-plan.md`  
**Review:** `docs/workflow/reviews/2026-06-24-staff-ai-processing-queue-review.md`  
**Status:** approved

## Summary

Import no longer auto-enqueues AI. Staff control processing from the Processing tab via **Start AI** / **Pause AI** (auto advance ON) or **Process image with AI** (OFF). Client orchestrates one enqueue at a time; Cloud Functions `maxInstances` set to 1.

## Acceptance criteria

- [x] Import path does not call `enqueueAfterImport`
- [x] Idle imports show **Waiting for AI** on Processing tab
- [x] Auto advance ON: Start/Pause sequential queue
- [x] Auto advance OFF: single-design Process button with manual advance
- [x] Retry buttons only on failed designs
- [x] `AI_ENRICHMENT_MAX_INSTANCES = 1`
- [ ] Manual batch test (15+ designs, Start AI) — pending human QA

## Tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npx tsx --test` aiProcessingQueue, aiReviewInbox, aiReviewInboxEligibility | pass 29/29 |

## Manual test checkpoint

**Feature:** Batch import + Start AI sequential queue  
**Environment:** local dev (`npm run dev`) + deployed functions with `maxInstances: 1`

### Steps

1. Import 15+ designs (batch or folder).
2. Open AI Processing → Processing tab — all show **Waiting for AI**, none processing.
3. Enable **Auto advance**, select a design mid-queue, click **Start AI**.
4. Confirm designs process one at a time; majority succeed without 429 storm.
5. Click **Pause AI** mid-run — current design finishes, selection advances, next is not enqueued.
6. Disable **Auto advance**, click **Process image with AI** — one design runs; must click again for next.
7. Confirm failed designs show **Retry AI Processing** only.

### Please reply with

- `PASS` / `FAIL: [description]` / `PASS WITH NOTES: [notes]`

## Deploy note

Production requires human-approved deploy: `firebase deploy --only functions:enqueueAiEnrichment,functions:onDesignAiEnrichmentQueued`
