/**
 * Bounded DEV smoke: prove deployed enqueueAiEnrichment is catalog-enrich-v29 + normalizer-v3.
 * fresh-prints-dev ONLY. Temporarily resets Highland + Jimothy for callable eligibility, then restores.
 *
 * Usage:
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/smoke-enqueue-v29-dev.mjs
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-dev";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_smoke-enqueue-v29-dev-results.json",
);

const HIGHLAND_ID = "yJm2VBRvecPNjx79aSnK";
const JIMOTHY_ID = "6x2LyTvG3ewIePeWHanV";

const RUN_ID = Date.now().toString(36);
const PASSWORD = `Smoke29-${randomBytes(18).toString("base64url")}!aA1`;

const SNAPSHOT_KEYS = [
  "status",
  "aiReviewStatus",
  "aiProcessed",
  "aiReviewed",
  "aiProcessingStage",
  "aiSuggestions",
  "aiAnalysis",
  "smartProfile",
  "aiReviewedAt",
  "aiReviewedBy",
  "aiReviewNotes",
  "aiReviewConfidence",
  "title",
  "description",
  "categoryId",
  "categoryName",
  "tags",
];

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
  const projectId = process.env.FIREBASE_PROJECT_ID || PROJECT_ID;
  if (projectId !== PROJECT_ID) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${PROJECT_ID}`);
  }
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }
  return getFirestore();
}

function snapshotDesign(data) {
  const snap = {};
  for (const key of SNAPSHOT_KEYS) {
    if (data[key] !== undefined) {
      snap[key] = data[key];
    }
  }
  return snap;
}

async function resetForEnqueue(db, designId) {
  await db.collection("designs").doc(designId).update({
    status: "imported",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiProcessingStage: FieldValue.delete(),
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    aiSuggestions: FieldValue.delete(),
    aiAnalysis: FieldValue.delete(),
    smartProfile: FieldValue.delete(),
    aiReviewedAt: FieldValue.delete(),
    aiReviewedBy: FieldValue.delete(),
    aiReviewNotes: FieldValue.delete(),
    aiReviewConfidence: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function restoreDesign(db, designId, snap) {
  const payload = {
    ...snap,
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Clear processing stage if snapshot had none
  if (snap.aiProcessingStage === undefined) {
    payload.aiProcessingStage = FieldValue.delete();
  }
  await db.collection("designs").doc(designId).set(payload, { merge: true });
}

function summarize(smartProfile) {
  const prov = smartProfile?.provenance ?? {};
  return {
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    subjects: smartProfile?.subjects ?? [],
    automationDecision: prov.automationDecision ?? null,
    catalogWorkflowMode: null,
  };
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const settingsSnap = await db.collection("settings").doc("aiEnrichment").get();
  const settings = settingsSnap.data() || {};
  const catalogWorkflowMode = settings.catalogWorkflowMode ?? null;
  const catalogAutonomousLiveEnabled = settings.catalogAutonomousLiveEnabled === true;

  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
    fixtures: [],
    aborted: false,
  };

  if (catalogAutonomousLiveEnabled) {
    results.aborted = true;
    results.abortReason = "catalogAutonomousLiveEnabled is ON — refuse smoke";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  const email = `smoke-v29-${RUN_ID}@freshprints.local`;
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
    displayName: `Smoke v29 ${RUN_ID}`,
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
  const enqueue = httpsCallable(getFunctions(app, "us-central1"), "enqueueAiEnrichment");

  const ids = [
    { id: HIGHLAND_ID, label: "Highland" },
    { id: JIMOTHY_ID, label: "Jimothy" },
  ];

  try {
    for (const { id, label } of ids) {
      const ref = db.collection("designs").doc(id);
      const beforeSnap = await ref.get();
      if (!beforeSnap.exists) {
        results.fixtures.push({ id, label, outcome: "missing" });
        continue;
      }
      const beforeData = beforeSnap.data();
      const before = snapshotDesign(beforeData);
      console.log(`RESET ${label} ${id}`);
      await resetForEnqueue(db, id);

      console.log(`ENQUEUE (Cloud Function) ${label} ${id}`);
      const callResult = await enqueue({ designId: id });
      const afterSnap = await ref.get();
      const afterData = afterSnap.data() || {};
      const summary = summarize(afterData.smartProfile);
      summary.catalogWorkflowMode = catalogWorkflowMode;

      const subjectsLower = (summary.subjects || []).map((s) => String(s).toLowerCase());
      let checks = {};
      if (id === HIGHLAND_ID) {
        checks = {
          promptV29: summary.promptVersion === "catalog-enrich-v29",
          normalizerV3: summary.normalizerVersion === "smart-profile-normalizer-v3",
          hasHighlandCow: subjectsLower.some((s) => s === "highland cow" || s.includes("highland cow")),
        };
      } else {
        checks = {
          promptV29: summary.promptVersion === "catalog-enrich-v29",
          normalizerV3: summary.normalizerVersion === "smart-profile-normalizer-v3",
          hasRaccoon: subjectsLower.some((s) => s.includes("raccoon")),
          noPeople: !subjectsLower.includes("people") && !subjectsLower.includes("person"),
        };
      }

      console.log(`RESTORE ${label} ${id}`);
      await restoreDesign(db, id, before);

      const restored = (await ref.get()).data() || {};
      results.fixtures.push({
        id,
        label,
        outcome: "smoked_and_restored",
        callableData: callResult.data ?? null,
        afterEnrichment: summary,
        checks,
        restore: {
          status: restored.status,
          aiReviewStatus: restored.aiReviewStatus,
          matchedBeforeStatus: restored.status === before.status,
          matchedBeforeReview: restored.aiReviewStatus === before.aiReviewStatus,
        },
        pass: Object.values(checks).every(Boolean),
      });
      console.log(JSON.stringify({ label, checks, summary }, null, 2));
    }
  } finally {
    await db.collection("users").doc(user.uid).delete().catch(() => {});
    await authAdmin.deleteUser(user.uid).catch(() => {});
  }

  results.completedAt = new Date().toISOString();
  results.allPass = results.fixtures.every((f) => f.pass === true);
  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log("WROTE " + OUT_PATH);
  console.log("ALL_PASS=" + results.allPass);
  if (!results.allPass) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
