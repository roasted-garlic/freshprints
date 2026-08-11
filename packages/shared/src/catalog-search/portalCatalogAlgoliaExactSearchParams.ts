/**
 * Query-time Algolia exact-token search semantics for Portal (and Studio) catalog search.
 *
 * Prefer these searchParams over mutating production index settings:
 * - typoTolerance: false — blocks Kill→Will (1-edit neighbors)
 * - queryType: prefixNone — blocks Kill→Willie-style prefix expansion
 *
 * Multi-word queries keep Algolia default AND across tokens.
 * Admin/write keys must never appear in clients that import this helper.
 */

export const PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS = {
  typoTolerance: false as const,
  queryType: 'prefixNone' as const,
};

export type PortalCatalogAlgoliaExactTokenSearchParams =
  typeof PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS;

/**
 * When the query is non-empty after trim, merge exact-token params into searchParams.
 * Empty queries (browse / unconstrained facets) leave engine defaults unchanged.
 */
export function withPortalCatalogAlgoliaExactTokenSearchParams<
  T extends Record<string, unknown>,
>(searchParams: T, query: string | undefined | null): T & Partial<PortalCatalogAlgoliaExactTokenSearchParams> {
  if (!query?.trim()) {
    return searchParams;
  }
  return {
    ...searchParams,
    ...PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS,
  };
}
