import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

import {
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  type FirestoreTraceMetadata,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';
import { createBoundedAsyncCache } from '@fresh-prints/shared/utils/boundedAsyncCache';

import { PORTAL_FIRESTORE_COLLECTIONS } from '../../../lib/firebase/collections';
import { getPortalDb } from '../../../lib/firebase/client';
import type {
  CatalogCategory,
  CatalogDesign,
  CatalogDesignListPage,
  CatalogDesignListQuery,
  CatalogDesignSortField,
  CatalogTagOption,
} from '../types/catalog.types';
import { filterCatalogDesignsBySearch } from '../utils/catalogSearch';
import { portalCatalogAssetService } from './portalCatalogAssetService';
import {
  invalidateCatalogDesignById,
  loadCatalogDesignByIdCached,
} from './catalogDesignByIdCache';

export const DEFAULT_CATALOG_PAGE_SIZE = 40;
export const HOME_DISCOVERY_POOL_PAGE_SIZE = 80;
/** Warm back-navigation reuse for ordinary Firestore catalog pages. */
export const CATALOG_PAGE_CACHE_TTL_MS = 15_000;
/**
 * Amendment 3 — hard cap on active categories before running one ready-design
 * aggregate count per category. Exceeding this fails closed (no all-actives fallback).
 */
export const MAX_ACTIVE_CATEGORIES_FOR_COUNT = 64;

export const TOO_MANY_ACTIVE_CATEGORIES_MESSAGE =
  `Too many active categories for customer availability counts (max ${MAX_ACTIVE_CATEGORIES_FOR_COUNT}).`;

const catalogPageCache = createBoundedAsyncCache<CatalogDesignListPage>({
  maxEntries: 48,
  ttlMs: CATALOG_PAGE_CACHE_TTL_MS,
});

const homeDiscoveryPoolCache = createBoundedAsyncCache<CatalogDesign[]>({
  maxEntries: 4,
  ttlMs: CATALOG_PAGE_CACHE_TTL_MS,
});

function serializeCatalogPageCacheKey(listQuery: CatalogDesignListQuery): string {
  return JSON.stringify({
    categoryId: listQuery.categoryId ?? null,
    createdAfterMs: listQuery.createdAfterMs ?? null,
    readyAfterMs: listQuery.readyAfterMs ?? null,
    cursor: listQuery.cursor ?? null,
    limitCount: listQuery.limitCount ?? DEFAULT_CATALOG_PAGE_SIZE,
    sortField: listQuery.sortField ?? 'readyAt',
    tag: listQuery.tag ?? null,
  });
}

/** Explicit invalidation after catalog-affecting mutations (favorites do not mutate design docs). */
export function invalidateCatalogPageCaches(): void {
  catalogPageCache.clear();
  homeDiscoveryPoolCache.clear();
}

function isFirestoreIndexNotReadyError(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    return false;
  }

  if (error.code !== 'failed-precondition') {
    return false;
  }

  return /index/i.test(error.message);
}


interface DesignDocumentData {
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  tags?: unknown;
  status?: unknown;
  thumbnailPath?: unknown;
  previewPath?: unknown;
  artworkBackgroundHex?: unknown;
  width?: unknown;
  height?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  readyAt?: unknown;
  requestCount?: unknown;
  favoriteCount?: unknown;
  lastRequestedAt?: unknown;
  lastAddedToShowAt?: unknown;
}

function timestampToMillis(value: unknown): number | undefined {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return undefined;
}

