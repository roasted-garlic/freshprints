# Plan: Etsy link-only results — rip website scrape

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-etsy-link-only-rip-scrape-review.md |

---

## Goal

Remove all Etsy website scrape / ScraperAPI / Firecrawl listing-preview paths from Help Me Find a Design. Results UI is **Primary + Broader Etsy search link cards only**, restyled to feel intentional and clickable. Purchases stay on Etsy (new tab). Target **`fresh-prints-dev` only**.

## Background

Owner rejected scrape quality: scraped cards were not close enough to direct Etsy search links. Prior work (ADR-FP-087g/h/i) is superseded by this owner decision. Return to the website-first link-only posture of ADR-FP-087f, with UI polish.

## Scope

### In Scope

- Delete callable `searchEtsyWebsiteRecommendations` (source, tests, `functions` export)
- Delete ScraperAPI client (`fetchEtsySearchHtml`), cache (`etsyWebsiteScrapeCache`), kill-switch reader (`etsyWebsiteScrapeFlag`) used only by scrape
- Remove scrape-only shared parsers/fixtures (`parseEtsySearchHtml`, `parseEtsySearchMarkdown`, `parseEtsyScraperApiJson`, `parseFirecrawlEtsyExtract`, fixtures)
- Remove `SCRAPERAPI_API_KEY` code wiring (`defineSecret` / secrets.ts); do **not** destroy GCP secret unless easy later
- Portal: remove scrape call, listing grid, skeleton, soft-debug box, Fetch live
- Restyle Primary + Broader link cards (portal design system / dark theme)
- Docs: ADR superseding scrape, BACKEND, RISK_REGISTER, SECURITY, DATA_MODEL
- Undeploy/delete function on `fresh-prints-dev`

### Out of Scope

- Production deploy
- Destroying Secret Manager secrets (`SCRAPERAPI_API_KEY`, `FIRECRAWL_API_KEY`) — optional later
- Deleting Cursor MCP ScraperAPI config (agent tooling, not product hot path)
- Questionnaire / submit / complete / cancel lifecycle changes beyond removing scrape load
- Broader Custom Request / AI paths
- Unrelated Open API leftovers (already removed)

---

## Affected Areas

### Files / Modules (expected)

**Delete**
- `functions/src/searchEtsyWebsiteRecommendations.ts` (+ `.test.ts`)
- `functions/src/lib/etsy/fetchEtsySearchHtml.ts`
- `functions/src/lib/etsy/etsyWebsiteScrapeCache.ts`
- `functions/src/lib/etsy/etsyWebsiteScrapeFlag.ts`
- `packages/shared/src/utils/parseEtsySearchHtml.ts` (+ test + fixtures)
- `packages/shared/src/utils/parseEtsySearchMarkdown.ts` (+ test)
- `packages/shared/src/utils/parseEtsyScraperApiJson.ts` (+ test + fixture)
- `packages/shared/src/utils/parseFirecrawlEtsyExtract.ts` (+ firecrawl fixture if unused)
- `apps/portal/features/etsy-recommendations/components/EtsyListingCard.tsx`

**Modify**
- `functions/src/index.ts` — drop export
- `functions/src/lib/secrets.ts` — drop `scraperApiKeySecret`
- Shared action types — remove search-website request/response types
- Shared listing type — remove if unused after rip
- Portal service, wizard hook, results dashboard, page content, CSS
- Docs: DECISIONS, BACKEND, RISK_REGISTER, SECURITY, DATA_MODEL, ROADMAP/TECH_DEBT if scrape referenced

### Architecture Impact
- [x] Details: Remove server scrape layer; Portal results = client-built URLs + open in new tab only. Restore simpler UI → services → submit/complete callables.

### Security Impact
- [x] Details: Stop requiring / wiring `SCRAPERAPI_API_KEY` for product path. No client-side scrape. R-010 scrape risk → mitigated / closed for product (link-only).

### Data Model Impact
- [x] Details: Stop reading/writing `etsyWebsiteSearchCache` and scrape kill switch from code. Docs note collections may remain inert in Firestore (no migration required). Rate-limit scrape fields unused.

### Backend Impact
- [x] Details: Delete callable on `fresh-prints-dev`. Submit/complete/cancel unchanged.

### UI / UX Impact
- [x] Details: Results = polished Primary + Broader cards; clear “Open on Etsy” CTA; no listing placeholders / debug.
- [x] **QA follow-up (2026-07-16 owner):** Step 2 Tone/style → free-text + suggestions (no checkboxes); subject autocomplete flush under input with Enter/arrows/Escape. Still link-only; no scrape re-add.

### Migration Impact
- [x] None (code-only; optional later Firestore doc cleanup)
- [x] Forward: undeploy function; Portal local (App Hosting only if used)
- [x] Rollback: revert git + redeploy prior function revision (not preferred)

---

## Approach

1. Rip functions scrape stack + secret wiring + export.
2. Rip shared scrape parsers/types used only for cards.
3. Simplify Portal wizard/service/results to link-only; delete listing card component.
4. Restyle query cards within existing portal tokens (hover lift, primary vs broader hierarchy, CTA row).
5. Update docs + ADR-FP-087j.
6. `firebase functions:delete searchEtsyWebsiteRecommendations --project fresh-prints-dev` (or deploy after export removed).
7. Automated tests on remaining packages; manual QA checkpoint.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc -p functions --noEmit`; portal/shared as applicable | yes |
| Lint | project lint for touched packages if configured | yes if exists |
| Unit tests | remaining etsyRecommendation* tests (query builder, validation, listing URL, subject) | yes |
| Build | skip full monorepo unless needed | no |
| Deploy delete | delete function on fresh-prints-dev | yes (dev) |

### Manual
- [x] Custom Designs → questionnaire → results: only snazzy Primary/Broader cards; open Etsy; no scrape/debug/listings

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (owner PASS/FAIL)
- [ ] Production deploy — N/A
- [ ] Secrets destroy — out of scope

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Orphaned function still callable briefly | Low | Explicit delete on fresh-prints-dev |
| Secret left in GCP | Low | Document optional cleanup; code no longer references |
| Owner wants scrape again later | Low | ADR records decision; prior code in git history |

---

## Rollback Plan

Revert this branch/commit and redeploy prior `searchEtsyWebsiteRecommendations` revision on `fresh-prints-dev` if needed. Prefer not to restore scrape without new owner approval.

---

## Documentation Updates Required
- [x] BACKEND.md
- [x] DATA_MODEL.md
- [x] SECURITY.md
- [x] DECISIONS.md (ADR-FP-087j)
- [x] RISK_REGISTER.md
- [ ] ROADMAP.md (brief note if scrape cards listed)

---

## Open Questions
- [x] None — owner decision is authoritative

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-16-etsy-link-only-rip-scrape-review.md
- Verdict: pending
