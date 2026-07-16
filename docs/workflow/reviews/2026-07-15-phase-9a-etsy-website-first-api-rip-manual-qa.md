# Phase 9A Website-first Open API rip — Manual QA

Date: 2026-07-15  
Plan: `docs/workflow/plans/2026-07-15-phase-9a-etsy-website-first-api-rip-plan.md`  
Environment: Portal local → `fresh-prints-dev`

## Deploy

| Item | Result |
|------|--------|
| Delete `searchEtsyRecommendations` | Deploy to `fresh-prints-dev` |
| Redeploy `submitEtsyRecommendationRequest` | Deploy to `fresh-prints-dev` |
| Shared tests | `etsyRecommendation*.test.ts` pass |
| Functions `tsc` | Pass |

## Paths to verify

| Case | Expected |
|------|----------|
| Submit highland cow (or similar) | Results show Primary + Broader Etsy link cards (no listing grid) |
| Open Primary | Etsy search with `q` including terms + `png digital download`, `instant_download=true&explicit=1` |
| Done / Cancel | Returns to choose path without API errors |
| No “Search again” / diagnostics / quota | Gone |

## Owner result

**PASS** (2026-07-15) — owner visual smoke on local Portal against `fresh-prints-dev`.
