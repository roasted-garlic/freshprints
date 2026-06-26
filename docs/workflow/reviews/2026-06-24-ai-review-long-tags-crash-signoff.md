# Signoff: Fix Needs Review crash — AI tags exceed 40 character limit

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-ai-review-long-tags-crash-plan.md`  
**Review:** `docs/workflow/reviews/2026-06-24-ai-review-long-tags-crash-review.md`  
**Status:** approved

## Summary

Needs Review no longer crashes when `aiSuggestions.tags` contain phrases longer than 40 characters. Tags are sanitized at draft seed and render time; the AI pipeline truncates tags before persistence; approve still uses strict `parseTagsInput` validation.

## Changes

| Area | Files |
|------|-------|
| Safe tag sanitization | `designTagNormalizer.ts`, `designFormMapper.ts` |
| Render + draft | `TagChipInput.tsx`, `aiReviewFormState.ts`, `AiReviewFormPanel.tsx`, `aiReviewInbox.types.ts` |
| AI pipeline | `functions/src/ai/catalogTitleRules.ts` |
| Error boundary copy | `AiReviewErrorBoundary.tsx` |
| Styles | `tag-chip-input.css` |
| Tests | `designTagNormalizer.test.ts`, `aiReviewFormState.test.ts`, `catalogTitleRules.test.ts` |

## Acceptance criteria

- [x] Needs Review form renders with long AI tags (no error boundary)
- [x] Approve still validates via `parseTagsInput` at save time (`aiReviewInboxService.ts` unchanged)
- [x] New AI enrichments never write tags > 40 chars (`pushNormalizedTag` truncates)
- [x] Existing bad Firestore data handled via `sanitizeDesignTagsForDisplay` + inline `tagsAdjustmentNote`

## Tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npx tsx --test designTagNormalizer.test.ts aiReviewFormState.test.ts` | pass 7/7 |
| `npx tsx --test functions/src/ai/catalogTitleRules.test.ts` | pass 13/13 |

## Manual test checkpoint

**Feature:** Needs Review with long AI tags  
**Environment:** local dev (`npm run dev`)

### Steps

1. Open AI Processing → Needs Review tab.
2. Select a design whose `aiSuggestions.tags` include a phrase > 40 characters (or seed test data).
3. Confirm Final Catalog Information renders with tag chips (no error boundary).
4. Confirm warning hint appears when tags were shortened.
5. Approve design — confirm save succeeds with tags ≤ 40 chars.

### Pass criteria

- [ ] Form renders without error boundary
- [ ] Adjustment hint visible when applicable
- [ ] Approve succeeds

**Manual result:** pending human QA

## Follow-ups

None required for this scope.
