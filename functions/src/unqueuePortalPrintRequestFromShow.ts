import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  PORTAL_UNQUEUE_CONTINUABLE_REQUEST_CONFLICT_MESSAGE,
  PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES,
} from "../../packages/shared/src/constants/portal/portalUnqueuePrintRequestErrorCodes.constants";
import type {
  UnqueuePortalPrintRequestFromShowResponse,
} from "../../packages/shared/src/types/portal/unqueuePortalPrintRequestFromShow.types";
import type { ShowAllocationStatus } from "../../packages/shared/src/types/showAllocation/showAllocation.enums";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import { isPortalEditablePrintRequest } from "../../packages/shared/src/utils/portalPrintRequestEditability";
import { isPrintRequestOrigin } from "../../packages/shared/src/utils/printRequestOrigin";
import { evaluatePortalPrintRequestUnqueue } from "../../packages/shared/src/utils/portalPrintRequestUnqueue";
import { shouldTransitionActiveRequestToEditing } from "../../packages/shared/src/utils/showProductionRecovery";
import { computeShowAllocatedQuantityFromAllocations } from "../../packages/shared/src/utils/showProductionRecovery";

import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { recomputeAndPersistQueueTab } from "./lib/printRequestQueueTab";
import { validateUnqueuePortalPrintRequestFromShowRequest } from "./lib/unqueuePortalPrintRequestFromShowValidation";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to remove this request from the show right now.");
}

function unqueueFailedPrecondition(
  code: (typeof PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES)[keyof typeof PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES],
  message: string,
): never {
  throw failedPrecondition(message, { code });
}

async function customerHasOtherPortalEditableContinuableRequest(
  customerId: string,
  excludePrintRequestId: string,
): Promise<boolean> {
  const snap = await adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .where("status", "in", ["draft", "editing"])
    .limit(4)
    .get();

  return snap.docs.some(
    (doc) =>
      doc.id !== excludePrintRequestId &&
      isPortalEditablePrintRequest({
        status: typeof doc.data().status === "string" ? doc.data().status : "draft",
        requestOrigin:
          typeof doc.data().requestOrigin === "string" ? doc.data().requestOrigin : undefined,
        isInternal: doc.data().isInternal === true,
      }),
  );
}

