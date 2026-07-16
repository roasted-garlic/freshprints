# Review: Phase 9A — Etsy website scrape for in-app listing cards

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-15-phase-9a-etsy-website-scrape-cards-plan.md` |
| Verdict | **approved** |

---

## Summary

The plan is clear, bounded, and aligned with ADR-FP-087f, R-010, and the roadmap deferred scrape slice. Engineering approach (server-only fetch+parse, hybrid link fallback, kill switch, `fresh-prints-dev` first) is sound; Google CSE is correctly rejected as a substitute. **Implement remains gated** on documented R-010 legal/ToS approval — Review does not authorize scrape code.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | In/out of scope explicit; no scrape before legal; no prod; no Open API default; no client scrape |
| Architecture alignment | pass | Functions-only boundary; Portal → service → callable; matches former Open API layering without reintroducing API |
| Security impact addressed | pass | R-010 gate; URL sanitize; rate limits; no long-term raw HTML; user-safe errors; kill switch |
| Data model impact addressed | pass | Prefer ephemeral listing arrays; optional short-TTL cache; no request-blob expansion unless justified |
| Backend impact addressed | pass | New callable + cache/flag/timeouts on `fresh-prints-dev` first; headless deferred |
| Test strategy adequate | pass | Parser fixtures, mocked fetch, sanitize tests, builds; manual QA checklist for cards/fallback/flag |
| Human checkpoints identified | pass | Legal/ToS before Implement; product choice; later UI QA and prod out of scope |
| Roadmap alignment | pass | Matches deferred “In-app listing scrape… R-010” item |
| Documentation plan | pass | DATA_MODEL, BACKEND, SECURITY, DECISIONS, RISK_REGISTER, ROADMAP, TESTING listed for implement |
| No silent scope expansion | pass | CSE/Open API/production/checkout explicitly out; hybrid shape if scrape approved |

---

## Architecture Review

**Findings:**
- Server-only scrape (Cloud Functions, Cloud Run only if headless later) correctly forbids client-side Etsy HTML fetch.
- Hybrid UX (cards + always-on Primary/Broader links; purchases on Etsy via sanitized URLs / `openEtsyBrowseWindow`) preserves current compliance posture.
- Kill switch default **off** + link-only rollback is the right failure/ops model for fragile markup and ToS risk.
- Reuse of existing search URL builders and target `EtsyRecommendationListing` shape keeps continuity with foundation UX (max 12).

**Required changes:**
- [x] None

**Implement notes (non-blocking):**
- Callable must not accept arbitrary scrape URLs from the client — only derive from stored `canonicalQuery` / existing builders (plan already states this).
- Auth/authorization should match existing `etsyRecommendationRequests` customer boundaries (same pattern as submit/search formerly).

---

## Security Review

**Findings:**
- R-010 is correctly treated as a **hard gate on Implement**, not on Review — Plan → Review may complete; scrape code must not start without documented legal/owner approval.
- Plan correctly notes that outbound purchase handoff does **not** waive Etsy ToS for HTML scrape/redisplay.
- URL sanitization, rate limits, ephemeral/cache discipline, and feature flag are adequate for a first-pass design.
- No new secrets required for plain public HTML fetch; any proxy/CAPTCHA/CSE keys would need a separate review.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] R-010 legal/ToS approval before **any** scrape Implement (dev included)
- [x] Separate authorized phase before production deploy (already out of scope)

---

## Data Model Review

**Findings:**
- Ephemeral response listings preferred; optional short-TTL cache collection with customer non-writable rules if added — appropriate.
- No Firestore migration of request schema required; legacy API keyword fields remain ignored.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Prefer fetch + HTML parser over Playwright/Puppeteer unless fetch fails after legal approval — good cost/ops tradeoff.
- Cache TTL, User-Agent, retries, and concurrent guards are called out; defaults can be locked at Implement kickoff.
- Env limited to `fresh-prints-dev` for this phase — correct.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Fixture-based parser tests + mocked callable fetch (no live Etsy in CI) are required and sufficient for CI honesty.
- Manual QA checklist covers cards, Etsy CTAs, link fallback, kill switch, scrape failure, trademark, mobile.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Doc update list is complete for a post-legal implement phase. R-010 status and ADR amendment correctly deferred until legal decision.

---

## Google CSE / alternatives

**Finding:** Plan’s verdict is accepted for this review — **Google Custom Search / Programmable Search is not an approved implement path** for Phase 9A cards. It does not reproduce Etsy best-match ranking or filters, usually lacks price/shop, mixes non-listing URLs, adds billing/secrets, and does not clear Etsy redisplay concerns. Stay link-only if scrape is denied; do not invest in CSE as the card strategy unless the owner explicitly overrides with eyes open (would require plan revision + re-review).

---

## Required Changes (if approved_with_changes)

None — verdict is **approved**.

---

## Blockers (if blocked)

None for Review. **Implement is blocked** pending R-010 legal/ToS human checkpoint (see Next Step).

---

## Verdict Rationale

Approve the engineering/product plan: scope, architecture, security posture, CSE non-path, and success criteria are adequate to proceed **after** legal approval. Do not treat this Review approval as permission to write scrape code. Open product questions (cache TTL, Primary vs Broader, accept missing shop/price) may be resolved at Implement kickoff with plan defaults (12 listings, Primary-first, graceful degrade) unless the owner specifies otherwise.

---

## Next Step

**Human Checkpoint (R-010) — required before Implement.**

Do **not** start Implement until the owner records a legal/product decision in workflow state Decision Log.

### Exact question for owner

> **R-010 / Phase 9A cards — choose one:**
>
> 1. **Yes, scrape (legal approved)** — Document that you approve server-side fetch/parse of Etsy website search HTML for in-app preview cards on `fresh-prints-dev` (purchases stay on Etsy; hybrid cards + link fallback + kill switch per plan). Then Implement may start.
> 2. **Stay link-only** — Keep Primary/Broader website search link cards only; do **not** implement scrape; do **not** adopt Google CSE as substitute. Close or reword R-010 as accepted residual desire.
> 3. **Other** — e.g. counsel review pending with a date, or an explicit override to pursue a different approach (would require plan revision + re-review; CSE is discouraged).

Reply with `1`, `2`, or `3` (and notes). Until then: wait; answer questions; revise plan only if product direction changes.

---

## Addendum — Vendor choice re-review (2026-07-15)

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Trigger | Owner R-010 **yes scrape** + ScraperAPI **or** Oxylabs; plan Addendum A |
| Verdict | **approved_with_changes** |

### Recorded owner decision

1. Legal/product: **yes, scrape** (owner-as-counsel) for Etsy search HTML via proxy/scrape vendor on `fresh-prints-dev`.
2. Purchases remain on Etsy.
3. Vendor: either ScraperAPI or Oxylabs — engineering picks default.

### Changes accepted

- Default vendor: **ScraperAPI** (`SCRAPERAPI_API_KEY` in Secret Manager); Oxylabs documented alternate.
- Architecture: server fetch goes through ScraperAPI (optional `render=true`), not bare Cloud Functions IP → Etsy.
- Defaults locked: max 12, Primary-only cards, 30 min cache, graceful missing shop/price, kill switch + link fallback.

### Security notes

- No client-side scrape; fail closed if secret missing/UNSET; no secret values in docs/logs.
- Do not block Implement further — owner asked to move.

### Next step

**Implement** on `fresh-prints-dev` per amended plan.
