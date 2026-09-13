/**
 * DEV-only: ADR-FP-172 Explicit standard enrichment QA fixtures (shadow, Autonomous OFF).
 * Creates disposable DAMN artwork fixtures and enqueues via deployed callable.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/adr172-explicit-standard-enrichment-qa-fixture-dev.mjs
 *
 * Does not mutate mode/live gate, vocabulary, or forensic design 03cbj1cIFH7Bavt38XBX.
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
const sharp = require("sharp");

const PROJECT_ID = "fresh-prints-dev";
const SELECTED_TERM = "damn";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_adr172-explicit-standard-enrichment-qa-fixture-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Adr172Qa-${randomBytes(18).toString("base64url")}!aA1`;

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

async function renderQaAPng() {
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

/** DAMN text + hat silhouette (no lexical "hat") — aims for structured_evidence_gap if model lists hat. */
async function renderQaBPng() {
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- brim -->
  <ellipse cx="400" cy="260" rx="220" ry="40" fill="#222222"/>
  <!-- crown -->
  <rect x="300" y="120" width="200" height="140" rx="20" fill="#222222"/>
  <text x="400" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="120" font-weight="700" fill="#111111">DAMN</text>
</svg>`);
  const png = await sharp(svg).png().toBuffer();
  const webp = await sharp(png).webp({ quality: 90 }).toBuffer();
  return { png, webp, width: 800, height: 800 };
}

function snapshotDesign(data) {
  const provenance = data.smartProfile?.provenance ?? {};
  return {
    status: data.status ?? null,
    aiReviewStatus: data.aiReviewStatus ?? null,
    aiProcessingStage: data.aiProcessingStage ?? null,
    aiReviewedBy: data.aiReviewedBy ?? null,
    readyAt: data.readyAt ?? null,
    portalCatalogPublicationStatus: data.portalCatalogPublicationStatus ?? null,
    isExplicitContent: data.isExplicitContent ?? null,
    explicitContentSource: data.explicitContentSource ?? null,
    censoredTerms: data.censoredTerms ?? null,
    automationDecision: provenance.automationDecision ?? null,
    automationReasonCodes: provenance.automationReasonCodes ?? null,
    explicitAutomationPreview: provenance.explicitAutomationPreview ?? null,
    suggestionTitle: data.aiSuggestions?.title ?? null,
    suggestionDescription: data.aiSuggestions?.description ?? null,
  };
}

async function createAndEnqueueFixture({
  db,
  bucket,
  uid,
  enqueue,
  label,
  titleSuffix,
  artworkKind,
  render,
}) {
  const designRef = db.collection("designs").doc();
  const designId = designRef.id;
  const originalPath = `/originals/${designId}.png`;
  const previewPath = `/previews/${designId}.webp`;
  const thumbnailPath = `/thumbnails/${designId}.webp`;
  const title = `DEV QA FIXTURE — ADR172 ${titleSuffix} — ${RUN_ID}`;

  const { png, webp, width, height } = await render();
  await bucket.file(originalPath.replace(/^\//, "")).save(png, {
    contentType: "image/png",
    metadata: { metadata: { qaFixture: "adr172-explicit-standard", runId: RUN_ID, label } },
  });
  await bucket.file(previewPath.replace(/^\//, "")).save(webp, { contentType: "image/webp" });
  await bucket.file(thumbnailPath.replace(/^\//, "")).save(webp, { contentType: "image/webp" });

  await designRef.set({
    id: designId,
    title,
    description:
      "DEV QA FIXTURE — DO NOT USE FOR PRODUCTION. ADR-FP-172 Explicit standard enrichment QA.",
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
    uploadedBy: uid,
    createdBy: uid,
    updatedBy: uid,
    importSourceFileName: `adr172-${label}-${RUN_ID}.png`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`ENQUEUE ${label} ${designId}`);
  const callResult = await enqueue({ designId });
  const after = (await designRef.get()).data() || {};
  return {
    label,
    designId,
    title,
    artworkKind,
    selectedTerm: SELECTED_TERM,
    enqueueResponse: callResult.data ?? null,
    after: snapshotDesign(after),
  };
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
    note: "QA C staff edit is owner Studio action on QA A fixture after PASS path",
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

  const email = `adr172-qa-${RUN_ID}@freshprints.local`;
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
    displayName: `ADR172 Explicit QA ${RUN_ID}`,
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

  results.qaA = await createAndEnqueueFixture({
    db,
    bucket,
    uid: user.uid,
    enqueue,
    label: "qa-a",
    titleSuffix: "Shadow Explicit — DAMN",
    artworkKind: "DAMN text only",
    render: renderQaAPng,
  });

  results.qaB = await createAndEnqueueFixture({
    db,
    bucket,
    uid: user.uid,
    enqueue,
    label: "qa-b",
    titleSuffix: "Explicit + Blocker attempt — DAMN + hat shape",
    artworkKind: "DAMN text + hat silhouette (no lexical hat)",
    render: renderQaBPng,
  });

  const qaBCodes = results.qaB.after.automationReasonCodes || [];
  const qaBHasHardBlocker =
    Array.isArray(qaBCodes) &&
    qaBCodes.some(
      (code) =>
        typeof code === "string" &&
        code !== "shadow_would_auto_approve" &&
        !code.startsWith("shadow_"),
    );
  results.qaB.blockerAssessment = {
    automationReasonCodes: qaBCodes,
    likelyHardBlockerPresent: qaBHasHardBlocker,
    note: qaBHasHardBlocker
      ? "Owner should confirm blocker is valid unrelated hard blocker in Studio"
      : "[QA B FIXTURE NEEDS OWNER DECISION] — enrichment did not surface a clear unrelated hard blocker; do not weaken validation",
  };

  results.finishedAt = new Date().toISOString();
  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

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
