import { createHash } from "node:crypto";

/** Exact six flagship calibration design IDs — fail-closed allowlist (R4). */
export const FLAGSHIP_OBSERVE_DESIGN_IDS = [
  "yJm2VBRvecPNjx79aSnK",
  "6x2LyTvG3ewIePeWHanV",
  "KI7Ncd1O9JCuX9uCq505",
  "mZWO3Lsra91EhNRNEkhR",
  "W1bwk4jrCoQFn0OiyiSU",
  "ltn0gzs2YGXPADqCejr8",
] as const;

export type FlagshipObserveDesignId = (typeof FLAGSHIP_OBSERVE_DESIGN_IDS)[number];

const FLAGSHIP_OBSERVE_DESIGN_ID_SET = new Set<string>(FLAGSHIP_OBSERVE_DESIGN_IDS);

export const FLAGSHIP_OBSERVE_ALLOWED_PROJECT_ID = "fresh-prints-dev";

/** Business-facing fields included in the immutability snapshot (R5). */
const CANONICAL_BUSINESS_FIELD_KEYS = [
  "status",
  "aiReviewStatus",
  "aiProcessingStage",
  "aiProcessed",
  "aiReviewed",
  "readyAt",
  "title",
  "description",
  "categoryId",
  "categoryName",
  "tags",
  "smartProfile",
  "aiSuggestions",
  "aiAnalysis",
  "artworkBackgroundHex",
  "importHalftoneMode",
  "halftoneMode",
  "halftoneStaffDecision",
  "halftoneDecisionSource",
  "aiReviewConfidence",
  "aiReviewVersion",
  "aiReviewNotes",
  "aiReviewedAt",
  "aiReviewedBy",
  "aiRequestedVisionModelId",
  "updatedAt",
] as const;

/**
 * Fail-closed guard: project must be fresh-prints-dev and designId must be one of the six flagships.
 */
export function assertFlagshipObserveAllowed(projectId: string | undefined | null, designId: string): void {
  if (projectId !== FLAGSHIP_OBSERVE_ALLOWED_PROJECT_ID) {
    throw new Error(
      `Flagship observe forbidden: project must be ${FLAGSHIP_OBSERVE_ALLOWED_PROJECT_ID} (got ${projectId ?? "undefined"}).`,
    );
  }

  if (!FLAGSHIP_OBSERVE_DESIGN_ID_SET.has(designId)) {
    throw new Error(
      `Flagship observe forbidden: designId ${designId} is not in the hard-coded six-ID allowlist.`,
    );
  }
}

function isFirestoreTimestampLike(value: unknown): value is { toMillis: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  );
}

function isFirestoreTimestampProto(value: unknown): value is { _seconds: number; _nanoseconds?: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { _seconds?: unknown })._seconds === "number"
  );
}

function isFirestoreTimestampSeconds(value: unknown): value is { seconds: number; nanoseconds?: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { seconds?: unknown }).seconds === "number" &&
    !("toMillis" in (value as object))
  );
}

/**
 * Normalize Firestore timestamps and nested values for stable hashing.
 */
export function normalizeForCanonicalSnapshot(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isFirestoreTimestampLike(value)) {
    return value.toMillis();
  }

  if (isFirestoreTimestampProto(value)) {
    return value._seconds * 1000 + Math.floor((value._nanoseconds ?? 0) / 1_000_000);
  }

  if (isFirestoreTimestampSeconds(value)) {
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1_000_000);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForCanonicalSnapshot(entry));
  }

  if (typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      out[key] = normalizeForCanonicalSnapshot((value as Record<string, unknown>)[key]);
    }
    return out;
  }

  return String(value);
}

/**
 * Build a deterministic business-facing snapshot of a design document for immutability checks.
 */
export function buildCanonicalDesignBusinessSnapshot(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const source = data ?? {};
  const snapshot: Record<string, unknown> = {};

  for (const key of CANONICAL_BUSINESS_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      snapshot[key] = normalizeForCanonicalSnapshot(source[key]);
    } else {
      snapshot[key] = null;
    }
  }

  return snapshot;
}

/**
 * SHA-256 hex digest of the canonical business snapshot JSON (sorted keys).
 */
export function hashCanonicalDesignBusinessSnapshot(
  data: Record<string, unknown> | null | undefined,
): string {
  const snapshot = buildCanonicalDesignBusinessSnapshot(data);
  const json = JSON.stringify(snapshot);
  return createHash("sha256").update(json, "utf8").digest("hex");
}
