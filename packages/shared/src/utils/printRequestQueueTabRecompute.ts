import { derivePrintRequestListTab, type PrintRequestListTab } from "./printRequestListGrouping";
import { isPrintedAllocationStatus } from "./showAllocationTotals";
import type { PrintRequestStatus } from "../types/printRequest/printRequest.enums";
import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";

export interface PrintRequestQueueTabRecomputeItem {
  quantity: number;
}

export interface PrintRequestQueueTabRecomputeAllocation {
  allocatedQuantity: number;
  status: ShowAllocationStatus;
}

/**
 * Aggregates one print request's own items and allocations into `derivePrintRequestListTab`'s
 * input shape. Pure — no I/O. Cost of computing this is O(items + allocations for one request),
 * never O(total database); the caller (a Firestore trigger scoped to the affected request) must
 * only ever pass that one request's own item/allocation documents.
 */
export function computePrintRequestQueueTab(input: {
  status: PrintRequestStatus;
  items: PrintRequestQueueTabRecomputeItem[];
  allocations: PrintRequestQueueTabRecomputeAllocation[];
}): PrintRequestListTab {
  const totalRequestedQuantity = input.items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0),
    0,
  );

  let totalAllocatedQuantity = 0;
  let totalInProgressQuantity = 0;
  let totalPrintedQuantity = 0;

  for (const allocation of input.allocations) {
    if (allocation.status === "canceled") {
      continue;
    }
    const quantity = Number.isFinite(allocation.allocatedQuantity) ? allocation.allocatedQuantity : 0;
    totalAllocatedQuantity += quantity;
    if (allocation.status === "in_progress") {
      totalInProgressQuantity += quantity;
    }
    if (isPrintedAllocationStatus(allocation.status)) {
      totalPrintedQuantity += quantity;
    }
  }

  return derivePrintRequestListTab({
    totalRequestedQuantity,
    totalAllocatedQuantity,
    totalInProgressQuantity,
    totalPrintedQuantity,
    status: input.status,
  });
}
