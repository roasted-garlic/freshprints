import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
} from 'firebase/firestore';

import { PORTAL_FIRESTORE_COLLECTIONS } from '../../../lib/firebase/collections';
import { getPortalDb } from '../../../lib/firebase/client';
import type {
  CatalogCategory,
  CatalogDesign,
  CatalogDesignListPage,
  CatalogDesignListQuery,
  CatalogTagOption,
} from '../types/catalog.types';
import { filterCatalogDesignsBySearch } from '../utils/catalogSearch';

const DEFAULT_PAGE_SIZE = 24;

interface DesignDocumentData {
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  tags?: unknown;
  status?: unknown;
  thumbnailPath?: unknown;
  previewPath?: unknown;
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
    requestCount:
      typeof data.requestCount === 'number' && Number.isFinite(data.requestCount) && data.requestCount >= 0
        ? data.requestCount
        : 0,
    lastRequestedAtMs: timestampToMillis(data.lastRequestedAt),
  };
}

function getDesignSortMillis(design: CatalogDesign, sortMillisById: Map<string, number>): number {
  return sortMillisById.get(design.id) ?? 0;
}

function buildDesignListConstraints(listQuery: CatalogDesignListQuery): QueryConstraint[] {
  const pageSize = listQuery.limitCount ?? DEFAULT_PAGE_SIZE;
  const constraints: QueryConstraint[] = [where('status', '==', 'ready')];

  if (listQuery.categoryId?.trim()) {
    constraints.push(where('categoryId', '==', listQuery.categoryId.trim()));
  }

  if (listQuery.tag?.trim()) {
    constraints.push(where('tags', 'array-contains', listQuery.tag.trim().toLowerCase()));
  }

  constraints.push(orderBy('updatedAt', 'desc'));
  constraints.push(orderBy('__name__', 'desc'));

  if (listQuery.cursor) {
    constraints.push(
      startAfter(Timestamp.fromMillis(listQuery.cursor.sortMillis), listQuery.cursor.designId),
    );
  }

  constraints.push(limit(pageSize + 1));

  return constraints;
}

function buildDesignListPage(
  designs: CatalogDesign[],
  sortMillisById: Map<string, number>,
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
            sortMillis: getDesignSortMillis(lastDesign, sortMillisById),
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
    const pageSize = listQuery.limitCount ?? DEFAULT_PAGE_SIZE;
    const designsQuery = query(
      collection(getPortalDb(), PORTAL_FIRESTORE_COLLECTIONS.designs),
      ...buildDesignListConstraints(listQuery),
    );
    const snapshot = await getDocs(designsQuery);
    const sortMillisById = new Map<string, number>();

    const designs = snapshot.docs
      .map((designSnapshot) => {
        const data = designSnapshot.data() as DesignDocumentData;
        const updatedAt = data.updatedAt;

        if (updatedAt instanceof Timestamp) {
          sortMillisById.set(designSnapshot.id, updatedAt.toMillis());
        }

        return mapCatalogDesign(designSnapshot.id, data);
      })
      .filter((design): design is CatalogDesign => design !== null);

    const page = buildDesignListPage(designs, sortMillisById, pageSize);

    if (!listQuery.search?.trim()) {
      return page;
    }

    return {
      ...page,
      designs: filterCatalogDesignsBySearch(page.designs, listQuery.search),
    };
  },

  async listAllReadyDesigns(maxDesigns = 2000): Promise<CatalogDesign[]> {
    const designs: CatalogDesign[] = [];
    let cursor: CatalogDesignListQuery['cursor'];

    while (designs.length < maxDesigns) {
      const page = await this.listReadyDesignsPage({
        cursor,
        limitCount: Math.min(48, maxDesigns - designs.length),
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
