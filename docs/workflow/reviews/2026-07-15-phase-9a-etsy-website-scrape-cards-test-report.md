# Test Report: Phase 9A — Etsy website scrape cards

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Goal | `phase-9a-etsy-website-scrape-cards` |
| Plan | `docs/workflow/plans/2026-07-15-phase-9a-etsy-website-scrape-cards-plan.md` |
| Environment | local automated + `fresh-prints-dev` deploy |
| Overall | **passed_with_notes** (automated green; manual UI QA pending; ScraperAPI key still placeholder `UNSET`) |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared unit (parser + etsy utils) | `npx tsx --test packages/shared/src/utils/parseEtsySearchHtml.test.ts packages/shared/src/utils/etsyRecommendationListingUrl.test.ts packages/shared/src/utils/etsyRecommendationQueryBuilder.test.ts` | 0 | PASS (13 tests) |
| Functions unit | `npx tsx --test functions/src/searchEtsyWebsiteRecommendations.test.ts` | 0 | PASS (8 tests; mocked ScraperAPI fetch) |
| Functions build | `npm --prefix functions run build` | 0 | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | PASS |
| Deploy | `firebase deploy --only firestore:rules,functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS — function updated; rules released; secret accessor granted |
| Secret placeholder | `SCRAPERAPI_API_KEY` created as `UNSET` | 0 | Fail-closed until owner sets real key |

---

## Notes

- No live Etsy HTML in CI; parser uses fixtures; fetch uses mocked `Response` through ScraperAPI URL shape.
- Secret is placeholder `UNSET` — callable returns `unavailable` / link-only until owner sets a real ScraperAPI key and redeploys if needed.
- Kill switch doc may still be missing (`enabled` default off). Owner should set `etsyRecommendationConfig/websiteScrape.enabled = true` after secret is real.
- Production (`fresh-prints`) not deployed.

---

## Manual QA

Required before signoff — see `docs/workflow/reviews/2026-07-15-phase-9a-etsy-website-scrape-cards-manual-qa.md`.

---

## Follow-up 2026-07-15 — owner autoparse JSON shape

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared + functions unit | `npx tsx --test packages/shared/src/utils/parseEtsyScraperApiJson.test.ts packages/shared/src/utils/parseEtsySearchHtml.test.ts functions/src/searchEtsyWebsiteRecommendations.test.ts` | 0 | PASS (22 tests) |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS — function updated |

**Change:** Default ScraperAPI call is now `output_format=json&autoparse=true` (not `render=true`). Parser: `parseEtsyScraperApiJson` / `parseEtsyScraperApiResponse` with HTML fallback. Assumed fixture: `packages/shared/src/utils/fixtures/etsy-scraperapi-autoparse.fixture.json`. Real capture path: `tmp/etsy-scraperapi-autoparse.json`.

---

## Follow-up 2026-07-16 — ScraperAPI → Firecrawl (ADR-FP-087h)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions + parser unit | `npx tsx --test functions/src/searchEtsyWebsiteRecommendations.test.ts packages/shared/src/utils/parseEtsySearchHtml.test.ts` | 0 | PASS (22 tests; Firecrawl adapter + fixture) |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS — function updated; `FIRECRAWL_API_KEY` accessor granted |
| Secret placeholder | `FIRECRAWL_API_KEY` created as `UNSET` | 0 | Fail-closed until owner sets real key |

**Change:** Live path uses Firecrawl `POST /v2/scrape` with `formats: ["rawHtml"]` → `extractHtmlFromFirecrawlResponse` → `parseEtsySearchHtml`. Secret `FIRECRAWL_API_KEY` (placeholder `UNSET` fail-closed). `SCRAPERAPI_API_KEY` unused on live path. Kill switch unchanged. Fixture: `packages/shared/src/utils/fixtures/etsy-firecrawl-scrape.fixture.json`.

## Follow-up 2026-07-16 — Owner curl shape + Portal debug box

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions + parser unit | `npx tsx --test functions/src/searchEtsyWebsiteRecommendations.test.ts packages/shared/src/utils/parseEtsySearchHtml.test.ts` | 0 | PASS (21 tests) |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS — function updated |
| Secret probe | `firebase functions:secrets:access FIRECRAWL_API_KEY` (value not logged) | 0 | CONFIGURED (len=35, starts `fc-`); versions 1+2 ENABLED |

**Change:** Request body matches owner curl (`markdown` + JSON schema extract, `onlyMainContent`, `maxAge`, `parsers: ["pdf"]`). Soft responses include truncated `debugPayload`. Portal results page shows copyable Firecrawl debug textarea. JSON extract → cards when listing URLs present; markdown/HTML fallback retained.

## Follow-up 2026-07-16 — Root cause: Admin `app/no-app` (zero Firecrawl hits)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions + parser unit | `npx tsx --test functions/src/searchEtsyWebsiteRecommendations.test.ts packages/shared/src/utils/parseEtsySearchHtml.test.ts` | 0 | PASS (21 tests) |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS |
| Logs diagnosis | `firebase functions:log --only searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | `app/no-app` at `requirePortalCustomer` — never reached Firecrawl |
| Secret | access probe (value not logged) | 0 | CONFIGURED (len=35, `fc-…`); function binds secret version **2** |

