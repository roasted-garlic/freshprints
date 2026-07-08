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
  printWidthInches?: number;
  printHeightInches?: number;
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
