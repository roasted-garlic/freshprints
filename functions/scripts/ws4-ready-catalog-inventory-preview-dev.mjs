/**
 * WS4 prep — Ready Catalog inventory + Preview only (fresh-prints-dev).
 * Target: catalog-enrich-v33 + smart-profile-normalizer-v6.
 * Calls previewCatalogReprocessJob; does NOT start.
 * Extra Admin scan for staff-edited / presets / failed / version pairs.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/ws4-ready-catalog-inventory-preview-dev.mjs
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
const TARGET_PROMPT = "catalog-enrich-v33";
const TARGET_NORMALIZER = "smart-profile-normalizer-v6";
const OUT_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws4-preview-inventory-raw.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Ws4Preview-${randomBytes(18).toString("base64url")}!aA1`;

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
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return getFirestore();
}

async function countQuery(query) {
  return (await query.count().get()).data().count;
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

async function scanReadyExtras(db) {
  const promptDist = {};
  const normalizerDist = {};
  const pairDist = {};
  let eligible = 0;
  let exactV33V6 = 0;
  let exactV32V6 = 0;
  let missingProvenance = 0;
  let missingProfile = 0;
  let schemaV1 = 0;
  let staffEdited = 0;
  let presetSeeded = 0;
  let legacyTagsNonEmpty = 0;
  let cursor = null;

  for (;;) {
    let q = db
      .collection("designs")
      .where("status", "==", "ready")
      .where("aiReviewStatus", "==", "approved")
      .orderBy("__name__")
      .limit(200);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      eligible += 1;
      const data = doc.data() || {};
      const sp = data.smartProfile;
      if (!sp || typeof sp !== "object") {
        missingProfile += 1;
        bump(promptDist, "(missing)");
        bump(normalizerDist, "(missing)");
        bump(pairDist, "(missing)/(missing)");
        continue;
      }
      const prompt =
        typeof sp.provenance?.promptVersion === "string" && sp.provenance.promptVersion.trim()
          ? sp.provenance.promptVersion.trim()
          : "(missing)";
      const normalizer =
        typeof sp.provenance?.normalizerVersion === "string" && sp.provenance.normalizerVersion.trim()
          ? sp.provenance.normalizerVersion.trim()
          : "(missing)";
      bump(promptDist, prompt);
      bump(normalizerDist, normalizer);
      bump(pairDist, `${prompt} / ${normalizer}`);
      if (prompt === "(missing)" || normalizer === "(missing)") missingProvenance += 1;
      if (prompt === TARGET_PROMPT && normalizer === TARGET_NORMALIZER) exactV33V6 += 1;
      if (prompt === "catalog-enrich-v32" && normalizer === TARGET_NORMALIZER) exactV32V6 += 1;
      if (sp.schemaVersion === "smart-profile-v1" || sp.provenance?.schemaVersion === "smart-profile-v1") {
        schemaV1 += 1;
      } else if (sp.schemaVersion == null && sp.dimensions) {
        // many profiles omit explicit schemaVersion but are v1-shaped
        schemaV1 += 1;
      }
      const staffKeys = sp.provenance?.staffEditedDimensionKeys;
      if (Array.isArray(staffKeys) && staffKeys.length > 0) {
        staffEdited += 1;
      }
      const presetKeys = sp.provenance?.importPresetDimensionKeys;
      if (Array.isArray(presetKeys) && presetKeys.length > 0) {
        presetSeeded += 1;
      }
      if (Array.isArray(data.tags) && data.tags.length > 0) legacyTagsNonEmpty += 1;
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }

  const [
    failedStage,
    processingStatus,
    readyTotal,
    activeReadyJobs,
    activeAiJobs,
  ] = await Promise.all([
    countQuery(db.collection("designs").where("aiProcessingStage", "==", "failed")),
    countQuery(db.collection("designs").where("status", "==", "processing")),
    countQuery(db.collection("designs").where("status", "==", "ready")),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("targetType", "==", "ready_catalog")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("targetType", "==", "ai_review_queue")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
  ]);

  return {
    targetPrompt: TARGET_PROMPT,
    targetNormalizer: TARGET_NORMALIZER,
    readyTotal,
    readyApprovedEligible: eligible,
    exactV33V6,
    exactV32V6,
    refreshRequired: Math.max(0, eligible - exactV33V6),
    alreadyCurrent: exactV33V6,
    missingProfile,
    missingProvenance,
    schemaV1Approx: schemaV1,
    staffEditedSmartProfileCount: staffEdited,
    presetSeededCount: presetSeeded,
    legacyTagsNonEmpty,
    promptVersionDistribution: promptDist,
    normalizerVersionDistribution: normalizerDist,
    promptNormalizerPairDistribution: pairDist,
    failedAiProcessingStage: failedStage,
    processingStatusCount: processingStatus,
    activeReadyCatalogJobs: activeReadyJobs,
    activeAiReviewQueueJobs: activeAiJobs,
  };
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env mismatch");
  }

  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  if (settings.catalogWorkflowMode !== "shadow") {
    throw new Error(`expected shadow, got ${settings.catalogWorkflowMode}`);
  }
  if (settings.catalogAutonomousLiveEnabled === true) {
    throw new Error("Autonomous ON — abort");
  }

  console.log("Scanning Ready extras…");
  const extras = await scanReadyExtras(db);
  console.log("Extras", JSON.stringify({
    eligible: extras.readyApprovedEligible,
    v33v6: extras.exactV33V6,
    v32v6: extras.exactV32V6,
    refresh: extras.refreshRequired,
  }));

  if (extras.activeReadyCatalogJobs > 0 || extras.activeAiReviewQueueJobs > 0) {
    throw new Error("Active reprocess jobs — abort");
  }

  const email = `ws4-ready-preview-${RUN_ID}@freshprints.local`;
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
    displayName: `WS4 Ready Preview ${RUN_ID}`,
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
  const preview = httpsCallable(getFunctions(app, "us-central1"), "previewCatalogReprocessJob");

  let previewResponse = null;
  try {
    console.log("Calling previewCatalogReprocessJob({ targetType: ready_catalog })…");
    const result = await preview({ targetType: "ready_catalog" });
    previewResponse = result.data;
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
  }

  const out = {
    projectId: PROJECT_ID,
    capturedAt: new Date().toISOString(),
    method:
      "previewCatalogReprocessJob(ready_catalog) + Admin Ready approved scan for version pairs / staff / presets",
    catalogWorkflowMode: settings.catalogWorkflowMode,
    catalogAutonomousLiveEnabled: false,
    startNotCalled: true,
    targetPrompt: TARGET_PROMPT,
    targetNormalizer: TARGET_NORMALIZER,
    confirmationPhrase: "REPROCESS READY CATALOG",
    extras,
    previewResponse,
  };
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log("Wrote", OUT_JSON);
  console.log(
    JSON.stringify(
      {
        previewEligible: previewResponse?.eligibleCount,
        previewAlreadyCurrent: previewResponse?.alreadyCurrentPipelineCount,
        extrasV33V6: extras.exactV33V6,
        extrasRefresh: extras.refreshRequired,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
