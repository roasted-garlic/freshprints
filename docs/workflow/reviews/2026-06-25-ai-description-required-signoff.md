# Signoff: Require non-empty AI catalog descriptions

**Date:** 2026-06-25
**Status:** implementation complete — manual QA and deploy pending

## Summary

Prompt v13 requires non-empty descriptions. Server `resolveCatalogDescription` is authoritative: placeholders and empty post-sanitize values trigger synthesis from visible text, subject/style, title, or generic fallback. Providers and pipeline log `catalog.enrich.description_fallback` when synthesis runs.

## Tests (automated)

| Command | Result |
|---------|--------|
| `cd functions && npm run build` | pass |
| `cd functions && npx tsx --test src/ai/catalogTitleRules.test.ts` | pass |
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |

## Manual Test Checkpoint

**Feature / area:** AI description required for illustration-only designs
**Environment:** local dev or dev Firebase with OpenAI
**Prerequisites:** Import or select designs with NO readable text (single character/mascot art)

### Steps

1. Process or Re-run AI on simple character-only image (no text)
   **Expected:** Suggested Description is a full sentence (subject + style/details), not blank or "-".
2. Process text + illustration design (e.g. raccoon with banners)
   **Expected:** Description includes visible text and/or art copy; not placeholder.
3. Re-run a design that previously showed "-" or empty description
   **Expected:** New `suggestions.description` populated after re-run.

### Pass criteria

- [ ] No blank or dash-only descriptions on test set
- [ ] Fallback sentences are sensible and editable by staff

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

## Deploy (human approval required)

Redeploy functions that include `catalogTitleRules` and enrichment providers (same bundle as prior AI changes).

## Signoff approval

- [x] Automated tests pass
- [ ] Manual test checkpoint completed
- [ ] Production deploy approved
