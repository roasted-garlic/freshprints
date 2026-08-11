# Verification: Portal complete catalog count (prelaunch-catalog-search-count-and-first-visit-ux)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Phase | Implement |
| Verdict | **No Portal count UI code change required** |

## Authority path (repo-verified)

| Mode | Source | File |
|------|--------|------|
| Ordinary browse | `catalogService.countReadyDesigns` → Firestore `getCountFromServer` via `resolveOrdinaryMatchingCount` | `useCatalogDesigns.ts`, `catalogService.ts` |
| Managed Algolia search | `response.nbHits` → `serverTotalCount` / `matchingCount` | `portalAlgoliaCatalogSearchService.ts`, `useCatalogDesigns.ts` |
| UI chip | `matchingCount` → `designCountLabel` | `CatalogPageContent.tsx` |

Page size is **40**, not 85. TD-031 already forbids seeding the badge from first-page `designs.length` while paging may continue.

## Conclusion

Approximately **85** on production is consistent with a complete ready-membership aggregate / Algolia `nbHits`, not a loaded-page mislabel in current source. Per Formal Review Required Change / Plan D: **do not fabricate a count fix**. Owner production QA should still compare the badge to Studio ready `countDesigns` / inventory; inventory mismatch would be sync/data, not this UI path.
