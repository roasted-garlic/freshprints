import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";

const PRINTED_ALLOCATION_STATUSES: ShowAllocationStatus[] = ["printed", "done"];

export function isPrintedAllocationStatus(status: ShowAllocationStatus): boolean {
  return PRINTED_ALLOCATION_STATUSES.includes(status);
}

export interface PrintRequestAllocationTotals {
  totalAllocatedQuantity: number;
  totalInProgressQuantity: number;
  totalPrintedQuantity: number;
}

export function buildPrintRequestAllocationTotalsByRequestId(
  allocations: Array<{
    printRequestId: string;
    allocatedQuantity: number;
    status: ShowAllocationStatus;
  }>,
): Record<string, PrintRequestAllocationTotals> {
  const totals: Record<string, PrintRequestAllocationTotals> = {};

  for (const allocation of allocations) {
    if (allocation.status === "canceled") {
      continue;
    }

    const current = totals[allocation.printRequestId] ?? {
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    };
    current.totalAllocatedQuantity += allocation.allocatedQuantity;

    if (allocation.status === "in_progress") {
      current.totalInProgressQuantity += allocation.allocatedQuantity;
    }

    if (isPrintedAllocationStatus(allocation.status)) {
      current.totalPrintedQuantity += allocation.allocatedQuantity;
    }

    totals[allocation.printRequestId] = current;
  }

  return totals;
}
