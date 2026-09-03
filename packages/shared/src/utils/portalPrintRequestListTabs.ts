import type { PrintRequest } from "../types/printRequest/printRequest.types";
import type { PrintRequestStatus } from "../types/printRequest/printRequest.enums";
import type { PrintRequestAllocationTotals } from "./showAllocationTotals";
import type { PrintRequestItemSummary } from "./printRequestItemSummaries";
import { derivePrintRequestListTab, type PrintRequestListTab } from "./printRequestListGrouping";

/**
 * Portal customer list tabs match Studio customer lifecycle tabs, including Editing.
 * Continuable semantics (ADR-FP-071) still use `draft` | `editing` status — not tab labels.
 */
export type PortalPrintRequestListTab = PrintRequestListTab;

export const PORTAL_PRINT_REQUEST_LIST_TABS = [
  "working",
  "editing",
  "queued",
  "printing",
  "printed",
] as const satisfies readonly PortalPrintRequestListTab[];

/**
 * Portal `/requests` tab strip presentation:
 * - Hide Editing when empty
 * - When any Editing PR exists, show Editing first (before Working)
 * Membership still derives to the Editing tab (ADR-FP-158).
 */
export function getVisiblePortalPrintRequestListTabs(
  editingCount: number,
): PortalPrintRequestListTab[] {
  if (editingCount > 0) {
    return ["editing", "working", "queued", "printing", "printed"];
  }
  return ["working", "queued", "printing", "printed"];
}

export const PORTAL_PRINT_REQUEST_LIST_TAB_PARAM = "tab";

/** Requests the customer can still edit in the portal (not yet locked for production). */
export function isPortalContinuablePrintRequestStatus(status: PrintRequestStatus): boolean {
  return status === "draft" || status === "editing";
}

/**
 * Identity map from shared lifecycle derive → Portal list tab.
 * Kept as a named helper so Studio/Portal presentation stays explicit and testable.
 */
export function toPortalPrintRequestListTab(tab: PrintRequestListTab): PortalPrintRequestListTab {
  return tab;
}

export function parsePortalPrintRequestListTab(
  value: string | null | undefined,
): PortalPrintRequestListTab {
  if (
    value === "queued" ||
    value === "printing" ||
    value === "printed" ||
    value === "working" ||
    value === "editing"
  ) {
    return value;
  }

  return "working";
}

export function getPortalPrintRequestListTabLabel(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case "working":
      return "Working";
    case "editing":
      return "Editing";
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
    editing: [],
    queued: [],
    printing: [],
    printed: [],
  };

  for (const request of input.requests) {
    if (request.closureKind === "converted_to_internal") {
      grouped.printed.push(request);
      continue;
    }

    const summary = input.summariesByRequestId[request.id] ?? { totalQuantity: 0, uniqueDesignCount: 0 };
    const allocationTotals = input.allocationTotalsByRequestId[request.id] ?? {
      totalAllocatedQuantity: 0,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    };
    const studioTab = derivePrintRequestListTab({
      totalRequestedQuantity: summary.totalQuantity,
      totalAllocatedQuantity: allocationTotals.totalAllocatedQuantity,
      totalInProgressQuantity: allocationTotals.totalInProgressQuantity,
      totalPrintedQuantity: allocationTotals.totalPrintedQuantity,
      status: request.status,
    });

    grouped[toPortalPrintRequestListTab(studioTab)].push(request);
  }

  return grouped;
}
