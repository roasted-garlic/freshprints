/**
 * DEV-only: TD-034 catalog-enrich-v35 cucumber reprocess QA.
 * Does not change global visionModelId. Cleans up temp owner user.
 *
 *   node functions/scripts/td034-v35-cucumber-qa-dev.mjs
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
const DESIGN_ID = "Y2IQuCgAPgnqrBIeJuap";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_td034-v35-cucumber-qa-dev-results.json",
);
const PASSWORD = `Td034Qa-${randomBytes(18).toString("base64url")}!aA1`;
const RUN_ID = Date.now().toString(36);

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureAdmin() {
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return { db: getFirestore() };
}

function captureDesign(data) {
  const sp = data.smartProfile || {};
  const prov = sp.provenance || {};
  return {
    designId: DESIGN_ID,
    status: data.status ?? null,
    aiReviewStatus: data.aiReviewStatus ?? null,
    aiProcessingStage: data.aiProcessingStage ?? null,
    model: prov.model || data.aiSuggestions?.model || null,
    provider: prov.provider || null,
    promptVersion: prov.promptVersion || null,
    normalizerVersion: prov.normalizerVersion || null,
    smartProfileVersion:
      prov.smartProfileVersion || prov.schemaVersion || sp.version || null,
    title: data.title || data.aiSuggestions?.title || sp.title || null,
    description:
      data.description || data.aiSuggestions?.description || sp.description || null,
    centralSubject: sp.centralSubject ?? null,
    subjects: sp.subjects ?? null,
    objects: sp.objects ?? null,
    visibleText: sp.visibleText ?? sp.readableTextLines ?? null,
    hardBlockers: prov.automationReasonCodes ?? null,
    softReasons: prov.softReasonCodes ?? null,
    wouldAutoApprove:
      typeof prov.wouldAutoApprove === "boolean" ? prov.wouldAutoApprove : null,
    automationDecision: prov.automationDecision ?? null,
    explicit:
      data.explicitContent ??
      data.isExplicit ??
      sp.explicitContent ??
      data.aiSuggestions?.explicitContent ??
      null,
    censoredTerms: data.censoredTerms ?? sp.censoredTerms ?? null,
    lifecycleStatus: data.status ?? null,
  };
}

async function main() {
  const { db } = ensureAdmin();
  const authAdmin = getAuth();
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  const pre = {
    visionModelId: settings.visionModelId ?? null,
    catalogWorkflowMode: settings.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
  };
  if (pre.catalogWorkflowMode !== "shadow" || pre.catalogAutonomousLiveEnabled) {
    throw new Error(`Autonomous gate not shadow/off: ${JSON.stringify(pre)}`);
  }

  const priorRaw = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
  const prior = captureDesign(priorRaw);

  const email = `td034-v35-cucumber-${RUN_ID}@freshprints.local`;
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
    displayName: `TD034 v35 Cucumber QA ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const portalEnv = loadPortalEnv();
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
  const fns = getFunctions(app, "us-central1");
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });

  console.log("Enqueue cucumber rerunFromReview (default model, no override)...");
  const startedAt = Date.now();
  const call = await enqueue({ designId: DESIGN_ID, rerunFromReview: true });
  console.log("callable", JSON.stringify(call.data));

  let data = priorRaw;
  let capture = prior;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const snap = await db.collection("designs").doc(DESIGN_ID).get();
    data = snap.data() || {};
    capture = captureDesign(data);
    const stage = data.aiProcessingStage;
    const updatedMs =
      data.updatedAt?.toMillis?.() ||
      (typeof data.updatedAt?._seconds === "number"
        ? data.updatedAt._seconds * 1000
        : 0);
    const fresh =
      updatedMs >= startedAt - 10_000 ||
      capture.promptVersion === "catalog-enrich-v35";
    if (
      fresh &&
      (stage === "ready_for_review" ||
        stage === "failed" ||
        (data.aiReviewStatus === "needs_review" &&
          capture.promptVersion === "catalog-enrich-v35"))
    ) {
      break;
    }
    process.stdout.write(".");
  }
  console.log("");

  const settingsAfter =
    (await db.collection("settings").doc("aiEnrichment").get()).data() || {};

  const womanGapStill =
    Array.isArray(capture.hardBlockers) &&
    capture.hardBlockers.some((c) => String(c).includes("subjects:woman"));
  const hardCount = Array.isArray(capture.hardBlockers)
    ? capture.hardBlockers.length
    : null;

  const out = {
    projectId: PROJECT_ID,
    runId: RUN_ID,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    pre,
    settingsAfter: {
      visionModelId: settingsAfter.visionModelId ?? null,
      catalogWorkflowMode: settingsAfter.catalogWorkflowMode ?? null,
      catalogAutonomousLiveEnabled:
        settingsAfter.catalogAutonomousLiveEnabled === true,
    },
    prior,
    callable: call.data ?? null,
    capture,
    mechanical: {
      priorWomanBlockerGone: !womanGapStill,
      newHardBlockersPresent: hardCount !== null && hardCount > 0 && !womanGapStill,
      womanStillEmitted:
        Array.isArray(capture.subjects) &&
        capture.subjects.map(String).includes("woman"),
      cucumberStillEmitted:
        Array.isArray(capture.objects) &&
        capture.objects.map(String).includes("cucumber"),
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ capture, mechanical: out.mechanical }, null, 2));

  try {
    await authAdmin.deleteUser(user.uid);
    await db.collection("users").doc(user.uid).delete();
  } catch {
    /* best-effort cleanup */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
