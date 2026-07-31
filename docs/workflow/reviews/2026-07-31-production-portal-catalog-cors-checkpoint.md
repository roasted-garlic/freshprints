# Checkpoint: Production Portal catalog CORS — owner retest

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-catalog-cors-plan.md` |
| Review | `docs/workflow/reviews/2026-07-31-production-portal-catalog-cors-review.md` (`approved`) |
| Owner result | **PASS** |

---

## Summary

Production Storage CORS was applied to `gs://fresh-prints-prod.firebasestorage.app` after
`APPROVE PRODUCTION STORAGE CORS`. Owner confirmed Portal Discover no longer shows
`Catalog discovery is temporarily unavailable.` on the production App Hosting URL with an empty
catalog (0 ready designs).

## Verification recorded

| Check | Result |
|-------|--------|
| Pre-apply bucket CORS | `null` |
| Post-apply config | `storage.cors.production.json` (GET/HEAD; hosted.app + apex + www) |
| ACAO probe (agent) | Matching `Access-Control-Allow-Origin` for all three origins |
| Owner Discover retest | **PASS** |
| `rebuildCatalogSnapshots` rerun | Not performed (not required) |
| Rules / Functions / App Hosting deploy for this fix | None |

## Residual notes

- `https://myprintrequest.com` remains Coming Soon until separate custom-domain work.
- Broader Phase G production smoke checklist (§3.16) continues after this catalog-CORS blocker.
