import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { shouldIncrementDesignRequestCount } from "../../packages/shared/src/utils/printRequestItemSource";

import { adminDb } from "./lib/admin";

/**
 * Keeps design popularity metadata honest for Portal + Studio adds.
 * Single source of truth — Studio must not also client-increment these fields.
 * Customer-upload items must not increment catalog requestCount.
 */
export const onPrintRequestItemCreated = onDocumentCreated(
  "printRequestItems/{itemId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) {
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
      requestCount: FieldValue.increment(1),
      lastRequestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);
