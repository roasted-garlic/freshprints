import type {
  PortalAdminShowQueueItemOrigin,
  PortalAdminShowQueueItemSource,
} from "./getPortalAdminUpcomingShowQueueDashboard.types";
import type { ShowAllocationStatus } from "../showAllocation/showAllocation.enums";

export interface GetPortalAdminShowQueueRequestDesignsRequest {
  showId: string;
  printRequestId: string;
}

export interface PortalAdminShowQueueDesignItem {
  label: string;
  source: PortalAdminShowQueueItemSource;
  status: ShowAllocationStatus;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  origin: PortalAdminShowQueueItemOrigin;
  /** Short-lived signed derivative URL; never a Storage path. */
  imageUrl?: string;
  imageExpiresAtMs?: number;
  /**
   * Present when imageUrl is omitted for a non-success reason.
   * Staff Artwork uses the same derivative signing path as catalog/upload when derivatives exist.
   */
  previewUnavailableReason?:
    | "missing_object"
    | "signing_failed"
    | "unresolved";
  /** Catalog Design Library mat color from Studio; omitted for uploads / unset designs. */
  artworkBackgroundHex?: string;
}

export interface PortalAdminShowQueueRequestDesignsResponse {
  showId: string;
  printRequestId: string;
  requestName: string;
  generatedAtMs: number;
  items: PortalAdminShowQueueDesignItem[];
}
