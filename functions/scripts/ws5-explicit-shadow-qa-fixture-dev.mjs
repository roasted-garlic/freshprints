/**
 * DEV-only: create disposable Explicit shadow QA fixture + enqueue via deployed callable.
 * fresh-prints-dev ONLY. Does not mutate mode/live gate or the six WS5 candidates.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/ws5-explicit-shadow-qa-fixture-dev.mjs
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
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

// Prefer sharp from functions deps for webp
const sharp = require("sharp");

const PROJECT_ID = "fresh-prints-dev";
const SELECTED_TERM = "damn";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_ws5-explicit-shadow-qa-fixture-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Ws5ShadowQa-${randomBytes(18).toString("base64url")}!aA1`;

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
  return { db: getFirestore(), bucket: getStorage().bucket() };
}

async function renderDamnPng() {
  // Pure PNG via sharp SVG — no node-canvas dependency
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="400" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="160" font-weight="700" fill="#111111">DAMN</text>
</svg>`);
  const png = await sharp(svg).png().toBuffer();
  const webp = await sharp(png).webp({ quality: 90 }).toBuffer();
  return { png, webp, width: 800, height: 800 };
}

async function main() {
  const { db, bucket } = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const settingsSnap = await db.collection("settings").doc("aiEnrichment").get();
  const settings = settingsSnap.data() || {};
  const catalogWorkflowMode = settings.catalogWorkflowMode ?? null;
  const catalogAutonomousLiveEnabled = settings.catalogAutonomousLiveEnabled === true;
  const terms = settings.explicitContentAutomationTerms;

  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
    termsCount: Array.isArray(terms) ? terms.length : null,
    selectedTerm: SELECTED_TERM,
    termPresent: Array.isArray(terms) ? terms.includes(SELECTED_TERM) : false,
  };

  if (catalogWorkflowMode !== "shadow" || catalogAutonomousLiveEnabled) {
    results.aborted = true;
    results.abortReason = "[PREREQUISITE NOT MET — AUTONOMOUS GATE STATE]";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (!results.termPresent) {
    results.aborted = true;
    results.abortReason = "selected term not in owner vocabulary";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  const email = `ws5-shadow-qa-${RUN_ID}@freshprints.local`;
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
    displayName: `WS5 Explicit Shadow QA ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const designRef = db.collection("designs").doc();
  const designId = designRef.id;
  const originalPath = `/originals/${designId}.png`;
  const previewPath = `/previews/${designId}.webp`;
  const thumbnailPath = `/thumbnails/${designId}.webp`;
  const title = `DEV QA FIXTURE — Explicit Shadow — DAMN — ${RUN_ID}`;

  const { png, webp, width, height } = await renderDamnPng();
  await bucket.file(originalPath.replace(/^\//, "")).save(png, {
    contentType: "image/png",
    metadata: { metadata: { qaFixture: "ws5-explicit-shadow", runId: RUN_ID } },
  });
  await bucket.file(previewPath.replace(/^\//, "")).save(webp, {
    contentType: "image/webp",
  });
  await bucket.file(thumbnailPath.replace(/^\//, "")).save(webp, {
    contentType: "image/webp",
  });

  await designRef.set({
    id: designId,
    title,
    description: "DEV QA FIXTURE — DO NOT USE FOR PRODUCTION. Explicit Content shadow preview.",
    status: "imported",
    tags: [],
    originalPath,
    previewPath,
    thumbnailPath,
    width,
    height,
    dpi: 300,
    printWidthInches: width / 300,
    printHeightInches: height / 300,
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    uploadedBy: user.uid,
    createdBy: user.uid,
    updatedBy: user.uid,
    importSourceFileName: `ws5-explicit-shadow-qa-${RUN_ID}.png`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const before = (await designRef.get()).data() || {};
  results.fixture = {
    designId,
    title,
    selectedTerm: SELECTED_TERM,
    artworkText: "DAMN",
    originalPath,
    previewPath,
    initialLifecycle: {
      status: before.status,
      aiReviewStatus: before.aiReviewStatus,
      aiProcessingStage: before.aiProcessingStage ?? null,
    },
    protectedHumanAuthority: {
      isExplicitContent: before.isExplicitContent ?? null,
      censoredTerms: before.censoredTerms ?? null,
    },
  };

  // Re-read gate immediately before enqueue
  const gateSnap = await db.collection("settings").doc("aiEnrichment").get();
  const gate = gateSnap.data() || {};
  results.preEnqueueGate = {
    catalogWorkflowMode: gate.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: gate.catalogAutonomousLiveEnabled === true,
  };
  if (
    results.preEnqueueGate.catalogWorkflowMode !== "shadow" ||
    results.preEnqueueGate.catalogAutonomousLiveEnabled
  ) {
    results.aborted = true;
    results.abortReason = "[PREREQUISITE NOT MET — AUTONOMOUS GATE STATE]";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

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

  console.log(`ENQUEUE fixture ${designId}`);
  const callResult = await enqueue({ designId });
  results.enqueueResponse = callResult.data ?? null;

  const after = (await designRef.get()).data() || {};
  const preview = after.smartProfile?.provenance?.explicitAutomationPreview ?? null;
  const provenance = after.smartProfile?.provenance ?? {};
  results.after = {
    status: after.status ?? null,
    aiReviewStatus: after.aiReviewStatus ?? null,
    aiProcessingStage: after.aiProcessingStage ?? null,
    aiReviewedBy: after.aiReviewedBy ?? null,
    readyAt: after.readyAt ?? null,
    portalCatalogPublicationStatus: after.portalCatalogPublicationStatus ?? null,
    isExplicitContent: after.isExplicitContent ?? null,
    censoredTerms: after.censoredTerms ?? null,
    automationDecision: provenance.automationDecision ?? null,
    automationReasonCodes: provenance.automationReasonCodes ?? null,
    promptVersion: provenance.promptVersion ?? null,
    normalizerVersion: provenance.normalizerVersion ?? null,
    explicitAutomationPreview: preview,
    suggestionTitle: after.aiSuggestions?.title ?? null,
  };

  results.finishedAt = new Date().toISOString();
  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  // Cleanup temp staff user only (keep fixture for owner QA)
  try {
    await authAdmin.deleteUser(user.uid);
    await db.collection("users").doc(user.uid).delete();
  } catch (err) {
    console.warn("temp user cleanup warning", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
