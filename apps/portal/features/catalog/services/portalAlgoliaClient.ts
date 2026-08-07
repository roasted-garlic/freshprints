import { algoliasearch, type SearchClient } from 'algoliasearch';

import { getPortalAlgoliaCatalogConfig } from './portalAlgoliaCatalogFlags';

let cachedClient: SearchClient | null = null;
let cachedKey = '';

export function getPortalAlgoliaSearchClient(): SearchClient {
  const config = getPortalAlgoliaCatalogConfig();
  if (!config) {
    throw new Error('Algolia catalog search is not configured.');
  }
  const key = `${config.appId}:${config.indexName}:${config.searchApiKey.slice(0, 8)}`;
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }
  cachedClient = algoliasearch(config.appId, config.searchApiKey);
  cachedKey = key;
  return cachedClient;
}

export function getPortalAlgoliaIndexName(): string {
  const config = getPortalAlgoliaCatalogConfig();
  if (!config) {
    throw new Error('Algolia catalog search is not configured.');
  }
  return config.indexName;
}

/** Test-only reset. */
export function resetPortalAlgoliaSearchClientForTests(): void {
  cachedClient = null;
  cachedKey = '';
}
