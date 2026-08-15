import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { recomputeAndPersistQueueTab } from "./lib/printRequestQueueTab";

/**
 * Keeps `printRequests/{id}.queueTab` (Working/Queued/Printing/Printed) in sync so the Studio
 * Print Requests list can filter and `getCountFromServer` exactly, with zero full-collection
 * scan (Wave C hydration remediation, 2026-07-25). Fires on both source collections whose fields
 * feed `derivePrintRequestListTab`: item quantity (create/update/delete) and allocation
 * quantity/status (create/update/delete, including the queued -> printing -> printed lifecycle
 * and removal). Each invocation queries only the ONE affected request's own items and
 * allocations — never a corpus scan, never another request's data.
 */

function extractPrintRequestId(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined,
): string | null {
  const candidate = after?.printRequestId ?? before?.printRequestId;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

export const onPrintRequestItemQueueTabInputWritten = onDocumentWritten(
  "printRequestItems/{itemId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const printRequestId = extractPrintRequestId(before, after);
    if (!printRequestId) {
      return;
    }

    // Operational-only skip: a write that does not change `quantity` cannot change the
    // derived tab, so recomputing would be a guaranteed no-op read for nothing.
    if (before && after && before.quantity === after.quantity) {
      return;
    }

    await recomputeAndPersistQueueTab(printRequestId);
  },
);

export const onShowAllocationQueueTabInputWritten = onDocumentWritten(
  "showAllocations/{allocationId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const printRequestId = extractPrintRequestId(before, after);
    if (!printRequestId) {
      return;
    }

    // Operational-only skip: only allocatedQuantity/status affect the derived tab.
    if (
      before &&
      after &&
      before.allocatedQuantity === after.allocatedQuantity &&
      before.status === after.status
    ) {
      return;
    }

    await recomputeAndPersistQueueTab(printRequestId);
  },
);
