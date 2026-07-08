import type { Timestamp } from 'firebase/firestore';

export function mapFirestoreTimestamp(value: unknown): Timestamp | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  ) {
    return value as Timestamp;
  }

  return undefined;
}

/**
 * Resolves audit timestamps from a Firestore snapshot.
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
