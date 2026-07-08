import type { Timestamp } from "firebase/firestore";

import type { PrintRequestOrigin } from "../printRequest/printRequest.types";
import type { ShowAllocationStatus } from "./showAllocation.enums";

/**
 * Allocates some or all of a Print Request item's quantity to a show/print run. A single
 * `printRequestItemId` may have multiple allocation records across different shows when a
 * request is split to fit capacity — never mutates the source `printRequestItems`,
 * `printRequests`, or `designs` documents.
 */
export interface ShowAllocation {
  id: string;
  upcomingShowId: string;
  printRequestId: string;
  printRequestItemId: string;
  designId: string;
  customerId?: string;
  requestNameSnapshot: string;
  requestOriginSnapshot?: PrintRequestOrigin;
  designTitleSnapshot?: string;
  /** Quantity allocated to this show from the source item — may be less than the full item quantity when split. */
  allocatedQuantity: number;
  /** Full source item quantity at allocation time, for display/reconciliation only. */
  sourceItemQuantitySnapshot: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  notes?: string;
  status: ShowAllocationStatus;
  addedBy: string;
  updatedBy: string;
  queuedAt?: Timestamp;
  queuedBy?: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  completedBy?: string;
  canceledAt?: Timestamp;
  canceledBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
