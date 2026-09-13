/**
 * Pre/post deploy safety for Slice 6 Smart Profile corrective on fresh-prints-dev.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const PROJECT_ID = "fresh-prints-dev";
const CANARY_IDS = [
  "07ZCzmp7OFdSYKZ6hTg5",
  "6x2LyTvG3ewIePeWHanV",
  "0MpiuK4ERPawPEsUoZLn",
];
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../..");
const FUNCTIONS_ROOT = resolve(SCRIPT_DIR, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function ensureAdmin() {
  if (getApps().length === 0) {
    initAdmin({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
  return getFirestore();
}

async function main() {
  const db = ensureAdmin();
  const settingsSnap = await db.collection("settings").doc("aiEnrichment").get();
  const settings = settingsSnap.data() ?? {};

  const activeJobs = await db
    .collection("catalogReprocessJobs")
    .where("status", "in", ["pending", "running", "paused"])
    .get();

  const designs = {};
  for (const id of CANARY_IDS) {
    const snap = await db.collection("designs").doc(id).get();
    const data = snap.data() ?? {};
    const profile = data.smartProfile;
    designs[id] = {
      exists: snap.exists,
      status: data.status ?? null,
      aiReviewStatus: data.aiReviewStatus ?? null,
      promptVersion: profile?.provenance?.promptVersion ?? null,
      normalizerVersion: profile?.provenance?.normalizerVersion ?? null,
      hasSmartProfile: Boolean(profile),
      hasSmartProfileAiSnapshot: Boolean(data.smartProfileAiSnapshot),
      automationDecision: profile?.provenance?.automationDecision ?? null,
      automationReasonCodes: profile?.provenance?.automationReasonCodes ?? null,
    };
  }

  const constants = readFileSync(
    resolve(REPO_ROOT, "packages/shared/src/constants/catalogReprocess.constants.ts"),
    "utf8",
  );
  const readyGate = /CATALOG_REPROCESS_READY_CATALOG_ENABLED = true/.test(constants);

  console.log(
    JSON.stringify(
      {
        projectId: PROJECT_ID,
        readyGateFromSource: readyGate,
        catalogWorkflowMode: settings.catalogWorkflowMode ?? null,
        catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled ?? null,
        activeReprocessJobs: activeJobs.docs.map((d) => ({
          id: d.id,
          status: d.data().status,
          targetType: d.data().targetType,
        })),
        canaryDesigns: designs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
