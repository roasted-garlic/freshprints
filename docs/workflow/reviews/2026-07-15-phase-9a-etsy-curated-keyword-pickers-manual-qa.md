# Phase 9A Curated Keyword Pickers — Manual QA

Date: 2026-07-15  
Plan: `docs/workflow/plans/2026-07-15-phase-9a-etsy-curated-keyword-pickers-plan.md`  
Environment: Portal local → `fresh-prints-dev`

## Deploy

| Item | Result |
|------|--------|
| `submitEtsyRecommendationRequest` | Deployed to `fresh-prints-dev` |
| `searchEtsyRecommendations` | Deployed to `fresh-prints-dev` |
| Shared unit tests | `npx tsx --test packages/shared/src/utils/etsyRecommendation*.test.ts` — **14/14 pass** |

## Highland-cow picker path

| Step | Expected |
|------|----------|
| Subject: Highland cow (optional Funny) | Short stack, not full sentence |
| Exact saying empty or ≤60 chars | API never dumps long prose |
| Find designs | Listings and/or `rawResultCount > 0` |

**Owner result:** **PASS** — listings / `rawResultCount > 0`

## Pass criteria

- [x] Curated subjects drive search (no required free-text description)
- [x] Review shows “We’ll search Etsy for: …” preview matching API keywords
- [x] Highland cow via picks returns API hits on Dev
- [x] ADR-FP-087d + DATA_MODEL answers fields updated
