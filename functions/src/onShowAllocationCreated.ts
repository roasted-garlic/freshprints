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
    if (!data) {
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
    const designSnapshot = await designRef.get();
    if (!designSnapshot.exists) {
      return;
    }

    await designRef.update({
      showAddCount: FieldValue.increment(1),
      lastAddedToShowAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);