function mapCatalogDesign(designId: string, data: DesignDocumentData): CatalogDesign | null {
  if (data.status !== 'ready' || typeof data.title !== 'string' || typeof data.thumbnailPath !== 'string') {
    return null;
  }

  if (
    typeof data.width !== 'number' ||
    !Number.isFinite(data.width) ||
    data.width <= 0 ||
    typeof data.height !== 'number' ||
    !Number.isFinite(data.height) ||
    data.height <= 0
  ) {
    return null;
  }

  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    id: designId,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : undefined,
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : undefined,
    tags,
    thumbnailPath: data.thumbnailPath,
    previewPath: typeof data.previewPath === 'string' ? data.previewPath : undefined,
    artworkBackgroundHex:
      typeof data.artworkBackgroundHex === 'string' ? data.artworkBackgroundHex : undefined,
    width: data.width,
    height: data.height,
    printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : undefined,
    createdAtMs: timestampToMillis(data.createdAt),
    readyAtMs: timestampToMillis(data.readyAt),
    updatedAtMs: timestampToMillis(data.updatedAt),
    requestCount:
      typeof data.requestCount === 'number' && Number.isFinite(data.requestCount) && data.requestCount >= 0
        ? data.requestCount
        : 0,
    favoriteCount:
      typeof data.favoriteCount === 'number' && Number.isFinite(data.favoriteCount) && data.favoriteCount >= 0
        ? data.favoriteCount
        : 0,
    lastRequestedAtMs: timestampToMillis(data.lastRequestedAt),
    lastAddedToShowAtMs: timestampToMillis(data.lastAddedToShowAt),
  };
}

function resolveSortField(listQuery: CatalogDesignListQuery): CatalogDesignSortField {
  return listQuery.sortField ?? 'readyAt';
}

/** Exported for focused ordering tests — mirrors Studio ready-order key. */
export function getDesignSortValue(design: CatalogDesign, sortField: CatalogDesignSortField): number {
  switch (sortField) {
    case 'readyAt':
      return design.readyAtMs ?? design.createdAtMs ?? 0;
    case 'createdAt':
      // Legacy / non–New-This-Week createdAt sorts only.
      return design.createdAtMs ?? 0;
    case 'requestCount':
      return design.requestCount;
    case 'favoriteCount':
      return design.favoriteCount;
    case 'lastRequestedAt':
      return design.lastRequestedAtMs ?? 0;
    case 'lastAddedToShowAt':
      return design.lastAddedToShowAtMs ?? 0;
    case 'updatedAt':
    default:
      return design.updatedAtMs ?? 0;
  }
}

function toCursorStartAfterValue(sortField: CatalogDesignSortField, sortValue: number): Timestamp | number {
  if (sortField === 'requestCount' || sortField === 'favoriteCount') {
    return sortValue;
  }

  return Timestamp.fromMillis(sortValue);
}

function buildDesignFilterConstraints(listQuery: CatalogDesignListQuery): QueryConstraint[] {
  const sortField = resolveSortField(listQuery);
  const constraints: QueryConstraint[] = [where('status', '==', 'ready')];

  if (listQuery.categoryId?.trim()) {
    constraints.push(where('categoryId', '==', listQuery.categoryId.trim()));
  }

  if (listQuery.tag?.trim()) {
    constraints.push(where('tags', 'array-contains', listQuery.tag.trim().toLowerCase()));
  }

  // Discover New This Week: customer-ready window on readyAt (not import createdAt).
  if (typeof listQuery.readyAfterMs === 'number') {
    constraints.push(where('readyAt', '>=', Timestamp.fromMillis(listQuery.readyAfterMs)));
  } else if (sortField === 'createdAt' && typeof listQuery.createdAfterMs === 'number') {
    constraints.push(where('createdAt', '>=', Timestamp.fromMillis(listQuery.createdAfterMs)));
  }

  return constraints;
}

function buildDesignListConstraints(listQuery: CatalogDesignListQuery): QueryConstraint[] {
  const pageSize = listQuery.limitCount ?? DEFAULT_CATALOG_PAGE_SIZE;
  const sortField = resolveSortField(listQuery);
  const constraints: QueryConstraint[] = [...buildDesignFilterConstraints(listQuery)];

  constraints.push(orderBy(sortField, 'desc'));
  constraints.push(orderBy('__name__', 'desc'));

  if (listQuery.cursor) {
    constraints.push(
      startAfter(toCursorStartAfterValue(sortField, listQuery.cursor.sortValue), listQuery.cursor.designId),
    );
  }

  constraints.push(limit(pageSize + 1));

  return constraints;
}

