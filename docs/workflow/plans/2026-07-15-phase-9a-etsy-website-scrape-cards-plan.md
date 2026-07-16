# Plan: Phase 9A — Etsy website scrape for in-app listing cards

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Author | Agent |
| Status | approved_with_changes (vendor addendum 2026-07-15) |
| Workflow | managed-phase |
| Goal name | `phase-9a-etsy-website-scrape-cards` |
| Related | ADR-FP-087f, R-010, `docs/workflow/plans/2026-07-15-phase-9a-etsy-website-first-api-rip-plan.md` |
| Parent | Phase 9A website-first results (shipped on `fresh-prints-dev`) |

---

## Goal

Restore Portal **in-app recommendation cards** (image + listing metadata comparable to the former Open API results) by sourcing listings from Etsy’s **website “best match” search**, while **purchases remain on Etsy** (outbound browse/purchase via listing or search URLs — no Fresh Prints checkout). Scraping must not begin until documented ToS/legal approval (R-010).

---

## Background

- **ADR-FP-087f (accepted):** Owner found Etsy website search more relevant than Open API listing cards. Open API search (`searchEtsyRecommendations`) and client stack were removed. Results today are Primary + Broader **website link cards** only. Scraping for in-app cards was explicitly deferred behind ToS/legal approval.
- **R-010 (blocked):** Desire to scrape Etsy HTML for in-app cards — High impact / Medium likelihood; mitigation is website-first links until counsel/owner ToS approval.
- **R-C03 (closed):** Open API relevance gap resolved by rip; does not authorize scrape.
- **Roadmap:** “In-app listing scrape from Etsy website search (blocked until ToS/legal approval — R-010)” is listed under deferred Phase 9 slices.
- **Secret cleanup (DONE):** `ETSY_X_API_KEY` removed from `fresh-prints-dev`; no Open API path remains.
- **Current product surface:** Questionnaire → `submitEtsyRecommendationRequest` → `canonicalQuery` + `etsySearchUrl` (and broader URL in Portal) → `EtsyResultsDashboard` link cards + trademark disclosure + `openEtsyBrowseWindow` for desktop popups.

### Former Open API card fields (target shape)

From the foundation plan (`2026-07-15-phase-9a-etsy-recommendations-foundation-plan.md`) and prior results UX:

```ts
interface EtsyRecommendationListing {
  listingId: number;
  title: string;
  listingUrl: string;          // https://www.etsy.com/listing/...
  imageUrl: string | null;
  shopName: string | null;
  priceAmount: string | null;  // display-ready amount string
  currencyCode: string | null;
}
```

UI previously: grid of up to **12** cards — image / title / shop / price / **View on Etsy** (official URL, new tab/popup). Optional fields missing → graceful degrade (placeholder image, omit shop/price). CSS for `.etsy-listing-card*` still exists in `apps/portal/styles/etsy-recommendations.css`; `EtsyListingCard.tsx` was deleted in the Open API rip.

### Existing search URL builders (reuse)

- `buildEtsyRecommendationCanonicalQuery` / `buildEtsyRecommendationBroaderQuery`
- `buildEtsyRecommendationSearchUrl(q)` → `https://www.etsy.com/search?q=…&instant_download=true&explicit=1`
- Default Etsy search sort is **best match / most relevant** when no alternate sort is set; implement phase should confirm live default (or set an explicit relevancy param if Etsy’s HTML requires it) and document it.

---

## Product intent

1. **Restore cards** — After questionnaire submit, show listing cards with image + metadata comparable to former Open API results, ordered as Etsy website **best match** for the Primary (and optionally Broader) query.
2. **Search source** — Etsy website search HTML (or equivalent server-fetched results page) for existing URL builders — not a reintroduction of Open API as default.
3. **Purchases on Etsy** — Card CTA and search links open Etsy (`openEtsyBrowseWindow` / `target="_blank"`). Fresh Prints does not sell, fulfill, download, or checkout listings. Trademark statement remains (already updated post-API: app is not endorsed/certified by Etsy; no “uses the Etsy API” claim).

---

## Scope

### In Scope

- Plan + review of scrape / alternatives (this doc).
- If legal approved and review approved later: **dev-only** (`fresh-prints-dev`) design for server-side scrape → normalized `EtsyRecommendationListing[]` → Portal card grid; keep Primary/Broader link cards as fallback.
- Feature flag / kill switch; caching; rate limits; failure fallback to current link-only UX.
- Doc updates (DATA_MODEL, BACKEND, SECURITY, DECISIONS, RISK_REGISTER, ROADMAP) in the implement phase after approval.
- Clear recommendation on Google Custom Search / Programmable Search as alternative.

