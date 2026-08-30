/**
 * Slice 6 — read-only previewCatalogReprocessJob (ready_catalog) on fresh-prints-dev.
 * Does NOT call startCatalogReprocessJob.
 *
 *   node functions/scripts/slice6-ready-catalog-preview-dev.mjs
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-dev";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_slice6-ready-catalog-preview-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Slice6Preview-${randomBytes(18).toString("base64url")}!aA1`;

function loadPortalEnv() {
  const raw = readFileSync(resolve(REPO_ROOT, "apps/portal/.env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function ensureAdmin() {
  if ((process.env.FIREBASE_PROJECT_ID || PROJECT_ID) !== PROJECT_ID) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${PROJECT_ID}`);
  }
  if (getApps().length === 0) {
    initAdmin({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
  return getFirestore();
}

async function countQuery(query) {
  const snap = await query.count().get();
  return snap.data().count;
}

async function snapshotCatalogState(db) {
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  const [
    readyTotal,
    readyApproved,
    activeReadyJobs,
    activeQueueJobs,
    totalReprocessJobs,
  ] = await Promise.all([
    countQuery(db.collection("designs").where("status", "==", "ready")),
    countQuery(
      db
        .collection("designs")
        .where("status", "==", "ready")
        .where("aiReviewStatus", "==", "approved"),
    ),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("projectId", "==", PROJECT_ID)
        .where("targetType", "==", "ready_catalog")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("projectId", "==", PROJECT_ID)
        .where("targetType", "==", "ai_review_queue")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
    countQuery(
      db.collection("catalogReprocessJobs").where("projectId", "==", PROJECT_ID),
    ),
  ]);

  return {
    projectId: PROJECT_ID,
    catalogWorkflowMode: settings.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
    readyTotal,
    readyApprovedEligible: readyApproved,
    readyNotApprovedApprox: Math.max(0, readyTotal - readyApproved),
    activeReadyCatalogJobs: activeReadyJobs,
    activeAiReviewQueueJobs: activeQueueJobs,
    totalCatalogReprocessJobs: totalReprocessJobs,
  };
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const precheck = await snapshotCatalogState(db);
  if (precheck.catalogWorkflowMode !== "shadow") {
    throw new Error(`Expected shadow mode, got ${precheck.catalogWorkflowMode}`);
  }
  if (precheck.catalogAutonomousLiveEnabled) {
    throw new Error("catalogAutonomousLiveEnabled is ON — abort");
  }
  if (precheck.activeReadyCatalogJobs > 0 || precheck.activeAiReviewQueueJobs > 0) {
    throw new Error("Active reprocess jobs exist — abort");
  }

  const email = `slice6-ready-preview-${RUN_ID}@freshprints.local`;
  const user = await authAdmin.createUser({
    email,
    password: PASSWORD,
    emailVerified: true,
    disabled: false,
  });
  await db.collection("users").doc(user.uid).set({
    role: "owner",
    isActive: true,
    email,
    displayName: `Slice6 Ready Preview ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const app = initializeApp({
    apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const clientAuth = getClientAuth(app);
  await signInWithEmailAndPassword(clientAuth, email, PASSWORD);

  const preview = httpsCallable(getFunctions(app, "us-central1"), "previewCatalogReprocessJob");
  const beforeSnapshot = await snapshotCatalogState(db);

  const startedAt = new Date().toISOString();
  let payload;
  try {
    console.log("Calling previewCatalogReprocessJob({ targetType: ready_catalog }) …");
    const result = await preview({ targetType: "ready_catalog" });
    payload = result.data;
    console.log("Preview returned.");
  } finally {
    try {
      await authAdmin.deleteUser(user.uid);
    } catch {
      /* ignore */
    }
    try {
      await db.collection("users").doc(user.uid).delete();
    } catch {
      /* ignore */
    }
    console.log("Temp owner cleaned up");
  }

  const afterSnapshot = await snapshotCatalogState(db);

  const mutationProof = {
    before: beforeSnapshot,
    after: afterSnapshot,
    unchanged:
      beforeSnapshot.readyTotal === afterSnapshot.readyTotal &&
      beforeSnapshot.readyApprovedEligible === afterSnapshot.readyApprovedEligible &&
      beforeSnapshot.activeReadyCatalogJobs === afterSnapshot.activeReadyCatalogJobs &&
      beforeSnapshot.activeAiReviewQueueJobs === afterSnapshot.activeAiReviewQueueJobs &&
      beforeSnapshot.totalCatalogReprocessJobs === afterSnapshot.totalCatalogReprocessJobs,
    jobsCreated: afterSnapshot.totalCatalogReprocessJobs - beforeSnapshot.totalCatalogReprocessJobs,
  };

  const out = {
    projectId: PROJECT_ID,
    startedAt,
    finishedAt: new Date().toISOString(),
    callable: "previewCatalogReprocessJob",
    request: { targetType: "ready_catalog" },
    precheck,
    response: payload,
    mutationProof,
    startNotCalled: true,
    canaryNotUsed: true,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(JSON.stringify({ precheck, response: payload, mutationProof }, null, 2));

  if (!mutationProof.unchanged) {
    console.error("P0: Preview may have mutated catalog state");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
