/**
 * Stage 1b / Stage 4 — Portal Algolia catalog search flags / public env.
 * Admin/write keys must never appear here.
 *
 * Managed search via Algolia is the **default** path when search-only credentials
 * are present. `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=false` is an emergency
 * kill-switch only (not an opt-in).
 *
 * Slice 3 Smart Filters UI: `NEXT_PUBLIC_USE_SMART_FILTERS=true` is opt-in (default OFF).
 */

export function portalAlgoliaCatalogSearchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH !== 'false';
}

/** Customer Smart Filters UI — enabled only when explicitly `true` (default OFF). */
export function portalSmartFiltersEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_SMART_FILTERS === 'true';
}

export function getPortalAlgoliaCatalogConfig(): {
  appId: string;
  searchApiKey: string;
  indexName: string;
} | null {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID?.trim() ?? '';
  const searchApiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY?.trim() ?? '';
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME?.trim() ?? '';
  if (!appId || !searchApiKey || !indexName) {
    return null;
  }
  return { appId, searchApiKey, indexName };
}

export function isPortalAlgoliaCatalogConfigured(): boolean {
  return portalAlgoliaCatalogSearchEnabled() && getPortalAlgoliaCatalogConfig() !== null;
}

/** Smart Filters button/modal — flag on and Algolia search credentials present. */
export function isPortalSmartFiltersConfigured(): boolean {
  return portalSmartFiltersEnabled() && isPortalAlgoliaCatalogConfigured();
}
