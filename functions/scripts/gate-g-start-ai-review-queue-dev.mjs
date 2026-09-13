/**
 * Gate G — startCatalogReprocessJob (ai_review_queue) on fresh-prints-dev ONLY.
 * Pre-start recheck; exact phrase; no Ready Catalog; no Autonomous flip.
 *
 *   node functions/scripts/gate-g-start-ai-review-queue-dev.mjs
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
const PHRASE = "REPROCESS AI REVIEW QUEUE";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_gate-g-start-ai-review-queue-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `GateG-${randomBytes(18).toString("base64url")}!aA1`;

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

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  // --- Pre-start recheck (Admin read; no mutations) ---
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  const mode = settings.catalogWorkflowMode ?? null;
  const live = settings.catalogAutonomousLiveEnabled === true;

  const activeSnap = await db
    .collection("catalogReprocessJobs")
    .where("projectId", "==", PROJECT_ID)
    .where("targetType", "==", "ai_review_queue")
    .where("status", "in", ["pending", "running", "paused"])
    .limit(1)
    .get();
  const activeJobId = activeSnap.empty ? null : activeSnap.docs[0].id;

  const recheck = {
    projectId: PROJECT_ID,
    catalogWorkflowMode: mode,
    catalogAutonomousLiveEnabled: live,
    activeJobId,
    readyCatalogEnabledConstant: false,
  };

  if (mode !== "shadow" || live === true || activeJobId) {
    writeFileSync(
      OUT_PATH,
      JSON.stringify({ aborted: true, reason: "prestart_mismatch", recheck }, null, 2),
    );
    throw new Error(`Pre-start STOP: ${JSON.stringify(recheck)}`);
  }

  const email = `gate-g-start-${RUN_ID}@freshprints.local`;
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
    displayName: `Gate G Start ${RUN_ID}`,
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
  await signInWithEmailAndPassword(getClientAuth(app), email, PASSWORD);
  const start = httpsCallable(getFunctions(app, "us-central1"), "startCatalogReprocessJob");

  let startResponse;
  try {
    console.log("Pre-start OK. Submitting startCatalogReprocessJob …");
    const result = await start({
      targetType: "ai_review_queue",
      confirmationPhrase: PHRASE,
    });
    startResponse = result.data;
    console.log("Start response:", JSON.stringify(startResponse, null, 2));
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

  const jobId = startResponse?.jobId;
  if (!jobId) {
    throw new Error("Start succeeded but no jobId");
  }

  const jobSnap = await db.collection("catalogReprocessJobs").doc(jobId).get();
  const job = jobSnap.data() || {};

  const out = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    recheck,
    startResponse,
    jobDocument: {
      jobId,
      status: job.status ?? null,
      targetType: job.targetType ?? null,
      totalEligible: job.totalEligible ?? null,
      promptVersion: job.promptVersion ?? null,
      normalizerVersion: job.normalizerVersion ?? null,
      pipelineVersion: job.pipelineVersion ?? null,
      catalogWorkflowModeSnapshot: job.catalogWorkflowModeSnapshot ?? null,
      autonomousLiveEnabledSnapshot: job.autonomousLiveEnabledSnapshot ?? null,
      createdBy: job.createdBy ?? null,
      createdAt: job.createdAt?.toDate?.()?.toISOString?.() ?? job.createdAt ?? null,
      environment: job.environment ?? null,
      dryRun: job.dryRun === true,
    },
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`JOB_ID=${jobId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
