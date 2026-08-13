# Scope Correction — Discover/catalog only (Etsy Phase 9 retired for this goal)

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Goal id (unchanged) | `phase-9-custom-request-results-and-routing-remediation` |
| Owner QA | **PASS WITH NOTES** — Discover defects PASS; Etsy not in current defect scope |
| Authoritative base | `975f6400262a86600c4662f39480c6f55e20b0c1` |
| Branch | `fix/phase9-results-and-discover-remediation` |

---

## Decision

This corrective **closes as Discover/catalog remediation only**.

Workstream A (Etsy Recommendations results/lifecycle remediation inherited from older Phase 9 planning) is **retired / superseded for this goal** — not implemented in the final diff.

Assisted Creation remains **untouched** (as intended).

---

## Owner PASS (retained)

1. Discover category rail hydration / category completeness  
2. Curated counts + truthful `hasMore` / Load more  

---

## Reverted for final PR scope

Etsy application-code changes from this remediation were restored to base `975f640…`:

- `apps/portal/features/etsy-recommendations/components/EtsyResultsDashboard.tsx`
- `apps/portal/features/etsy-recommendations/hooks/useEtsyRecommendationWizard.ts`
- `apps/portal/features/etsy-recommendations/pages/EtsyRecommendationsPageContent.tsx`
- `apps/portal/styles/etsy-recommendations.css`
- Removed: `apps/portal/features/etsy-recommendations/utils/etsyResultsLifecycleRemediation.test.ts`

---

## Final PR scope (Discover only)

- Catalog eligibility flags for Recently Requested / Most Liked (list + count + hasMore)
- Discover Home category rail post-selection hydration
- Focused catalog tests

No Functions / Rules / indexes / Algolia / Studio / Assisted / Etsy app changes.