### Out of Scope

- **Any scrape or new listing-fetch code before legal/ToS approval and before Review/Implement gates.**
- Production (`fresh-prints`) deploy.
- Reintroducing Etsy Open API as the default search path.
- In-app checkout, payments, downloads of listing files.
- Create with AI / Assisted Creation / design-fee staff queue.
- Client-side scrape of Etsy from the browser (forbidden pattern).
- Deleting or changing production secrets.

---

## Affected Areas

### Files / Modules (expected — implement phase only)

- `functions/src/` — new callable (e.g. `searchEtsyWebsiteRecommendations` or extend submit response) + scrape/parse module + cache/rate-limit
- `packages/shared/` — listing DTO types (restore `EtsyRecommendationListing`), URL sanitize helpers (already present)
- `apps/portal/features/etsy-recommendations/` — restore listing card component + wire results dashboard
- `apps/portal/styles/etsy-recommendations.css` — reuse existing listing-card styles
- Docs: DATA_MODEL, BACKEND, SECURITY, DECISIONS, RISK_REGISTER, ROADMAP, TESTING

### Architecture Impact

- [x] Details: New **Functions-only** integration boundary for outbound Etsy HTML fetch/parse. Portal calls callable/service; never fetches Etsy HTML from the client. Same layered pattern as former Open API search (UI → service → callable → server client).

### Security Impact

- [x] Details: ToS/legal gate (R-010); no secrets required for public HTML fetch unless proxy/CAPTCHA service added later; validate/sanitize all listing URLs (`sanitizeEtsyListingUrl`); rate-limit per customer; do not persist raw HTML long-term if avoidable; user-safe errors only; kill switch.

### Data Model Impact

- [x] Details: Prefer **ephemeral** listing arrays on callable response (like former search). Optional short-TTL server cache collection (not customer-writable). Do not expand `etsyRecommendationRequests` with large listing blobs unless caching strategy requires it — document choice in implement.

### Backend Impact

- [x] Details: New Cloud Function(s) on `fresh-prints-dev` only first; timeouts; User-Agent policy; retries; cache TTL; feature flag (Remote Config or env/secret boolean).

### UI / UX Impact

- [x] Details: Restore listing grid above/beside Primary+Broader links; loading skeleton; empty/scrape-fail → link cards; manual UX review checkpoint.

### Migration Impact

- [x] None for Firestore schema of requests (legacy `apiKeywords*` remain ignored).
- [x] Forward: deploy function + Portal; flag off by default until smoke green.
- [x] Rollback: flag off → link-only UX (current shipped behavior).

---

## Technical options (honest comparison)

### 1. Server-side scrape / HTML parse (fetch + parse)

| Aspect | Assessment |
|--------|------------|
| Fit to product | **Best relevance match** to what owner preferred (website best match). |
| Fields | Likely extractable: listing URL/id, title, image; shop/price often present in card markup but **fragile** across A/B markup. |
| Ops | Cloud Function fetch + Cheerio/regex parse; caching + rate limits required. |
| Fragility | **High** — Etsy markup/bot walls change without notice. |
| ToS | **Blocked by R-010** until legal approval. |
| Cost | Low–medium (CPU/egress); spikes if no cache. |

### 2. Headless browser (Playwright/Puppeteer)

| Aspect | Assessment |
|--------|------------|
| Fit | Better against JS-rendered or bot-challenged pages than plain fetch. |
| Cost/ops | **High** — memory, cold start, browser binaries in Functions (or Cloud Run), harder CI. |
| Bot detection | Still may hit CAPTCHA/blocks; more moving parts. |
| Verdict | Only if plain fetch proves insufficient **after** legal approval; not first choice for Phase 9A. |

### 3. Official Etsy Open API (contrast only)

| Aspect | Assessment |
|--------|------------|
| Why ripped | Relevance worse than website; keyword tuning failed; images alone did not justify API. |
| Quotas/secrets | Key deleted on dev; would reintroduce secret + Commercial Access/trademark API wording. |
| Verdict | **Not default.** Keep as historical contrast; do not re-adopt unless product reverses ADR-FP-087f. |

### 4. Google Custom Search / Programmable Search JSON API

