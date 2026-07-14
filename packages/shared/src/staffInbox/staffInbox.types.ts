import type { PrintRequestListTab } from "../utils/printRequestListGrouping";

export type StaffInboxItemKind = "portal_queued" | "show_queue_full";

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
}
