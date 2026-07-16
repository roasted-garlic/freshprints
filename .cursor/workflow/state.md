## Current Goal
etsy-open-api-restore

## Current Mode
managed-phase

## Phase
test

## Plan Status
complete

## Review Status
approved_with_changes

## Implementation Status
complete

## Test Status
pending_manual

## Signoff Status
pending

## Human Checkpoint Required
yes

## Human Checkpoint Reason
1) **Secret:** `ETSY_X_API_KEY` is missing on `fresh-prints-dev` (deploy blocked). Run `firebase functions:secrets:set ETSY_X_API_KEY --project fresh-prints-dev` (do not paste the value in chat), then ask to redeploy `searchEtsyRecommendations`.
2) **Functions redeploy required** for listing images (hydrate `listing_ids` comma-separated fix) and wording max 80 server validation.
3) **Manual QA:** After secret + redeploy, hard-refresh Portal and retest quote max 80, wider results, listing thumbnails. Reply PASS / FAIL / PASS WITH NOTES.

## Allowed Actions
Await owner secret set + redeploy request; answer questions; record feedback; read logs (redact secrets). No production. No scrape. No commit unless asked.

## Forbidden Actions
Production deploy; ScraperAPI/Firecrawl; commit unless asked; print secret values; signoff before secret deploy + manual QA recorded.

## Next Required Step
Owner: set `ETSY_X_API_KEY` on fresh-prints-dev (no value in chat), then say “redeploy”; after deploy, hard-refresh Portal and run manual QA below — reply PASS/FAIL.

## DONE
no

## Last Completed Step
2026-07-16 — Owner UX fixes: wording max 52→80; results width widened; hydrate listing_ids comma-separated (image root cause). Unit tests 22/22 PASS. Functions redeploy still required for images + server wording max.

## Plan Path
docs/workflow/plans/2026-07-16-etsy-open-api-restore-plan.md

## Review Path
docs/workflow/reviews/2026-07-16-etsy-open-api-restore-review.md

## Test Report Path
docs/workflow/reviews/2026-07-16-etsy-open-api-restore-test-report.md

## Manual QA Path
docs/workflow/reviews/2026-07-16-etsy-open-api-restore-manual-qa.md

## Decision Log
- 2026-07-16 — **Owner fixes (quote 80 / width / images):** `ETSY_RECOMMENDATION_MAX_WORDING_LENGTH` 52→80 + DATA_MODEL + validation tests; results page 56→64rem and `.etsy-results` shell override 700px→62rem + grid minmax 11.5→13rem; **image root cause:** batch hydrate used repeated `listing_ids` query params (ADR-FP-087) — fixed to comma-separated via `buildEtsyBatchListingsQuery`. Automated: 22/22 PASS. **Functions redeploy required** for images + server accept 53–80 chars. Portal CSS/copy apply after hard-refresh without redeploy. Does not unblock Open API secret.
- 2026-07-16 — **Choice cards tweak (Portal-only, no deploy):** `.etsy-route-card` radius `--radius-lg`→`--radius-md` (0.75→0.5rem); watermark 68%→56% + inward position; card 3 `Handshake`→`Palette`. Agent fixture visual PASS; live hard-refresh needs signed-in session. Does not unblock Open API secret/deploy.
- 2026-07-16 — **Questionnaire warning copy (Portal + shared wording max, no deploy):** Subject/tone/quote hints → amber warning callouts (no “Etsy” in strings); `ETSY_RECOMMENDATION_MAX_WORDING_LENGTH` 60→52 (fits “Apparently I have an attitude, who knew!?” + buffer). Superseded by 80-char owner fix above.
- 2026-07-16 — **UX polish v2 (Portal-only, no deploy):** Choice card icons → large low-opacity watermark (~68% width, opacity 0.18 active / 0.12 coming-soon), absolute lower-right behind text; min-height 17.5→15.5rem. Awaiting owner hard-refresh retest PASS/FAIL. Does not unblock Open API secret/deploy.
- 2026-07-16 — **UX polish (Portal-only, no deploy):** Custom Designs choice cards taller + centered lucide icons (Binoculars / Sparkles / Handshake) in `EtsyRouteChoosePath` + `etsy-recommendations.css`. Superseded by watermark approach above.
- 2026-07-16 — **Implement complete:** restored `searchEtsyRecommendations`, live client, normalizer, rate limits, Portal listing grid under Primary/Broader links; copy avoids “Etsy” in link/fallback CTAs; soft-fail when key empty.
- 2026-07-16 — **Deploy blocked:** `ETSY_X_API_KEY` not found on `fresh-prints-dev` (deleted 2026-07-15 ops cleanup). Owner must `firebase functions:secrets:set ETSY_X_API_KEY --project fresh-prints-dev` then redeploy.
- 2026-07-16 — Automated tests PASS (shared 33 + normalize 8 + suggestion validation 7).
- 2026-07-16 — **ADR-FP-087l:** Open API restored under link-first; scrape stays ripped (087j); admin suggestions kept (087k).
- 2026-07-16 — Owner decision recorded; prior admin-suggest-lists QA left open when this phase started.
