/**
 * Backfill designs.favoriteCount from customers/{customerId}/favorites/{designId} (dev/admin).
 *
 * Usage (from repo root, with GOOGLE_APPLICATION_CREDENTIALS or `firebase login:application-default`):
 *   node functions/scripts/backfill-design-favorite-counts.mjs
 *
 * Optional:
 *   FIREBASE_PROJECT_ID=fresh-prints-dev node functions/scripts/backfill-design-favorite-counts.mjs
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

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();

async function main() {
  console.log(`Backfilling favoriteCount on project ${projectId}…`);

  const favoritesSnap = await db.collectionGroup("favorites").get();
  const counts = new Map();

  for (const favoriteDoc of favoritesSnap.docs) {
    const designId = favoriteDoc.id;
    if (!designId) {
      continue;
    }
    counts.set(designId, (counts.get(designId) || 0) + 1);
  }

  console.log(`Found ${favoritesSnap.size} favorite docs across ${counts.size} designs.`);

  const designSnap = await db.collection("designs").select().get();
  let batch = db.batch();
  let ops = 0;
  let updated = 0;

  async function flush() {
    if (ops === 0) {
      return;
    }
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }

  for (const designDoc of designSnap.docs) {
    const nextCount = counts.get(designDoc.id) || 0;
    batch.set(designDoc.ref, { favoriteCount: nextCount }, { merge: true });
    ops += 1;
    updated += 1;
    if (ops >= 400) {
      await flush();
    }
  }

  await flush();
  console.log(`Updated favoriteCount on ${updated} design docs.`);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
