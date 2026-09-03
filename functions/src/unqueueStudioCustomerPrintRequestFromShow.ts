import { FieldValue, type QuerySnapshot } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { canRemoveRequestFromShow } from "../../packages/shared/src/utils/showQueueEditability";
import { computeShowAllocatedQuantityFromAllocations } from "../../packages/shared/src/utils/showProductionRecovery";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { recomputeAndPersistQueueTab } from "./lib/printRequestQueueTab";
import {
  applyParkOrCleanupOtherContinuablesInTransaction,
  mapToContinuableParkingDocs,
} from "./lib/portalContinuableParking";

export interface UnqueueStudioCustomerPrintRequestFromShowRequest {
  printRequestId: string;
  upcomingShowId: string;
}

export interface UnqueueStudioCustomerPrintRequestFromShowResponse {
  printRequestId: string;
  upcomingShowId: string;
  requestStatus: "editing" | "active";
  parkedDraftId: string | null;
  canceledAllocationIds: string[];
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to remove this request from the show right now.");
}

/**
 * Staff trusted TX: remove a customer Print Request from a show and, when it has no remaining
 * active allocations, transition to editing while parking/cleaning the customer's Continuable draft.
 */
export const unqueueStudioCustomerPrintRequestFromShow = onCall(
  async (request): Promise<UnqueueStudioCustomerPrintRequestFromShowResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);

      const printRequestId =
        typeof request.data?.printRequestId === "string" ? request.data.printRequestId.trim() : "";
      const upcomingShowId =
        typeof request.data?.upcomingShowId === "string" ? request.data.upcomingShowId.trim() : "";
      if (!printRequestId || !upcomingShowId) {
        throw invalidArgument("printRequestId and upcomingShowId are required.");
      }

      const requestRef = adminDb.collection("printRequests").doc(printRequestId);
      const showRef = adminDb.collection("upcomingShows").doc(upcomingShowId);

      const result = await adminDb.runTransaction(async (transaction) => {
        const allocationsOnShowQuery = adminDb
          .collection("showAllocations")
          .where("printRequestId", "==", printRequestId)
          .where("upcomingShowId", "==", upcomingShowId);
        const allRequestAllocationsQuery = adminDb
          .collection("showAllocations")
          .where("printRequestId", "==", printRequestId);
        const showAllocationsForQuantityQuery = adminDb
          .collection("showAllocations")
          .where("upcomingShowId", "==", upcomingShowId);

        const [
          freshRequestSnap,
          freshShowSnap,
          allocationsSnap,
          allAllocationsSnap,
          showAllocationsSnap,
        ] = await Promise.all([
          transaction.get(requestRef),
          transaction.get(showRef),
          transaction.get(allocationsOnShowQuery),
          transaction.get(allRequestAllocationsQuery),
          transaction.get(showAllocationsForQuantityQuery),
        ]);

        if (!freshRequestSnap.exists) {
          throw invalidArgument("Print request not found.");
        }
        if (!freshShowSnap.exists) {
          throw invalidArgument("Show not found.");
        }

        const requestData = freshRequestSnap.data() ?? {};
        const customerId = typeof requestData.customerId === "string" ? requestData.customerId : "";
        const isInternal = requestData.isInternal === true;
        const showData = freshShowSnap.data() ?? {};
        const productionStatus = (
          typeof showData.productionStatus === "string" ? showData.productionStatus : "open"
        ) as ShowProductionStatus;

        if (!canRemoveRequestFromShow(productionStatus)) {
          throw failedPrecondition(
            "This show has already started printing. Removing allocations requires an admin correction.",
          );
        }

        // Read Continuables before any writes (Firestore TX rule).
        let continuablesSnap: QuerySnapshot | null = null;
        if (!isInternal && customerId) {
          const continuablesQuery = adminDb
            .collection("printRequests")
            .where("customerId", "==", customerId)
            .where("status", "in", ["draft", "editing"])
            .limit(4);
          continuablesSnap = await transaction.get(continuablesQuery);
        }

        const deletedAllocationIds: string[] = [];
        for (const allocationDoc of allocationsSnap.docs) {
          if (allocationDoc.data().status === "canceled") {
            continue;
          }
          transaction.delete(allocationDoc.ref);
          deletedAllocationIds.push(allocationDoc.id);
        }

        const hasActiveGlobally = allAllocationsSnap.docs.some((doc) => {
          if (deletedAllocationIds.includes(doc.id)) {
            return false;
          }
          return doc.data().status !== "canceled";
        });

        const remainingShowAllocations = showAllocationsSnap.docs
          .filter((doc) => !deletedAllocationIds.includes(doc.id))
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              status: typeof data.status === "string" ? data.status : "canceled",
              allocatedQuantity:
                typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
              upcomingShowId,
              printRequestId:
                typeof data.printRequestId === "string" ? data.printRequestId : undefined,
            };
          });

        transaction.update(showRef, {
          allocatedQuantity: computeShowAllocatedQuantityFromAllocations(
            remainingShowAllocations,
            upcomingShowId,
          ),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: caller.id,
        });

        let parkedDraftId: string | null = null;

        if (!hasActiveGlobally) {
          const requestPatch: Record<string, unknown> = {
            status: "editing",
            updatedBy: caller.id,
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (!isInternal && customerId && continuablesSnap) {
            const parkResult = applyParkOrCleanupOtherContinuablesInTransaction(transaction, {
              customerId,
              editingRequestRef: requestRef,
              editingPrintRequestId: printRequestId,
              actorId: caller.id,
              otherContinuableDocs: mapToContinuableParkingDocs(continuablesSnap.docs),
            });
            if (parkResult.parkedDraftId) {
              requestPatch.parksDraftPrintRequestId = parkResult.parkedDraftId;
              parkedDraftId = parkResult.parkedDraftId;
            }
          }

          transaction.update(requestRef, requestPatch);
        }

        return {
          printRequestId,
          upcomingShowId,
          requestStatus: hasActiveGlobally ? ("active" as const) : ("editing" as const),
          parkedDraftId,
          canceledAllocationIds: deletedAllocationIds,
        };
      });

      await recomputeAndPersistQueueTab(printRequestId);
      return result;
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
