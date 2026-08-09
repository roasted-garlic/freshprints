/**
 * Stage 5 generated-asset cleanup — pure safety guards (no I/O).
 *
 * Hard allowlists for Storage prefixes, Firestore collection, and Firebase project.
 * Used by `functions/scripts/stage5-generated-asset-cleanup.mjs` and unit-tested in isolation.
 *
 * Formal Review: no callable; no arbitrary operator prefixes; no production escape hatch.
 */

/** Only permitted Firebase project for Stage 5 cleanup tooling. */
export const STAGE5_ALLOWED_PROJECT_ID = "fresh-prints-dev";

/**
 * Exact Storage prefixes eligible for list/delete. Trailing slash required so
 * `generated/portal-catalog-extra/...` cannot match.
 */
export const STAGE5_STORAGE_PREFIXES = Object.freeze([
  "generated/portal-catalog/",
  "generated/catalog-reference/",
]);

/** Sole Firestore collection eligible for Stage 5 orphan cleanup. */
export const STAGE5_FIRESTORE_COLLECTION = "snapshotPublicationState";

/**
 * Roots that must never be targeted. Documented in dry-run records as an explicit
 * negative checklist (Formal Review required change).
 */
export const STAGE5_NEGATIVE_ROOTS = Object.freeze([
  "originals/",
  "thumbnails/",
  "previews/",
  "display/",
  "customer-uploads/",
]);

/**
 * @param {string} path
 * @returns {string}
 */
export function normalizeStorageObjectPath(path) {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("Storage path must be a non-empty string");
  }
  if (path.includes("\\") || path.includes("\0")) {
    throw new Error(`Refusing Storage path with illegal characters: ${path}`);
  }
  // Strip leading slashes only; do not resolve `..` — reject instead.
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed.includes("..") || trimmed.split("/").includes("..")) {
    throw new Error(`Refusing Storage path with path traversal: ${path}`);
  }
  return trimmed;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isAllowedStoragePath(path) {
  let normalized;
  try {
    normalized = normalizeStorageObjectPath(path);
  } catch {
    return false;
  }
  return STAGE5_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * @param {string} path
 * @returns {string} normalized path
 */
export function assertAllowedStoragePath(path) {
  const normalized = normalizeStorageObjectPath(path);
  if (!STAGE5_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    throw new Error(
      `Refusing Storage path outside Stage 5 allowlist: ${path}. ` +
        `Allowed prefixes: ${STAGE5_STORAGE_PREFIXES.join(", ")}`,
    );
  }
  return normalized;
}

/**
 * @param {string} projectId
 */
export function assertStage5ProjectId(projectId) {
  if (projectId !== STAGE5_ALLOWED_PROJECT_ID) {
    throw new Error(
      `Refusing Stage 5 cleanup against project "${projectId}". ` +
        `Hard-pinned to "${STAGE5_ALLOWED_PROJECT_ID}" only (no production escape hatch).`,
    );
  }
}

/**
 * @param {string} collectionId
 */
export function assertStage5FirestoreCollection(collectionId) {
  if (collectionId !== STAGE5_FIRESTORE_COLLECTION) {
    throw new Error(
      `Refusing Firestore collection "${collectionId}". ` +
        `Stage 5 allows only "${STAGE5_FIRESTORE_COLLECTION}".`,
    );
  }
}

/**
 * Build the dry-run record shape (Formal Review: counts, samples, negative checklist).
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {Array<{ prefix: string, objectCount: number, totalBytes: number|null, samplePaths: string[] }>} input.storageByPrefix
 * @param {{ collectionId: string, documentCount: number, sampleIds: string[] }} input.firestore
 * @param {"dry-run"|"apply"} input.mode
 */
export function buildStage5DryRunRecord(input) {
  assertStage5ProjectId(input.projectId);
  assertStage5FirestoreCollection(input.firestore.collectionId);

  for (const row of input.storageByPrefix) {
    if (!STAGE5_STORAGE_PREFIXES.includes(row.prefix)) {
      throw new Error(`Unexpected prefix in dry-run record: ${row.prefix}`);
    }
    for (const sample of row.samplePaths) {
      assertAllowedStoragePath(sample);
    }
  }

  const negativeRootChecklist = STAGE5_NEGATIVE_ROOTS.map((root) => ({
    root,
    targetedForDeletion: false,
    note: "Confirmed not in Stage 5 Storage allowlist",
  }));

  return {
    stage: "Stage 5 — Generated Asset Cleanup",
    projectId: input.projectId,
    mode: input.mode,
    performedAt: new Date().toISOString(),
    storageAllowlist: [...STAGE5_STORAGE_PREFIXES],
    firestoreAllowlist: [STAGE5_FIRESTORE_COLLECTION],
    storageByPrefix: input.storageByPrefix.map((row) => ({
      prefix: row.prefix,
      objectCount: row.objectCount,
      totalBytes: row.totalBytes,
      samplePaths: [...row.samplePaths],
    })),
    firestore: {
      collectionId: input.firestore.collectionId,
      documentCount: input.firestore.documentCount,
      sampleIds: [...input.firestore.sampleIds],
    },
    negativeRootChecklist,
    otherRootsNote:
      "Every Storage root outside the two allowlisted generated prefixes is out of scope and was not targeted.",
    destructiveActionsPerformed: input.mode === "apply",
  };
}
