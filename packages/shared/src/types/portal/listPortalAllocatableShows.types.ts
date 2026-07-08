import type { ShowProductionStatus } from "../upcomingShow/upcomingShow.enums";

export interface PortalAllocatableShow {
  id: string;
  scheduledStartAt: string | null;
  productionStatus: ShowProductionStatus;
  maxTotalQuantity?: number;
  allocatedQuantity: number;
}

export interface ListPortalAllocatableShowsResponse {
  shows: PortalAllocatableShow[];
}
