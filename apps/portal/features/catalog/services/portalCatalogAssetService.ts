'use client';

import { getDownloadURL, ref } from 'firebase/storage';

import {
  parseCatalogReferenceManifest,
  parseClientCatalogReferenceSnapshot,
  parsePortalCatalogCardBucket,
  parsePortalCatalogCardOverrides,
  parsePortalCatalogIdAsset,
  parsePortalCatalogManifest,
  parsePortalCatalogSearchShard,
  parsePortalCatalogTagFacetSummary,
} from '@fresh-prints/shared/catalog-snapshots/catalogSnapshot.parsers';
import type {
  ClientCatalogReferenceSnapshot,
  PortalCatalogCard,
  PortalCatalogManifest,
} from '@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types';
import { applyPortalCatalogCardOverrides } from '@fresh-prints/shared/catalog-snapshots/catalogCardOverrides';
import {
  portalCatalogCardBucketNumber,
  resolvePortalCatalogPath,
} from '@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types';
import { traceStorageAssetComplete, traceStorageAssetStart } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalStorage } from '../../../lib/firebase/client';
import type { CatalogDesign } from '../types/catalog.types';

const PORTAL_MANIFEST_PATH = 'generated/portal-catalog/manifest.json';
const REFERENCE_MANIFEST_PATH = 'generated/catalog-reference/manifest.json';
const MANIFEST_TTL_MS = 30_000;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;

/** Sanitized path CLASS for the debug tracer — never the real Storage path/download URL. */
function assetClassForPath(path: string): string {
  if (path === PORTAL_MANIFEST_PATH) return 'portal-catalog/portal/manifest';
  if (path === REFERENCE_MANIFEST_PATH) return 'portal-catalog/portal/taxonomy-manifest';
  if (path.includes('discover')) return 'portal-catalog/portal/discover';
  if (path.includes('cards')) return 'portal-catalog/portal/card-bucket';
  if (path.includes('search')) return 'portal-catalog/portal/search-shard';
  if (path.includes('filters') || path.includes('tag')) return 'portal-catalog/portal/filter';
  if (path.includes('client')) return 'portal-catalog/portal/taxonomy';
  return 'portal-catalog/portal/other';
}

const cache = new Map<string, { bytes: number; value: unknown }>();
// One active download per exact immutable Storage path: concurrent callers (catalog page,
// request-detail cards, Current Request drawer resolving overlapping buckets) share the same
// Promise instead of each fetching the not-yet-cached asset — the owner's live trace showed 12
// cold bucket misses for a 4-item request because this map was missing (2026-07-25). Mirrors the
// manifest/taxonomy loaders' existing in-flight pattern; rejected Promises are evicted in finally.
const inflightByPath = new Map<string, Promise<unknown>>();
let cacheBytes = 0;
let portalManifestCache: { expiresAtMs: number; value: PortalCatalogManifest } | null = null;
let portalManifestLoad: Promise<PortalCatalogManifest> | null = null;
let referenceLoad: Promise<ClientCatalogReferenceSnapshot> | null = null;
let referenceCache: { expiresAtMs: number; value: ClientCatalogReferenceSnapshot } | null = null;
let tagFacetLoad: Promise<Array<{ id: string; name: string; count: number }>> | null = null;

function putCache(path: string, value: unknown, bytes: number): void {
  const prior = cache.get(path);
  if (prior) cacheBytes -= prior.bytes;
  cache.delete(path);
  cache.set(path, { bytes, value });
  cacheBytes += bytes;
  while (cacheBytes > MAX_CACHE_BYTES) {
    const oldest = cache.entries().next().value as
      | [string, { bytes: number; value: unknown }]
      | undefined;
    if (!oldest) break;
    cache.delete(oldest[0]);
    cacheBytes -= oldest[1].bytes;
  }
}

