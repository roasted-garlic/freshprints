# Plan: Restore Etsy Open API search (link-first)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-etsy-open-api-restore-review.md |
| Supersedes product path | ADR-FP-087f (Open API rip), ADR-FP-087j (scrape rip → link-only) |
| Keeps | ADR-FP-087k admin suggestion overlays; Primary/Broader website URL builders |

---

## Goal

Restore **Etsy Open API** (`findAllListingsActive` + batch hydration) as the in-app listing source for Help me find a Design on Portal, while keeping **search link cards first** (Primary + Broader). Soft-fail to links-only when the API key is missing or search returns few/no results. **Do not** re-add ScraperAPI/Firecrawl. Deploy callables to **`fresh-prints-dev` only**.

## Background

- Scraping was ripped (ADR-FP-087j); results are link-only today.
- Open API was removed earlier (ADR-FP-087f) after relevance complaints; owner now says Open API is the only free + reliable source.
- Secret `ETSY_X_API_KEY` was deleted from Secret Manager on `fresh-prints-dev` (2026-07-15 ops cleanup) — must be re-set by owner before live cards work.
- Prior Open API stack exists in agent transcript history (not on `origin/master`); restore patterns from that + foundation plan, adapted to current hybrid questionnaire + link-first layout.
- Admin-managed subject/tone suggestion overlays (ADR-FP-087k) stay.

## Scope

### In Scope

1. Restore `searchEtsyRecommendations` callable + live Open API client, normalizer, rate limits; bind `ETSY_X_API_KEY` via `defineSecret`.
2. Shared Open API keyword builders aligned with current website builders (`subjectText` / styles / wording + `png`; fallback = broader-style keywords).
3. Portal: after submit → call search; results order:
   1. Warning: more elaborate/specific → fewer results
   2. Primary + Broader **search link cards** (copy must **not** say “Etsy” in CTAs / fallback / empty messaging — use “Open search” / “Browse designs” / “open search in a new tab”)
   3. API listing grid (image, title, price, shop, open listing) — CTAs like “View listing” (avoid “View on Etsy” if easy)
4. Soft empty / unavailable: still show links + message to use search links above (no “Etsy” in that copy).
5. Soft-fail when secret missing / API unavailable: links-only + warning (no hard crash).
6. Docs: ADR-FP-087l, BACKEND, DATA_MODEL, RISK, ROADMAP, SECURITY/TESTING as needed; workflow state; manual QA.
7. Deploy `searchEtsyRecommendations` (+ shared rebuild if needed) to `fresh-prints-dev`.

### Out of Scope

