import { algoliasearch, type Algoliasearch } from 'algoliasearch';
import { defineString } from 'firebase-functions/params';

import { algoliaAdminApiKeySecret } from './algoliaSecrets';

export const algoliaAppId = defineString('ALGOLIA_APP_ID', { default: '' });
export const algoliaPortalCatalogIndexName = defineString('ALGOLIA_PORTAL_CATALOG_INDEX_NAME', {
  default: 'portal_catalog_ready_dev',
});

export function isAlgoliaPortalCatalogSyncConfigured(): boolean {
  try {
    return Boolean(algoliaAppId.value().trim());
  } catch {
    return false;
  }
}

export function getAlgoliaPortalCatalogIndexName(): string {
  const name = algoliaPortalCatalogIndexName.value().trim();
  return name || 'portal_catalog_ready_dev';
}

export function createAlgoliaAdminClient(): Algoliasearch {
  const appId = algoliaAppId.value().trim();
  const apiKey = algoliaAdminApiKeySecret.value().trim();
  if (!appId || !apiKey) {
    throw new Error('Algolia admin credentials are not configured.');
  }
  return algoliasearch(appId, apiKey);
}

export async function ensurePortalCatalogAlgoliaIndexSettings(
  client: Algoliasearch,
  indexName: string,
): Promise<void> {
  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: ['title', 'searchText', 'categoryName', 'unordered(tagFacetKeys)'],
      attributesForFaceting: ['filterOnly(tagIds)', 'filterOnly(categoryId)', 'tagFacetKeys'],
      customRanking: ['desc(readyAtMs)'],
      // Keep records small — no unretrievable private attrs expected.
      unretrievableAttributes: [],
    },
  });
}
