/**
 * Studio Algolia catalog search flags — search-only credentials only.
 * Never import or document an Algolia admin/write key here.
 *
 * Uses the same environment-specific index as Portal for the active Firebase project.
 * `VITE_USE_ALGOLIA_CATALOG_SEARCH=false` is an emergency kill-switch only.
 */

export function studioAlgoliaCatalogSearchEnabled(): boolean {
  return import.meta.env.VITE_USE_ALGOLIA_CATALOG_SEARCH !== "false";
}

export function getStudioAlgoliaCatalogConfig(): {
  appId: string;
  searchApiKey: string;
  indexName: string;
} | null {
  const appId = (import.meta.env.VITE_ALGOLIA_APP_ID as string | undefined)?.trim() ?? "";
  const searchApiKey =
    (import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY as string | undefined)?.trim() ?? "";
  const indexName = (import.meta.env.VITE_ALGOLIA_INDEX_NAME as string | undefined)?.trim() ?? "";
  if (!appId || !searchApiKey || !indexName) {
    return null;
  }
  return { appId, searchApiKey, indexName };
}

export function isStudioAlgoliaCatalogConfigured(): boolean {
  return studioAlgoliaCatalogSearchEnabled() && getStudioAlgoliaCatalogConfig() !== null;
}