function buildDesignListPage(
  designs: CatalogDesign[],
  sortField: CatalogDesignSortField,
  pageSize: number,
): CatalogDesignListPage {
  const hasMore = designs.length > pageSize;
  const pageDesigns = hasMore ? designs.slice(0, pageSize) : designs;
  const lastDesign = pageDesigns.at(-1);

  return {
    designs: pageDesigns,
    hasMore,
    nextCursor:
      hasMore && lastDesign
        ? {
            designId: lastDesign.id,
            sortValue: getDesignSortValue(lastDesign, sortField),
          }
        : undefined,
  };
}

/**
 * Reorders found ready designs to match the caller’s requested ID sequence (deduped /
 * trimmed by the caller). Pure/exported for focused Stage 1a ordering tests.
 */
export function orderReadyDesignsByRequestedIds(
  requestedIds: readonly string[],
  foundDesigns: readonly CatalogDesign[],
): CatalogDesign[] {
  const byId = new Map(foundDesigns.map((design) => [design.id, design]));
  return requestedIds.flatMap((id) => {
    const design = byId.get(id);
    return design ? [design] : [];
  });
}

/**
 * Maps a Firestore category document to the Portal public category contract.
 * Authoritative active-state field is boolean `isActive` (DATA_MODEL / Studio categoryService).
 * Inactive (`false`), missing, or non-boolean active-state values are excluded — matching the
 * pre–Wave C `mapCategoryDocument` contract. Query filter remains; client enforcement prevents
 * archived/malformed docs from appearing if a read is ever widened.
 */
export function mapPortalActiveCategory(
  categoryId: string,
  data: Record<string, unknown>,
): CatalogCategory | null {
  if (typeof data.name !== 'string' || data.isActive !== true) {
    return null;
  }

  return {
    id: categoryId,
    name: data.name,
    ...(typeof data.description === 'string' ? { description: data.description } : {}),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
  };
}

/** Stable Portal category display order — sortOrder asc, then name. */
export function sortPortalCatalogCategories(
  categories: readonly CatalogCategory[],
): CatalogCategory[] {
  return [...categories].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}

/**
 * Amendment 3 — keep active categories that have at least one Rules-ready design.
 * Preserves input order. Fail-closed when the active set exceeds the count cap or when
 * any `countReadyByCategoryId` call rejects (Promise.all).
 */
export async function selectCustomerVisibleCategories(
  activeCategories: readonly CatalogCategory[],
  countReadyByCategoryId: (categoryId: string) => Promise<number>,
): Promise<CatalogCategory[]> {
  if (activeCategories.length > MAX_ACTIVE_CATEGORIES_FOR_COUNT) {
    throw new Error(TOO_MANY_ACTIVE_CATEGORIES_MESSAGE);
  }

  const counted = await Promise.all(
    activeCategories.map(async (category) => ({
      category,
      count: await countReadyByCategoryId(category.id),
    })),
  );

  return counted.filter(({ count }) => count > 0).map(({ category }) => category);
}

/** In-flight dedupe for concurrent `listActiveCategories` callers (no module TTL). */
let listActiveCategoriesInFlight: Promise<CatalogCategory[]> | null = null;

function catalogListTraceMetadata(
  listQuery: CatalogDesignListQuery,
  source: string,
): FirestoreTraceMetadata {
  const sortField = resolveSortField(listQuery);
  const constraints = [
    'status==ready',
    listQuery.categoryId?.trim() ? 'categoryId=={categoryId}' : '',
    listQuery.tag?.trim() ? 'tags array-contains {tag}' : '',
    typeof listQuery.readyAfterMs === 'number' ? 'readyAt>={timestamp}' : '',
    typeof listQuery.createdAfterMs === 'number' ? 'createdAt>={timestamp}' : '',
  ].filter(Boolean);

  return {
    app: 'portal',
    collection: PORTAL_FIRESTORE_COLLECTIONS.designs,
    constraints,
    limit: (listQuery.limitCount ?? DEFAULT_CATALOG_PAGE_SIZE) + 1,
    orderBy: [`${sortField}:desc`, '__name__:desc'],
    source,
    triggerReason: 'route',
  };
}

