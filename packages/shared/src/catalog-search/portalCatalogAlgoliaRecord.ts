/**
 * Stage 1b Algolia Portal catalog search — public-safe record contract.
 * Disposable derived data; Firestore remains source of truth.
 *
 * Slice 3: Smart Profile dimensions are additive; legacy tag fields remain for migration.
 */

export const PORTAL_CATALOG_ALGOLIA_FACET_KEY_SEPARATOR = '::';

/** Customer-facing Smart Filter facet attributes (Objects / searchConcepts / visibleText excluded). */
export const PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES = [
  'subjects',
  'styles',
  'themes',
  'interests',
  'professionsGroups',
  'occasions',
  'places',
  'colors',
] as const;

export type PortalCatalogAlgoliaSmartFacetAttribute =
  (typeof PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES)[number];

/**
 * Searchable attribute order encodes evidence hierarchy (owner Slice 3 approval):
 * title → structured identity/intent → searchConcepts → visibleText → objects → legacy.
 */
export const PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES = [
  'title',
  'unordered(subjects)',
  'unordered(professionsGroups)',
  'unordered(occasions)',
  'unordered(places)',
  'unordered(themes)',
  'unordered(interests)',
  'unordered(styles)',
  'categoryName',
  'unordered(colors)',
  'unordered(searchConcepts)',
  'unordered(visibleText)',
  'unordered(objects)',
  'searchText',
  'unordered(tagFacetKeys)',
] as const;

export const PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING = [
  'filterOnly(tagIds)',
  /** Retrievable facet values so Category selector can narrow by search/smart context. */
  'categoryId',
  'tagFacetKeys',
  ...PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
] as const;

/**
 * Smart Profile fields that affect Algolia search/facets.
 * Provenance-only churn (automationDecision, validationWarnings, etc.) is excluded.
 */
export const PORTAL_CATALOG_ALGOLIA_SMART_PROFILE_INDEX_KEYS = [
  'subjects',
  'objects',
  'styles',
  'themes',
  'interests',
  'professionsGroups',
  'occasions',
  'places',
  'colors',
  'visibleText',
  'searchConcepts',
  'categoryId',
  'categoryName',
  'provenance.version',
] as const;

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
  /** Smart Profile — omitted when absent/empty (partial coverage safe). */
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  places?: string[];
  colors?: string[];
  visibleText?: string[];
  searchConcepts?: string[];
  smartProfileVersion?: string;
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

/** Normalize a string list for Algolia — omit empties; never emit undefined entries. */
export function normalizePortalCatalogAlgoliaStringList(
  value: unknown,
  maxItems = 12,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= maxItems) break;
  }
  return result.length > 0 ? result : undefined;
}

/**
 * Project only search/facet-relevant Smart Profile fields for change classification.
 * Provenance automation/shadow fields are ignored so they do not thrash Algolia.
 */
export function projectSmartProfileForAlgoliaIndex(smartProfile: unknown): Record<string, unknown> | null {
  if (!smartProfile || typeof smartProfile !== 'object' || Array.isArray(smartProfile)) {
    return null;
  }
  const profile = smartProfile as Record<string, unknown>;
  const provenance =
    profile.provenance && typeof profile.provenance === 'object' && !Array.isArray(profile.provenance)
      ? (profile.provenance as Record<string, unknown>)
      : undefined;

  const projected: Record<string, unknown> = {
    subjects: normalizePortalCatalogAlgoliaStringList(profile.subjects) ?? null,
    objects: normalizePortalCatalogAlgoliaStringList(profile.objects) ?? null,
    styles: normalizePortalCatalogAlgoliaStringList(profile.styles) ?? null,
    themes: normalizePortalCatalogAlgoliaStringList(profile.themes) ?? null,
    interests: normalizePortalCatalogAlgoliaStringList(profile.interests) ?? null,
    professionsGroups: normalizePortalCatalogAlgoliaStringList(profile.professionsGroups) ?? null,
    occasions: normalizePortalCatalogAlgoliaStringList(profile.occasions) ?? null,
    places: normalizePortalCatalogAlgoliaStringList(profile.places) ?? null,
    colors: normalizePortalCatalogAlgoliaStringList(profile.colors) ?? null,
    visibleText: normalizePortalCatalogAlgoliaStringList(profile.visibleText) ?? null,
    searchConcepts: normalizePortalCatalogAlgoliaStringList(profile.searchConcepts, 16) ?? null,
    categoryId: typeof profile.categoryId === 'string' ? profile.categoryId.trim() || null : null,
    categoryName: typeof profile.categoryName === 'string' ? profile.categoryName.trim() || null : null,
    version: typeof provenance?.version === 'string' ? provenance.version : null,
  };

  const hasAny = Object.values(projected).some((entry) => entry !== null);
  return hasAny ? projected : null;
}

/** Soft upper bound for public Algolia record JSON size (Slice 3 review note). */
export const PORTAL_CATALOG_ALGOLIA_RECORD_SIZE_SOFT_MAX_BYTES = 10_000;
