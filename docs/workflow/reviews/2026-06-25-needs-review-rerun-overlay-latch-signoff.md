# Signoff: Needs Review Re-run overlay latch + eligibility

**Date:** 2026-06-25  
**Status:** approved — manual QA pending

## Summary

Fixed overlay flash by replacing stale-ready effect with rerun session latch (`priorGeneratedAt`). Overlay driven solely by `isRerunningAi` on Needs Review. Client eligibility matches server via `isDesignRerunnableFromNeedsReview`. Re-run button disabled while latched.

## Tests

| Command | Result |
|---------|--------|
| `tsc --noEmit` | pass |
| `eslint` | pass |
| aiReviewRerunSession (4) + eligibility (6) + selection (6) | 16/16 pass |
| enqueueAiEnrichmentValidation (4) | 4/4 pass |

## Server changes
None — client latch + eligibility sufficient.

## Manual Test Checkpoint

**Feature / area:** Needs Review Re-run AI overlay + eligibility  
**Why automated tests are insufficient:** Firestore subscription + callable + pipeline timing  
**Environment:** local dev with Firebase emulators or dev project  
**Prerequisites:** At least one design in Needs Review with existing AI suggestions

### Steps
1. Open AI Review → Needs Review → select design with suggestions → click Re-run AI  
   **Expected:** Overlay stays visible through full pipeline; new suggestions replace old; overlay then hides; draft form matches new suggestions.
2. Click Re-run once only (do not double-click)  
   **Expected:** No "Only imported designs in Needs Review can be re-run from the review workspace." error.
3. Switch to Processing tab  
   **Expected:** No preview overlay; inline status behavior unchanged.
4. Return to Needs Review and Re-run a failed design (if available)  
   **Expected:** Same latch behavior; overlay until terminal state.
5. Optional: Rapid double-click Re-run  
   **Expected:** Button disabled after first click; no second callable; no eligibility error.

### Pass criteria
- [ ] Overlay latches from click until UI reflects new result
- [ ] No eligibility error on single legitimate click
- [ ] Processing tab unaffected
- [ ] No double-submit

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
