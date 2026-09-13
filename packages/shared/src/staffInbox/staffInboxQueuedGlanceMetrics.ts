import type {
  StaffInboxPortalAllocationSnapshot,
  StaffInboxQueuedGlanceMetrics,
} from "./staffInbox.types";

export type { StaffInboxQueuedGlanceMetrics };

const ACTIVE_ALLOCATION_STATUSES = new Set(["pending", "queued", "in_progress"]);

function isActiveAllocationStatus(status: string): boolean {
  return ACTIVE_ALLOCATION_STATUSES.has(status);
}

function allocationDesignKey(allocation: StaffInboxPortalAllocationSnapshot): string {
  const designId = allocation.designId?.trim();
  if (designId) {
    return `design:${designId}`;
  }

  const customerUploadId = allocation.customerUploadId?.trim();
  if (customerUploadId) {
    return `upload:${customerUploadId}`;
  }

  const printRequestItemId = allocation.printRequestItemId?.trim();
  if (printRequestItemId) {
    return `item:${printRequestItemId}`;
  }

  return `qty:${allocation.printRequestId}:${allocation.upcomingShowId}:${allocation.allocatedQuantity}`;
}

/**
 * Summarize design count, print qty, and priceable units for one queued
 * request+show alert from its active portal allocations.
 */
export function buildStaffInboxQueuedGlanceMetrics(
  allocations: readonly StaffInboxPortalAllocationSnapshot[],
): StaffInboxQueuedGlanceMetrics | null {
  const active = allocations.filter((allocation) => isActiveAllocationStatus(allocation.status));
  if (active.length === 0) {
    return null;
  }

  const designKeys = new Set<string>();
  let printQuantity = 0;
  const pricingUnits: StaffInboxQueuedGlanceMetrics["pricingUnits"] = [];

  for (const allocation of active) {
    designKeys.add(allocationDesignKey(allocation));

    const quantity =
      typeof allocation.allocatedQuantity === "number" && Number.isFinite(allocation.allocatedQuantity)
        ? allocation.allocatedQuantity
        : 0;
    printQuantity += quantity;

    const width = allocation.printWidthInches;
    const height = allocation.printHeightInches;
    if (
      quantity > 0 &&
      typeof width === "number" &&
      Number.isFinite(width) &&
      width > 0 &&
      typeof height === "number" &&
      Number.isFinite(height) &&
      height > 0
    ) {
      pricingUnits.push({
        printWidthInches: width,
        printHeightInches: height,
        quantity,
      });
    }
  }

  return {
    designCount: designKeys.size,
    printQuantity,
    pricingUnits,
  };
}

export function filterAllocationsForQueuedGroup(
  allocations: readonly StaffInboxPortalAllocationSnapshot[],
  printRequestId: string,
  upcomingShowId: string,
): StaffInboxPortalAllocationSnapshot[] {
  return allocations.filter(
    (allocation) =>
      allocation.printRequestId === printRequestId && allocation.upcomingShowId === upcomingShowId,
  );
}
