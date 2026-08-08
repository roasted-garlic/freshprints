/**
 * Stage 5 — Generated-asset cleanup ops script (dev only).
 *
 * Local Admin SDK procedure — NOT a deployed callable (Formal Review preference).
 *
 * Hard-pinned to `fresh-prints-dev`. Storage deletes limited to exact prefixes:
 *   - generated/portal-catalog/
 *   - generated/catalog-reference/
 * Firestore deletes limited to collection:
 *   - snapshotPublicationState
 *
 * Usage (from repo root, with ADC / GOOGLE_APPLICATION_CREDENTIALS):
 *   node functions/scripts/stage5-generated-asset-cleanup.mjs
 *     → dry-run (default): list + print JSON record; NO deletes
 *
 *   APPLY=1 node functions/scripts/stage5-generated-asset-cleanup.mjs
 *     → destructive: delete allowlisted Storage objects + snapshotPublicationState docs
 *     → safe to re-run after partial progress (re-lists remaining objects)
 *     → per-object retry/backoff for transient GCS errors; bounded concurrency
 *     → final verification re-list; non-zero exit if residuals remain
 *
 * Owner gates (do not bypass):
 *   APPROVE DEV STORAGE DRY-RUN: STAGE 5   — before first live dry-run
 *   APPROVE DEV STORAGE DELETE: STAGE 5    — before APPLY=1
 *
 * There is NO ALLOW_NON_DEV / production escape hatch.
 */

/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

import {
  STAGE5_ALLOWED_PROJECT_ID,
  STAGE5_FIRESTORE_COLLECTION,
  STAGE5_STORAGE_PREFIXES,
  assertAllowedStoragePath,
  assertStage5FirestoreCollection,
  assertStage5ProjectId,
  buildStage5DryRunRecord,
} from "./lib/stage5GeneratedAssetCleanupGuard.mjs";
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

/** Fail-closed bucket map — only the Stage 5 allowed project has an entry. */
const STAGE5_STORAGE_BUCKET_BY_PROJECT = Object.freeze({
  [STAGE5_ALLOWED_PROJECT_ID]: "fresh-prints-dev.firebasestorage.app",
});

/** Fail-closed project resolution — env override must still equal fresh-prints-dev. */
function resolveProjectId() {
  const fromEnv =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    STAGE5_ALLOWED_PROJECT_ID;
  assertStage5ProjectId(fromEnv);
  return fromEnv;
}

function resolveStorageBucket(projectId) {
  assertStage5ProjectId(projectId);
  const bucket = STAGE5_STORAGE_BUCKET_BY_PROJECT[projectId];
  if (!bucket) {
    throw new Error(`No Stage 5 Storage bucket mapping for project "${projectId}".`);
  }
  return bucket;
}

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {string} prefix
 */
async function listPrefix(bucket, prefix) {
  if (!STAGE5_STORAGE_PREFIXES.includes(prefix)) {
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
      assertAllowedStoragePath(name);
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
  assertStage5FirestoreCollection(STAGE5_FIRESTORE_COLLECTION);
  const snap = await withTransientRetry(() => db.collection(STAGE5_FIRESTORE_COLLECTION).get());
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

  for (const prefix of STAGE5_STORAGE_PREFIXES) {
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
  console.log(`  ${STAGE5_FIRESTORE_COLLECTION} → ${docIds.length} document(s)`);

  return { storageByPrefix, allObjects, docIds };
}

async function main() {
  const projectId = resolveProjectId();
  const apply = process.env.APPLY === "1";
  const mode = apply ? "apply" : "dry-run";
  const concurrency = Number(process.env.STAGE5_CONCURRENCY || STAGE5_APPLY_CONCURRENCY);

  console.log(`Stage 5 generated-asset cleanup — project=${projectId} mode=${mode}`);
  if (apply) {
    console.warn("APPLY=1 set — destructive deletes will run for allowlisted targets only.");
    console.warn(
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
  assertStage5ProjectId(resolved);

  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(storageBucket);

  const { storageByPrefix, allObjects, docIds } = await inventoryAllowlisted(bucket, db);

  const record = buildStage5DryRunRecord({
    projectId: resolved,
    mode,
    storageByPrefix,
    firestore: {
      collectionId: STAGE5_FIRESTORE_COLLECTION,
      documentCount: docIds.length,
      sampleIds: docIds.slice(0, SAMPLE_LIMIT),
    },
  });

  const outPath =
    process.env.STAGE5_DRY_RUN_OUT ||
    resolve(
      process.cwd(),
      `docs/workflow/reviews/stage5-generated-asset-cleanup-dry-run-${resolved}-${Date.now()}.json`,
    );

  // Always write the inventory record (even on apply, as an audit trail before deletes).
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

  // ---- Destructive path (APPLY=1 only) ----
  // Re-lists remaining objects each run → safe resume after partial progress.
  if (allObjects.length === 0) {
    console.log("No Storage objects remaining under allowlisted prefixes.");
  } else {
    const deleteResult = await deleteAllowlistedPathsInBatches({
      paths: allObjects.map((o) => o.name),
      concurrency,
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

  // Firestore orphan cleanup (writers gone). Safe to run even if Storage still has residuals;
  // verification below reports overall cleanliness.
  assertStage5FirestoreCollection(STAGE5_FIRESTORE_COLLECTION);
  const liveDocIds = await listSnapshotPublicationState(db);
  let deletedDocs = 0;
  const BATCH = 400;
  for (let i = 0; i < liveDocIds.length; i += BATCH) {
    const slice = liveDocIds.slice(i, i + BATCH);
    await withTransientRetry(async () => {
      const batch = db.batch();
      for (const id of slice) {
        batch.delete(db.collection(STAGE5_FIRESTORE_COLLECTION).doc(id));
      }
      await batch.commit();
    });
    deletedDocs += slice.length;
  }
  console.log(`Deleted ${deletedDocs} ${STAGE5_FIRESTORE_COLLECTION} document(s).`);

  console.log("Final verification (re-list allowlisted targets only)…");
  const verify = await inventoryAllowlisted(bucket, db);
  const summary = buildApplyVerificationSummary(verify.storageByPrefix, verify.docIds.length);
  console.log(JSON.stringify({ verification: summary }, null, 2));

  const verifyPath =
    process.env.STAGE5_VERIFY_OUT ||
    resolve(
      process.cwd(),
      `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-verify-${resolved}.json`,
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

  console.log("APPLY complete — allowlisted Storage prefixes and snapshotPublicationState are empty.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
