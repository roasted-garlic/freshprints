import { FieldValue } from "firebase-admin/firestore";

import { computePrintRequestQueueTab } from "../../../packages/shared/src/utils/printRequestQueueTabRecompute";

import { adminDb } from "./admin";

/**
 * Recomputes and persists `printRequests/{id}.queueTab` from that request's items + allocations.
 * Used by Firestore triggers and by an explicit Studio callable after allocate (so Working→Queued
 * does not depend solely on trigger delivery lag).
 */
export async function recomputeAndPersistQueueTab(printRequestId: string): Promise<string | null> {
  const requestRef = adminDb.collection("printRequests").doc(printRequestId);
  const [requestSnapshot, itemsSnapshot, allocationsSnapshot] = await Promise.all([
    requestRef.get(),
    adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId).get(),
    adminDb.collection("showAllocations").where("printRequestId", "==", printRequestId).get(),
  ]);

  if (!requestSnapshot.exists) {
    return null;
  }

  const requestData = requestSnapshot.data() ?? {};
  const status = typeof requestData.status === "string" ? requestData.status : "draft";

  const nextQueueTab = computePrintRequestQueueTab({
    status: status as "draft" | "active" | "editing" | "completed" | "archived",
    items: itemsSnapshot.docs.map((doc) => ({
      quantity: typeof doc.data().quantity === "number" ? doc.data().quantity : 0,
    })),
    allocations: allocationsSnapshot.docs.map((doc) => ({
      allocatedQuantity:
        typeof doc.data().allocatedQuantity === "number" ? doc.data().allocatedQuantity : 0,
      status: typeof doc.data().status === "string" ? doc.data().status : "canceled",
    })),
  });

  if (nextQueueTab === null) {
    if (requestData.queueTab !== undefined) {
      await requestRef.update({
        queueTab: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return null;
  }

  if (requestData.queueTab === nextQueueTab) {
    return nextQueueTab;
  }

  await requestRef.update({
    queueTab: nextQueueTab,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return nextQueueTab;
}
