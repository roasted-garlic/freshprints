# Phase 9A Etsy Recommendations Foundation — Manual Visual Smoke Checkpoint

Date: 2026-07-15  
Status: **ready for owner** — Functions + Firestore deployed to `fresh-prints-dev`; live Etsy API smoke passed

Do not run against production. Do not paste Etsy credentials into chat.

---

## Deployment record (dev only)

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Firestore rules | Deployed |
| Firestore indexes | Deployed (includes `etsyRecommendationRequests` customerId+status) |
| Functions | `submitEtsyRecommendationRequest`, `searchEtsyRecommendations`, `completeEtsyRecommendationRequest`, `cancelEtsyRecommendationRequest` created successfully |
| Portal App Hosting | **Not deployed** — CLI prompted to create backend interactively; skipped. Use **local Portal** against `fresh-prints-dev` |
| Production | Untouched |

## Live smoke (bounded, no secret logged)

| Check | Result |
|-------|--------|
| `GET /v3/application/listings/active?keywords=mama%20bear%20design&limit=3&sort_on=score` | HTTP **200**, 3 results |
| Search includes Images inline | **false** (hydration required — matches plan) |
| Price field keys | `amount`, `currency_code`, `divisor` |
| Rate headers | `x-limit-per-day: 5000`, `x-limit-per-second: 5` |
| `GET /v3/application/listings/batch?...&includes=Images,Shop` | HTTP **200**, images + shop name present |

---

## Setup for visual smoke

1. Ensure Portal `.env.local` points at **fresh-prints-dev** (existing local Portal setup).
2. Start Portal locally (your usual Portal dev command, e.g. workspace `@fresh-prints/portal`).
3. Sign in as a **customer**.
4. Open **Custom Designs** in nav (or go to `/custom-designs`).

---

## Route-selection checklist

- [ ] Custom Designs entry is easy to find
- [ ] Heading: How can we help with your design?
- [ ] Three cards appear
- [ ] Help Me Find a Design is clearly active
- [ ] Create My Design with AI shows Coming soon
- [ ] Fresh Prints Assisted Creation shows Coming soon
- [ ] Disabled cards do nothing when activated
- [ ] Desktop layout looks polished
- [ ] Mobile layout looks polished
- [ ] Keyboard navigation / focus works

## Questionnaire checklist

- [ ] Screen 1: description only; required
- [ ] Screen 2: wording + must-have details; both optional
- [ ] No rights / references / AI questions
- [ ] Review shows only entered information
- [ ] Edit details works
- [ ] Search Etsy works
- [ ] Replace-active confirmation appears when an active search already exists

## Results checklist

- [ ] Loading state looks stable
- [ ] Up to 12 listings appear inside Fresh Prints
- [ ] Images / missing-image placeholder look intentional
- [ ] Titles wrap; shop/price when available
- [ ] View on Etsy opens official listing
- [ ] Open this search on Etsy uses the same search intent
- [ ] Edit search / Search again / Done / Cancel work
- [ ] Empty and error states provide a useful direct Etsy link
- [ ] Etsy disclosure + trademark statement visible
- [ ] No secrets or stack traces appear

## Owner visual notes (2026-07-15)

1. **Copy:** No Etsy mention before results.
2. **Layout:** Uniform width across steps.
3. **Wizard shell (follow-up):** Restyled to match reference Custom Request wizard — segmented progress, bordered step card, Back/Continue, radio focus options, style checkboxes.
4. **Search-relevant steps only (3 + review):**
   - Describe your design
   - What kind of design (optional)
   - Words, style, colors, must-haves (optional)
5. **PNG + instant download:** Canonical/API query appends `png` (not `digital download`). Direct Etsy URLs add `instant_download=true&explicit=1`.

Re-check local Portal, then reply `PASS` / `FAIL` / `PASS WITH NOTES`.
