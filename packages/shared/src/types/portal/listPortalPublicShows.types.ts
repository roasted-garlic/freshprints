import type { ShowProductionStatus } from "../upcomingShow/upcomingShow.enums";

export interface PortalPublicShowSummary {
  id: string;
  scheduledStartAt: string | null;
  productionStatus: ShowProductionStatus;
  /** Distinct ready catalog designs allocated to this show (public-safe count). */
  uniquePublicCatalogDesignCount: number;
}

export interface ListPortalPublicShowsResponse {
  shows: PortalPublicShowSummary[];
}
