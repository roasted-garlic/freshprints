# Production Maintenance and Smart Profile / Algolia Preview

Date: 2026-09-13
Parent goal: `coordinated-production-promotion-release-readiness`
Project: `fresh-prints-prod`
Frozen candidate: `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`

## Maintenance activation

The owner-authorized maintenance state is ON. Read-only Firestore metadata confirms
`settings/portalMaintenance` exists with `enabled=true`; the configured tester value was not
recorded. The public `getPortalMaintenanceState` callable returns the reviewed bounded heading and
message with `maintenanceTestAccessGranted=false` for an unauthenticated caller. An unauthenticated
attempt to update maintenance returned HTTP 401 `UNAUTHENTICATED`, confirming the callable write
boundary. The final Firestore Rules release remains live, and both projection producer Functions
are ACTIVE.

The reviewed local maintenance contracts pass 9/9 under the Firestore emulator, covering customer
mutation guards, owner control, tester eligibility, merged-account recovery, private responses, and
bounded refresh. No live authenticated Studio/admin session was available in this shell, so visual
owner/admin recovery usability is not independently claimed as a live PASS. Maintenance was not
turned OFF.

## Smart Profile filter investigation

- Exact Portal flag: `NEXT_PUBLIC_USE_SMART_FILTERS`.
- Code contract: `portalSmartFiltersEnabled()` is true only when the value is exactly `"true"`;
  `isPortalSmartFiltersConfigured()` also requires configured Algolia credentials.
- Production state: the flag is absent from the production App Hosting/Cloud Run environment
  metadata and therefore resolves false; no new value was created or changed.
- The Smart Filters UI is present in the deployed Portal JavaScript bundle, but the button is hidden
  because `showSmartFilters = isPortalSmartFiltersConfigured()` is false.
- Because `NEXT_PUBLIC_*` is build-time client configuration, enabling this flag requires a new
  Portal build after the index reconcile; configuration alone cannot change the already-built client.

## Smart Profile production read-only preview

The reviewed `previewCatalogReprocessJob` callable is not deployed in the current production
Function inventory (the production allowlist intentionally omitted the catalog-reprocess controls),
so no provider-calling or production job invocation was attempted. A read-only Firestore REST
inventory using the same eligibility contract (`status=ready` and `aiReviewStatus=approved`) found:

- Ready designs: **2,734**;
- eligible Ready designs: **2,734**;
- already-current Smart Profiles: **0**;
- requiring reprocess: **2,734**;
- missing Smart Profile: **2,734**;
- malformed/unsafe: **0**;
- skipped/excluded: **0** among the eligible set (the indexed status contract excludes non-ready or
  non-approved records);
- prompt/normalizer distribution: all `(missing)` because no `smartProfile` field is present;
- reviewed target snapshot: prompt `catalog-enrich-v37`, normalizer `smart-profile-normalizer-v6`;
- selected runtime model: `gemini-2.5-flash-lite` (Google provider);
- expected provider calls: **2,734** (one enrichment per eligible design);
- cost: not reliably estimable without provider token usage; no provider calls were made.

The current production settings resolve `catalogWorkflowMode=manual` (field absent, fail-safe
default), `catalogAutonomousLiveEnabled=false`, and `semanticReviewPlaygroundEnabled=false`.
Automatic autonomy and Pass 2 remain OFF. The reviewed worker preserves staff/import preset
authority and carries the explicit-content policy through the enrichment pipeline; no settings or
design documents were mutated.

## Algolia read-only preview

The verified production index is **`portal_catalog_ready_prod`** in app `Z1FVCM5QUX`. Search-only
read access reports **2,734** records. A `facets=*` query exposes only the legacy `tagFacetKeys`
facet; a representative record contains `tagIds` and `tagFacetKeys` and no Smart Profile facet
fields. The search-only key cannot read index settings (`403 Method not allowed with this API key`),
and the reviewed owner/admin `reconcilePortalCatalogAlgoliaIndex({dryRun:true})` callable returned
`401 UNAUTHENTICATED` from this shell; therefore the live searchable-attribute list is not claimed
as independently read here (**[NEEDS LIVE ADMIN API CHECK]**). The prior reviewed legacy contract
was `title`, `searchText`, `categoryName`, and `unordered(tagFacetKeys)` searchable, with
`filterOnly(tagIds)`, `filterOnly(categoryId)`, and `tagFacetKeys` faceting; this is historical
evidence, not a fresh live settings read.

The proposed settings are the repository contract:

- searchable attributes: `title`, unordered Smart Profile dimensions and `categoryName`,
  `unordered(colors)`, `unordered(searchConcepts)`, `unordered(visibleText)`,
  `unordered(objects)`, and `searchText`;
- facets: `categoryId` plus the eight Smart Profile facets `subjects`, `styles`, `themes`,
  `interests`, `professionsGroups`, `occasions`, `places`, and `colors`;
- legacy `tagIds` / `tagFacetKeys` are absent from proposed records/settings after reconcile;
- category and Halftone remain supported separately; legacy tag search/facet authority is not.

Expected disposition after the separately authorized reconcile is a full clear/rebuild or equivalent
reviewed rebuild from the 2,734 Ready source records, with Smart Profile fields populated after the
reprocess. No clear, rebuild, settings mutation, or record write occurred in this checkpoint.

The dependency is strict: complete the Smart Profile reprocess and Algolia reconcile first, then
publish a Portal build with `NEXT_PUBLIC_USE_SMART_FILTERS=true`; enabling the UI before indexed
Smart Profile facets exist would expose empty/incorrect filters.

## Production boundary

No Smart Profile provider calls, reprocess APPLY, Algolia clear/rebuild APPLY, Portal build, index or
settings mutation, autonomy/Pass 2 enablement, tag deletion, unrelated backfill, or maintenance
deactivation occurred. Maintenance must remain ON.

## Next owner checkpoints

1. `OWNER AUTHORIZE PROD FULL ELIGIBLE-DESIGN SMART PROFILE REPROCESS/BACKFILL`
2. After that operation and its verification: `OWNER AUTHORIZE PROD ALGOLIA SMART PROFILE SEARCH RECONCILE/APPLY`

An authenticated owner/admin session is still required to invoke the existing production dry-run
callables for independently recorded callable-level preview evidence before either APPLY gate.
