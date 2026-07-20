import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { clampItemQuantityToWorkingRequestMax } from "../../packages/shared/src/utils/printRequestWorkingRequestMax";
import { sumPrintRequestItemQuantities } from "../../packages/shared/src/utils/portalShowQueueCapacity";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { loadPrintRequestLimitSettings } from "./lib/loadPrintRequestLimitSettings";
import { requirePortalCustomer } from "./lib/portalCustomer";

export interface UpdatePortalPrintRequestItemQuantityRequest {
  printRequestId: string;
  itemId: string;
  quantity: number;
}

export interface UpdatePortalPrintRequestItemQuantityResponse {
  itemId: string;
  printRequestId: string;
  quantity: number;
  charged: number;
  refunded: number;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to update print quantity right now.");
}

/**
 * Portal quantity change clamped to working request max (`L` = maxQuantityPerShowPerCustomer).
 */
export const updatePortalPrintRequestItemQuantity = onCall(
  async (request): Promise<UpdatePortalPrintRequestItemQuantityResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = request.data as UpdatePortalPrintRequestItemQuantityRequest;
      const printRequestId =
        typeof data?.printRequestId === "string" ? data.printRequestId.trim() : "";
      const itemId = typeof data?.itemId === "string" ? data.itemId.trim() : "";
      const nextQuantity = Math.floor(Number(data?.quantity));

      if (!printRequestId || !itemId) {
        throw invalidArgument("printRequestId and itemId are required.");
      }
      if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
        throw invalidArgument("Quantity must be at least 1.");
      }

      const customerUid = request.auth.uid;
      const settings = await loadPrintRequestLimitSettings();
      const maxPerRequest = settings.maxQuantityPerShowPerCustomer;
      let quantity = nextQuantity;

      await adminDb.runTransaction(async (tx) => {
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const itemRef = adminDb.collection("printRequestItems").doc(itemId);
        const itemsQuery = adminDb
          .collection("printRequestItems")
          .where("printRequestId", "==", printRequestId);

        const [requestSnap, itemSnap, itemsSnap] = await Promise.all([
          tx.get(requestRef),
          tx.get(itemRef),
          tx.get(itemsQuery),
        ]);

        if (!requestSnap.exists) {
          throw invalidArgument("Print request not found.");
        }
        if (!itemSnap.exists) {
          throw invalidArgument("Print request item not found.");
        }

        const requestData = requestSnap.data() ?? {};
        const itemData = itemSnap.data() ?? {};

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
        if (itemData.printRequestId !== printRequestId) {
          throw invalidArgument("Item does not belong to this print request.");
        }

        const currentQuantity = Math.floor(Number(itemData.quantity ?? 0));
        if (!Number.isFinite(currentQuantity) || currentQuantity < 1) {
          throw failedPrecondition("This item has an invalid quantity.");
        }

        quantity = nextQuantity;
        if (nextQuantity === currentQuantity) {
          return;
        }

        const otherPrintCount = sumPrintRequestItemQuantities(
          itemsSnap.docs
            .filter((docSnap) => docSnap.id !== itemId)
            .map((docSnap) => {
              const qty = Number(docSnap.data()?.quantity ?? 1);
              return {
                quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
              };
            }),
        );

        quantity = clampItemQuantityToWorkingRequestMax({
          requestedQuantity: nextQuantity,
          currentQuantity,
          otherItemsPrintCount: otherPrintCount,
          maxPerRequest,
        });

        if (quantity === currentQuantity) {
          return;
        }

        const now = FieldValue.serverTimestamp();
        tx.update(itemRef, {
          quantity,
          updatedAt: now,
        });
        tx.update(requestRef, {
          updatedAt: now,
          updatedBy: customerUid,
        });
      });

      return {
        itemId,
        printRequestId,
        quantity,
        charged: 0,
        refunded: 0,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
