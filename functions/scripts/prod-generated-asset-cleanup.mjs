/**
 * PR #40 Gate 6 — Generated-asset cleanup ops script (production only).
 *
 * Local Admin SDK procedure — NOT a deployed callable.
 *
 * Hard-pinned to `fresh-prints-prod`. Storage deletes limited to exact prefixes:
 *   - generated/portal-catalog/
 *   - generated/catalog-reference/
 * Firestore deletes limited to collection:
 *   - snapshotPublicationState
 *
 * Reuses Stage 5 APPLY resilience helpers (concurrency / retry / verify).
 * Does NOT modify or unlock `stage5-generated-asset-cleanup.mjs` (still fresh-prints-dev only).
 *
 * Usage (from repo root, with ADC / GOOGLE_APPLICATION_CREDENTIALS):
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   node functions/scripts/prod-generated-asset-cleanup.mjs
 *     → dry-run (default): list + print JSON record; NO deletes
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   $env:CONFIRM_PROD_STORAGE_CLEANUP = "1"
 *   $env:APPLY = "1"
 *   node functions/scripts/prod-generated-asset-cleanup.mjs
 *     → destructive: delete allowlisted Storage objects + snapshotPublicationState docs
 *     → safe to re-run after partial progress (re-lists remaining objects)
 *     → per-object retry/backoff for transient GCS errors; bounded concurrency
 *     → final verification re-list; non-zero exit if residuals remain
 *
 * Owner gates (do not bypass):
 *   APPROVE PROD STORAGE CLEANUP DRY-RUN   — before first live dry-run
 *   APPROVE PROD STORAGE CLEANUP DELETE    — before APPLY=1
 *
 * Stage 5 script remains separate; there is NO Stage 5 production escape hatch.
 */

/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

import {
  PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID,
  PROD_STORAGE_CLEANUP_CONFIRM_ENV,
  PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION,
  PROD_STORAGE_CLEANUP_STORAGE_PREFIXES,
  assertProdAllowedStoragePath,
  assertProdStorageCleanupApplyConfirm,
  assertProdStorageCleanupFirestoreCollection,
  assertProdStorageCleanupProjectId,
  buildProdStorageCleanupDryRunRecord,
} from "./lib/prodGeneratedAssetCleanupGuard.mjs";
import {
  STAGE5_APPLY_CONCURRENCY,
  buildApplyVerificationSummary,
  deleteAllowlistedPathsInBatches,
  withTransientRetry,
} from "./lib/stage5GeneratedAssetCleanupApply.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const SAMPLE_LIMIT = 20;
const PAGE_SIZE = 1000;

/** Fail-closed bucket map — only the prod cleanup allowed project has an entry. */
const PROD_STORAGE_BUCKET_BY_PROJECT = Object.freeze({
  [PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID]: "fresh-prints-prod.firebasestorage.app",
});

/** Fail-closed project resolution — env override must still equal fresh-prints-prod. */
function resolveProjectId() {
  const fromEnv =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID;
  assertProdStorageCleanupProjectId(fromEnv);
  return fromEnv;
}

function resolveStorageBucket(projectId) {
  assertProdStorageCleanupProjectId(projectId);
  const bucket = PROD_STORAGE_BUCKET_BY_PROJECT[projectId];
  if (!bucket) {
    throw new Error(`No prod Storage cleanup bucket mapping for project "${projectId}".`);
  }
  return bucket;
}

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {string} prefix
 */
async function listPrefix(bucket, prefix) {
  if (!PROD_STORAGE_CLEANUP_STORAGE_PREFIXES.includes(prefix)) {
    throw new Error(`Internal error: refusing to list non-allowlisted prefix ${prefix}`);
  }

  /** @type {Array<{ name: string, size: number }>} */
  const objects = [];
  let pageToken = undefined;

  do {
    const [files, , apiResponse] = await withTransientRetry(
      () =>
        bucket.getFiles({
          prefix,
          autoPaginate: false,
          maxResults: PAGE_SIZE,
          pageToken,
        }),
      {
        onRetry: ({ attempt, delayMs, error }) => {
          console.warn(
            `list retry prefix=${prefix} attempt=${attempt} delayMs=${delayMs}: ${error?.message || error}`,
          );
        },
      },
    );

    for (const file of files) {
      const name = file.name;
      assertProdAllowedStoragePath(name);
      const size = Number(file.metadata?.size ?? 0);
      objects.push({ name, size: Number.isFinite(size) ? size : 0 });
    }

    pageToken =
      apiResponse && typeof apiResponse === "object" && "nextPageToken" in apiResponse
        ? apiResponse.nextPageToken
        : undefined;
  } while (pageToken);

  return objects;
}

