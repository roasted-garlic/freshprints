import type { ShowProductionStatus } from '../upcomingShow/upcomingShow.enums';

export interface PortalShowCatalogDesignCard {
  id: string;
  title: string;
  thumbnailPath?: string;
  categoryId?: string;
  tags: string[];
  isExplicitContent?: boolean;
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
