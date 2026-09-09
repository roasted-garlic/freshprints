import type { PrintRequestListTab } from "../utils/printRequestListGrouping";

export type StaffInboxItemKind = "portal_queued" | "show_queue_full" | "design_issue_report";

export interface StaffInboxPortalRequestSnapshot {
  id: string;
  name: string;
  itemCount: number;
  customerDisplayNameSnapshot?: string;
  updatedAtMillis: number;
}

export interface StaffInboxPortalAllocationSnapshot {
  printRequestId: string;
  upcomingShowId: string;
  requestNameSnapshot: string;
  status: string;
  createdAtMillis: number;
  /** Allocated print quantity for this row (required for glance metrics). */
  allocatedQuantity?: number;
  printRequestItemId?: string;
  designId?: string;
  customerUploadId?: string;
  printWidthInches?: number;
  printHeightInches?: number;
}

/** At-a-glance metrics for a `portal_queued` alert (request+show allocation scope). */
export interface StaffInboxQueuedGlanceMetrics {
  designCount: number;
  printQuantity: number;
  pricingUnits: Array<{
    printWidthInches: number;
    printHeightInches: number;
    quantity: number;
  }>;
}

export interface StaffInboxItem {
  id: string;
  kind: StaffInboxItemKind;
  printRequestId?: string;
  upcomingShowId?: string;
  title: string;
  subtitle: string;
  printRequestTab?: PrintRequestListTab;
  occurredAtMillis: number;
  /** Present on `portal_queued` when live allocations can be summarized. */
  queuedGlance?: StaffInboxQueuedGlanceMetrics;
  designIssueReport?: import("../designIssueReports/designIssueReport.types").DesignIssueReport;
}

export interface StaffInboxCompletedItem extends StaffInboxItem {
  acknowledgedAtMillis: number;
  /** Staff who marked the item done (display name when available). */
  acknowledgedByDisplayName?: string;
  acknowledgedByUserId?: string;
}

export interface StaffInboxBadgeCounts {
  printRequests: number;
  showQueue: number;
  designReports: number;
}
