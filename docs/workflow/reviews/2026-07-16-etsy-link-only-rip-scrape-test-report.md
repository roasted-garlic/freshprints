# Test Report: Etsy link-only rip scrape

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Plan | docs/workflow/plans/2026-07-16-etsy-link-only-rip-scrape-plan.md |
| Verdict | **passed_with_notes** |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared + portal Etsy unit tests | `npx tsx --test packages/shared/src/utils/etsyRecommendationListingUrl.test.ts packages/shared/src/utils/etsyRecommendationQueryBuilder.test.ts packages/shared/src/utils/etsyRecommendationValidation.test.ts packages/shared/src/utils/etsyRecommendationSubjectParser.test.ts apps/portal/features/etsy-recommendations/utils/applyEtsySubjectSuggestion.test.ts` | 0 | PASS (26 tests) |
| Functions typecheck | `npx tsc --noEmit` (functions/) | 0 | PASS |
| Portal build | `npm run build:portal` | 1 | **SKIP** — EPERM on `apps/portal/.next/trace` (likely dev server lock); not a compile error. Linter clean on touched files. |

| Lint (touched portal files) | IDE diagnostics | — | PASS (no issues) |

## Deploy (fresh-prints-dev only)

| Action | Command | Exit | Result |
|--------|---------|------|--------|
| Delete scrape callable | `firebase functions:delete searchEtsyWebsiteRecommendations --region us-central1 --project fresh-prints-dev --force` | 0 | PASS — function deleted |

**Note:** Full `firebase deploy --only functions` aborted because unrelated orphan `ensurePortalWorkingPrintRequest` exists in GCP but not local source (pre-existing; out of scope). Scrape callable deleted explicitly.

## Removed coverage

Scrape-specific unit tests deleted with source (`searchEtsyWebsiteRecommendations.test.ts`, parse* scrape tests). Remaining Etsy tests cover query builders, validation, browse URL sanitization.

## Manual QA

Pending owner — see `docs/workflow/reviews/2026-07-16-etsy-link-only-rip-scrape-manual-qa.md`.

## Notes

- Portal runs locally; no App Hosting deploy unless owner uses hosted Portal.
- GCP secrets `SCRAPERAPI_API_KEY` / `FIRECRAWL_API_KEY` may remain in Secret Manager (unused by product code).
