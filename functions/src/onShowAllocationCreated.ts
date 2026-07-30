import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { shouldIncrementDesignRequestCount } from "../../packages/shared/src/utils/printRequestItemSource";

import { adminDb } from "./lib/admin";

/**
 * Recently Requested / show-add popularity: bump when a catalog design is allocated
 * to a show (Portal queue-to-show or Studio Add to Show). Working-cart item creates
 * do not write these fields — see onPrintRequestItemCreated for requestCount only.
 */
export const onShowAllocationCreated = onDocumentCreated(
  "showAllocations/{allocationId}",
  async (event) => {
    const data = event.data?.data();
    const allocationRef = event.data?.ref;
    if (!data || !allocationRef) {
      return;
    }

    if (data.status === "canceled") {
      return;
    }

    const upcomingShowId =
      typeof data.upcomingShowId === "string" ? data.upcomingShowId.trim() : "";
    if (!upcomingShowId) {
      return;
    }

    if (
      !shouldIncrementDesignRequestCount({
        sourceType: data.sourceType,
        designId: typeof data.designId === "string" ? data.designId : undefined,
        customerUploadId:
          typeof data.customerUploadId === "string" ? data.customerUploadId : undefined,
      })
    ) {
      return;
    }

    const designId = String(data.designId).trim();
    const designRef = adminDb.collection("designs").doc(designId);

    // Cheap redelivery guard mirroring onPrintRequestItemCreated: mark the small triggering
    // allocation document itself so a redelivered CloudEvent for the same allocation cannot
    // double-count `showAddCount` (Wave C comprehensive-audit amendment, 2026-07-24).
    await adminDb.runTransaction(async (transaction) => {
      const [designSnapshot, allocationSnapshot] = await Promise.all([
        transaction.get(designRef),
        transaction.get(allocationRef),
      ]);
      if (!designSnapshot.exists) {
        return;
      }
      if (allocationSnapshot.data()?.showAddCountApplied === true) {
        return;
      }
      transaction.update(designRef, {
        showAddCount: FieldValue.increment(1),
        lastAddedToShowAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(allocationRef, { showAddCountApplied: true });
    });
  },
);
