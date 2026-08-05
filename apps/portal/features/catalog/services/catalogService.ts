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
  traceGeneratedFallbackActivation,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  type FirestoreTraceMetadata,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

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
import { generatedPortalCatalogEnabled } from './catalogSnapshotFlags';
import {
  invalidateCatalogDesignById,
  loadCatalogDesignByIdCached,
} from './catalogDesignByIdCache';

export const DEFAULT_CATALOG_PAGE_SIZE = 40;
export const HOME_DISCOVERY_POOL_PAGE_SIZE = 80;

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
  return listQuery.sortField ?? 'createdAt';
}

function getDesignSortValue(design: CatalogDesign, sortField: CatalogDesignSortField): number {
  switch (sortField) {
    case 'createdAt':
      // Owner QA Amendment 3: default browse orders by the most recent transition into `ready`,
      // falling back to createdAt for legacy designs approved before `readyAt` existed.
      return design.readyAtMs ?? design.createdAtMs ?? 0;
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

  if (sortField === 'createdAt' && typeof listQuery.createdAfterMs === 'number') {
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
 * Exact set of requested design ids not present in a generated-manifest response. A
 * successful-but-incomplete response (a manifest cold-start gap) omits designs without
 * throwing — this is what getReadyDesignsByIds uses to bound its per-doc fallback retry to
 * exactly the missing subset, never the full requested set. Pure/exported for direct testing
 * per this repo's hook/service testing convention (docs/standards/TESTING.md).
 */
export function resolveMissingDesignIds(
  requestedIds: readonly string[],
  foundDesigns: readonly Pick<CatalogDesign, 'id'>[],
): string[] {
  const foundIds = new Set(foundDesigns.map((design) => design.id));
  return requestedIds.filter((id) => !foundIds.has(id));
}

function catalogListTraceMetadata(
  listQuery: CatalogDesignListQuery,
  source: string,
): FirestoreTraceMetadata {
  const sortField = resolveSortField(listQuery);
  const constraints = [
    'status==ready',
    listQuery.categoryId?.trim() ? 'categoryId=={categoryId}' : '',
    listQuery.tag?.trim() ? 'tags array-contains {tag}' : '',
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

    if (!listQuery.search?.trim()) {
      return page;
    }

    return {
      ...page,
      designs: filterCatalogDesignsBySearch(page.designs, listQuery.search),
    };
  },

  async getReadyDesignsByIds(designIds: string[]): Promise<CatalogDesign[]> {
    const uniqueIds = [...new Set(designIds.map((id) => id.trim()).filter(Boolean))];

    if (uniqueIds.length === 0) {
      return [];
    }

    let generatedDesigns: CatalogDesign[] = [];
    let missingIds = uniqueIds;

    if (generatedPortalCatalogEnabled()) {
      try {
        generatedDesigns = await portalCatalogAssetService.getDesignsByIds(uniqueIds);
        missingIds = resolveMissingDesignIds(uniqueIds, generatedDesigns);

        // Fully successful — every requested design was in the generated snapshot.
        // Zero extra reads: do not fall through to the per-doc fallback below.
        if (missingIds.length === 0) {
          return generatedDesigns;
        }

        // Successful-but-incomplete: a manifest cold-start gap (just-approved design not yet
        // reflected in the cached snapshot) can omit a design without throwing. Retry only the
        // exact missing subset via the per-doc fallback — never the full requested set.
        traceGeneratedFallbackActivation(
          'portal-catalog/request-card',
          'generated-card-partial-result',
          { app: 'portal', triggerReason: 'route' },
        );
      } catch {
        traceGeneratedFallbackActivation(
          'portal-catalog/request-card',
          'generated-card-resolution-failed',
          { app: 'portal', triggerReason: 'route' },
        );
      }
    }

    // Per-doc reads: archived/non-ready designs deny customer read and must not
    // fail the whole Favorites page (batch `in` queries are rules-unsafe here).
    // Bounded to `missingIds` — the exact subset not already resolved above.
    const fallbackDesigns = await Promise.all(
      missingIds.map((designId) =>
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

    return [
      ...generatedDesigns,
      ...fallbackDesigns.filter((design): design is CatalogDesign => design !== null),
    ];
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
    const preferredQueries: CatalogDesignListQuery[] = [
      {
        limitCount: HOME_DISCOVERY_POOL_PAGE_SIZE,
        sortField: 'createdAt',
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
        sortField: 'createdAt',
      });
      return fallback.designs;
    }

    return [];
  },

  /**
   * Paged list with automatic fallback to `createdAt` (then `updatedAt`) when a
   * sort-specific composite index is missing or still building.
   */
  async listReadyDesignsPageWithSortFallback(
    listQuery: CatalogDesignListQuery = {},
  ): Promise<CatalogDesignListPage> {
    try {
      return await this.listReadyDesignsPage(listQuery);
    } catch (error) {
      const sortField = listQuery.sortField ?? 'createdAt';

      if (!isFirestoreIndexNotReadyError(error)) {
        throw error;
      }

      if (sortField === 'createdAt') {
        return this.listReadyDesignsPage({
          ...listQuery,
          createdAfterMs: undefined,
          sortField: 'updatedAt',
        });
      }

      if (sortField === 'updatedAt') {
        throw error;
      }

      return this.listReadyDesignsPage({
        ...listQuery,
        createdAfterMs: undefined,
        sortField: 'createdAt',
      });
    }
  },

  /** @deprecated Prefer paged listReadyDesignsPage — retained for rare admin/debug callers. */
  async listAllReadyDesigns(maxDesigns = 2000): Promise<CatalogDesign[]> {
    const designs: CatalogDesign[] = [];
    let cursor: CatalogDesignListQuery['cursor'];

    while (designs.length < maxDesigns) {
      const page = await this.listReadyDesignsPage({
        cursor,
        limitCount: Math.min(48, maxDesigns - designs.length),
        sortField: 'createdAt',
      });

      designs.push(...page.designs);

      if (!page.hasMore || !page.nextCursor) {
        break;
      }

      cursor = page.nextCursor;
    }

    return designs;
  },

  async listActiveCategories(): Promise<CatalogCategory[]> {
    if (generatedPortalCatalogEnabled()) {
      try {
        const snapshot = await portalCatalogAssetService.loadClientTaxonomy();
        return snapshot.categories;
      } catch {
        // Bounded rollout/rollback fallback while a valid manifest is unavailable.
      }
    }
    const traceMetadata: FirestoreTraceMetadata = {
      app: 'portal',
      collection: PORTAL_FIRESTORE_COLLECTIONS.categories,
      constraints: ['isActive==true'],
      source: 'catalogService.listActiveCategories.fallback',
      triggerReason: 'route',
    };
    traceFirestoreOneShotStart('getDocs', traceMetadata);
    const snapshot = await getDocs(query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.categories),
      where('isActive', '==', true),
    ));
    traceFirestoreOneShotComplete('getDocs', traceMetadata, snapshot.size);
    return snapshot.docs.flatMap((document) => {
      const data = document.data();
      if (typeof data.name !== 'string') return [];
      return [{
        id: document.id,
        name: data.name,
        ...(typeof data.description === 'string' ? { description: data.description } : {}),
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
      }];
    }).sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  },

  /**
   * Tags for the Portal tag modal: only tags with at least one ready design, each with its
   * ready-design count — never the full approved-tag taxonomy. Sourced exclusively from the
   * compact generated tag-facet asset (`portalCatalogAssetService.listTagFacets`).
   *
   * No Firestore fallback exists deliberately: the only way to derive a *complete* "tags with
   * counts" shape from Firestore alone is either a full-collection scan (unbounded — the exact
   * defect this asset exists to remove) or one `getCountFromServer` call per approved tag
   * (~1,122 network round trips, worse). Rather than ship an incomplete/inaccurate bounded
   * fallback, this throws when the generated asset is unavailable; `useCatalogTags` surfaces that
   * as an "unavailable" state so the caller never silently under- or over-counts. Owner-approved
   * 2026-07-24 (see the Wave C dev deployment checkpoint's "Blocking Issue 2" resolution).
   */
  async listApprovedTags(): Promise<CatalogTagOption[]> {
    return portalCatalogAssetService.listTagFacets();
  },

  /**
   * Same contract as `listApprovedTags`, narrowed to designs matching every tag in
   * `selectedTags` (AND semantics) — powers dynamic tag-modal narrowing (selecting a tag hides
   * unrelated tags and recalculates remaining counts). Same no-Firestore-fallback rule applies;
   * see `portalCatalogAssetService.listNarrowedTagFacets` for how this stays bounded.
   */
  async listNarrowedApprovedTags(selectedTags: string[]): Promise<CatalogTagOption[]> {
    return portalCatalogAssetService.listNarrowedTagFacets(selectedTags);
  },
};
