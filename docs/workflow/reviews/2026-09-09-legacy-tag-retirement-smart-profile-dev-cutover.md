# DEV checkpoint — legacy tag operational retirement and Smart Profile search parity

| Field | Result |
|---|---|
| Date | 2026-09-09 |
| Firebase project | `fresh-prints-dev` only |
| Algolia app / index | `WQ6OPP2E6Z` / `portal_catalog_ready_dev` |
| Production touched | **No** |
| Portal App Hosting / Studio publish | **No** (not required for the existing local DEV Smart Filter configuration) |
| Owner authorization | `Continue Workflow OWNER AUTHORIZATION: DEV SMART FILTER CONFIG + TAG-RETIREMENT…` |

## Scoped Function deployment

The deployment used an explicit six-Function allowlist; no unfiltered Functions deploy was used:

```text
functions:enqueueAiEnrichment
functions:getPortalDesignShareOpenGraph
functions:listPortalShowCatalogDesigns
functions:syncPortalCatalogDesignToAlgolia
functions:reconcilePortalCatalogAlgoliaIndex
functions:reconcilePortalCatalogAlgoliaIndexScheduled
```

The list is derived from the reviewed source diff: the active category-only AI loader path, the Algolia record/sync/reconcile path, and the public show/share DTO handlers changed by this goal. The retained `onTagTaxonomySourceWritten` and `archiveTagWithGuards` exports were not deleted or deployed as part of this checkpoint; post-deploy inventory confirmed both remain `ACTIVE` in `fresh-prints-dev`.

Deployment result: **6 Functions deployed, 0 errors**. The Firebase CLI project and all resulting Function metadata were `fresh-prints-dev` / `us-central1`.

## Existing reconcile mechanism

The existing owner/admin callable was used, not a one-off reindex script:

1. Dry run: `scanned=350`, `upserted=350`, `cleared=false`.
2. Apply: `scanned=350`, `upserted=350`, `cleared=true`, `dryRun=false`.

The callable applied the reviewed shared index settings before rebuilding the 350 ready-design records. No Firestore/Storage Rules, Firestore composite indexes, migration, AI provider call, Smart Profile backfill, or tag mutation was performed.

## Algolia settings evidence

Rollback capture was taken immediately before apply. The pre-change DEV settings were:

```json
{
  "searchableAttributes": [
    "title", "unordered(subjects)", "unordered(professionsGroups)",
    "unordered(occasions)", "unordered(places)", "unordered(themes)",
    "unordered(interests)", "unordered(styles)", "categoryName",
    "unordered(colors)", "unordered(searchConcepts)", "unordered(visibleText)",
    "unordered(objects)", "searchText", "unordered(tagFacetKeys)"
  ],
  "attributesForFaceting": [
    "filterOnly(tagIds)", "filterOnly(categoryId)", "tagFacetKeys",
    "subjects", "styles", "themes", "interests", "professionsGroups",
    "occasions", "places", "colors"
  ],
  "customRanking": ["desc(readyAtMs)"],
  "paginationLimitedTo": 1000
}
```

Post-apply DEV settings are:

```json
{
  "searchableAttributes": [
    "title", "unordered(subjects)", "unordered(professionsGroups)",
    "unordered(occasions)", "unordered(places)", "unordered(themes)",
    "unordered(interests)", "unordered(styles)", "categoryName",
    "unordered(colors)", "unordered(searchConcepts)", "unordered(visibleText)",
    "unordered(objects)", "searchText"
  ],
  "attributesForFaceting": [
    "categoryId", "subjects", "styles", "themes", "interests",
    "professionsGroups", "occasions", "places", "colors"
  ],
  "customRanking": ["desc(readyAtMs)"],
  "paginationLimitedTo": 1000
}
```

The eight Smart Profile facet dimensions are present; `tagIds` and `tagFacetKeys` are absent from both searchable and faceting settings. `objects`, `searchConcepts`, and `visibleText` remain searchable.

## Deterministic live DEV parity corpus

The live DEV index returned 350 records (350 returned at `hitsPerPage=1000`). Results included:

| Check | Result |
|---|---|
| Smart Profile facets | `subjects=Pennywise` → 2; `styles=digital art` → 1; `themes=horror` → 4; `interests=horror movies` → 7; `professionsGroups=villains` → 1; `occasions=summer vacation` → 1; `places=beach` → 4; `colors=blue` → 102 |
| Smart facet AND | `subjects=Pennywise` AND `styles=digital art` → 2 |
| Category narrowing | `categoryId=tj0HemRh2RuYLfI7N6nO` → 161 |
| Missing-profile behavior | sentinel facet `subjects=__missing_profile_sentinel__` → 0 |
| Searchable `objects` | query `ice` → 8 |
| Searchable `searchConcepts` | query `horror` → 7 |
| Searchable `visibleText` | query `The` → 323 |
| Query/pagination | empty query → 350; page 0 and page 1 at 5 hits each returned 10 distinct IDs; `q=horror` → 7 |
| Exact ID | `sLQJtNGoTimOfLaNxqmW` resolved to `Horror Icons Enjoying a Summer Vacation` |
| Former tag-name/alias queries | 20 sampled former names/aliases all returned 0; e.g. `beauty and the beast beast` → 0 |
| Tag-field proof | no returned record key contains `tag`; settings contain no tag attribute |
| Halftone | DEV Firestore ready corpus has 1 record with `halftoneStaffDecision.value === true`; Halftone remains a dedicated field, not a tag facet |

Pagination and zero-count behavior were exercised with the same live search client (page 0/page 1, bounded page size, and the missing-profile sentinel); the source retirement suites separately cover legacy `?tag`/`?tags` no-crash/no-filter behavior. Portal/Studio were not published in this checkpoint, so owner QA must verify those routes in the intended DEV builds.

## Rollback

The retained pre-change settings above are the rollback contract. The pre-change source revision is
`76884b968841b76744758f911c509f66aaeb8d2d`; historical `design.tags` and taxonomy documents were
not mutated. If rollback is required, restore those settings through the Algolia admin settings
API for **this exact DEV app/index**, redeploy the prior reviewed Algolia builder/sync/reconcile
source from that revision through an owner-approved scoped deployment, and run the existing
owner/admin reconcile against the unchanged Firestore corpus. Do not target `fresh-prints-prod`; do
not delete tags or Functions.

## Next gate

This checkpoint is not Owner QA signoff. The next required marker is:

`[NEEDS OWNER DEV QA: LEGACY TAG RETIREMENT + SMART PROFILE SEARCH PARITY]`