async function fetchJson(path: string): Promise<unknown> {
  const assetClass = assetClassForPath(path);
  const existing = cache.get(path);
  if (existing) {
    cache.delete(path);
    cache.set(path, existing);
    traceStorageAssetStart(assetClass, { app: 'portal', triggerReason: 'route' });
    traceStorageAssetComplete(assetClass, { app: 'portal', triggerReason: 'route' }, { cacheStatus: 'hit' });
    return existing.value;
  }

  const inflight = inflightByPath.get(path);
  if (inflight) {
    traceStorageAssetStart(assetClass, { app: 'portal', triggerReason: 'route' });
    traceStorageAssetComplete(assetClass, { app: 'portal', triggerReason: 'route' }, {
      cacheStatus: 'in-flight-reuse',
    });
    return inflight;
  }

  traceStorageAssetStart(assetClass, { app: 'portal', triggerReason: 'route' });
  const load = (async () => {
    const url = await getDownloadURL(ref(getPortalStorage(), path));
    const response = await fetch(url, { cache: path.includes('/manifest.json') ? 'no-cache' : 'force-cache' });
    if (!response.ok) {
      const errorCode = `http-${response.status}`;
      traceStorageAssetComplete(assetClass, { app: 'portal', triggerReason: 'route' }, { errorCode });
      throw new Error(`Catalog asset request failed (${response.status}).`);
    }
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) {
      traceStorageAssetComplete(assetClass, { app: 'portal', triggerReason: 'route' }, {
        errorCode: 'oversized-asset',
      });
      throw new Error('Catalog asset exceeded its 2 MiB safety limit.');
    }
    const value = JSON.parse(text) as unknown;
    putCache(path, value, text.length);
    traceStorageAssetComplete(assetClass, { app: 'portal', triggerReason: 'route' }, {
      bytes: text.length,
      cacheStatus: 'miss',
    });
    return value;
  })();
  inflightByPath.set(path, load);
  try {
    return await load;
  } finally {
    inflightByPath.delete(path);
  }
}

async function loadPortalManifest(): Promise<PortalCatalogManifest> {
  if (portalManifestCache && portalManifestCache.expiresAtMs > Date.now()) {
    return portalManifestCache.value;
  }
  if (portalManifestLoad) return portalManifestLoad;
  portalManifestLoad = (async () => {
    cache.delete(PORTAL_MANIFEST_PATH);
    const value = parsePortalCatalogManifest(await fetchJson(PORTAL_MANIFEST_PATH));
    portalManifestCache = { value, expiresAtMs: Date.now() + MANIFEST_TTL_MS };
    return value;
  })();
  try {
    return await portalManifestLoad;
  } finally {
    portalManifestLoad = null;
  }
}

async function loadCardsById(
  manifest: PortalCatalogManifest,
  designIds: string[],
): Promise<Map<string, PortalCatalogCard>> {
  const requiredBuckets = new Set(
    designIds.map((id) => portalCatalogCardBucketNumber(id, manifest.cards.bucketCount)),
  );
  const paths = [...requiredBuckets].map((bucket) =>
    resolvePortalCatalogPath(manifest.cards.pathTemplate, { bucket }),
  );
  const buckets = await Promise.all(
    paths.map(async (path) => parsePortalCatalogCardBucket(await fetchJson(path))),
  );
  const cards = new Map(
    buckets.flatMap((bucket) => bucket.cards).map((card) => [card.id, card]),
  );
  if (manifest.cardOverrides) {
    const overrides = parsePortalCatalogCardOverrides(
      await fetchJson(manifest.cardOverrides.path),
    );
    return applyPortalCatalogCardOverrides(cards, overrides.cards);
  }
  return cards;
}

async function loadCards(
  manifest: PortalCatalogManifest,
  designIds: string[],
): Promise<PortalCatalogCard[]> {
  const cardsById = await loadCardsById(manifest, designIds);
  return designIds.flatMap((id) => {
    const card = cardsById.get(id);
    return card ? [card] : [];
  });
}

async function loadTagDesignIds(
  manifest: PortalCatalogManifest,
  tagId: string,
): Promise<string[]> {
  const path = resolvePortalCatalogPath(manifest.filters.tagPathTemplate, { tagId });
  const asset = parsePortalCatalogIdAsset(await fetchJson(path));
  return asset.designIds;
}

export function tokenize(search: string): string[] {
  return [...new Set(search.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))];
}

export function searchShardKeyForTerm(term: string): string {
  return /^[a-z0-9]/.test(term) ? `${term[0]}${term[1] ?? '_'}` : '__';
}

/**
 * AND-intersects multiple design-ID lists (order-agnostic — used for tag-facet narrowing, where
 * only membership matters, not the "Studio-newest first" browse order `planPortalCatalogSearchPage`
 * preserves for pagination).
 */
export function intersectDesignIdLists(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  const [shortest, ...rest] = [...lists].sort((left, right) => left.length - right.length);
  const otherSets = rest.map((list) => new Set(list));
  const seen = new Set<string>();
  return (shortest ?? []).filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return otherSets.every((set) => set.has(id));
  });
}

