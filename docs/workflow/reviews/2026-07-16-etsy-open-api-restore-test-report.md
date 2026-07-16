# Test Report: Restore Etsy Open API (link-first)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Goal | etsy-open-api-restore |
| Plan | docs/workflow/plans/2026-07-16-etsy-open-api-restore-plan.md |
| Status | automated_passed; pending_manual; secret_needs_set |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Shared Etsy utils | `npx tsx --test` on `etsyRecommendation*.test.ts` + suggestion lists | PASS (33) |
| Normalize listings | `npx tsx --test functions/src/lib/etsy/normalizeEtsyListings.test.ts` | PASS (8) |
| Suggestion validation | `npx tsx --test functions/src/lib/etsyRecommendationSuggestionValidation.test.ts` | PASS (7) |

Live Open API calls were **not** made from unit tests (mock client only).

---

## Deploy / secret

| Item | Status |
|------|--------|
| `ETSY_X_API_KEY` on `fresh-prints-dev` | **Not configured** (Secret Manager 404) |
| `searchEtsyRecommendations` deploy | **BLOCKED** — Secret Manager has no `ETSY_X_API_KEY` (`In non-interactive mode but have no value for the secret`) |

Owner must run (value not recorded here):

```bash
firebase functions:secrets:set ETSY_X_API_KEY --project fresh-prints-dev
```

Then redeploy `functions:searchEtsyRecommendations` if the first deploy failed due to the missing secret.

---

## Manual

See `docs/workflow/reviews/2026-07-16-etsy-open-api-restore-manual-qa.md`.
