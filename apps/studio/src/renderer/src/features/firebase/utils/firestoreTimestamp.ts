import { Timestamp } from "firebase/firestore";

/**
 * Returns true when value is a resolved Firestore Timestamp (not a serverTimestamp sentinel).
 */
export function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

/**
 * Maps a Firestore field to Timestamp when resolved; undefined for null, missing, or pending writes.
 */
export function mapFirestoreTimestamp(value: unknown): Timestamp | undefined {
  return isFirestoreTimestamp(value) ? value : undefined;
}

/**
 * Resolves required design audit timestamps from a snapshot.
 * Uses createdAt/updatedAt fallback when one is still pending after serverTimestamp writes.
 */
export function resolveDesignDocumentTimestamps(data: {
  createdAt?: unknown;
  updatedAt?: unknown;
}): { createdAt: Timestamp; updatedAt: Timestamp } | null {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  if (!createdAt && !updatedAt) {
    return null;
  }

  const resolvedCreatedAt = createdAt ?? updatedAt!;
  const resolvedUpdatedAt = updatedAt ?? createdAt!;

  return {
    createdAt: resolvedCreatedAt,
    updatedAt: resolvedUpdatedAt,
  };
}

/**
 * Maps ISO strings or Firestore Timestamps to an ISO string for nested AI metadata.
 */
export function mapFirestoreIsoString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const timestamp = mapFirestoreTimestamp(value);

  if (timestamp) {
    return timestamp.toDate().toISOString();
  }

  return undefined;
}
