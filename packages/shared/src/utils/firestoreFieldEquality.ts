/**
 * Semantic equality for Firestore field values used in preservation diagnostics.
 * Timestamp instances must compare by seconds/nanoseconds, not object identity.
 */

export interface FirestoreTimestampLike {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
  toDate?: () => Date;
}

function readTimestampParts(value: FirestoreTimestampLike): { seconds: number; nanoseconds: number } | null {
  const seconds =
    typeof value.seconds === "number"
      ? value.seconds
      : typeof value._seconds === "number"
        ? value._seconds
        : null;
  const nanoseconds =
    typeof value.nanoseconds === "number"
      ? value.nanoseconds
      : typeof value._nanoseconds === "number"
        ? value._nanoseconds
        : null;
  if (seconds === null || nanoseconds === null) {
    return null;
  }
  return { seconds, nanoseconds };
}

function isTimestampLike(value: unknown): value is FirestoreTimestampLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  return readTimestampParts(value as FirestoreTimestampLike) !== null;
}

export function firestoreFieldValuesEqual(before: unknown, after: unknown): boolean {
  if (before === after) {
    return true;
  }

  if (before == null && after == null) {
    return true;
  }

  if (before == null || after == null) {
    return false;
  }

  if (isTimestampLike(before) && isTimestampLike(after)) {
    const b = readTimestampParts(before)!;
    const a = readTimestampParts(after)!;
    return b.seconds === a.seconds && b.nanoseconds === a.nanoseconds;
  }

  if (typeof before === "string" && typeof after === "string") {
    return before === after;
  }

  if (typeof before === "boolean" && typeof after === "boolean") {
    return before === after;
  }

  if (typeof before === "number" && typeof after === "number") {
    return before === after;
  }

  return false;
}

export function readyApprovalAuditUnchanged(input: {
  beforeAiReviewedBy?: unknown;
  afterAiReviewedBy?: unknown;
  beforeAiReviewedAt?: unknown;
  afterAiReviewedAt?: unknown;
  beforeReadyAt?: unknown;
  afterReadyAt?: unknown;
}): boolean {
  return (
    firestoreFieldValuesEqual(input.beforeAiReviewedBy, input.afterAiReviewedBy) &&
    firestoreFieldValuesEqual(input.beforeAiReviewedAt, input.afterAiReviewedAt) &&
    firestoreFieldValuesEqual(input.beforeReadyAt, input.afterReadyAt)
  );
}