export const unqueuePortalPrintRequestFromShow = onCall(
  async (request): Promise<UnqueuePortalPrintRequestFromShowResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const customer = await requirePortalCustomer(request.auth.uid);
      const payload = validateUnqueuePortalPrintRequestFromShowRequest(request.data);

      const requestRef = adminDb.collection("printRequests").doc(payload.printRequestId);
      const showRef = adminDb.collection("upcomingShows").doc(payload.upcomingShowId);

      const [requestSnap, showSnap] = await Promise.all([requestRef.get(), showRef.get()]);

      if (!requestSnap.exists) {
        throw invalidArgument("Print request not found.");
      }

      const requestData = requestSnap.data() ?? {};
      const requestCustomerId =
        typeof requestData.customerId === "string" ? requestData.customerId : "";
      if (requestCustomerId !== customer.customerId) {
        throw permissionDenied("You can only change your own print requests.");
      }

      if (!showSnap.exists) {
        throw invalidArgument("Show not found.");
      }

      const showData = showSnap.data() ?? {};
      const showProductionStatus = (typeof showData.productionStatus === "string"
        ? showData.productionStatus
        : "open") as ShowProductionStatus;

      const allocationsSnap = await adminDb
        .collection("showAllocations")
        .where("printRequestId", "==", payload.printRequestId)
        .where("upcomingShowId", "==", payload.upcomingShowId)
        .get();

      const allocationsOnShow = allocationsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          upcomingShowId: payload.upcomingShowId,
          status: (typeof data.status === "string" ? data.status : "canceled") as ShowAllocationStatus,
          allocatedQuantity:
            typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
        };
      });

      const hasOtherContinuable = await customerHasOtherPortalEditableContinuableRequest(
        customer.customerId,
        payload.printRequestId,
      );

      const eligibility = evaluatePortalPrintRequestUnqueue({
        request: {
          id: payload.printRequestId,
          status: typeof requestData.status === "string" ? requestData.status : "draft",
          requestOrigin: isPrintRequestOrigin(requestData.requestOrigin)
            ? requestData.requestOrigin
            : undefined,
          isInternal: requestData.isInternal === true,
          closureKind:
            requestData.closureKind === "converted_to_internal" ? "converted_to_internal" : undefined,
        },
        showProductionStatus,
        allocationsOnShow,
        hasOtherPortalEditableContinuableRequest: hasOtherContinuable,
      });

      if (!eligibility.eligible) {
        switch (eligibility.reason) {
          case "continuable_request_conflict":
            unqueueFailedPrecondition(
              PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.CONTINUABLE_REQUEST_CONFLICT,
              PORTAL_UNQUEUE_CONTINUABLE_REQUEST_CONFLICT_MESSAGE,
            );
            break;
          case "production_started":
            unqueueFailedPrecondition(
              PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.PRODUCTION_STARTED,
              "This request can no longer be removed because printing has already started.",
            );
            break;
          case "show_not_removable":
            unqueueFailedPrecondition(
              PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.SHOW_NOT_REMOVABLE,
              "This show can no longer accept request changes from the Portal.",
            );
            break;
          case "not_queued_on_show":
            unqueueFailedPrecondition(
              PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.NOT_QUEUED,
              "This request is not queued to the selected show.",
            );
            break;
          case "not_portal_customer":
          case "converted_to_internal":
            unqueueFailedPrecondition(
              PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.NOT_EDITABLE_ORIGIN,
              "This request cannot be edited from the Portal.",
            );
            break;
          case "request_closed":
            unqueueFailedPrecondition(
              PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.NOT_QUEUED,
              "This request is already closed.",
            );
            break;
          default:
            throw failedPrecondition("This request cannot be removed from the show right now.");
        }
      }

      const cancelableIds = new Set(eligibility.cancelableAllocationIds);

      await adminDb.runTransaction(async (transaction) => {
        const freshAllocationsSnap = await transaction.get(
          adminDb
            .collection("showAllocations")
            .where("printRequestId", "==", payload.printRequestId)
            .where("upcomingShowId", "==", payload.upcomingShowId),
        );

        for (const allocationDoc of freshAllocationsSnap.docs) {
          if (!cancelableIds.has(allocationDoc.id)) {
            continue;
          }
          const status = allocationDoc.data().status;
          if (status === "canceled") {
            continue;
          }
          transaction.update(allocationDoc.ref, {
            status: "canceled",
            canceledAt: FieldValue.serverTimestamp(),
            canceledBy: customer.customerId,
            updatedBy: customer.customerId,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        const allRequestAllocationsSnap = await transaction.get(
          adminDb
            .collection("showAllocations")
            .where("printRequestId", "==", payload.printRequestId),
        );

        const hasActiveGlobally = allRequestAllocationsSnap.docs.some((doc) => {
          if (cancelableIds.has(doc.id)) {
            return false;
          }
          return doc.data().status !== "canceled";
        });

        const showAllocationsForQuantitySnap = await transaction.get(
          adminDb
            .collection("showAllocations")
            .where("upcomingShowId", "==", payload.upcomingShowId),
        );

        const snapshots = showAllocationsForQuantitySnap.docs.map((doc) => {
          const data = doc.data();
          const status = cancelableIds.has(doc.id)
            ? "canceled"
            : typeof data.status === "string"
              ? data.status
              : "canceled";
          return {
            id: doc.id,
            status,
            allocatedQuantity:
              typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
            upcomingShowId: payload.upcomingShowId,
            printRequestId:
              typeof data.printRequestId === "string" ? data.printRequestId : undefined,
          };
        });

        const freshAllocated = computeShowAllocatedQuantityFromAllocations(
          snapshots,
          payload.upcomingShowId,
        );

        transaction.update(showRef, {
          allocatedQuantity: freshAllocated,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const requestStatus =
          typeof requestData.status === "string" ? requestData.status : "active";
        const requestPatch: Record<string, unknown> = {
          updatedBy: customer.customerId,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (
          shouldTransitionActiveRequestToEditing({
            requestStatus,
            hasActiveAllocationsGlobally: hasActiveGlobally,
            hasOtherContinuableRequest: hasOtherContinuable,
            isInternal: false,
          })
        ) {
          requestPatch.status = "editing";
        }

        transaction.update(requestRef, requestPatch);
      });

      await recomputeAndPersistQueueTab(payload.printRequestId);

      const updatedRequestSnap = await requestRef.get();
      const updatedStatus =
        typeof updatedRequestSnap.data()?.status === "string"
          ? updatedRequestSnap.data()!.status
          : "active";

      return {
        printRequestId: payload.printRequestId,
        upcomingShowId: payload.upcomingShowId,
        canceledAllocationIds: eligibility.cancelableAllocationIds,
        releasedQuantity: eligibility.releasedQuantity,
        requestStatus: updatedStatus === "editing" ? "editing" : "active",
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
