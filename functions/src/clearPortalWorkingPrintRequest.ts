import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { assertPortalActiveEditableRequestData } from "./lib/portalContinuableParking";

export interface ClearPortalWorkingPrintRequestRequest {
  printRequestId: string;
}

export interface ClearPortalWorkingPrintRequestResponse {
  printRequestId: string;
  /** Preserved open status — clear empties items; does not archive. */
  status: "draft" | "editing";
  removedItemCount: number;
  refundedPrints: number;
}

export function buildClearPortalWorkingPrintRequestAccounting(input: {
  allocationDocumentsReturned: number;
  durationMs: number;
  itemDocumentsReturned: number;
  outcome: "success" | "failure";
  parentWrites: number;
}) {
  const itemQueryBillableReads = Math.max(1, input.itemDocumentsReturned);
  const allocationQueryRan = input.itemDocumentsReturned > 0;
  const allocationBillableReads = allocationQueryRan
    ? Math.max(1, input.allocationDocumentsReturned)
    : 0;
  return {
    functionName: "clearPortalWorkingPrintRequest",
    eventClassification: input.itemDocumentsReturned === 0 ? "empty-no-op" : "clear-items",
    readOperations: 4 + (allocationQueryRan ? 1 : 0),
    documentsReturned:
      3 + input.itemDocumentsReturned + input.allocationDocumentsReturned,
    approximateBillableReads: 3 + itemQueryBillableReads + allocationBillableReads,
    writes: input.parentWrites,
    deletes: input.itemDocumentsReturned,
    transactionAttempts: 0,
    batchSize: input.parentWrites + input.itemDocumentsReturned,
    retryNumber: 0,
    duplicateSkip: input.itemDocumentsReturned === 0,
    durationMs: input.durationMs,
    outcome: input.outcome,
  };
}

function parseRequest(data: unknown): ClearPortalWorkingPrintRequestRequest {
  if (data == null || typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  const printRequestId =
    typeof (data as { printRequestId?: unknown }).printRequestId === "string"
      ? (data as { printRequestId: string }).printRequestId.trim()
      : "";
  if (!printRequestId) {
    throw invalidArgument("printRequestId is required.");
  }
  return { printRequestId };
}

/**
 * Empties the customer's working print request (deletes items, itemCount → 0)
 * while keeping it open as draft/editing so the next Add reuses the same id
 * (ADR-FP-071; clear ≠ archive — see ADR-FP-079 amend 2026-07-18).
 */
export const clearPortalWorkingPrintRequest = onCall(
  async (request): Promise<ClearPortalWorkingPrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const startedAtMs = Date.now();
    let itemDocumentsReturned = 0;
    let allocationDocumentsReturned = 0;
    let parentWrites = 0;
    const logAccounting = (outcome: "success" | "failure", failureCode?: string) => {
      if (process.env.GCLOUD_PROJECT !== "fresh-prints-dev") return;
      console.info("portal-clear-working-request-accounting", {
        ...buildClearPortalWorkingPrintRequestAccounting({
          allocationDocumentsReturned,
          durationMs: Date.now() - startedAtMs,
          itemDocumentsReturned,
          outcome,
          parentWrites,
        }),
        ...(failureCode ? { failureCode } : {}),
      });
    };

    try {
    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    const payload = parseRequest(request.data);
    const customerUid = request.auth.uid;
    const requestRef = adminDb.collection("printRequests").doc(payload.printRequestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      throw invalidArgument("Print request was not found.");
    }

    const data = requestSnap.data() ?? {};
    
    // Assert request is active editable (not parked)
    assertPortalActiveEditableRequestData(data, payload.printRequestId);
    
    if (data.customerId !== portalCustomer.customerId) {
      throw permissionDenied("You do not own this print request.");
    }

    const status = data.status;
    if (status !== "draft" && status !== "editing") {
      throw failedPrecondition("Only an open Current Request can be cleared.");
    }
    const preservedStatus: "draft" | "editing" = status;

    const itemsSnap = await adminDb
      .collection("printRequestItems")
      .where("printRequestId", "==", payload.printRequestId)
      .get();
    itemDocumentsReturned = itemsSnap.size;

    if (itemsSnap.empty) {
      logAccounting("success");
      return {
        printRequestId: payload.printRequestId,
        status: preservedStatus,
        removedItemCount: 0,
        refundedPrints: 0,
      };
    }

    const allocationsSnap = await adminDb
      .collection("showAllocations")
      .where("printRequestId", "==", payload.printRequestId)
      .limit(25)
      .get();
    allocationDocumentsReturned = allocationsSnap.size;

    const hasActiveAllocation = allocationsSnap.docs.some((docSnap) => {
      const allocationStatus = docSnap.data()?.status;
      return (
        allocationStatus === "pending" ||
        allocationStatus === "queued" ||
        allocationStatus === "in_progress"
      );
    });

    if (hasActiveAllocation) {
      throw failedPrecondition(
        "This request is already on a show. Remove it from the show queue before clearing.",
      );
    }

    let refundedPrints = 0;
    for (const itemDoc of itemsSnap.docs) {
      const qty = Math.floor(Number(itemDoc.data()?.quantity ?? 0));
      if (Number.isFinite(qty) && qty > 0) {
        refundedPrints += qty;
      }
    }

    let batch = adminDb.batch();
    let ops = 0;
    let removedItemCount = 0;

    const commitIfNeeded = async (force = false): Promise<void> => {
      if (ops === 0) {
        return;
      }
      if (!force && ops < 400) {
        return;
      }
      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    };

    for (const itemDoc of itemsSnap.docs) {
      batch.delete(itemDoc.ref);
      removedItemCount += 1;
      ops += 1;
      await commitIfNeeded();
    }

    batch.update(requestRef, {
      itemCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: customerUid,
    });
    ops += 1;
    parentWrites = 1;
    await commitIfNeeded(true);

    logAccounting("success");
    return {
      printRequestId: payload.printRequestId,
      status: preservedStatus,
      removedItemCount,
      refundedPrints,
    };
    } catch (error) {
      logAccounting("failure", "clear-failed");
      throw error;
    }
  },
);