| Question | Answer |
|----------|--------|
| Can it return Etsy listing cards with title, image, price, shop, direct listing URL? | **Partially.** Typical items: `title`, `link`, `snippet`, sometimes thumbnail via `pagemap`/`cse_image`. **Price and shop are usually missing** as structured fields. Links may be listing pages, shop pages, search pages, or Etsy help — not guaranteed `/listing/{id}` cards. |
| “Best match”? | **No.** Google ranks by its own index/signals, not Etsy’s search sort. `site:etsy.com` narrows host but does not reproduce Etsy relevancy or `instant_download` filters reliably. |
| Filters | Hard to encode Etsy’s `instant_download=true&explicit=1` into CSE; results mix digital + physical + non-listings. |
| ToS / compliance | Google API ToS + attribution; caching/display rules; does **not** clear Etsy ToS for redistributing Etsy listing content. Still a third-party scrape-of-index of Etsy. |
| Cost / quota | Free tier is small (historically ~100 queries/day); paid thereafter. Adds Google Cloud billing + API key secret. |
| Verdict | **Unwise as primary or as “scrape replacement.”** At best a **weak fallback** for title+link(+thumbnail) if legal forever forbids Etsy HTML scrape **and** owner accepts worse relevance and missing price/shop — still inferior to current Primary/Broader link cards for purchase handoff. |

### 5. Other realistic options

| Option | Notes |
|--------|-------|
| **Stay link-only (status quo)** | Lowest legal/ops risk; purchases already on Etsy; no cards/images. Valid default until legal. |
| **Affiliate / partner APIs** | Only if a compliant partner program exists for Fresh Prints’ use case; not currently in repo; would need separate product/legal phase. |
| **Manual / staff curation** | High effort; not scalable for questionnaire-driven queries. |
| **Hybrid** | Link cards always; scrape (or CSE) behind flag for optional preview grid. **Recommended product shape** if scrape is ever approved. |

---

## Legal / risk

- **R-010** remains open/blocked: scrape of Etsy website HTML for in-app cards requires **documented ToS/counsel (or owner-as-counsel) approval** before Implement.
- Scraping Etsy may violate Etsy’s Terms of Use regardless of “public HTML” or “we send buyers to Etsy.” Do not treat outbound purchase handoff as a ToS waiver.
- **Sending purchases to Etsy** (compliance posture already in product):
  - Deep links / search URLs only (`sanitizeEtsyBrowseUrl` / `sanitizeEtsyListingUrl`).
  - Disclosure: Fresh Prints does not sell, fulfill, or download listings; purchases on Etsy with independent sellers.
  - Trademark statement present in Portal (`ETSY_TRADEMARK_STATEMENT`) — no false API endorsement claim.
- Recommend: **Plan → Review may proceed**; **Implement is gated** on Human Checkpoint for legal/ToS (and product preference among scrape vs stay link-only vs weak CSE fallback).

---

## Proposed architecture (only if scrape approved)

```
Portal (results step)
  → etsyRecommendationService.searchWebsiteListings(requestId)
    → Callable (Functions, fresh-prints-dev)
      → rate limit + feature flag
      → build Primary search URL from request.canonicalQuery (existing builder)
      → fetch HTML (server) OR read short-TTL cache
      → parse listing cards → EtsyRecommendationListing[]
      → return listings + etsySearchUrl (+ optional broader)
  → EtsyListingCard grid + Primary/Broader link cards
  → View on Etsy → openEtsyBrowseWindow(listingUrl)
```

### Constraints

| Rule | Detail |
|------|--------|
| Where scrape runs | **Cloud Functions only** (or Cloud Run if headless later). Never client scrape. |
| Input | Existing `canonicalQuery` / `etsySearchUrl` on `etsyRecommendationRequests`; optionally broader query. Client must not pass arbitrary scrape URLs. |
| Output | Former card fields listed above; max **12** listings (match foundation UX). |
| Sort | Etsy website best match / default relevancy for that search URL. |
| Caching | Short TTL (propose **15–60 minutes**, open question); key by normalized query + filter params; no long-term raw HTML retention. |
| Rate limits | Per customer/day + concurrent guard (reuse mental model of former `etsyRecommendationRateLimits`). |
| Failure | Fall back to Primary/Broader **link cards** (current UX); user-safe message; no crash. |
| Kill switch | Feature flag default **off**; instant disable without redeploy if using Remote Config / Secret boolean. |
| Env | **`fresh-prints-dev` first**; production only in a separate authorized deploy phase. |
| Dependencies | Prefer fetch + HTML parser already acceptable in Functions ecosystem; avoid Playwright unless fetch fails after legal approval. |

### Implementation sequence (post-legal, post-review)

1. Spike on `fresh-prints-dev`: one Primary query HTML sample — confirm selectors for id/title/image/shop/price; document fragility.
2. Shared DTO + URL sanitizers (restore types).
3. Callable + cache + rate limit + flag off.
4. Portal cards + skeleton + fallback.
5. Unit tests for parser (fixture HTML); manual QA checklist.
6. Docs + ADR amendment; update R-010 status if approved.

