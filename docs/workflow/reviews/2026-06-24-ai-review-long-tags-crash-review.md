# Review: Fix Needs Review crash — AI tags exceed 40 character limit

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-ai-review-long-tags-crash-plan.md`  
**Status:** approved

## Summary

Approved. Safe display sanitization at draft seed and render paths; strict validation preserved at approve/save. Server-side tag cap prevents recurrence.

## Notes

- Truncate (not skip) over-length tags for display to preserve partial search value.
- `parseTagsInput` remains strict for save-time validation.
