# Plan: Enable J/K keyboard shortcuts on Processing tab

**Date:** 2026-06-25

## Goal
Enable J/K navigation on Processing and Rejected tabs when a design is selected.

## Change
- `AiReviewPage.tsx`: `isEnabled: Boolean(inbox.selectedDesign)` (all inbox tabs)
- A/R remain gated by `canApprove`/`canReject` inside hook (false on Processing/Rejected)
- J/K not disabled during `isActionLoading` — navigation mid-action is acceptable; dirty-draft guard still applies on selection change

## Files
- `src/renderer/src/features/ai-review/pages/AiReviewPage.tsx`
