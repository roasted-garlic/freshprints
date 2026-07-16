# Ops note: Etsy Open API secret + function cleanup

**Date:** 2026-07-15  
**Project:** `fresh-prints-dev`  
**Owner approval:** Explicit request to delete unused `ETSY_X_API_KEY` and unused Open API Cloud Functions.

## Functions

| Name | Action |
|------|--------|
| `searchEtsyRecommendations` | **Already absent** from `firebase functions:list --project fresh-prints-dev` (removed in website-first rip deploy). No delete needed. |
| `submitEtsyRecommendationRequest` | Kept |
| `completeEtsyRecommendationRequest` | Kept |
| `cancelEtsyRecommendationRequest` | Kept |

No other Etsy Open API–specific callables found on `fresh-prints-dev`.

## Secret

| Item | Result |
|------|--------|
| Secret name | `ETSY_X_API_KEY` |
| Project | `fresh-prints-dev` |
| Action | Destroyed versions `@3`, `@2`, `@1` via `firebase functions:secrets:destroy … -f` |
| Confirm | Subsequent `functions:secrets:get` → **404** Secret not found (exit 1, expected) |

Secret values were never printed.

## Production

| Check | Result |
|-------|--------|
| `firebase functions:secrets:get ETSY_X_API_KEY --project fresh-prints` | **403** Service Usage / no permission — **not deleted** |
| Prod function list / secret delete | Skipped pending access + explicit owner confirmation |

## Repo / docs updated

- `docs/architecture/BACKEND.md` — cleanup recorded
- `docs/standards/SECURITY.md` — removed broken “legacy may exist” table insert; noted deletion
- `docs/project/DECISIONS.md` — ADR-FP-087f follow-up
- Prior phase signoff follow-up marked done
- `.cursor/workflow/state.md` + `references/project-chatgpt-handoff/CURRENT-STATE.md`

## Commands (summary)

| Command | Exit |
|---------|------|
| `firebase functions:list --project fresh-prints-dev` | 0 |
| `firebase functions:secrets:get ETSY_X_API_KEY --project fresh-prints-dev` (before) | 0 (versions 1–3 ENABLED) |
| `firebase functions:secrets:destroy ETSY_X_API_KEY --project fresh-prints-dev -f` | 0 (destroyed @3) |
| `firebase functions:secrets:destroy ETSY_X_API_KEY@2 … -f` | 0 |
| `firebase functions:secrets:destroy ETSY_X_API_KEY@1 … -f` | 0 (then destroyed secret) |
| `firebase functions:secrets:get ETSY_X_API_KEY --project fresh-prints-dev` (after) | 1 (404) |
| `firebase functions:secrets:get ETSY_X_API_KEY --project fresh-prints` | 1 (403) |
| `gcloud` | Not on PATH; used Firebase CLI instead |