**Root cause:** Lazy Admin Firestore Proxy never registered the default app → callable threw before `fetch` to `api.firecrawl.dev` (explains empty Firecrawl dashboard).

**Fix:** Eager `initializeApp` + Auth/Firestore; Storage stays lazy. JSON extract schema → `products[]` (+ `product_url`). Log line `firecrawl_request_start` (hosts only). Portal catch synthesizes debug box when callable throws. Gemini Path 2 deferred (ADR-FP-087h).

**Portal App Hosting:** Debug box + catch UX need Portal redeploy if testing on hosted Portal:

```powershell
firebase deploy --only apphosting --project fresh-prints-dev
```

Local Portal (`npm run dev` in `apps/portal`) picks up source without App Hosting deploy. Function fix is live on `fresh-prints-dev` regardless.

---

## Follow-up 2026-07-16 — Return to ScraperAPI (ADR-FP-087i)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared + functions unit | `npx tsx --test functions/src/searchEtsyWebsiteRecommendations.test.ts packages/shared/src/utils/parseEtsyScraperApiJson.test.ts packages/shared/src/utils/parseEtsySearchHtml.test.ts` | 0 | PASS (27 tests) |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS — function updated; `SCRAPERAPI_API_KEY` accessor granted |
| Secret probe | `firebase functions:secrets:get` / access (value not logged) | 0 | **CONFIGURED** — v2 ENABLED, len=32 (not UNSET) |

**Change:** Live path uses ScraperAPI `GET https://api.scraperapi.com/?api_key=…&output_format=markdown&url=…`. If markdown parse yields 0 cards → one HTML fetch (omit `output_format`) → `parseEtsySearchHtml` JSON-LD. Soft `debugPayload` vendor=`scraperapi`. Firecrawl off hot path. Kill switch + Primary/Broader links unchanged.

---

## Follow-up 2026-07-16 — Cache bypass (`forceRefresh`) for live ScraperAPI QA

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions unit | `npx tsx --test functions/src/searchEtsyWebsiteRecommendations.test.ts` | 0 | PASS (11 tests) |
| Functions build | `npm run build` (functions/) | 0 | PASS |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS |

**Finding:** Cache hits are intentional — Firestore `etsyWebsiteSearchCache`, TTL **30 minutes**, doc id = sha256(`normalizedQuery|instant_download=true|explicit=1`). Owner highland-cow query hit cache → debug `parseSource: "cache"` / no ScraperAPI credit.

**Fix:** Callable accepts `forceRefresh: true` (skip cache read; still charges quota; rewrites cache on success). Portal soft-debug **Fetch live (bypass cache)** button. TTL unchanged. Local Portal picks up UI; App Hosting needs separate deploy for the button.

---

## Follow-up 2026-07-16 — Rich markdown parse (titles / images / prices)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared + functions unit | `npx tsx --test packages/shared/src/utils/parseEtsySearchMarkdown.test.ts packages/shared/src/utils/parseEtsyScraperApiJson.test.ts packages/shared/src/utils/parseEtsySearchHtml.test.ts functions/src/searchEtsyWebsiteRecommendations.test.ts` | 0 | PASS (33 tests) |
| Functions build | `npm --prefix functions run build` | 0 | PASS |
| Deploy | `firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev` | 0 | PASS |

**Root cause:** Markdown was routed through HTML extractors (`src=` / `aria-label`). Nested `![title](etsystatic)` closed `[text](url)` early → IDs only → `Listing ${id}`, null images, prices bled across 2500-char windows.

**Fix:** `parseEtsySearchMarkdown` flattens nested images, extracts alt title / etsystatic URL / per-link `$` or Sale Price / `By shop`. Thin majority → HTML fallback. Cache key `v2-rich-markdown`; skip cache write when thin.
