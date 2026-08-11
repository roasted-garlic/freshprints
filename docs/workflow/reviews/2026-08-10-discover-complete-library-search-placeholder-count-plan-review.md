# Review: Discover complete-library search placeholder count (plan)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-10-discover-complete-library-search-placeholder-count-plan.md |
| Verdict | **approved** |

---

## Summary

Independent verification confirms Discover placeholder uses `useCatalogHomeDesigns().designs.length`, which is the bounded `listHomeDiscoveryPool` merge (~`HOME_DISCOVERY_POOL_PAGE_SIZE` 80 per preferred sort), not ready membership. Reusing `countReadyDesigns({})` via `fetchReadyDesignCountWithRetry` without expanding home hydration is the correct narrow fix on the existing hotfix branch.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Placeholder only; rails unchanged |
| Architecture alignment | pass | Firestore aggregate SoT; no full hydrate |
| Security impact addressed | pass | Existing public ready count read pattern |
| Data / Backend | pass | No Functions/Rules/indexes/Algolia |
| Test strategy adequate | pass | Pure placeholder + containment; scroll tests rerun |
| Human checkpoints | pass | Stop before merge/deploy |
| No silent scope expansion | pass | Same branch; scroll fix preserved |

---

## Independent verification

| Claim | Verdict |
|-------|---------|
| `readyDesignCount = designs.length \|\| null` in CatalogHomePageContent | Confirmed |
| Home uses `listHomeDiscoveryPool` only | Confirmed |
| `HOME_DISCOVERY_POOL_PAGE_SIZE = 80` bounded pages | Confirmed |
| `countReadyDesigns` + `fetchReadyDesignCountWithRetry` exist | Confirmed |
| Neutral fallback string already present | Confirmed (`title, tag or description`) |

---

## Required changes
- [ ] None

## Blockers
None.

## Next Step
Implement on `hotfix/portal-design-modal-scroll-preservation` → Test → combined Implementation Review → update prod PR checkpoint; **do not merge/deploy**.
