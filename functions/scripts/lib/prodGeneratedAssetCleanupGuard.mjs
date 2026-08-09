/**
 * Production generated-asset cleanup — pure safety guards (no I/O).
 *
 * Hard allowlists for Storage prefixes, Firestore collection, and Firebase project.
 * Used by `functions/scripts/prod-generated-asset-cleanup.mjs` and unit-tested in isolation.
 *
 * Formal Review: no callable; no Stage 5 escape hatch; prod hard-pin only;
 * APPLY requires CONFIRM_PROD_STORAGE_CLEANUP=1 in addition to APPLY=1.
 */

/* eslint-env node */

/** Only permitted Firebase project for production generated-asset cleanup tooling. */
export const PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID = "fresh-prints-prod";

/**
 * Exact Storage prefixes eligible for list/delete. Trailing slash required so
 * `generated/portal-catalog-extra/...` cannot match.
 * Intentionally duplicates Stage 5 allowlist (isolation; do not import Stage 5 pin).
 */
export const PROD_STORAGE_CLEANUP_STORAGE_PREFIXES = Object.freeze([
  "generated/portal-catalog/",
  "generated/catalog-reference/",
]);

/** Sole Firestore collection eligible for production orphan cleanup. */
export const PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION = "snapshotPublicationState";

/**
 * Roots that must never be targeted. Documented in dry-run records as an explicit
 * negative checklist.
 */
export const PROD_STORAGE_CLEANUP_NEGATIVE_ROOTS = Object.freeze([
  "originals/",
  "thumbnails/",
  "previews/",
  "display/",
  "customer-uploads/",
]);

/** Second APPLY confirm env (must equal "1" when APPLY=1). */
export const PROD_STORAGE_CLEANUP_CONFIRM_ENV = "CONFIRM_PROD_STORAGE_CLEANUP";

/**
 * @param {string} path
 * @returns {string}
 */
export function normalizeProdStorageObjectPath(path) {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("Storage path must be a non-empty string");
  }
  if (path.includes("\\") || path.includes("\0")) {
    throw new Error(`Refusing Storage path with illegal characters: ${path}`);
  }
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
export function isProdAllowedStoragePath(path) {
  let normalized;
  try {
    normalized = normalizeProdStorageObjectPath(path);
  } catch {
    return false;
  }
  return PROD_STORAGE_CLEANUP_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * @param {string} path
 * @returns {string} normalized path
 */
export function assertProdAllowedStoragePath(path) {
  const normalized = normalizeProdStorageObjectPath(path);
  if (!PROD_STORAGE_CLEANUP_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    throw new Error(
      `Refusing Storage path outside prod cleanup allowlist: ${path}. ` +
        `Allowed prefixes: ${PROD_STORAGE_CLEANUP_STORAGE_PREFIXES.join(", ")}`,
    );
  }
  return normalized;
}

/**
 * @param {string} projectId
 */
export function assertProdStorageCleanupProjectId(projectId) {
  if (projectId !== PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID) {
    throw new Error(
      `Refusing prod Storage cleanup against project "${projectId}". ` +
        `Hard-pinned to "${PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID}" only ` +
        `(Stage 5 script remains separate and still pins fresh-prints-dev).`,
    );
  }
}

/**
 * @param {string} collectionId
 */
export function assertProdStorageCleanupFirestoreCollection(collectionId) {
  if (collectionId !== PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION) {
    throw new Error(
      `Refusing Firestore collection "${collectionId}". ` +
        `Prod cleanup allows only "${PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION}".`,
    );
  }
}

/**
 * Dual APPLY confirm — Formal Review required change.
 * Call only when operator intends destructive APPLY.
 */
export function assertProdStorageCleanupApplyConfirm(env = process.env) {
  if (env[PROD_STORAGE_CLEANUP_CONFIRM_ENV] !== "1") {
    throw new Error(
      `Refusing prod Storage cleanup APPLY without ${PROD_STORAGE_CLEANUP_CONFIRM_ENV}=1 ` +
        `(in addition to APPLY=1).`,
    );
  }
}

/**
 * Build the dry-run / pre-APPLY inventory record shape.
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {Array<{ prefix: string, objectCount: number, totalBytes: number|null, samplePaths: string[] }>} input.storageByPrefix
 * @param {{ collectionId: string, documentCount: number, sampleIds: string[] }} input.firestore
 * @param {"dry-run"|"apply"} input.mode
 */
export function buildProdStorageCleanupDryRunRecord(input) {
  assertProdStorageCleanupProjectId(input.projectId);
  assertProdStorageCleanupFirestoreCollection(input.firestore.collectionId);

  for (const row of input.storageByPrefix) {
    if (!PROD_STORAGE_CLEANUP_STORAGE_PREFIXES.includes(row.prefix)) {
      throw new Error(`Unexpected prefix in dry-run record: ${row.prefix}`);
    }
    for (const sample of row.samplePaths) {
      assertProdAllowedStoragePath(sample);
    }
  }

  const negativeRootChecklist = PROD_STORAGE_CLEANUP_NEGATIVE_ROOTS.map((root) => ({
    root,
    targetedForDeletion: false,
    note: "Confirmed not in prod Storage cleanup allowlist",
  }));

  return {
    stage: "PR #40 Gate 6 — Prod Generated Asset Cleanup",
    projectId: input.projectId,
    mode: input.mode,
    performedAt: new Date().toISOString(),
    storageAllowlist: [...PROD_STORAGE_CLEANUP_STORAGE_PREFIXES],
    firestoreAllowlist: [PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION],
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
    applyConfirmEnv: PROD_STORAGE_CLEANUP_CONFIRM_ENV,
  };
}
