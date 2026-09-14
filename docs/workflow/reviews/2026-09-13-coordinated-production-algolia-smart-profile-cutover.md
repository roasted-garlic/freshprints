# Production Algolia Smart Profile Cutover — Owner Gate

Date: 2026-09-13
Parent goal: `coordinated-production-promotion-release-readiness`
Project: `fresh-prints-prod`
Owner authorization: `OWNER AUTHORIZE PROD ALGOLIA SMART PROFILE SEARCH RECONCILE/APPLY`

## Read-only preflight

Firestore REST inventory confirms 2,734 eligible designs (`status=ready` and
`aiReviewStatus=approved`). All 2,734 have Smart Profiles current at the frozen-source target
`catalog-enrich-v39` / `smart-profile-normalizer-v7`; missing, stale, malformed, unsafe, and
failed/unprocessed counts are zero. Maintenance is ON, Catalog Processing Mode is `shadow`, Live
Autonomous/autonomy is OFF, Pass 2 is OFF, and the provider/model remains Google
`gemini-2.5-flash-lite`.

`gcloud functions describe` confirms the reviewed `reconcilePortalCatalogAlgoliaIndex` Function is
ACTIVE in `fresh-prints-prod` with `ALGOLIA_APP_ID=Z1FVCM5QUX` and
`ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod`. Secret Manager metadata confirms
`ALGOLIA_ADMIN_API_KEY` has enabled versions; no secret value was read or displayed.

The exact reviewed production reconcile implementation is
`functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts`. It rebuilds from ready Firestore
designs, applies `ensurePortalCatalogAlgoliaIndexSettings`, clears the configured index, and
upserts the bounded records. The Studio bridge uses the logged-in owner/admin Firebase session and
does not accept pasted tokens.

## Frozen/reviewed contract

`packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` defines the exact searchable
attributes:

`title`, `unordered(subjects)`, `unordered(professionsGroups)`, `unordered(occasions)`,
`unordered(places)`, `unordered(themes)`, `unordered(interests)`, `unordered(styles)`,
`categoryName`, `unordered(colors)`, `unordered(searchConcepts)`, `unordered(visibleText)`,
`unordered(objects)`, `searchText`.

Exact facet attributes are `categoryId` plus the eight Smart Profile facets:
`subjects`, `styles`, `themes`, `interests`, `professionsGroups`, `occasions`, `places`, and
`colors`. The public record allowlist contains no `tagIds` or `tagFacetKeys`; legacy Firestore tag
data is not physically deleted.

## Apply boundary / stop

This continuation revalidated the owner-authorized checkpoint. The repository bridge remains
`apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.ts`
and calls the owner/admin-only `reconcilePortalCatalogAlgoliaIndex` callable; no alternate CLI or
token path is approved.

The owner-authenticated Studio/admin session required for the reviewed dry run, current Algolia
settings capture, and APPLY is not available in this shell. No unauthenticated callable invocation,
token workaround, index clear, settings change, record write, or rebuild was performed. Current
Algolia record count and settings remain **not captured** pending that authenticated path; therefore
the reconcile preview has not passed and APPLY is not started.

Portal Smart Filters (`NEXT_PUBLIC_USE_SMART_FILTERS`) and Studio Smart Filters
(`VITE_USE_SMART_FILTERS`) remain OFF. Because these are build-time flags, a new Portal production
rollout and a new Studio release will be required only after successful Algolia verification; neither
has been published. Catalog Processing Mode remains `shadow` under the reviewed post-backfill
disposition; Autonomous mode remains disabled. Maintenance remains ON.

## Production Studio access investigation — 2026-09-13

The owner opened stable Studio `1.0.10` against production, but the expected DevTools action and
`Ctrl+Shift+I` are unavailable. Repository inspection confirms this is intentional environment
gating, not an authenticated-session failure:

- `Sidebar.tsx` creates the Dev Tools action only when `import.meta.env.DEV && isElectronDesktop()`;
- Electron `appIpcHandlers.ts` rejects `OPEN_DEV_TOOLS` when `app.isPackaged` is true;
- `permissionService.ts` makes the role permission owner-only, but the production build/package
  gates still suppress it;
- `portalCatalogAlgoliaReconcileAdminService.ts` installs its only UI surface on
  `window.freshPrintsDev` only when `isFirebaseDebugPanelEnabled` is true;
- `firebaseDebugPanelGate.ts` requires a development build and `fresh-prints-dev`, so the bridge is
  absent from production even if DevTools were opened by another means.

Focused source search found no normal production Studio route, screen, or control invoking the
reconcile service. Root cause is therefore **B — existing reconcile path is DEV/debug-only**.
The investigation-only corrective Plan is
`docs/workflow/plans/2026-09-13-production-algolia-reconcile-studio-access-corrective-plan.md`.
It preserves the existing owner/admin callable and explicitly records that the callable response
does not provide live Algolia settings; no production callable, index read, or mutation was
performed.

## Next owner action

Review and approve the corrective Plan before implementation:
`OWNER REVIEW/APPROVE PRODUCTION ALGOLIA RECONCILE STUDIO ACCESS CORRECTIVE PLAN`.
After that Plan is formally reviewed and implemented, the production Studio control must run the
reviewed reconcile preview/dry run, capture the permitted metadata, verify the exact contract, and
leave APPLY separately owner-gated. Stop on any index identity or contract mismatch. Expected next
checkpoint after successful cutover: **OWNER AUTHORIZE SMART FILTER PRODUCTION BUILDS / RELEASES**.
