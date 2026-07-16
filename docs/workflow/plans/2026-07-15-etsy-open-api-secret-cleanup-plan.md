# Plan: Etsy Open API secret + unused function cleanup

**Date:** 2026-07-15  
**Project:** `fresh-prints-dev` only  
**Goal:** Delete unused `ETSY_X_API_KEY` and any leftover Open API Cloud Functions after website-first rip.

## Scope

1. Confirm `ETSY_X_API_KEY` / `searchEtsyRecommendations` unused in remaining source.
2. List deployed functions on `fresh-prints-dev`; delete Open API–only leftovers (e.g. `searchEtsyRecommendations`) if still present.
3. Delete Secret Manager secret `ETSY_X_API_KEY` on `fresh-prints-dev` (owner approved).
4. Update BACKEND/SECURITY/workflow notes so docs match reality.
5. Do **not** touch production (`fresh-prints`) secrets/functions without separate owner confirmation.

## Out of scope

- Production Secret Manager / function deletes
- Scrape / AI phases
- Unrelated Portal callables

## Success criteria

- No Open API–only callable left on `fresh-prints-dev`
- `ETSY_X_API_KEY` removed from `fresh-prints-dev` Secret Manager
- Docs no longer claim the secret is pending optional cleanup
- Ops note records what was deleted
