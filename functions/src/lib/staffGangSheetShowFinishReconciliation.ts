import { FieldValue, type Transaction } from "firebase-admin/firestore";

import { evaluatePrintRequestCompletionEligibility } from "../../../packages/shared/src/utils/printRequestCompletionEligibility";
import { isFinishableShowAllocationStatus } from "../../../packages/shared/src/utils/showFinishAllocationStatuses";

import { adminDb } from "./admin";
import { recomputeAndPersistQueueTab } from "./printRequestQueueTab";

const FINISHABLE_STATUSES = new Set(["pending", "queued", "in_progress"]);

function isFinishableStatus(status: unknown): boolean {
  return typeof status === "string" && FINISHABLE_STATUSES.has(status);
}

/**
 * Marks finishable allocations on a completed show/sheet as `done` inside an existing transaction.
 * Returns affected print request IDs for post-commit reconciliation.
 */
export async function finishShowAllocationsInTransaction(
  transaction: Transaction,
  input: {
    upcomingShowId: string;
    actorId: string;
  },
): Promise<string[]> {
  const allocationsQuery = adminDb
    .collection("showAllocations")
    .where("upcomingShowId", "==", input.upcomingShowId);
  const allocationsSnap = await transaction.get(allocationsQuery);

  const printRequestIds = new Set<string>();

  for (const allocationDoc of allocationsSnap.docs) {
    const data = allocationDoc.data();
    const status = typeof data.status === "string" ? data.status : "canceled";

    if (status === "canceled" || !isFinishableStatus(status)) {
      continue;
    }

    if (!isFinishableShowAllocationStatus(status as never)) {
      continue;
    }

    const printRequestId = typeof data.printRequestId === "string" ? data.printRequestId : "";
    if (printRequestId) {
      printRequestIds.add(printRequestId);
    }

    transaction.update(allocationDoc.ref, {
      status: "done",
      completedAt: FieldValue.serverTimestamp(),
      completedBy: input.actorId,
      updatedBy: input.actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return [...printRequestIds];
}

/**
 * After allocations are terminal, complete print requests that are fully printed across all shows.
 */
export async function reconcilePrintRequestsAfterShowFinish(
  printRequestIds: readonly string[],
  actorId: string,
): Promise<void> {
  const uniqueIds = [...new Set(printRequestIds.filter(Boolean))];

  for (const printRequestId of uniqueIds) {
    const requestRef = adminDb.collection("printRequests").doc(printRequestId);
    const [requestSnap, itemsSnap, allocationsSnap] = await Promise.all([
      requestRef.get(),
      adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId).get(),
      adminDb.collection("showAllocations").where("printRequestId", "==", printRequestId).get(),
    ]);

    if (!requestSnap.exists) {
      continue;
    }

    const requestData = requestSnap.data() ?? {};
    const eligibility = evaluatePrintRequestCompletionEligibility({
      requestStatus: typeof requestData.status === "string" ? requestData.status : "draft",
      items: itemsSnap.docs.map((doc) => ({
        quantity: typeof doc.data().quantity === "number" ? doc.data().quantity : 0,
      })),
      allocations: allocationsSnap.docs.map((doc) => ({
        status: typeof doc.data().status === "string" ? doc.data().status : "canceled",
        allocatedQuantity:
          typeof doc.data().allocatedQuantity === "number" ? doc.data().allocatedQuantity : 0,
      })),
    });

    if (eligibility === "eligible") {
      await requestRef.update({
        status: "completed",
        updatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await recomputeAndPersistQueueTab(printRequestId);
  }
}
