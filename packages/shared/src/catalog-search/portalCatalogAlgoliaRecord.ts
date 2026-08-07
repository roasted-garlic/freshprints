/**
 * Stage 1b Algolia Portal catalog search — public-safe record contract.
 * Disposable derived data; Firestore remains source of truth.
 */

export const PORTAL_CATALOG_ALGOLIA_FACET_KEY_SEPARATOR = '::';

export interface PortalCatalogAlgoliaRecord {
  objectID: string;
  title: string;
  /** Flattened public search corpus: title, description, tag names, aliases, category name. */
  searchText: string;
  categoryId: string;
  categoryName: string;
  /** Tag document IDs — used for true AND `facetFilters`. */
  tagIds: string[];
  /**
   * Facet keys `tagId::tagName` so facet distribution carries display names
   * without a second taxonomy hydrate.
   */
  tagFacetKeys: string[];
  /** Newest-ready ordering; never treat createdAt as customer "new". */
  readyAtMs: number;
}

export function encodePortalCatalogTagFacetKey(tagId: string, tagName: string): string {
  return `${tagId}${PORTAL_CATALOG_ALGOLIA_FACET_KEY_SEPARATOR}${tagName}`;
}

export function parsePortalCatalogTagFacetKey(
  key: string,
): { id: string; name: string } | null {
  const separator = PORTAL_CATALOG_ALGOLIA_FACET_KEY_SEPARATOR;
  const index = key.indexOf(separator);
  if (index <= 0) return null;
  const id = key.slice(0, index).trim();
  const name = key.slice(index + separator.length).trim();
  if (!id || !name) return null;
  return { id, name };
}

export function buildPortalCatalogSearchText(input: {
  title: string;
  description?: string;
  categoryName?: string;
  tagNames: string[];
  tagAliases: string[];
}): string {
  return [
    input.title,
    input.description ?? '',
    input.categoryName ?? '',
    ...input.tagNames,
    ...input.tagAliases,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}
