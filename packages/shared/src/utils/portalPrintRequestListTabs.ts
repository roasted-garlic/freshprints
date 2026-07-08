import type { PrintRequest } from "../types/printRequest/printRequest.types";
import type { PrintRequestStatus } from "../types/printRequest/printRequest.enums";
import type { PrintRequestAllocationTotals } from "./showAllocationTotals";
import type { PrintRequestItemSummary } from "./printRequestItemSummaries";
import { derivePrintRequestListTab, type PrintRequestListTab } from "./printRequestListGrouping";

export type PortalPrintRequestListTab = PrintRequestListTab;

export const PORTAL_PRINT_REQUEST_LIST_TAB_PARAM = "tab";

/** Requests the customer can still edit in the portal (not yet locked for production). */
export function isPortalContinuablePrintRequestStatus(status: PrintRequestStatus): boolean {
  return status === "draft" || status === "editing";
}

export function parsePortalPrintRequestListTab(
  value: string | null | undefined,
): PortalPrintRequestListTab {
  if (value === "queued" || value === "printing" || value === "printed" || value === "working") {
    return value;
  }

  return "working";
}

export function getPortalPrintRequestListTabLabel(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case "working":
      return "Working";
    case "queued":
      return "Queued";
    case "printing":
      return "Printing";
    case "printed":
      return "Printed";
  }
}

export function groupPortalPrintRequestsByListTab(input: {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  allocationTotalsByRequestId: Record<string, PrintRequestAllocationTotals>;
}): Record<PortalPrintRequestListTab, PrintRequest[]> {
  const grouped: Record<PortalPrintRequestListTab, PrintRequest[]> = {
    working: [],
    queued: [],
    printing: [],
    printed: [],
  };

  for (const request of input.requests) {
    const summary = input.summariesByRequestId[request.id] ?? { totalQuantity: 0, uniqueDesignCount: 0 };
    const allocationTotals = input.allocationTotalsByRequestId[request.id] ?? {
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    };
    const tab = derivePrintRequestListTab({
      totalRequestedQuantity: summary.totalQuantity,
      totalAllocatedQuantity: allocationTotals.totalAllocatedQuantity,
      totalInProgressQuantity: allocationTotals.totalInProgressQuantity,
      totalPrintedQuantity: allocationTotals.totalPrintedQuantity,
      status: request.status,
    });

    grouped[tab].push(request);
  }

  return grouped;
}