---

## Approach (this Plan phase)

1. Document product intent, options, legal gate, and recommendation (this file).
2. Complete Review phase on the plan (engineering/process).
3. **Human Checkpoint:** legal/ToS approval (and product choice) before any Implement.
4. If legal denies scrape: keep link-only; do **not** adopt Google CSE as primary; optionally close or reword R-010 as accepted residual desire.
5. If legal approves: Implement per architecture above on dev only.

---

## Recommendation (required)

**Scraping Etsy website best-match HTML is the only option that can restore image cards with relevance close to what the owner preferred when ripping the Open API** — but it is **not recommended to implement until R-010 legal/ToS approval**, because of ToS risk, markup fragility, and bot/ops cost. Prefer plain **server fetch + parse** over headless browsers initially; always keep link-card fallback and a kill switch; ship on `fresh-prints-dev` only first.

**Google Custom Search / Programmable Search API is not a wise alternative** if scraping is disallowed or deferred. It does not reproduce Etsy’s best-match ranking or instant-download filters, usually lacks structured price/shop, mixes non-listing URLs, adds Google billing/secrets/ToS, and still does not clear Etsy redisplay concerns. It is at best a **weak thumbnail/title fallback** — worse for purchase handoff than the current Primary/Broader Etsy search links.

**Preferred path for Fresh Prints Phase 9A cards:** Stay on website-first **link cards** until legal approves scrape → then **hybrid** (server scrape cards + always-on Etsy links, purchases on Etsy). Do **not** reintroduce Open API as default. Do **not** invest in Google CSE as the card strategy.

---

## Test Strategy

### Automated (implement phase)

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck` (repo scripts as documented) | yes |
| Lint | `npm run lint` | yes |
| Unit tests | Parser fixtures + URL sanitize + shared listing normalize | yes |
| Build | Portal + functions build | yes |
| Integration | Callable with mocked fetch (no live Etsy in CI) | yes if callable added |
| E2E | no unless already configured for Portal | no |
| Backend/rules | Rate-limit collection rules if new cache collection | yes if new collection |

### Manual

- [x] Details — see checklist below (human QA after implement).

#### Manual QA checklist (when cards ship)

1. Complete questionnaire → results show skeleton then up to 12 cards with image/title; shop/price when parse finds them.
2. Each card **View on Etsy** opens listing URL on Etsy (popup or new tab); purchase flow is on Etsy only.
3. Primary (+ Broader if shown) search link cards still work.
4. Kill switch / flag off → link-only UX (no broken empty state).
5. Scrape failure / timeout → fallback links + safe error; no raw HTML/stack.
6. Trademark + disclosure still visible.
7. Mobile: links open without relying on sized popup.
8. Dev project only; no prod deploy in this phase.

---

## Human Checkpoints Anticipated

- [x] **Legal / ToS approval for Etsy HTML scrape (R-010)** — **required before Implement**
- [x] Business/product: scrape vs stay link-only vs (discouraged) CSE fallback
- [ ] Manual UI/UX review (after implement)
- [ ] Production deploy (out of scope)
- [ ] Secrets / env vars (only if proxy/CAPTCHA/CSE keys ever added — not default)
- [ ] Other: max listings, cache TTL defaults

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Etsy ToS violation / cease-and-desist | Critical | No implement without R-010 approval; kill switch; link-only rollback |
| Markup change breaks parser | High | Fixture tests; graceful fallback; monitor empty rates |
| Bot detection / IP block | High | Low rate; cache; respectful User-Agent; avoid headless unless needed |
| Scope creep (Open API return, CSE, production) | Medium | This plan’s out-of-scope; re-review if scope grows |
| Stale prices/images in cache | Medium | Short TTL; disclose that previews may be outdated; purchase truth is on Etsy |
| Google CSE adopted as “easy” substitute | Medium | Explicit recommendation: unwise; reject in review unless owner overrides with eyes open |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

- Feature flag off → current Primary/Broader link-only results (ADR-FP-087f).
- Undeploy scrape callable on `fresh-prints-dev` if needed.
- No production rollback required if never deployed to prod.

---

## Documentation Updates Required

- [ ] DATA_MODEL.md — scrape response / cache if any
- [ ] BACKEND.md — new callable, flag, no client scrape
- [ ] SECURITY.md — ToS gate + URL sanitization
- [ ] DECISIONS.md — ADR amendment if scrape approved or rejected
- [ ] RISK_REGISTER.md — R-010 status update after legal decision
- [ ] ROADMAP.md — Phase 9A deferred item status
- [ ] TESTING.md — parser/fixture commands if added
- [ ] STYLE_GUIDE.md — only if card UX patterns change materially

---

## Open Questions

- [x] **Legal:** Is scraping Etsy search HTML for in-app preview cards approved for Fresh Prints? — **Yes (owner-as-counsel, 2026-07-15)** via vendor proxy/scrape API; purchases stay on Etsy; `fresh-prints-dev` only.
- [x] Prefer **scrape (if approved)** vs **stay link-only** vs owner override to try CSE anyway? — **Scrape via ScraperAPI or Oxylabs** (owner said either; default **ScraperAPI**).
- [x] Max listings: keep **12**? — **Yes.**
- [x] Cache TTL: **15 / 30 / 60** minutes? — **30 minutes.**
- [x] Scrape Primary only, or Primary + Broader? — **Primary only** for cards; Broader remains link card.
- [x] Accept missing shop/price when markup omits them? — **Yes** (graceful degrade).

---

## Addendum A — ScraperAPI vs Oxylabs (2026-07-15)

Owner approved website scrape path and asked to use **either** [scraperapi.com](https://www.scraperapi.com) or [oxylabs.io](https://oxylabs.io) as the proxy/scrape vendor. Purchases stay on Etsy. Target: restore in-app cards from Etsy **search page** HTML.

| Aspect | ScraperAPI | Oxylabs (Web Scraper / Realtime) |
|--------|------------|----------------------------------|
| **API shape** | Single GET `https://api.scraperapi.com/?api_key=…&url=…` (+ optional `render=true`) → raw HTML body | POST `https://realtime.oxylabs.io/v1/queries` with Basic auth + JSON `{ source, url, render }` → nested `results[].content` |
| **JS rendering** | Optional `render=true` (extra credits); good for bot-challenged e-commerce | Built-in render options; enterprise unblocker available |
| **Reliability vs Etsy** | Strong for SMB/dev use; residential rotation + CAPTCHA handling behind one endpoint | Stronger enterprise pools / success rates; heavier product surface |
| **Pricing model** | Credit/monthly tiers (~$49 Hobby entry); predictable per-request credits; render costs more | Result- or bandwidth-oriented; often higher effective cost for low volume; separate product plans |
| **Firebase Functions fit** | **Excellent** — one `fetch`, no SDK, secret = API key only | Good but more auth wiring (username + password), JSON unwrap, longer cold paths |
| **Docs quality** | Clear developer-first request docs | Solid; more enterprise-oriented |
| **New deps** | None (native `fetch`) | None (native `fetch`) |

