import { algoliasearch, type SearchClient } from "algoliasearch";

import { getStudioAlgoliaCatalogConfig } from "./studioAlgoliaCatalogFlags";

let cachedClient: SearchClient | null = null;
let cachedKey = "";

export function getStudioAlgoliaSearchClient(): SearchClient {
  const config = getStudioAlgoliaCatalogConfig();
  if (!config) {
    throw new Error("Algolia catalog search is not configured.");
  }
  const key = `${config.appId}:${config.indexName}:${config.searchApiKey.slice(0, 8)}`;
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }
  cachedClient = algoliasearch(config.appId, config.searchApiKey);
  cachedKey = key;
  return cachedClient;
}

export function getStudioAlgoliaIndexName(): string {
  const config = getStudioAlgoliaCatalogConfig();
  if (!config) {
    throw new Error("Algolia catalog search is not configured.");
  }
  return config.indexName;
}

/** Test-only reset. */
export function resetStudioAlgoliaSearchClientForTests(): void {
  cachedClient = null;
  cachedKey = "";
}
