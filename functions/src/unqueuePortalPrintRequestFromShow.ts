import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
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

async function healStuckActivePortalRequest(input: {
  requestRef: DocumentReference;
  printRequestId: string;
  customerId: string;
  requestStatus: string;
  hasOtherContinuable: boolean;
  upcomingShowId: string;
}): Promise<UnqueuePortalPrintRequestFromShowResponse | null> {
  if (input.requestStatus !== "active" || input.hasOtherContinuable) {
    return null;
  }

  const allAllocationsSnap = await adminDb
    .collection("showAllocations")
    .where("printRequestId", "==", input.printRequestId)
    .get();
  const hasActiveGlobally = allAllocationsSnap.docs.some(
    (doc) => doc.data().status !== "canceled",
  );
  if (hasActiveGlobally) {
    return null;
  }

  await input.requestRef.update({
    status: "editing",
    updatedBy: input.customerId,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await recomputeAndPersistQueueTab(input.printRequestId);

  return {
    printRequestId: input.printRequestId,
    upcomingShowId: input.upcomingShowId,
    canceledAllocationIds: [],
    releasedQuantity: 0,
    requestStatus: "editing",
  };
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
      const requestSnap = await requestRef.get();

      if (!requestSnap.exists) {
        throw invalidArgument("Print request not found.");
      }

      const requestData = requestSnap.data() ?? {};
      const requestCustomerId =
        typeof requestData.customerId === "string" ? requestData.customerId : "";
      if (requestCustomerId !== customer.customerId) {
        throw permissionDenied("You can only change your own print requests.");
      }

      const requestStatus =
        typeof requestData.status === "string" ? requestData.status : "draft";
      const hasOtherContinuable = await customerHasOtherPortalEditableContinuableRequest(
        customer.customerId,
        payload.printRequestId,
      );

      // Heal path: stuck `active` with no allocations (e.g. prior unqueue canceled allocations
      // but missed the status flip). upcomingShowId is optional here.
      if (!payload.upcomingShowId) {
        const healed = await healStuckActivePortalRequest({
          requestRef,
          printRequestId: payload.printRequestId,
          customerId: customer.customerId,
          requestStatus,
          hasOtherContinuable,
          upcomingShowId: "",
        });
        if (healed) {
          return healed;
        }
        if (hasOtherContinuable) {
          unqueueFailedPrecondition(
            PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES.CONTINUABLE_REQUEST_CONFLICT,
            PORTAL_UNQUEUE_CONTINUABLE_REQUEST_CONFLICT_MESSAGE,
          );
        }
        throw invalidArgument("Show id is required.");
      }

      const showRef = adminDb.collection("upcomingShows").doc(payload.upcomingShowId);
      const showSnap = await showRef.get();

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
          upcomingShowId: payload.upcomingShowId!,
          status: (typeof data.status === "string" ? data.status : "canceled") as ShowAllocationStatus,
          allocatedQuantity:
            typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
        };
      });

      const eligibility = evaluatePortalPrintRequestUnqueue({
        request: {
          id: payload.printRequestId,
          status: requestStatus,
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
        if (eligibility.reason === "not_queued_on_show") {
          const healed = await healStuckActivePortalRequest({
            requestRef,
            printRequestId: payload.printRequestId,
            customerId: customer.customerId,
            requestStatus,
            hasOtherContinuable,
            upcomingShowId: payload.upcomingShowId,
          });
          if (healed) {
            return healed;
          }
        }

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

      await adminDb.runTransaction(async (transaction) => {
        const allocationsOnShowQuery = adminDb
          .collection("showAllocations")
          .where("printRequestId", "==", payload.printRequestId)
          .where("upcomingShowId", "==", payload.upcomingShowId);
        const allRequestAllocationsQuery = adminDb
          .collection("showAllocations")
          .where("printRequestId", "==", payload.printRequestId);
        const showAllocationsForQuantityQuery = adminDb
          .collection("showAllocations")
          .where("upcomingShowId", "==", payload.upcomingShowId);

        const [freshAllocationsSnap, allRequestAllocationsSnap, showAllocationsForQuantitySnap] =
          await Promise.all([
            transaction.get(allocationsOnShowQuery),
            transaction.get(allRequestAllocationsQuery),
            transaction.get(showAllocationsForQuantityQuery),
          ]);

        const canceledThisTx = new Set<string>();
        for (const allocationDoc of freshAllocationsSnap.docs) {
          const status = allocationDoc.data().status;
          if (status !== "pending" && status !== "queued") {
            continue;
          }
          canceledThisTx.add(allocationDoc.id);
          transaction.update(allocationDoc.ref, {
            status: "canceled",
            canceledAt: FieldValue.serverTimestamp(),
            canceledBy: customer.customerId,
            updatedBy: customer.customerId,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        const hasActiveGlobally = allRequestAllocationsSnap.docs.some((doc) => {
          if (canceledThisTx.has(doc.id)) {
            return false;
          }
          return doc.data().status !== "canceled";
        });

        const snapshots = showAllocationsForQuantitySnap.docs.map((doc) => {
          const data = doc.data();
          const status = canceledThisTx.has(doc.id)
            ? "canceled"
            : typeof data.status === "string"
              ? data.status
              : "canceled";
          return {
            id: doc.id,
            status,
            allocatedQuantity:
              typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
            upcomingShowId: payload.upcomingShowId!,
            printRequestId:
              typeof data.printRequestId === "string" ? data.printRequestId : undefined,
          };
        });

        const freshAllocated = computeShowAllocatedQuantityFromAllocations(
          snapshots,
          payload.upcomingShowId!,
        );

        transaction.update(showRef, {
          allocatedQuantity: freshAllocated,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const requestPatch: Record<string, unknown> = {
          updatedBy: customer.customerId,
          updatedAt: FieldValue.serverTimestamp(),
        };

        // ADR-FP-071 already blocked before this transaction when another continuable exists.
        // When this release leaves zero active allocations, restore Portal editability.
        if (!hasActiveGlobally && !hasOtherContinuable) {
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