/**
 * Pure core of dynamic tag-modal narrowing: given the complete matching-design-ID set for the
 * currently selected tags (AND-intersected — see `intersectDesignIdLists`) and the card data for
 * that set, computes which unselected tags still co-occur on at least one matching design, and
 * their live counts. Selected tags always appear with the full matching-set size as their count.
 * Extracted so it's directly unit-testable without mocking Storage/fetch.
 */
export function computeNarrowedTagFacets(
  selectedTagIds: string[],
  matchingDesignIds: string[],
  cardsById: Map<string, { tags: string[] }>,
  tagNameById: Map<string, string>,
): Array<{ id: string; name: string; count: number }> {
  const uniqueSelected = [...new Set(selectedTagIds)];

  const candidateCounts = new Map<string, number>();
  for (const id of matchingDesignIds) {
    const card = cardsById.get(id);
    if (!card) continue;
    for (const tagId of new Set(card.tags)) {
      if (uniqueSelected.includes(tagId)) continue;
      candidateCounts.set(tagId, (candidateCounts.get(tagId) ?? 0) + 1);
    }
  }

  const selectedEntries = uniqueSelected.map((id) => ({
    id,
    name: tagNameById.get(id) ?? id,
    count: matchingDesignIds.length,
  }));
  const candidateEntries = [...candidateCounts.entries()].map(([id, count]) => ({
    id,
    name: tagNameById.get(id) ?? id,
    count,
  }));

  return [...selectedEntries, ...candidateEntries].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

/**
 * Combines every tag/category/search-term candidate ID list into one deduplicated result, THEN
 * paginates. Pagination must never happen before this full set exists, or a page can under-report
 * `total`/omit a match that lands after an arbitrarily-sliced point (the exact owner-reported "BEST"
 * regression: 2 total matches, only 1 shown until Load more).
 *
 * Order preservation: every candidate list (tag filter, category filter, each search term's shard
 * match) is published by the publisher already ordered "Studio-newest first" — `createdAt DESC`,
 * design ID `DESC` tiebreaker — matching the existing customer-facing browse order used everywhere
 * else in this repository (`catalogService.ts`'s `orderBy(sortField, 'desc'), orderBy('__name__',
 * 'desc')`). Because every list shares that same relative order, intersecting the *shortest* list
 * against the others (cheapest correct choice — checking membership in the other lists doesn't
 * depend on their order) and filtering it in place preserves the correct order with no extra
 * network request and no arbitrary alphabetical-ID reordering.
 */
export function planPortalCatalogSearchPage(
  candidateLists: string[][],
  options: { limit?: number; offset?: number } = {},
): { pageIds: string[]; total: number } {
  if (candidateLists.length === 0) return { pageIds: [], total: 0 };
  const [shortest, ...rest] = [...candidateLists].sort((left, right) => left.length - right.length);
  const otherSets = rest.map((list) => new Set(list));
  const seen = new Set<string>();
  const ids = shortest!.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return otherSets.every((set) => set.has(id));
  });
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(40, Math.max(1, options.limit ?? 40));
  return { pageIds: ids.slice(offset, offset + limit), total: ids.length };
}

