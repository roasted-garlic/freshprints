import type { ShowProductionStatus, UpcomingShowStatus } from "../upcomingShow/upcomingShow.enums";

export type PortalAdminShowQueueRequestKind = "customer" | "internal" | "unknown";
export type PortalAdminShowQueueItemSource = "catalog_design" | "customer_upload" | "staff_artwork";
export type PortalAdminShowQueueItemOrigin = "standard" | "requeued" | "moved";

export interface GetPortalAdminUpcomingShowQueueDashboardRequest {
  showId?: string;
}

export interface PortalAdminUpcomingShowListItem {
  showId: string;
  title: string;
  scheduledStartAtMs: number | null;
  showStatus: UpcomingShowStatus;
  productionStatus: ShowProductionStatus;
  isArchived: boolean;
}

export interface PortalAdminShowCapacityDto {
  maxTotalQuantity?: number;
  allocatedQuantity: number;
  remainingQuantity?: number;
  isFull: boolean;
  isOverCapacity: boolean;
  /** Percent used; may exceed 100. Undefined when uncapped or invalid max. */
  percentUsed?: number;
  usedLabel: string;
}

export interface PortalAdminShowRequestSummary {
  printRequestId: string;
  name: string;
  kind: PortalAdminShowQueueRequestKind;
  /** Opaque only within this response; never a customer identifier across responses. */
  customerGroupKey: string;
  customerIdentityLabel?: string;
  designQty: number;
  printQty: number;
  statusSummary: string;
  /** Null means one or more saved request items could not be priced safely. */
  requestTotalPriceUsd: number | null;
  /** Null means no active allocations or an active allocation could not be priced safely. */
  selectedShowAllocationTotalPriceUsd: number | null;
}

export interface PortalAdminSelectedShowDashboard {
  showId: string;
  title: string;
  scheduledStartAtMs: number | null;
  showStatus: UpcomingShowStatus;
  productionStatus: ShowProductionStatus;
  isArchived: boolean;
  designQty: number;
  printQty: number;
  prQty: number;
  capacity: PortalAdminShowCapacityDto;
  requests: PortalAdminShowRequestSummary[];
}

export interface PortalAdminUpcomingShowQueueDashboardResponse {
  generatedAtMs: number;
  timeZone: string;
  shows: PortalAdminUpcomingShowListItem[];
  selectedShowId: string | null;
  selected: PortalAdminSelectedShowDashboard | null;
}
