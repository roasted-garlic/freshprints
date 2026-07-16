# Manual Test Checkpoint: Phase 9A — Etsy website scrape cards (ScraperAPI)

**Feature / area:** Portal Custom Designs → Etsy recommendation results (hybrid listing cards)
**Why automated tests are insufficient:** Live Etsy scrape via ScraperAPI, card layout, popups, and kill-switch UX need human verification.
**Environment:** local Portal against **`fresh-prints-dev`**
**Date:** 2026-07-16 (vendor return Firecrawl → ScraperAPI, ADR-FP-087i)

## Setup status (agent)

| Item | Status |
|------|--------|
| Function `searchEtsyWebsiteRecommendations` | Redeploy after ScraperAPI markdown + HTML fallback wiring |
| Secret `SCRAPERAPI_API_KEY` | Check with `firebase functions:secrets:get` — must be real key, not `UNSET` |
| Kill switch `etsyRecommendationConfig/websiteScrape` | Should remain **enabled** (`enabled: true`) |
| Portal debug box | Labeled ScraperAPI; local Portal sees it immediately |
| Old `FIRECRAWL_API_KEY` | Unused on live path — optional cleanup later |

### Owner: set ScraperAPI secret if missing (do not paste key into chat)

```powershell
firebase functions:secrets:set SCRAPERAPI_API_KEY --project fresh-prints-dev
firebase deploy --only functions:searchEtsyWebsiteRecommendations --project fresh-prints-dev
```

Verify versions only (no value dump):

```powershell
firebase functions:secrets:get SCRAPERAPI_API_KEY --project fresh-prints-dev
```

### Prerequisites before live-card QA
- Signed-in Portal customer on `fresh-prints-dev`
- Function `searchEtsyWebsiteRecommendations` deployed with ScraperAPI wiring
- Secret `SCRAPERAPI_API_KEY` set to a **real** ScraperAPI key (not `UNSET`)
- Kill switch on: Firestore `etsyRecommendationConfig/websiteScrape.enabled === true`

## Manual Test Checkpoint

**Feature / area:** Etsy Custom Designs scrape cards (ScraperAPI)
**Why automated tests are insufficient:** Live vendor latency, card images, and soft fallback UX
**Environment:** local / App Hosting Portal → `fresh-prints-dev` Functions
**Prerequisites:** Real `SCRAPERAPI_API_KEY`; kill switch enabled; hard-refresh Portal

### Steps
1. Hard-refresh Portal → Custom Designs → complete Etsy questionnaire → submit → **Expected:** results page with Primary/Broader links; listing cards appear (or soft message + debug box).
2. Click **Fetch live (bypass cache)** in the soft debug box (old thin markdown cache may still exist until TTL; cache key was also bumped to `v2-rich-markdown`) → **Expected:** loading skeleton, then `parseSource` of `markdown` / `html` / `json` (not `cache`); ScraperAPI dashboard shows a new hit.
3. Confirm cards show **real titles** (not `Listing 123…`), **etsystatic images** (not gradient placeholders), and **varied prices** when scrape succeeds → **Expected:** clickable cards open Etsy listing.
4. If cards fail, copy ScraperAPI debug textarea → **Expected:** `vendor: "scraperapi"`, `keyConfigured: true`, no API key in text. Paste into chat (never paste the key).
5. Confirm ScraperAPI dashboard shows request(s) after a live (non-cache) fetch → **Expected:** hits for markdown and possibly HTML fallback.

### Pass criteria
- [ ] Cards load from ScraperAPI (or soft unavailable with working Primary/Broader links)
- [ ] Live path verified: after **Fetch live**, debug is not `cache`
- [ ] Titles are real listing names (not `Listing <id>`)
- [ ] Images load from etsystatic (not placeholders for most cards)
- [ ] Prices vary across cards (not all the same duplicated amount)
- [ ] No crash / opaque 500 for normal auth
- [ ] Debug box has no secret values

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
