# Signoff: AI Review tab selection + re-run processing UI

**Date:** 2026-06-25  
**Status:** approved — manual QA pending

## Summary

Fixed stale Processing selection appearing in Needs Review queue on tab switch. Re-run AI now shows preview + processing stepper only until terminal state.

## Changes

- `resolveIsPinnedNeedsReviewDesign` — pin only when `isRerunningAi`
- Tab change selects first design in new tab list
- `shouldUseLiveDesignForSelection` — no stale cross-tab live design in workspace
- `AiReviewWorkspace` — `showNeedsReviewProcessingState` hides suggestions/form/actions

## Tests

| Command | Result |
|---------|--------|
| `tsc --noEmit` | pass |
| `eslint` | pass |
| aiReviewInboxSelection + aiReviewInbox tests | 25/25 pass |

## Manual QA

1. Processing → select PENDING design → Needs Review → first needs_review item selected, queue order correct
2. Rejected tab switch → first rejected item selected
3. Re-run AI → only preview + stepper → on complete, suggestions + form + actions return
4. Re-run failure → full sections with failed state + Re-run AI available
