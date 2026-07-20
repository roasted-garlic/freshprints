import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";

export interface RemovePortalPrintRequestItemRequest {
  printRequestId: string;
  itemId: string;
}

export interface RemovePortalPrintRequestItemResponse {
  itemId: string;
  printRequestId: string;
  refunded: number;
  removed: boolean;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to remove this print request item right now.");
}

/**
 * Portal item remove. Idempotent: missing item returns removed=false.
 */
export const removePortalPrintRequestItem = onCall(
  async (request): Promise<RemovePortalPrintRequestItemResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = request.data as RemovePortalPrintRequestItemRequest;
      const printRequestId =
        typeof data?.printRequestId === "string" ? data.printRequestId.trim() : "";
      const itemId = typeof data?.itemId === "string" ? data.itemId.trim() : "";

      if (!printRequestId || !itemId) {
        throw invalidArgument("printRequestId and itemId are required.");
      }

      const customerUid = request.auth.uid;
      let removed = false;

      await adminDb.runTransaction(async (tx) => {
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const itemRef = adminDb.collection("printRequestItems").doc(itemId);

        const [requestSnap, itemSnap] = await Promise.all([
          tx.get(requestRef),
          tx.get(itemRef),
        ]);

        if (!requestSnap.exists) {
          throw invalidArgument("Print request not found.");
        }

        const requestData = requestSnap.data() ?? {};
        if (requestData.customerId !== portalCustomer.customerId) {
          throw permissionDenied("You do not own this print request.");
        }
        if (requestData.requestOrigin !== "portal_customer" || requestData.isInternal === true) {
          throw failedPrecondition("This request cannot be edited from the portal.");
        }
        const status = requestData.status;
        if (status !== "draft" && status !== "editing") {
          throw failedPrecondition("This print request can no longer be edited.");
        }

        // Idempotent double-remove.
        if (!itemSnap.exists) {
          return;
        }

        const itemData = itemSnap.data() ?? {};
        if (itemData.printRequestId !== printRequestId) {
          throw invalidArgument("Item does not belong to this print request.");
        }

        const now = FieldValue.serverTimestamp();
        const currentItemCount = Number(requestData.itemCount ?? 0);
        tx.delete(itemRef);
        tx.update(requestRef, {
          itemCount: Math.max(0, currentItemCount - 1),
          updatedAt: now,
          updatedBy: customerUid,
        });
        removed = true;
      });

      return {
        itemId,
        printRequestId,
        refunded: 0,
        removed,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
