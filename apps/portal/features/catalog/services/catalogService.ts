import {
  collection,
  documentId,
  getCountFromServer,
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
  width?: unknown;
  height?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  requestCount?: unknown;
  lastRequestedAt?: unknown;
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
    width: data.width,
    height: data.height,
    printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : undefined,
    createdAtMs: timestampToMillis(data.createdAt),
    updatedAtMs: timestampToMillis(data.updatedAt),
    requestCount:
      typeof data.requestCount === 'number' && Number.isFinite(data.requestCount) && data.requestCount >= 0
        ? data.requestCount
        : 0,
    lastRequestedAtMs: timestampToMillis(data.lastRequestedAt),
  };
}

function resolveSortField(listQuery: CatalogDesignListQuery): CatalogDesignSortField {
  return listQuery.sortField ?? 'updatedAt';
}

function getDesignSortValue(design: CatalogDesign, sortField: CatalogDesignSortField): number {
  switch (sortField) {
    case 'createdAt':
      return design.createdAtMs ?? 0;
    case 'requestCount':
      return design.requestCount;
    case 'lastRequestedAt':
      return design.lastRequestedAtMs ?? 0;
    case 'updatedAt':
    default:
      return design.updatedAtMs ?? 0;
  }
}

function toCursorStartAfterValue(sortField: CatalogDesignSortField, sortValue: number): Timestamp | number {
  if (sortField === 'requestCount') {
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

function mapCategoryDocument(categoryId: string, data: Record<string, unknown>): CatalogCategory | null {
  if (typeof data.name !== 'string' || data.isActive !== true) {
    return null;
  }

  return {
    id: categoryId,
    name: data.name,
    description: typeof data.description === 'string' ? data.description : undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
  };
}

function mapTagDocument(tagId: string, data: Record<string, unknown>): CatalogTagOption | null {
  if (typeof data.name !== 'string' || data.status !== 'approved') {
    return null;
  }

  return {
    id: tagId,
    name: data.name,
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
    const snapshot = await getDocs(designsQuery);

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

    const designs: CatalogDesign[] = [];
    const designsRef = collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.designs);

    for (let index = 0; index < uniqueIds.length; index += 30) {
      const chunk = uniqueIds.slice(index, index + 30);
      const snapshot = await getDocs(query(designsRef, where(documentId(), 'in', chunk)));

      for (const designSnapshot of snapshot.docs) {
        const mapped = mapCatalogDesign(designSnapshot.id, designSnapshot.data() as DesignDocumentData);
        if (mapped) {
          designs.push(mapped);
        }
      }
    }

    const byId = new Map(designs.map((design) => [design.id, design]));
    return uniqueIds
      .map((designId) => byId.get(designId))
      .filter((design): design is CatalogDesign => design !== undefined);
  },

  /** Exact count of ready designs matching category / primary tag / new-this-week bounds. */
  async countReadyDesigns(listQuery: CatalogDesignListQuery = {}): Promise<number> {
    const countQuery = query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.designs),
      ...buildDesignFilterConstraints(listQuery),
    );
    const snapshot = await getCountFromServer(countQuery);
    return snapshot.data().count;
  },

  /**
   * Fetches every ready design matching the server filters (paged under the hood).
   * Used so library search/tags can run across the full matching set.
   */
  async listAllMatchingReadyDesigns(
    listQuery: CatalogDesignListQuery = {},
    options?: {
      onPage?: (designs: CatalogDesign[]) => void;
      pageSize?: number;
    },
  ): Promise<CatalogDesign[]> {
    const designs: CatalogDesign[] = [];
    let cursor: CatalogDesignListQuery['cursor'] = listQuery.cursor;
    const pageSize = options?.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE;

    for (;;) {
      const page = await this.listReadyDesignsPageWithSortFallback({
        ...listQuery,
        cursor,
        limitCount: pageSize,
        search: undefined,
      });

      designs.push(...page.designs);
      options?.onPage?.(page.designs);

      if (!page.hasMore || !page.nextCursor) {
        break;
      }

      cursor = page.nextCursor;
    }

    return designs;
  },

  /**
   * Bounded pools for Discover home rails — not the full catalog.
   * Prefer library paging for browse-all.
   *
   * While composite indexes for createdAt / requestCount / lastRequestedAt are
   * still building, falls back to the existing status+updatedAt index so home
   * stays usable.
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
        sortField: 'lastRequestedAt',
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
        sortField: 'updatedAt',
      });
      return fallback.designs;
    }

    return [];
  },

  /**
   * Paged list with automatic fallback to `updatedAt` when a sort-specific
   * composite index is missing or still building.
   */
  async listReadyDesignsPageWithSortFallback(
    listQuery: CatalogDesignListQuery = {},
  ): Promise<CatalogDesignListPage> {
    try {
      return await this.listReadyDesignsPage(listQuery);
    } catch (error) {
      const sortField = listQuery.sortField ?? 'updatedAt';

      if (!isFirestoreIndexNotReadyError(error) || sortField === 'updatedAt') {
        throw error;
      }

      return this.listReadyDesignsPage({
        ...listQuery,
        createdAfterMs: undefined,
        sortField: 'updatedAt',
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
        sortField: 'updatedAt',
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
    const categoriesQuery = query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.categories),
      where('isActive', '==', true),
    );
    const snapshot = await getDocs(categoriesQuery);

    return snapshot.docs
      .map((categorySnapshot) =>
        mapCategoryDocument(categorySnapshot.id, categorySnapshot.data() as Record<string, unknown>),
      )
      .filter((category): category is CatalogCategory => category !== null)
      .sort((left, right) => {
        const orderCompare = left.sortOrder - right.sortOrder;

        if (orderCompare !== 0) {
          return orderCompare;
        }

        return left.name.localeCompare(right.name);
      });
  },

  async listApprovedTags(): Promise<CatalogTagOption[]> {
    const tagsQuery = query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.tags),
      where('status', '==', 'approved'),
    );
    const snapshot = await getDocs(tagsQuery);

    return snapshot.docs
      .map((tagSnapshot) => mapTagDocument(tagSnapshot.id, tagSnapshot.data() as Record<string, unknown>))
      .filter((tag): tag is CatalogTagOption => tag !== null)
      .sort((left, right) => left.name.localeCompare(right.name));
  },
};
