/**
 * Backfill designs.readyAt for existing `status: "ready"` designs (dev only).
 *
 * `readyAt` is the canonical default catalog ordering key (most recent transition into
 * `status: "ready"`). It is written going forward by `applyCatalogApprovalUpdate`, but designs
 * approved before the field existed have no value — and a Firestore `orderBy("readyAt")` silently
 * excludes documents missing the field, so those legacy designs would vanish from Studio's
 * Design Library. This backfill seeds them from the best available existing evidence.
 *
 * Seed precedence (best evidence first):
 *   1. aiReviewedAt — the review action that approved the design into ready
 *   2. updatedAt    — last write to the document
 *   3. createdAt    — original creation
 *
 * Idempotent: designs that already carry `readyAt` are skipped. Safe to re-run.
 *
 * Usage (from repo root, with GOOGLE_APPLICATION_CREDENTIALS or `firebase login:application-default`):
 *   node functions/scripts/backfill-design-ready-at.mjs            # dry run (default)
 *   APPLY=1 node functions/scripts/backfill-design-ready-at.mjs    # perform writes
 *
 * PRODUCTION IS A SEPARATE HUMAN CHECKPOINT. This script refuses to run against any project other
 * than fresh-prints-dev unless ALLOW_NON_DEV=1 is set explicitly.
 */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "fresh-prints-dev";
const apply = process.env.APPLY === "1";
const allowNonDev = process.env.ALLOW_NON_DEV === "1";

if (projectId !== "fresh-prints-dev" && !allowNonDev) {
  console.error(
    `Refusing to run against "${projectId}". This backfill is dev-only; production is a separate ` +
      "human checkpoint. Set ALLOW_NON_DEV=1 only after that checkpoint is approved.",
  );
  process.exit(1);
}

const BATCH_SIZE = 400;

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();

  const snapshot = await db.collection("designs").where("status", "==", "ready").get();

  let alreadySet = 0;
  let toWrite = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.readyAt) {
      alreadySet += 1;
      continue;
    }

    const seed = data.aiReviewedAt ?? data.updatedAt ?? data.createdAt;

    if (!seed) {
      console.warn(`skip ${doc.id}: no aiReviewedAt/updatedAt/createdAt to seed from`);
      continue;
    }

    toWrite.push({ ref: doc.ref, seed });
  }

  console.log(
    `project=${projectId} ready=${snapshot.size} alreadySet=${alreadySet} needsBackfill=${toWrite.length} mode=${apply ? "APPLY" : "DRY-RUN"}`,
  );

  if (!apply) {
    console.log("Dry run only — re-run with APPLY=1 to write.");
    return;
  }

  let written = 0;

  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const batch = db.batch();

    for (const { ref, seed } of toWrite.slice(i, i + BATCH_SIZE)) {
      batch.update(ref, { readyAt: seed });
    }

    await batch.commit();
    written += Math.min(BATCH_SIZE, toWrite.length - i);
    console.log(`committed ${written}/${toWrite.length}`);
  }

  console.log(`Backfill complete: ${written} design(s) updated.`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
