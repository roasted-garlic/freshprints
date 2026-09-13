import type { ShowAllocationStatus } from "../showAllocation/showAllocation.enums";
import type { ShowProductionStatus, UpcomingShowStatus } from "../upcomingShow/upcomingShow.enums";

export type GetPortalAdminDailyShowQueueRequest = Record<string, never>;

export type PortalAdminShowQueueRequestKind = "customer" | "internal" | "unknown";
export type PortalAdminShowQueueItemSource = "catalog_design" | "customer_upload" | "staff_artwork";
export type PortalAdminShowQueueItemOrigin = "standard" | "requeued" | "moved";

export interface PortalAdminDailyShowQueueResponse {
  operationalDay: {
    dateKey: string;
    timeZone: string;
    generatedAtMs: number;
  };
  totals: {
    showCount: number;
    attachedQuantity: number;
    activeWorkQuantity: number;
  };
  shows: Array<{
    title: string;
    scheduledStartAtMs: number;
    showStatus: UpcomingShowStatus;
    productionStatus: ShowProductionStatus;
    isArchived: boolean;
    attachedQuantity: number;
    activeWorkQuantity: number;
    requests: Array<{
      name: string;
      kind: PortalAdminShowQueueRequestKind;
      customerIdentityLabel?: string;
      attachedQuantity: number;
      activeWorkQuantity: number;
      items: Array<{
        label: string;
        source: PortalAdminShowQueueItemSource;
        status: ShowAllocationStatus;
        quantity: number;
        printWidthInches?: number;
        printHeightInches?: number;
        sizeLabel?: string;
        origin: PortalAdminShowQueueItemOrigin;
      }>;
    }>;
  }>;
}
