/**
 * Algolia Cloud Function exports — intentionally NOT imported by default `index.ts`
 * while Algolia is optional/OFF.
 *
 * Re-export from `functions/src/index.ts` only after an approved production Algolia
 * Functions checkpoint when:
 * - `ALGOLIA_ADMIN_API_KEY` exists in Secret Manager for the target project
 * - `ALGOLIA_APP_ID` / `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` are set for that project
 * - production index is **not** the development default (`portal_catalog_ready_dev`);
 *   production is expected to use a separate index (e.g. `portal_catalog_ready_prod`)
 *
 * Dev caution: after these are absent from `index.ts`, avoid unfiltered
 * `firebase deploy --only functions` on `fresh-prints-dev` (where Algolia Functions
 * may already be live) — use scoped `--only` lists until exports are restored.
 */
export { syncPortalCatalogDesignToAlgolia } from "./syncPortalCatalogDesignToAlgolia";
export {
  reconcilePortalCatalogAlgoliaIndex,
  reconcilePortalCatalogAlgoliaIndexScheduled,
} from "./reconcilePortalCatalogAlgoliaIndex";
