/**
 * Query-time Algolia exact-token search semantics for Portal (and Studio) catalog search.
 *
 * Prefer these searchParams over mutating production index settings:
 * - typoTolerance: false — blocks Kill→Will (1-edit neighbors)
 * - queryType: prefixLast — completed tokens exact; final token may prefix-match (kil→Kill)
 *   without fuzzy edits (kill↛Will) and without prefixAll (kill↛Willie)
 *
 * Multi-word queries keep Algolia default AND across tokens.
 * Admin/write keys must never appear in clients that import this helper.
 */

export const PORTAL_CATALOG_ALGOLIA_EXACT_TOKEN_SEARCH_PARAMS = {
  typoTolerance: false as const,
  queryType: 'prefixLast' as const,
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
