export type PrintRequestListTab = "working" | "editing" | "queued" | "printing" | "printed";

export interface PrintRequestListGroupingInput {
  /** Sum of all `printRequestItems.quantity` for the request. */
  totalRequestedQuantity: number;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for the request. */
  totalAllocatedQuantity: number;
  /** Sum of `allocatedQuantity` across allocations with status `in_progress`. */
  totalInProgressQuantity: number;
  /** Sum of `allocatedQuantity` across allocations with status `printed` or `done`. */
  totalPrintedQuantity: number;
  /** The request's persisted high-level lifecycle status. */
  status: "draft" | "active" | "editing" | "completed" | "archived";
}

/**
 * Derives which Studio list tab a Print Request belongs in. Allocation-driven tabs win first;
 * persisted `status === "editing"` (de-queued for revision) maps to Editing when no active
 * allocations remain; never-queued drafts and other zero-allocation carts stay Working.
 * Portal list tabs use the same derive output (including Editing). Continuable
 * create/edit guards still key off `draft` | `editing` status (ADR-FP-071).
 */
export function derivePrintRequestListTab(input: PrintRequestListGroupingInput): PrintRequestListTab {
  if (input.status === "completed") {
    return "printed";
  }

  if (input.totalRequestedQuantity > 0 && input.totalPrintedQuantity >= input.totalRequestedQuantity) {
    return "printed";
  }

  if (input.totalInProgressQuantity > 0) {
    return "printing";
  }

  if (input.totalAllocatedQuantity > 0) {
    return "queued";
  }

  if (input.status === "editing") {
    return "editing";
  }

  return "working";
}
