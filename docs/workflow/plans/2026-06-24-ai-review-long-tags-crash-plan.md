# Plan: Fix Needs Review crash — AI tags exceed 40 character limit

**Date:** 2026-06-24  
**Phase:** Plan  
**Goal:** Needs Review tab renders designs with long AI-suggested tags without error boundary; pipeline stops persisting invalid tags.

## Problem

`TagChipInput` calls `parseTagsInput` on render, which throws when any tag exceeds `MAX_DESIGN_TAG_LENGTH` (40). `createAiReviewDraftFromDesign` seeds raw `aiSuggestions.tags` from visible-text variations that can exceed 40 characters.

## Scope IN

| File | Change |
|------|--------|
| `designTagNormalizer.ts` | `sanitizeDesignTagsForDisplay`, `formatTagsSanitizationNote` |
| `designFormMapper.ts` | `tryParseTagsInput` for safe render parsing |
| `TagChipInput.tsx` | Use `tryParseTagsInput`; optional `adjustmentHint` |
| `aiReviewFormState.ts` | Sanitize tags when building draft; set adjustment note |
| `aiReviewInbox.types.ts` | Optional `tagsAdjustmentNote` on draft |
| `AiReviewFormPanel.tsx` | Pass adjustment hint to tag input |
| `catalogTitleRules.ts` | Truncate tags to 40 in `pushNormalizedTag` |
| `AiReviewErrorBoundary.tsx` | Clearer title for validation-related errors |
| Tests | `designTagNormalizer.test.ts`, extend `aiReviewFormState.test.ts`, `catalogTitleRules.test.ts` |

## Scope OUT

- Changing the 40-character product limit
- Migrating existing Firestore documents (handled at read/display time)

## Acceptance criteria

- [ ] Needs Review form renders with long AI tags (no error boundary)
- [ ] Approve still validates via `parseTagsInput` at save time
- [ ] New AI enrichments never write tags > 40 chars
- [ ] Staff see inline hint when tags were shortened or omitted

## Risks

- Truncated tags may be less searchable — acceptable; staff can edit before approve.

## Test strategy

- Unit: sanitize truncates/skips; draft creation with long tags; `normalizeAiTags` caps length
- `npx tsc --noEmit`, `npm run lint`, `npx tsx --test` on affected test files
