import { Timestamp } from "firebase/firestore";

/**
 * Builds a merged Firestore document for mapDesignDocument after a successful write.
 * Avoids false failures when immediate getDoc returns unresolved serverTimestamp fields.
 */
export function mergeDesignDocumentDataAfterWrite(
  existingData: Record<string, unknown>,
  fieldUpdates: Record<string, unknown>,
  callerId: string,
): Record<string, unknown> {
  const now = Timestamp.now();

  const merged: Record<string, unknown> = {
    ...existingData,
    ...fieldUpdates,
    updatedBy: callerId,
    updatedAt: now,
  };

  if ("aiReviewedAt" in fieldUpdates) {
    merged.aiReviewedAt = now;
  }

  if (!merged.createdAt) {
    merged.createdAt = now;
  }

  if (typeof merged.createdBy !== "string" && typeof merged.uploadedBy === "string") {
    merged.createdBy = merged.uploadedBy;
  }

  return merged;
}
