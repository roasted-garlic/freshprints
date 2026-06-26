# Plan: AI catalog output polish — canvas + tag exclusions

**Date:** 2026-06-25  
**Goal:** Omit analysis canvas from catalog copy; filter morbid tags via prompt v9 + server-side list.

## Scope

- `aiTagExclusions.ts` — exclusion list + prompt section + filter
- `catalogTitleRules.ts` — prompt v9, sanitize description/palette
- Providers apply post-processing
- Tests + ADR

## Out of scope

- Canvas color change in `prepareAiAnalysisImage`
- Staff-editable exclusion list UI
- Title/description censorship of skull
