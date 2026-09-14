# Production Algolia Smart Profile Reconcile — Owner Authorization Record

| Field | Value |
|---|---|
| Date | 2026-09-14 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Authorization | `OWNER AUTHORIZE PROD ALGOLIA SMART PROFILE SEARCH RECONCILE/APPLY` |
| Project | `fresh-prints-prod` |
| App / index | `Z1FVCM5QUX` / `portal_catalog_ready_prod` |
| Reviewed callable | `reconcilePortalCatalogAlgoliaIndex` |
| Reviewed UI | Production-configured Studio `1.0.11` draft → Settings → AI Enrichment → Algolia Reconcile |
| Status | **OWNER-REPORTED PASS — 2026-09-14; aggregate counts not supplied** |

## Required execution contract

Run the owner/admin-authenticated Studio control only. First run Preview with `{ dryRun: true }`,
verify the target identity, finite scanned/upserted counts, and search-only `nbHits`. Apply requires
the current Preview, an explicit destructive confirmation, and `{ dryRun: false }`. The callable
clears and rebuilds only `portal_catalog_ready_prod` from Ready Firestore designs and applies the
reviewed searchable/facet settings contract. Portal Smart Filters remain OFF during this gate.

## Execution result

The owner reports that the reviewed owner/admin-authenticated Studio Preview → explicit Apply was
run manually against the production target and **PASSED**. The owner did not provide aggregate
Preview/Apply counts in the message; this record intentionally does not infer or invent them. This
shell did not invoke the callable, access Algolia, clear/rebuild the index, or mutate production.

## Current execution boundary

This shell has no owner Firebase Auth session. The reviewed evidence explicitly rejects an
unauthenticated callable invocation, pasted token, or alternate CLI/token path. Maintenance remains
ON; Catalog Processing Mode remains `shadow`; Autonomous and Pass 2 remain OFF.

## Next owner-authorized step

Owner authorization received:
**`OWNER AUTHORIZE SMART FILTER PRODUCTION BUILDS / RELEASES`**.

Run the established stable Studio workflow from frozen production SHA
`f1001332574b8891b2a59c14985e5c00cdbceb09` with `release_type=stable`,
`distribution_mode=internal-unsigned`, and `smart_filters=on`. Finalize/replace the same-SHA
`1.0.11` draft and verify the eight assets plus the ON env bake. Keep the release unpublished until
the separate documented **`APPROVE STUDIO PUBLISH: 1.0.11`** gate follows Windows/Mac arm64/Mac
x64 smoke. Portal Smart Filter secret/flag/App Hosting rollout remains separately unauthorized.
