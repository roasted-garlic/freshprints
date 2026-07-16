# Phase 9A Hybrid Keyword Parse — Manual QA

Date: 2026-07-15  
Plan: `docs/workflow/plans/2026-07-15-phase-9a-etsy-hybrid-keyword-parse-plan.md`  
Environment: Portal local → `fresh-prints-dev`

## Deploy

| Item | Result |
|------|--------|
| `submitEtsyRecommendationRequest` | Deployed to `fresh-prints-dev` (incl. post-fix redeploy) |
| `searchEtsyRecommendations` | Deployed to `fresh-prints-dev` |
| Shared unit tests | `etsyRecommendation*.test.ts` — pass |

## Paths verified

| Case | Expected |
|------|----------|
| Type `highland cow` (or suggest-pick) | Listings and/or `rawResultCount > 0`; API keywords short stack + `png digital download` |
| Type `Wednesday Addams` (or suggest-pick) | Listings and/or `rawResultCount > 0`; parsed phrase not discarded |
| Review preview | “We’ll search Etsy for: …” matches focused API keywords |

## Owner result

**PASS WITH NOTES** (2026-07-15): Search works. Suggestion UX still a bit awkward (typed-prefix / pick flow). Follow-up: polish autocomplete replace/append behavior further if owner wants.

Hotfix mid-QA: suggestion pick now replaces incomplete typed prefixes; leftover parser tokens dropped; submit/search redeployed after “Choose at least one subject” from stale Dual-path.

## Pass criteria

- [x] Free-text subject + autocomplete replaces required subject chip grid
- [x] Draft key `fp.etsyRecommendation.draft.v3` (old v2 drafts cleared)
- [x] Highland cow path returns API hits on Dev
- [x] Wednesday Addams path returns API hits on Dev
- [x] ADR-FP-087e + DATA_MODEL answers fields updated
- [ ] Suggestion UX feels polished (deferred / follow-up)
