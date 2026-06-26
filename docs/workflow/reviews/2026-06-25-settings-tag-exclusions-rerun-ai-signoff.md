# Signoff: Settings tag exclusions + Needs Review re-run AI

**Date:** 2026-06-25  
**Status:** approved — deploy + manual QA pending

## Summary

Owner/admin manage `additionalTagExclusions` merged with `BASE_AI_TAG_EXCLUSIONS`. Pipeline builds prompt per run with effective list. Needs Review **Re-run AI** regenerates suggestions in place via `rerunFromReview`.

## Tests

| Command | Result |
|---------|--------|
| functions build + 28 unit tests | pass |
| tsc + eslint | pass |

## Manual QA

1. Settings → add `witch` exclusion → save
2. Re-run AI on Needs Review design → `witch` not in tags
3. Re-run with unsaved form edits → confirm dialog
4. Stay on Needs Review tab during re-run

## Deploy

```bash
firebase deploy --only functions:updateAiEnrichmentSettings,functions:enqueueAiEnrichment,functions:onDesignAiEnrichmentQueued
```
