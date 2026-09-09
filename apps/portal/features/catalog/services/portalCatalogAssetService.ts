/**
 * Stage 4: Portal no longer reads generated portal-catalog Storage for search/facets.
 * The service retains only the historical generated-search guard. Tag-facet methods were
 * removed once the Portal tag drawer and all active facet callers were retired.
 * File retained until Stage 5 deletes shared parsers / Storage objects.
 */

export const portalCatalogAssetService = {
  async listMatchingDesigns(): Promise<never> {
    throw new Error(
      'Generated portal catalog search is retired (Stage 4). Use Algolia or Firestore browse.',
    );
  },

};
