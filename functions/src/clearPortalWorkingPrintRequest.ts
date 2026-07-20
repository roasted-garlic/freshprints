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

    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    const payload = parseRequest(request.data);
    const customerUid = request.auth.uid;
    const requestRef = adminDb.collection("printRequests").doc(payload.printRequestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      throw invalidArgument("Print request was not found.");
    }

    const data = requestSnap.data() ?? {};
    if (data.customerId !== portalCustomer.customerId) {
      throw permissionDenied("You do not own this print request.");
    }

    const status = data.status;
    if (status !== "draft" && status !== "editing") {
      throw failedPrecondition("Only an open Current Request can be cleared.");
    }
    const preservedStatus: "draft" | "editing" = status;

    const allocationsSnap = await adminDb
      .collection("showAllocations")
      .where("printRequestId", "==", payload.printRequestId)
      .limit(25)
      .get();

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

    const itemsSnap = await adminDb
      .collection("printRequestItems")
      .where("printRequestId", "==", payload.printRequestId)
      .get();

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

    async function commitIfNeeded(force = false): Promise<void> {
      if (ops === 0) {
        return;
      }
      if (!force && ops < 400) {
        return;
      }
      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    }

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
    await commitIfNeeded(true);

    return {
      printRequestId: payload.printRequestId,
      status: preservedStatus,
      removedItemCount,
      refundedPrints,
    };
  },
);