/**
 * @param {FirebaseFirestore.Firestore} db
 */
async function listSnapshotPublicationState(db) {
  assertProdStorageCleanupFirestoreCollection(PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION);
  const snap = await withTransientRetry(() =>
    db.collection(PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION).get(),
  );
  return snap.docs.map((d) => d.id);
}

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {FirebaseFirestore.Firestore} db
 */
async function inventoryAllowlisted(bucket, db) {
  /** @type {Array<{ prefix: string, objectCount: number, totalBytes: number|null, samplePaths: string[] }>} */
  const storageByPrefix = [];
  /** @type {Array<{ name: string, size: number }>} */
  let allObjects = [];

  for (const prefix of PROD_STORAGE_CLEANUP_STORAGE_PREFIXES) {
    const objects = await listPrefix(bucket, prefix);
    allObjects = allObjects.concat(objects);
    const totalBytes = objects.reduce((sum, o) => sum + o.size, 0);
    storageByPrefix.push({
      prefix,
      objectCount: objects.length,
      totalBytes,
      samplePaths: objects.slice(0, SAMPLE_LIMIT).map((o) => o.name),
    });
    console.log(`  ${prefix} → ${objects.length} object(s), ${totalBytes} byte(s)`);
  }

  const docIds = await listSnapshotPublicationState(db);
  console.log(`  ${PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION} → ${docIds.length} document(s)`);

  return { storageByPrefix, allObjects, docIds };
}

