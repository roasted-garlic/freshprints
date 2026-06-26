# Plan: AI Review inbox — tab selection fix + re-run processing UI

**Date:** 2026-06-25

## Problem A
Stale Processing selection pinned to Needs Review queue top on tab switch.

## Problem B
Re-run AI should show full processing stepper, hiding suggestions/form/actions until complete.

## Implementation
1. `isPinnedNeedsReviewDesign` only when `isRerunningAi`
2. Tab change effect: select first design in new tab (unless active rerun)
3. `selectedDesign` only uses `liveDesign` when tab matches or pinned
4. `AiReviewWorkspace`: processing stepper-only mode during needs_review rerun
5. Unit tests for pin/selection helpers

## Files
- `useAiReviewInbox.ts`, `AiReviewWorkspace.tsx`, `AiReviewSuggestionsSection.tsx`
- `aiReviewInboxSelection.ts` + tests