### Recommended default: **ScraperAPI**

**Rationale:** Lowest integration cost for Cloud Functions, clearest fail-closed secret pattern (`SCRAPERAPI_API_KEY`), credit pricing matches low Portal preview volume with cache + daily quota, and `render=true` covers Etsy JS/bot walls without Playwright in Functions. Oxylabs remains the **documented alternate** if ScraperAPI success rates on Etsy search prove insufficient.

### Security / ops (unchanged + vendor)

- Secrets in Firebase Secret Manager only; never client-side scrape.
- Kill switch: Firestore `etsyRecommendationConfig/websiteScrape.enabled` (missing = off).
- Missing/placeholder secret → fail closed to Primary/Broader **link-only** UX.
- Rate limit + short-TTL cache; sanitize listing/image URLs; no long-term raw HTML retention.
- Deploy **`fresh-prints-dev` only** in this phase.

### Architecture tweak vs original plan

```
Callable searchEtsyWebsiteRecommendations
  → build Primary search URL (existing builders)
  → ScraperAPI fetch (server) with SCRAPERAPI_API_KEY
  → parseEtsySearchHtml → EtsyRecommendationListing[]
  → Portal cards + always-on link fallback
```

---

## Success criteria

- Plan reviewed; legal checkpoint recorded before any scrape code.
- Cards show best-match-sourced listings with former fields where available; purchases only via Etsy; fallback and kill switch proven on `fresh-prints-dev`.
- Vendor default ScraperAPI; secret documented; no real keys in repo.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-15-phase-9a-etsy-website-scrape-cards-review.md`
- Verdict: **approved** (2026-07-15) — no required plan changes at first review
- Legal/ToS: **approved by owner (2026-07-15)** — R-010 yes-scrape via ScraperAPI/Oxylabs; default ScraperAPI
- Light re-review of vendor addendum: **approved_with_changes** (see review doc addendum) — proceed to Implement |
