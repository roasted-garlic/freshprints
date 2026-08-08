/**
 * Stage 4: Portal no longer reads generated portal-catalog Storage for search/facets.
 * Methods throw if called — accidental rewiring fails closed instead of fetching shards.
 * File retained until Stage 5 deletes shared parsers / Storage objects.
 */

export const portalCatalogAssetService = {
  async listMatchingDesigns(): Promise<never> {
    throw new Error(
      'Generated portal catalog search is retired (Stage 4). Use Algolia or Firestore browse.',
    );
  },

  async listTagFacets(): Promise<never> {
    throw new Error(
      'Generated portal catalog facets are retired (Stage 4). Use Algolia when configured.',
    );
  },

  async listNarrowedTagFacets(): Promise<never> {
    throw new Error(
      'Generated portal catalog facets are retired (Stage 4). Use Algolia when configured.',
    );
  },
};
