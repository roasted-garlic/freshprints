import type { ShowProductionStatus } from "../upcomingShow/upcomingShow.enums";

export interface PortalPublicShowSummary {
  id: string;
  scheduledStartAt: string | null;
  productionStatus: ShowProductionStatus;
  /** Distinct show images: ready catalog designs + all allocated customer uploads (includes non-share uploads in the count). */
  uniquePublicCatalogDesignCount: number;
}

export interface ListPortalPublicShowsResponse {
  shows: PortalPublicShowSummary[];
}
