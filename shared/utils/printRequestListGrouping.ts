export type PrintRequestListTab = "working" | "queued" | "printed";

export interface PrintRequestListGroupingInput {
  /** Sum of all `printRequestItems.quantity` for the request. */
  totalRequestedQuantity: number;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for the request. */
  totalAllocatedQuantity: number;
  /** Sum of `allocatedQuantity` across allocations with status `printed` or `done`. */
  totalPrintedQuantity: number;
  /** The request's persisted high-level lifecycle status. */
  status: "draft" | "active" | "editing" | "completed" | "archived";
}

/**
 * Derives which list tab (Working / Queued / Printed) a Print Request belongs in, from its show
 * allocations rather than a persisted queue-status field. A request with no active allocations
 * is Working regardless of its persisted status label; a fully printed/completed request is
 * Printed even if `status` was never transitioned, so the tab never contradicts the allocation
 * data on screen.
 */
export function derivePrintRequestListTab(input: PrintRequestListGroupingInput): PrintRequestListTab {
  if (input.status === "completed") {
    return "printed";
  }

  if (input.totalRequestedQuantity > 0 && input.totalPrintedQuantity >= input.totalRequestedQuantity) {
    return "printed";
  }

  if (input.totalAllocatedQuantity > 0) {
    return "queued";
  }

  return "working";
}