export const catalogService = {
  async listReadyDesignsPage(listQuery: CatalogDesignListQuery = {}): Promise<CatalogDesignListPage> {
    const pageSize = listQuery.limitCount ?? DEFAULT_CATALOG_PAGE_SIZE;
    const sortField = resolveSortField(listQuery);
    const designsQuery = query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.designs),
      ...buildDesignListConstraints(listQuery),
    );
    const traceMetadata = catalogListTraceMetadata(
      listQuery,
      'catalogService.listReadyDesignsPage',
    );
    traceFirestoreOneShotStart('getDocs', traceMetadata);
    const snapshot = await getDocs(designsQuery);
    traceFirestoreOneShotComplete('getDocs', traceMetadata, snapshot.size);

    const designs = snapshot.docs
      .map((designSnapshot) => mapCatalogDesign(designSnapshot.id, designSnapshot.data() as DesignDocumentData))
      .filter((design): design is CatalogDesign => design !== null);

    const page = buildDesignListPage(designs, sortField, pageSize);

    // `orderBy(readyAt)` silently omits ready docs missing the field — same completeness
    // guard as Studio Design Library (fall back to createdAt for this request only).
    // New This Week (`readyAfterMs`) must NOT demote to createdAt week/order semantics.
    if (
      sortField === 'readyAt' &&
      typeof listQuery.readyAfterMs !== 'number' &&
      !listQuery.cursor &&
      !page.hasMore
    ) {
      const matchingCount = await this.countReadyDesigns(listQuery);
      if (matchingCount > page.designs.length) {
        return this.listReadyDesignsPage({ ...listQuery, sortField: 'createdAt' });
      }
    }

    if (!listQuery.search?.trim()) {
      return page;
    }

    return {
      ...page,
      designs: filterCatalogDesignsBySearch(page.designs, listQuery.search),
    };
  },

  /**
   * Phase 1B Stage 1a: Firestore-primary known-ID hydration.
   *
   * Uses per-document `getDoc` (via short-lived cache + in-flight dedupe) rather than a
   * batch `in` query: archived/non-ready designs deny customer read and would fail an entire
   * `in` batch. Only ready, mappable designs are returned; missing/denied IDs are omitted.
   * Result order matches the deduped requested-ID sequence.
   */
  async getReadyDesignsByIds(designIds: string[]): Promise<CatalogDesign[]> {
    const uniqueIds = [...new Set(designIds.map((id) => id.trim()).filter(Boolean))];

    if (uniqueIds.length === 0) {
      return [];
    }

    const loaded = await Promise.all(
      uniqueIds.map((designId) =>
        loadCatalogDesignByIdCached(designId, async () => {
          try {
            const traceMetadata: FirestoreTraceMetadata = {
              app: 'portal',
              collection: PORTAL_FIRESTORE_COLLECTIONS.designs,
              documentPathPattern: 'designs/{designId}',
              source: 'catalogService.getReadyDesignsByIds',
              triggerReason: 'route',
            };
            traceFirestoreOneShotStart('getDoc', traceMetadata);
            const snapshot = await getDoc(
              doc(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.designs, designId),
            );
            traceFirestoreOneShotComplete('getDoc', traceMetadata, snapshot.exists() ? 1 : 0);

            if (!snapshot.exists()) {
              return null;
            }

            return mapCatalogDesign(snapshot.id, snapshot.data() as DesignDocumentData);
          } catch (error) {
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
              return null;
            }

            return null;
          }
        }),
      ),
    );

    return orderReadyDesignsByRequestedIds(
      uniqueIds,
      loaded.filter((design): design is CatalogDesign => design !== null),
    );
  },

  invalidateReadyDesignById(designId: string): void {
    invalidateCatalogDesignById(designId);
  },

  /** Exact count of ready designs matching category / primary tag / new-this-week bounds. */
  async countReadyDesigns(listQuery: CatalogDesignListQuery = {}): Promise<number> {
    const countQuery = query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.designs),
      ...buildDesignFilterConstraints(listQuery),
    );
    const traceMetadata = {
      ...catalogListTraceMetadata(listQuery, 'catalogService.countReadyDesigns'),
      limit: undefined,
      orderBy: undefined,
    };
    traceFirestoreOneShotStart('getCountFromServer', traceMetadata);
    const snapshot = await getCountFromServer(countQuery);
    traceFirestoreOneShotComplete('getCountFromServer', traceMetadata, 0);
    return snapshot.data().count;
  },

  /**
   * Bounded pools for Discover home rails — not the full catalog.
   * Prefer library paging for browse-all.
   *
   * While composite indexes for requestCount / favoriteCount / lastAddedToShowAt are
   * still building, falls back to status+createdAt (Studio-newest) so home stays usable.
   */
  async listHomeDiscoveryPool(): Promise<CatalogDesign[]> {
    return homeDiscoveryPoolCache.get('home-discovery-pool', async () => {
      const preferredQueries: CatalogDesignListQuery[] = [
        {
          limitCount: HOME_DISCOVERY_POOL_PAGE_SIZE,
          sortField: 'readyAt',
        },
        {
          limitCount: HOME_DISCOVERY_POOL_PAGE_SIZE,
          sortField: 'requestCount',
        },
        {
          limitCount: HOME_DISCOVERY_POOL_PAGE_SIZE,
          sortField: 'favoriteCount',
        },
        {
          limitCount: HOME_DISCOVERY_POOL_PAGE_SIZE,
          sortField: 'lastAddedToShowAt',
        },
      ];

      const settled = await Promise.allSettled(
        preferredQueries.map((listQuery) => this.listReadyDesignsPage(listQuery)),
      );

      const byId = new Map<string, CatalogDesign>();

      for (const result of settled) {
        if (result.status !== 'fulfilled') {
          continue;
        }

        for (const design of result.value.designs) {
          byId.set(design.id, design);
        }
      }

      if (byId.size > 0) {
        return [...byId.values()];
      }

      const indexBlocked = settled.every(
        (result) => result.status === 'rejected' && isFirestoreIndexNotReadyError(result.reason),
      );

      if (indexBlocked || settled.some((result) => result.status === 'rejected')) {
        const fallback = await this.listReadyDesignsPage({
          limitCount: HOME_DISCOVERY_POOL_PAGE_SIZE,
          sortField: 'readyAt',
        });
        return fallback.designs;
      }

      return [];
    });
  },

  /**
   * Paged list with automatic fallback to `createdAt` (then `updatedAt`) when a
   * sort-specific composite index is missing or still building.
   * Stable query-key cache + shared in-flight Promise for warm back-navigation.
   */
  async listReadyDesignsPageWithSortFallback(
    listQuery: CatalogDesignListQuery = {},
  ): Promise<CatalogDesignListPage> {
    const cacheKey = serializeCatalogPageCacheKey(listQuery);
    return catalogPageCache.get(cacheKey, async () => {
      try {
        return await this.listReadyDesignsPage(listQuery);
      } catch (error) {
        const sortField = listQuery.sortField ?? 'readyAt';

        if (!isFirestoreIndexNotReadyError(error)) {
          throw error;
        }

        if (sortField === 'readyAt') {
          // Never demote New This Week to createdAt membership/order.
          if (typeof listQuery.readyAfterMs === 'number') {
            throw error;
          }
          return this.listReadyDesignsPage({
            ...listQuery,
            createdAfterMs: undefined,
            readyAfterMs: undefined,
            sortField: 'createdAt',
          });
        }

        if (sortField === 'createdAt') {
          return this.listReadyDesignsPage({
            ...listQuery,
            createdAfterMs: undefined,
            readyAfterMs: undefined,
            sortField: 'updatedAt',
          });
        }

        if (sortField === 'updatedAt') {
          throw error;
        }

        return this.listReadyDesignsPage({
          ...listQuery,
          createdAfterMs: undefined,
          readyAfterMs: undefined,
          sortField: 'readyAt',
        });
      }
    });
  },

  /** @deprecated Prefer paged listReadyDesignsPage — retained for rare admin/debug callers. */
  async listAllReadyDesigns(maxDesigns = 2000): Promise<CatalogDesign[]> {
    const designs: CatalogDesign[] = [];
    let cursor: CatalogDesignListQuery['cursor'];

    while (designs.length < maxDesigns) {
      const page = await this.listReadyDesignsPage({
        cursor,
        limitCount: Math.min(48, maxDesigns - designs.length),
        sortField: 'readyAt',
      });

      designs.push(...page.designs);

      if (!page.hasMore || !page.nextCursor) {
        break;
      }

      cursor = page.nextCursor;
    }

    return designs;
  },

  /**
   * Customer-visible categories: active (Amendment 1 mapper) with at least one
   * Rules-ready design (`countReadyDesigns({ categoryId }) > 0`). Firestore-only —
   * no catalog-reference snapshot / generated taxonomy. Amendment 3 Stage 1a bridge.
   */
  async listActiveCategories(): Promise<CatalogCategory[]> {
    if (listActiveCategoriesInFlight) {
      return listActiveCategoriesInFlight;
    }

    const load = (async () => {
      const traceMetadata: FirestoreTraceMetadata = {
        app: 'portal',
        collection: PORTAL_FIRESTORE_COLLECTIONS.categories,
        constraints: ['isActive==true'],
        source: 'catalogService.listActiveCategories',
        triggerReason: 'route',
      };
      traceFirestoreOneShotStart('getDocs', traceMetadata);
      const snapshot = await getDocs(query(
        collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.categories),
        where('isActive', '==', true),
      ));
      traceFirestoreOneShotComplete('getDocs', traceMetadata, snapshot.size);

      const activeCategories = sortPortalCatalogCategories(
        snapshot.docs.flatMap((document) => {
          const mapped = mapPortalActiveCategory(
            document.id,
            document.data() as Record<string, unknown>,
          );
          return mapped ? [mapped] : [];
        }),
      );

      return selectCustomerVisibleCategories(activeCategories, (categoryId) =>
        catalogService.countReadyDesigns({ categoryId }),
      );
    })();

    // Store the load Promise itself (not load.finally(...)), so settle can clear by identity.
    listActiveCategoriesInFlight = load;
    void load.finally(() => {
      if (listActiveCategoriesInFlight === load) {
        listActiveCategoriesInFlight = null;
      }
    });

    return load;
  },

  /**
   * Tags for the Portal tag modal: only tags with at least one ready design, each with its
   * ready-design count — never the full approved-tag taxonomy.
   *
   * Stage 1b: Algolia facets when configured; otherwise generated `tags-facet.json`
   * (transition until Stage 4). No Firestore full-scan fallback.
   */
  async listApprovedTags(): Promise<CatalogTagOption[]> {
    const { isPortalAlgoliaCatalogConfigured } = await import('./portalAlgoliaCatalogFlags');
    if (isPortalAlgoliaCatalogConfigured()) {
      const { portalAlgoliaCatalogSearchService } = await import(
        './portalAlgoliaCatalogSearchService'
      );
      return portalAlgoliaCatalogSearchService.listTagFacets();
    }
    return portalCatalogAssetService.listTagFacets();
  },

  /**
   * Same contract as `listApprovedTags`, narrowed to designs matching every tag in
   * `selectedTags` (AND semantics).
   */
  async listNarrowedApprovedTags(selectedTags: string[]): Promise<CatalogTagOption[]> {
    const { isPortalAlgoliaCatalogConfigured } = await import('./portalAlgoliaCatalogFlags');
    if (isPortalAlgoliaCatalogConfigured()) {
      const { portalAlgoliaCatalogSearchService } = await import(
        './portalAlgoliaCatalogSearchService'
      );
      return portalAlgoliaCatalogSearchService.listNarrowedTagFacets(selectedTags);
    }
    return portalCatalogAssetService.listNarrowedTagFacets(selectedTags);
  },
};
