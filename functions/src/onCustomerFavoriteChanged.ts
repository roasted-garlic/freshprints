import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";

import { nextFavoriteCountAfterDelta } from "../../packages/shared/src/utils/designFavoriteCount";

import { adminDb } from "./lib/admin";

async function applyFavoriteCountDelta(designId: string, delta: 1 | -1): Promise<void> {
  const trimmedId = designId.trim();
  if (!trimmedId) {
    return;
  }

  const designRef = adminDb.collection("designs").doc(trimmedId);

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(designRef);
    if (!snapshot.exists) {
      return;
    }

    const current = snapshot.data()?.favoriteCount;
    const nextCount = nextFavoriteCountAfterDelta(
      typeof current === "number" ? current : undefined,
      delta,
    );

    transaction.update(designRef, {
      favoriteCount: nextCount,
    });
  });
}

/**
 * Keeps designs.favoriteCount in sync for Portal Most Liked discovery.
 * Path: customers/{customerId}/favorites/{designId}
 */
export const onCustomerFavoriteCreated = onDocumentCreated(
  "customers/{customerId}/favorites/{designId}",
  async (event) => {
    const designId = event.params.designId;
    if (typeof designId !== "string") {
      return;
    }

    await applyFavoriteCountDelta(designId, 1);
  },
);

export const onCustomerFavoriteDeleted = onDocumentDeleted(
  "customers/{customerId}/favorites/{designId}",
  async (event) => {
    const designId = event.params.designId;
    if (typeof designId !== "string") {
      return;
    }

    await applyFavoriteCountDelta(designId, -1);
  },
);
