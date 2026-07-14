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
}

export interface CatalogDesignListCursor {
  designId: string;
  sortMillis: number;
}

export interface CatalogDesignListQuery {
  categoryId?: string;
  tag?: string;
  search?: string;
  limitCount?: number;
  cursor?: CatalogDesignListCursor;
}

export interface CatalogDesignListPage {
  designs: CatalogDesign[];
  hasMore: boolean;
  nextCursor?: CatalogDesignListCursor;
}
