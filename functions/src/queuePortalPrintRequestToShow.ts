import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import type { QueuePortalPrintRequestToShowResponse } from "../../packages/shared/src/types/portal/queuePortalPrintRequestToShow.types";
import {
  canAllocatePrintRequestToShow,
  PAST_SHOW_READ_ONLY_MESSAGE,
} from "../../packages/shared/src/utils/showScheduleGrouping";
import {
  canFitPrintRequestOnShow,
  formatShowCapacityExceededMessage,
  sumPrintRequestItemQuantities,
} from "../../packages/shared/src/utils/portalShowQueueCapacity";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { validateQueuePortalPrintRequestToShowRequest } from "./lib/queuePortalPrintRequestToShowValidation";

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to queue print request right now.");
}

const EDITABLE_STATUSES = new Set(["draft", "editing"]);

export const queuePortalPrintRequestToShow = onCall(async (request): Promise<QueuePortalPrintRequestToShowResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  const userId = request.auth.uid;

  try {
    const customer = await requirePortalCustomer(userId);
    const payload = validateQueuePortalPrintRequestToShowRequest(request.data);
    const now = new Date();

    const [requestSnap, showSnap, itemsSnap, allocationsSnap] = await Promise.all([
      adminDb.collection("printRequests").doc(payload.printRequestId).get(),
      adminDb.collection("upcomingShows").doc(payload.upcomingShowId).get(),
      adminDb.collection("printRequestItems").where("printRequestId", "==", payload.printRequestId).get(),
      adminDb.collection("showAllocations").where("printRequestId", "==", payload.printRequestId).get(),
    ]);

    if (!requestSnap.exists) {
      throw invalidArgument("Print request not found.");
    }

    if (!showSnap.exists) {
      throw invalidArgument("Show not found.");
    }

    const requestData = requestSnap.data()!;

    if (requestData.customerId !== customer.customerId) {
      throw failedPrecondition("You can only queue your own print requests.");
    }

    if (requestData.requestOrigin !== "portal_customer" || requestData.isInternal === true) {
      throw failedPrecondition("This request cannot be queued from the portal.");
    }

    if (!EDITABLE_STATUSES.has(String(requestData.status))) {
      throw failedPrecondition("This request can no longer be queued to a show.");
    }

    const items = itemsSnap.docs.map((itemDoc) => {
      const data = itemDoc.data();

      if (typeof data.quantity !== "number" || data.quantity <= 0) {
        throw invalidArgument("Print request item data is incomplete.");
      }

      return {
        id: itemDoc.id,
        designId: typeof data.designId === "string" ? data.designId : "",
        quantity: data.quantity,
        printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : undefined,
        printHeightInches: typeof data.printHeightInches === "number" ? data.printHeightInches : undefined,
        sizeLabel: typeof data.sizeLabel === "string" ? data.sizeLabel : undefined,
      };
    });

    if (items.length === 0) {
      throw failedPrecondition("Add at least one design before queuing to a show.");
    }

    if (items.some((item) => !item.designId)) {
      throw invalidArgument("Print request item data is incomplete.");
    }

    const activeAllocations = allocationsSnap.docs.filter((doc) => doc.data().status !== "canceled");

    if (activeAllocations.length > 0) {
      throw failedPrecondition("This request is already queued. Contact staff to change shows.");
    }

    const showData = showSnap.data()!;

    if (showData.isArchived === true) {
      throw failedPrecondition("This show is no longer available.");
    }

    const scheduledStartAt = showData.scheduledStartAt as { toDate: () => Date } | undefined;

    if (!canAllocatePrintRequestToShow({ scheduledStartAt }, now)) {
      throw failedPrecondition(PAST_SHOW_READ_ONLY_MESSAGE);
    }

    const allocatedQuantity =
      typeof showData.allocatedQuantity === "number" && showData.allocatedQuantity >= 0
        ? showData.allocatedQuantity
        : 0;
    const maxTotalQuantity =
      typeof showData.maxTotalQuantity === "number" && showData.maxTotalQuantity >= 0
        ? showData.maxTotalQuantity
        : undefined;

    const totalQuantity = sumPrintRequestItemQuantities(items);

    if (
      !canFitPrintRequestOnShow({
        totalQuantity,
        maxTotalQuantity,
        allocatedQuantity,
      })
    ) {
      const remaining = maxTotalQuantity === undefined ? 0 : Math.max(0, maxTotalQuantity - allocatedQuantity);
      throw failedPrecondition(formatShowCapacityExceededMessage(totalQuantity, remaining));
    }

    const requestName = typeof requestData.name === "string" ? requestData.name : "Print request";
    const timestamp = FieldValue.serverTimestamp();
    const allocationIds: string[] = [];
    let allocatedTotal = 0;

    await adminDb.runTransaction(async (transaction) => {
      const freshShowSnap = await transaction.get(showSnap.ref);
      const freshRequestSnap = await transaction.get(requestSnap.ref);

      if (!freshShowSnap.exists || !freshRequestSnap.exists) {
        throw invalidArgument("Print request or show no longer exists.");
      }

      const freshShow = freshShowSnap.data()!;
      const freshRequest = freshRequestSnap.data()!;
      const freshAllocated =
        typeof freshShow.allocatedQuantity === "number" && freshShow.allocatedQuantity >= 0
          ? freshShow.allocatedQuantity
          : 0;
      const freshMax =
        typeof freshShow.maxTotalQuantity === "number" && freshShow.maxTotalQuantity >= 0
          ? freshShow.maxTotalQuantity
          : undefined;

      if (!EDITABLE_STATUSES.has(String(freshRequest.status))) {
        throw failedPrecondition("This request can no longer be queued to a show.");
      }

      if (
        !canFitPrintRequestOnShow({
          totalQuantity,
          maxTotalQuantity: freshMax,
          allocatedQuantity: freshAllocated,
        })
      ) {
        const remaining = freshMax === undefined ? 0 : Math.max(0, freshMax - freshAllocated);
        throw failedPrecondition(formatShowCapacityExceededMessage(totalQuantity, remaining));
      }

      for (const item of items) {
        const allocationRef = adminDb.collection("showAllocations").doc();
        allocationIds.push(allocationRef.id);
        allocatedTotal += item.quantity;

        transaction.set(allocationRef, {
          upcomingShowId: payload.upcomingShowId,
          printRequestId: payload.printRequestId,
          printRequestItemId: item.id,
          designId: item.designId,
          customerId: customer.customerId,
          requestNameSnapshot: requestName,
          requestOriginSnapshot: "portal_customer",
          allocatedQuantity: item.quantity,
          sourceItemQuantitySnapshot: item.quantity,
          printWidthInches: item.printWidthInches,
          printHeightInches: item.printHeightInches,
          sizeLabel: item.sizeLabel,
          status: "pending",
          addedBy: userId,
          updatedBy: userId,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      transaction.update(showSnap.ref, {
        allocatedQuantity: freshAllocated + allocatedTotal,
        updatedBy: userId,
        updatedAt: timestamp,
      });

      transaction.update(requestSnap.ref, {
        status: "active",
        updatedBy: userId,
        updatedAt: timestamp,
      });
    });

    return {
      printRequestId: payload.printRequestId,
      upcomingShowId: payload.upcomingShowId,
      allocationIds,
      totalAllocatedQuantity: allocatedTotal,
    };
  } catch (error) {
    mapHttpsError(error);
  }
});
