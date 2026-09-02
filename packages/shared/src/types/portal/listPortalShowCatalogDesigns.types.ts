import type { ShowProductionStatus } from '../upcomingShow/upcomingShow.enums';

export interface PortalShowCatalogDesignCard {
  id: string;
  title: string;
  thumbnailPath?: string;
  previewPath?: string;
  categoryId?: string;
  tags: string[];
  isExplicitContent?: boolean;
  /** Production pixel width — required for Portal print-request sizing. */
  width: number;
  /** Production pixel height — required for Portal print-request sizing. */
  height: number;
  requestCount?: number;
  favoriteCount?: number;
  updatedAtMs?: number;
  artworkBackgroundHex?: string;
}

export interface ListPortalShowCatalogDesignsRequest {
  upcomingShowId: string;
}

export interface ListPortalShowCatalogDesignsResponse {
  showId: string;
  scheduledStartAt: string | null;
  productionStatus: ShowProductionStatus;
  designs: PortalShowCatalogDesignCard[];
}