export const portalCatalogAssetService = {
  /**
   * Resolves the public card contract for a bounded set of known design IDs.
   * Card-bucket and override requests share the service's existing cache.
   */
  async getDesignsByIds(designIds: string[]): Promise<CatalogDesign[]> {
    const uniqueIds = [...new Set(designIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return [];
    const manifest = await loadPortalManifest();
    return loadCards(manifest, uniqueIds);
  },

  async listMatchingDesigns(
    search: string,
    selectedTags: string[],
    options: { categoryId?: string; limit?: number; offset?: number } = {},
  ): Promise<{ designs: CatalogDesign[]; total: number }> {
    const manifest = await loadPortalManifest();
    const candidateLists: string[][] = [];
    for (const tag of [...new Set(selectedTags)]) {
      let designIds: string[];
      try {
        designIds = await loadTagDesignIds(manifest, tag);
      } catch {
        return { designs: [], total: 0 };
      }
      candidateLists.push(designIds);
    }
    if (options.categoryId) {
      const path = resolvePortalCatalogPath(manifest.filters.categoryPathTemplate, {
        categoryId: options.categoryId,
      });
      let asset: Awaited<ReturnType<typeof parsePortalCatalogIdAsset>>;
      try {
        asset = parsePortalCatalogIdAsset(await fetchJson(path));
      } catch {
        return { designs: [], total: 0 };
      }
      candidateLists.push(asset.designIds);
    }
    const existingShardKeys = new Set(manifest.search.existingShardKeys);
    const terms = tokenize(search);
    const shards = new Map<string, Awaited<ReturnType<typeof parsePortalCatalogSearchShard>>>();
    for (const term of terms) {
      const shard = searchShardKeyForTerm(term);
      if (!existingShardKeys.has(shard)) return { designs: [], total: 0 };
      let asset = shards.get(shard);
      if (!asset) {
        const path = resolvePortalCatalogPath(manifest.search.pathTemplate, { shard });
        asset = parsePortalCatalogSearchShard(await fetchJson(path));
        shards.set(shard, asset);
      }
      candidateLists.push(asset.terms[term] ?? []);
    }
    const { pageIds, total } = planPortalCatalogSearchPage(candidateLists, options);
    return { designs: await loadCards(manifest, pageIds), total };
  },

  /**
   * Only tags with at least one ready design, with each tag's ready-design count. Deliberately has
   * no Firestore fallback — see the doc comment on `catalogService.listApprovedTags`. Concurrent
   * callers share one in-flight request; once the underlying facet asset is cached by `fetchJson`,
   * repeated calls (e.g. reopening the tag modal) resolve from cache with no new network request
   * until the manifest's 30-second TTL rotates to a new content version.
   */
  async listTagFacets(): Promise<Array<{ id: string; name: string; count: number }>> {
    if (tagFacetLoad) return tagFacetLoad;
    tagFacetLoad = (async () => {
      const manifest = await loadPortalManifest();
      const facet = parsePortalCatalogTagFacetSummary(await fetchJson(manifest.filters.tagFacetPath));
      return facet.tags;
    })();
    try {
      return await tagFacetLoad;
    } finally {
      tagFacetLoad = null;
    }
  },

  /**
   * Tag facet narrowed to designs matching every tag in `selectedTags` (AND semantics). With no
   * selected tags, this is equivalent to `listTagFacets()`'s global list.
   *
   * Zero new generated assets: reuses the same per-tag design-ID list asset
   * (`filters/tagPathTemplate`) `listMatchingDesigns` already fetches for search/filtering, and the
   * same card-bucket assets already required to render results — never a new fetch per *candidate*
   * tag, never every tag-filter asset, never a Firestore read. Card buckets are the only source of
   * tag co-occurrence (each card carries its own `tags: string[]`), so this trades one bucket fetch
   * (bounded by how many designs match the current selection, not by tag count) for exact live
   * co-occurrence counts.
   */
  async listNarrowedTagFacets(
    selectedTags: string[],
  ): Promise<Array<{ id: string; name: string; count: number }>> {
    const uniqueSelected = [...new Set(selectedTags)];
    if (uniqueSelected.length === 0) {
      return portalCatalogAssetService.listTagFacets();
    }

    const manifest = await loadPortalManifest();
    const facet = parsePortalCatalogTagFacetSummary(await fetchJson(manifest.filters.tagFacetPath));
    const tagNameById = new Map(facet.tags.map((tag) => [tag.id, tag.name]));

    const selectedLists = await Promise.all(
      uniqueSelected.map((tag) => loadTagDesignIds(manifest, tag)),
    );
    const matchingDesignIds = intersectDesignIdLists(selectedLists);

    const cardsById = await loadCardsById(manifest, matchingDesignIds);
    return computeNarrowedTagFacets(uniqueSelected, matchingDesignIds, cardsById, tagNameById);
  },

  async loadClientTaxonomy(): Promise<ClientCatalogReferenceSnapshot> {
    if (referenceCache && referenceCache.expiresAtMs > Date.now()) return referenceCache.value;
    if (referenceLoad) return referenceLoad;
    referenceLoad = (async () => {
      cache.delete(REFERENCE_MANIFEST_PATH);
      const manifest = parseCatalogReferenceManifest(await fetchJson(REFERENCE_MANIFEST_PATH));
      const snapshot = parseClientCatalogReferenceSnapshot(await fetchJson(manifest.clientPath));
      if (snapshot.contentVersion !== manifest.contentVersion) throw new Error('Stale taxonomy asset.');
      referenceCache = { value: snapshot, expiresAtMs: Date.now() + MANIFEST_TTL_MS };
      return snapshot;
    })();
    try {
      return await referenceLoad;
    } finally {
      referenceLoad = null;
    }
  },
};