- ScraperAPI / Firecrawl / website HTML scrape
- Production deploy
- Committing unless owner asks
- Printing secret values
- Full A/B diagnostics UI (server logs OK; no Portal debug panel required)
- Kill-switch doc (optional; skip unless trivial — feature works when key configured)
- Changing admin suggestion overlays / Studio settings beyond copy if any Etsy CTA appears there

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/searchEtsyRecommendations.ts` (restore)
- `functions/src/lib/etsy/{etsyClient.types,liveEtsyClient,normalizeEtsyListings,etsyRecommendationRateLimit}.ts` (+ tests)
- `functions/src/lib/secrets.ts` — re-add `etsyXApiKeySecret`
- `functions/src/index.ts` — export search callable
- `packages/shared` — `EtsyRecommendationListing` type; action types; Open API keyword builders + tests; restore display/fetch/rate-limit constants (align names with current `ETSY_RECOMMENDATION_MAX_LISTINGS` / `ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION`)
- Portal: `EtsyListingCard.tsx`, `EtsyResultsDashboard.tsx`, wizard hook, service `searchListings`, CSS for listing grid
- Docs + `.cursor/workflow/state.md`

### Architecture Impact

- [x] Details: Restore `Component → Hook → Service → Callable → Open API`. Portal never holds API key. Scraping remains forbidden.

### Security Impact

- [x] Details: Secret Manager only on search callable; reject client keywords/limit/sort; ownership checks; sanitize listing URLs; rate limits; no secrets in logs/errors; soft-fail if secret empty.

### Data Model Impact

- [x] Details: No required new fields on request docs (rebuild keywords from `answers` at search time). Rate-limit collection writes resume. Legacy `apiKeywords*` fields optional/ignored.

### Backend Impact

- [x] Details: Restore callable + `ETSY_X_API_KEY`; document re-set via `firebase functions:secrets:set` (no values in docs).

### UI / UX Impact

- [x] Details: Link-first + warning + listing grid; copy constraints; manual QA required.

### Migration Impact

- [x] None (no production; no backfill). Secret must be re-created on `fresh-prints-dev`.

---

## Approach

1. **Shared**
   - Add `EtsyRecommendationListing` + search request/response types.
   - Restore `buildEtsyRecommendationApiKeywords` / `Fallback` using `resolveEtsyRecommendationSubjectTokens` (hybrid subjectText) + styles + capped wording tokens + `png` (match website digital term; do **not** inject “digital download” into keywords).
   - Constants: `ETSY_RECOMMENDATION_SEARCH_FETCH_LIMIT` (~25), display max = existing `ETSY_RECOMMENDATION_MAX_LISTINGS` (12), API keyword token budget, rate-limit collection alias to existing `ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION`.

2. **Functions**
   - Live client: `GET /v3/application/listings/active` + batch hydrate `Images,Shop`; `sort_on=score`; return `{ results, requestPath, etsyReportedCount }`.
   - Search: auth → ownership → active request → charge quota → keywords from answers → search → if empty retry fallback once → normalize ≤12.
   - Missing/empty secret: return `{ listings: [], status: "unavailable", ... }` user-safe (do not throw internal).
   - Export from `index.ts`; secrets binding on callable only.

3. **Portal**
   - On entering results after submit (and optional Search again): call `searchEtsyRecommendations({ requestId })`.
   - Layout order per product requirements; update CTAs/aria to avoid “Etsy” in link/fallback copy; trademark aside may still use official statement.
   - Heading/lead: prefer “Browse matching designs” style over “Browse designs on Etsy” where easy without breaking trademark disclosure.

4. **Deploy / secret**
   - Deploy function to `fresh-prints-dev`.
   - Check whether secret exists; if not, record that owner must run secrets:set (do not print value). Soft-fail until set.

5. **Docs**
   - ADR-FP-087l supersedes 087f for product search path; keep 087j (no scrape).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `npx tsx --test packages/shared/src/utils/etsyRecommendation*.test.ts` | yes |
| Normalize unit | `npx tsx --test functions/src/lib/etsy/normalizeEtsyListings.test.ts` | yes |
| Functions typecheck / lint if cheap | project scripts | yes if available |
| Portal typecheck | portal script | yes if available |

### Manual

- [x] Portal Help me find a Design: elaborate vs short query warning visible; links above; listings below when secret set; empty/unavailable soft message without naming Etsy in fallback CTAs; purchases via listing/search URLs off-platform.

---

## Human Checkpoints Anticipated

- [x] Manual UI retest (PASS/FAIL)
- [x] Secrets: owner may need `firebase functions:secrets:set ETSY_X_API_KEY --project fresh-prints-dev` if missing
- [ ] Production deploy — forbidden
- [ ] No scrape re-add

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Secret deleted; cards empty until re-set | med | Soft-fail + clear owner ops note |
| Open API recall still sparse for long queries | med | Warning copy + Primary/Broader links always available |
| Rate limits | low | Restore prior 40/day customer, 20/day request |
| Saying “Etsy” in CTAs against owner copy rule | low | Explicit copy checklist in implement + QA |

---

## Rollback Plan

Undeploy/delete `searchEtsyRecommendations` on `fresh-prints-dev`; Portal falls back to not calling search / links-only UI. No production change.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] DECISIONS.md (ADR-FP-087l)
- [x] RISK_REGISTER.md / ROADMAP.md as needed
- [x] SECURITY.md / TESTING.md if secret/callable commands change

---

## Open Questions

- [x] None blocking — owner decision recorded in this plan.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-16-etsy-open-api-restore-review.md
- Verdict: pending
