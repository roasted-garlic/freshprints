export interface CatalogCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface CatalogTagOption {
  id: string;
  name: string;
  /** Ready-design count for this tag. Absent when the count is not known (e.g. legacy fallback). */
  count?: number;
}

export interface CatalogDesign {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  thumbnailPath: string;
  previewPath?: string;
  /**
   * Optional mat / OG letterbox background (`#rrggbb`).
   * Missing → Portal artwork grey.
   */
  artworkBackgroundHex?: string;
  /** Production pixel width from the design document. */
  width: number;
  /** Production pixel height from the design document. */
  height: number;
  printWidthInches?: number;
  printHeightInches?: number;
  /** Milliseconds since epoch; omitted when missing on legacy docs. */
  createdAtMs?: number;
  /**
   * Most recent transition into `status: "ready"` (Owner QA Amendment 3) — the canonical default
   * catalog ordering key. Omitted for legacy designs approved before the field existed; ordering
   * falls back to `createdAtMs` for those.
   */
  readyAtMs?: number;
  requestCount: number;
  /** Milliseconds since epoch; omitted when never added to a Working cart / request item. */
  lastRequestedAtMs?: number;
  /**
   * Milliseconds since epoch when last allocated to a show.
   * Gate for Recently Requested — Working-cart adds alone do not set this.
   */
  lastAddedToShowAtMs?: number;
  /** Customer favorites count (Most Liked). */
  favoriteCount: number;
  /**
   * Milliseconds since epoch; cache-bust for derivative URLs and index fallback.
   * Not used for default library order (request counters bump this field).
   */
  updatedAtMs?: number;
}

/**
 * Firestore orderBy field for ready-catalog paging.
 * Default browse uses `readyAt` (most recent approval to ready), with `createdAt` fallback
 * for legacy docs / completeness. Metric discover modes use requestCount / favoriteCount /
 * lastAddedToShowAt. Discover "new this week" uses `createdAt` + `createdAfterMs`.
 */
export type CatalogDesignSortField =
  | 'updatedAt'
  | 'createdAt'
  | 'readyAt'
  | 'requestCount'
  | 'lastRequestedAt'
  | 'lastAddedToShowAt'
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
