export interface CatalogCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface CatalogTagOption {
  id: string;
  name: string;
}

export interface CatalogDesign {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  thumbnailPath: string;
  previewPath?: string;
  /** Production pixel width from the design document. */
  width: number;
  /** Production pixel height from the design document. */
  height: number;
  printWidthInches?: number;
  printHeightInches?: number;
  /** Milliseconds since epoch; omitted when missing on legacy docs. */
  createdAtMs?: number;
  requestCount: number;
  /** Milliseconds since epoch; omitted when never requested. */
  lastRequestedAtMs?: number;
  /** Customer favorites count (Most Liked). */
  favoriteCount: number;
  /** Milliseconds since epoch; used for default library sort / cursors. */
  updatedAtMs?: number;
}

/** Firestore orderBy field for ready-catalog paging. */
export type CatalogDesignSortField =
  | 'updatedAt'
  | 'createdAt'
  | 'requestCount'
  | 'lastRequestedAt'
  | 'favoriteCount';

export interface CatalogDesignListCursor {
  designId: string;
  /** Sort key for the active `sortField` (timestamp millis or requestCount). */
  sortValue: number;
}

export interface CatalogDesignListQuery {
  categoryId?: string;
  tag?: string;
  /** Client-side only in listReadyDesignsPage today; prefer filtering after fetch. */
  search?: string;
  limitCount?: number;
  cursor?: CatalogDesignListCursor;
  sortField?: CatalogDesignSortField;
  /** Inclusive lower bound for `createdAt` when `sortField` is `createdAt` (e.g. New This Week). */
  createdAfterMs?: number;
}

export interface CatalogDesignListPage {
  designs: CatalogDesign[];
  hasMore: boolean;
  nextCursor?: CatalogDesignListCursor;
}
