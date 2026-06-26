# Plan: Settings tag exclusions + Needs Review re-run AI

**Date:** 2026-06-25

## Part A
- BASE_AI_TAG_EXCLUSIONS in shared constants + Firestore additionalTagExclusions
- Per-run `buildCatalogEnrichmentSystemPrompt(exclusions)`
- Settings UI with built-in chips + TagChipInput

## Part B
- `rerunFromReview` callable flag for needs_review designs
- Re-run AI button in AI Suggestions footer (in-place, no tab switch)
- Unsaved draft confirm dialog
