import {
  buildPortalCatalogSearchText,
  encodePortalCatalogTagFacetKey,
  type PortalCatalogAlgoliaRecord,
} from '../../../packages/shared/src/catalog-search/portalCatalogAlgoliaRecord';

export interface PortalCatalogAlgoliaTaxonomyTag {
  id: string;
  name: string;
  aliases: string[];
  status?: string;
}

export interface PortalCatalogAlgoliaTaxonomyCategory {
  id: string;
  name: string;
}

function millis(value: unknown): number | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

/**
 * designs.tags stores canonical lowercase **names** (e.g. "mama bear"), while the
 * `tags` collection document id is the slug (`mama-bear`). Index builders must
 * resolve either key.
 */
export function catalogTagDocumentIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Index a taxonomy tag under document id and canonical name when they differ. */
export function indexPortalCatalogTaxonomyTag(
  map: Map<string, PortalCatalogAlgoliaTaxonomyTag>,
  tag: PortalCatalogAlgoliaTaxonomyTag,
): void {
  map.set(tag.id, tag);
  const nameKey = tag.name.trim().toLowerCase();
  if (nameKey && nameKey !== tag.id) {
    map.set(nameKey, tag);
  }
}

/**
 * Build a public-safe Algolia record from a ready design + taxonomy maps.
 * Returns null when the design must not be indexed (non-ready / missing title).
 */
export function buildPortalCatalogAlgoliaRecord(input: {
  designId: string;
  data: Record<string, unknown>;
  tagsById: ReadonlyMap<string, PortalCatalogAlgoliaTaxonomyTag>;
  categoriesById: ReadonlyMap<string, PortalCatalogAlgoliaTaxonomyCategory>;
}): PortalCatalogAlgoliaRecord | null {
  const { designId, data, tagsById, categoriesById } = input;
  if (data.status !== 'ready') return null;
  if (typeof data.title !== 'string' || !data.title.trim()) return null;

  const tagIds = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];
  const tagNames: string[] = [];
  const tagAliases: string[] = [];
  const tagFacetKeys: string[] = [];

  for (const tagId of [...new Set(tagIds)]) {
    const tag = tagsById.get(tagId);
    if (!tag || tag.status === 'archived') continue;
    tagNames.push(tag.name);
    tagAliases.push(...(tag.aliases ?? []));
    tagFacetKeys.push(encodePortalCatalogTagFacetKey(tag.id, tag.name));
  }

  const categoryId = typeof data.categoryId === 'string' ? data.categoryId : '';
  const categoryName = categoryId ? (categoriesById.get(categoryId)?.name ?? '') : '';
  const description = typeof data.description === 'string' ? data.description : undefined;
  const readyAtMs = millis(data.readyAt) ?? millis(data.createdAt) ?? 0;

  return {
    objectID: designId,
    title: data.title.trim(),
    searchText: buildPortalCatalogSearchText({
      title: data.title,
      description,
      categoryName,
      tagNames,
      tagAliases,
    }),
    categoryId,
    categoryName,
    tagIds: [...new Set(tagIds)],
    tagFacetKeys,
    readyAtMs,
  };
}

/** Public field allowlist — used by tests to prove no private AI/staff fields. */
export const PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS = [
  'objectID',
  'title',
  'searchText',
  'categoryId',
  'categoryName',
  'tagIds',
  'tagFacetKeys',
  'readyAtMs',
] as const;
