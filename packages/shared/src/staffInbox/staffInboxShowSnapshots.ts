import { assessShowCapacity } from "../utils/showCapacity";
import type { StaffInboxPortalAllocationSnapshot } from "./staffInbox.types";

export interface StaffInboxShowSnapshot {
  allocatedQuantity: number;
  id: string;
  maxTotalQuantity?: number;
  productionStatus: string;
  updatedAtMillis: number;
}

const ACTIVE_ALLOCATION_STATUSES = new Set(["pending", "queued", "in_progress"]);

export function isStaffInboxShowQueueFull(show: StaffInboxShowSnapshot): boolean {
  if (show.productionStatus === "full") {
    return true;
  }

  return assessShowCapacity({
    allocatedQuantity: show.allocatedQuantity,
    maxTotalQuantity: show.maxTotalQuantity,
  }).isFull;
}

export function showHasPortalAllocations(
  upcomingShowId: string,
  portalAllocations: StaffInboxPortalAllocationSnapshot[],
): boolean {
  return portalAllocations.some(
    (allocation) =>
      allocation.upcomingShowId === upcomingShowId &&
      ACTIVE_ALLOCATION_STATUSES.has(allocation.status),
  );
}

export function listFullPortalShowIds(
  shows: StaffInboxShowSnapshot[],
  portalAllocations: StaffInboxPortalAllocationSnapshot[],
): string[] {
  const fullShowIds: string[] = [];

  for (const show of shows) {
    if (!showHasPortalAllocations(show.id, portalAllocations)) {
      continue;
    }

    if (isStaffInboxShowQueueFull(show)) {
      fullShowIds.push(show.id);
    }
  }

  return fullShowIds.sort();
}
