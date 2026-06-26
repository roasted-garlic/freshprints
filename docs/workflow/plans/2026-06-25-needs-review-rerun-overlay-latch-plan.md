# Plan: Needs Review Re-run overlay latch + eligibility

**Date:** 2026-06-25

## Problems
1. Overlay flashes off — effect clears `isRerunningAi` on stale `ready` before Firestore updates
2. Eligibility error on double-submit — button re-enabled while design already `pending`

## Solution
1. **Rerun session ref** — store `priorGeneratedAt` at click; complete only when `generatedAt` changes or `failed`
2. **Overlay** — drive by `isRerunningAi` only on Needs Review tab
3. **Eligibility** — `isDesignRerunnableFromNeedsReview` matches server (`needs_review` + imported + suggestions/failed)
4. **Button** — `disabled={isRerunningAi}`; rebuild draft on latch clear

## Server
No change unless client fixes insufficient (prefer client-only).

## Tests
- `aiReviewRerunSession.ts` — stale ready vs complete
- `aiReviewInboxEligibility` — pending design rejected
- Existing enqueue + selection tests