async function main() {
  const projectId = resolveProjectId();
  const apply = process.env.APPLY === "1";
  const mode = apply ? "apply" : "dry-run";
  const concurrency = Number(
    process.env.PROD_STORAGE_CLEANUP_CONCURRENCY ||
      process.env.STAGE5_CONCURRENCY ||
      STAGE5_APPLY_CONCURRENCY,
  );

  if (apply) {
    assertProdStorageCleanupApplyConfirm(process.env);
  }

  console.log(`Prod generated-asset cleanup — project=${projectId} mode=${mode}`);
  if (apply) {
    console.warn("APPLY=1 set — destructive deletes will run for allowlisted targets only.");
    console.warn(
      `${PROD_STORAGE_CLEANUP_CONFIRM_ENV}=1 confirmed. ` +
        `APPLY resilience: concurrency=${concurrency}, per-object retry/backoff, re-list resume, final verify.`,
    );
  } else {
    console.log("Dry-run default — listing only; no Storage or Firestore deletes.");
  }

  const storageBucket = resolveStorageBucket(projectId);
  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({ credential: applicationDefault(), projectId, storageBucket });

  // Re-assert after init in case ADC resolved a different project.
  const resolved =
    app.options?.projectId ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    projectId;
  assertProdStorageCleanupProjectId(resolved);

  // Fail closed if the Admin app storageBucket option does not match the hard-mapped prod bucket.
  if (app.options?.storageBucket && app.options.storageBucket !== storageBucket) {
    throw new Error(
      `Refusing prod Storage cleanup: app storageBucket "${app.options.storageBucket}" ` +
        `does not match hard-mapped bucket "${storageBucket}".`,
    );
  }

  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(storageBucket);

  const { storageByPrefix, allObjects, docIds } = await inventoryAllowlisted(bucket, db);

  const record = buildProdStorageCleanupDryRunRecord({
    projectId: resolved,
    mode,
    storageByPrefix,
    firestore: {
      collectionId: PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION,
      documentCount: docIds.length,
      sampleIds: docIds.slice(0, SAMPLE_LIMIT),
    },
  });

  const outPath =
    process.env.PROD_STORAGE_CLEANUP_DRY_RUN_OUT ||
    resolve(
      process.cwd(),
      `docs/workflow/reviews/prod-generated-asset-cleanup-dry-run-${resolved}-${Date.now()}.json`,
    );

  try {
    writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    console.log(`Wrote record: ${outPath}`);
  } catch (err) {
    console.warn(`Could not write record file (${err.message}); printing to stdout.`);
  }
  console.log(JSON.stringify(record, null, 2));

  if (!apply) {
    console.log("Dry-run complete — no deletes performed.");
    return;
  }

  // ---- Destructive path (APPLY=1 + CONFIRM only) ----
  // Order: Storage first, then snapshotPublicationState, then final verify (Formal Review).
  if (allObjects.length === 0) {
    console.log("No Storage objects remaining under allowlisted prefixes.");
  } else {
    const deleteResult = await deleteAllowlistedPathsInBatches({
      paths: allObjects.map((o) => o.name),
      concurrency,
      assertPath: assertProdAllowedStoragePath,
      deleteOne: async (name) => {
        await bucket.file(name).delete({ ignoreNotFound: true });
      },
      onProgress: ({ succeeded, failed, total, batchIndex, batchCount }) => {
        if (succeeded % 500 === 0 || succeeded + failed === total || batchIndex === batchCount) {
          console.log(
            `Storage delete progress: succeeded=${succeeded} failed=${failed} total=${total} batch=${batchIndex}/${batchCount}`,
          );
        }
      },
      onRetry: ({ path, attempt, delayMs, error }) => {
        if (attempt === 1 || attempt % 2 === 0) {
          console.warn(
            `retry path=${path} attempt=${attempt} delayMs=${delayMs}: ${error?.message || error}`,
          );
        }
      },
    });

    console.log(
      `Storage delete pass: succeeded=${deleteResult.succeeded} failed=${deleteResult.failed.length} of ${deleteResult.total}`,
    );
    if (deleteResult.failed.length > 0) {
      for (const row of deleteResult.failed.slice(0, 20)) {
        console.error(`  permanent failure: ${row.path} — ${row.error?.message || row.error}`);
      }
      if (deleteResult.failed.length > 20) {
        console.error(`  … ${deleteResult.failed.length - 20} more`);
      }
    }
  }

  assertProdStorageCleanupFirestoreCollection(PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION);
  const liveDocIds = await listSnapshotPublicationState(db);
  let deletedDocs = 0;
  const BATCH = 400;
  for (let i = 0; i < liveDocIds.length; i += BATCH) {
    const slice = liveDocIds.slice(i, i + BATCH);
    await withTransientRetry(async () => {
      const batch = db.batch();
      for (const id of slice) {
        batch.delete(db.collection(PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION).doc(id));
      }
      await batch.commit();
    });
    deletedDocs += slice.length;
  }
  console.log(`Deleted ${deletedDocs} ${PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION} document(s).`);

  console.log("Final verification (re-list allowlisted targets only)…");
  const verify = await inventoryAllowlisted(bucket, db);
  const summary = buildApplyVerificationSummary(verify.storageByPrefix, verify.docIds.length);
  console.log(JSON.stringify({ verification: summary }, null, 2));

  const verifyPath =
    process.env.PROD_STORAGE_CLEANUP_VERIFY_OUT ||
    resolve(
      process.cwd(),
      `docs/workflow/reviews/2026-08-08-prod-generated-asset-cleanup-verify-${resolved}.json`,
    );
  try {
    writeFileSync(
      verifyPath,
      `${JSON.stringify({ projectId: resolved, performedAt: new Date().toISOString(), verification: summary, inventory: verify.storageByPrefix, firestoreIds: verify.docIds }, null, 2)}\n`,
      "utf8",
    );
    console.log(`Wrote verification: ${verifyPath}`);
  } catch (err) {
    console.warn(`Could not write verification file (${err.message})`);
  }

  if (!summary.fullyClean) {
    console.error(
      "APPLY incomplete — residuals remain under allowlisted targets. Re-run the same APPLY=1 command to resume.",
    );
    process.exitCode = 2;
    return;
  }

  console.log(
    "APPLY complete — allowlisted Storage prefixes and snapshotPublicationState are empty on fresh-prints-prod.",
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
