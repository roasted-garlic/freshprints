# Signoff: Processing tab J/K keyboard shortcuts

**Date:** 2026-06-25  
**Status:** approved

## Summary
`useAiReviewKeyboardShortcuts` enabled whenever a design is selected (all inbox tabs). A/R remain gated by `canApprove`/`canReject`.

## Tests
| Command | Result |
|---------|--------|
| tsc + eslint | pass |
| aiReviewKeyboardShortcuts.test.ts (3) | pass |

## Manual QA
- Processing: J/K change selection; A/R no-op
- Needs Review: J/K/A/R unchanged
- Focus in input disables shortcuts
