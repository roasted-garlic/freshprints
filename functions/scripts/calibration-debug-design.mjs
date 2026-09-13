import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "../package.json"));
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: "fresh-prints-dev" });
}
const db = getFirestore();
const id = process.argv[2] || "SrDNWipuL0kBj3EuXY2c";
const snap = await db.collection("designs").doc(id).get();
const d = snap.data();
console.log(JSON.stringify({
  id,
  status: d?.status,
  aiReviewStatus: d?.aiReviewStatus,
  aiProcessingStage: d?.aiProcessingStage,
  aiProcessingError: d?.aiProcessingError,
  previewPath: d?.previewPath,
  smartProfile: d?.smartProfile?.provenance,
}, null, 2));
