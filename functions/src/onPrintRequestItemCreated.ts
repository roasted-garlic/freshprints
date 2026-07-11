import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { adminDb } from "./lib/admin";

/**
 * Keeps design popularity metadata honest for Portal + Studio adds.
 * Single source of truth — Studio must not also client-increment these fields.
 */
export const onPrintRequestItemCreated = onDocumentCreated(
  "printRequestItems/{itemId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }

    const designId = typeof data.designId === "string" ? data.designId.trim() : "";
    if (!designId) {
      return;
    }

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
