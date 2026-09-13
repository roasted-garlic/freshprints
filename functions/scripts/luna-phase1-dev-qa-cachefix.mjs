/**
 * Focused DEV verify: Settings Luna default → enqueue uses openai/gpt-5.6-luna.
 * Also checks override isolation and restores Gemini 2.5 afterward.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

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
const OUT = resolve(REPO_ROOT, "docs/workflow/reviews/_luna-phase1-dev-qa-cachefix-results.json");
const RUN_ID = Date.now().toString(36);
const PASSWORD = `LunaFix-${randomBytes(18).toString("base64url")}!aA1`;

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
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return { db: getFirestore(), bucket: getStorage().bucket() };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForEnrichment(db, designId, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = (await db.collection("designs").doc(designId).get()).data() || {};
    if (data.aiProcessingStage === "ready_for_review" || data.aiProcessingStage === "failed") {
      return data;
    }
    if (data.aiReviewStatus === "needs_review" || data.aiReviewStatus === "approved") return data;
    await sleep(2500);
  }
  throw new Error(`timeout ${designId}`);
}

function settingsPayload(settings, visionModelId) {
  return {
    visionModelId,
    promptTemplate: settings.promptTemplate,
    tagRerankPromptTemplate: settings.tagRerankPromptTemplate || "",
    additionalTagExclusions: settings.additionalTagExclusions || [],
    tagRerankMode: settings.tagRerankMode || "off",
    suggestionAuthorMode: settings.suggestionAuthorMode || "off",
    suggestedNewTagsPolicy: settings.suggestedNewTagsPolicy || "balanced",
    explicitContentAutomationTerms: settings.explicitContentAutomationTerms || [],
  };
}

async function main() {
  const { db, bucket } = ensureAdmin();
  const portalEnv = loadPortalEnv();
  const settingsRef = db.collection("settings").doc("aiEnrichment");
  const settings = (await settingsRef.get()).data() || {};

  const email = `luna-cachefix-${RUN_ID}@freshprints.local`;
  const user = await getAuth().createUser({ email, password: PASSWORD, emailVerified: true });
  await db.collection("users").doc(user.uid).set({
    role: "owner",
    isActive: true,
    email,
    displayName: `Luna cachefix ${RUN_ID}`,
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
  const fns = getFunctions(app, "us-central1");
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });
  const updateSettings = httpsCallable(fns, "updateAiEnrichmentSettings", { timeout: 60_000 });
  const playground = httpsCallable(fns, "testAiEnrichmentPlayground", { timeout: 180_000 });

  // Warm Gemini on enqueue instance, then switch to Luna and enqueue again immediately.
  await updateSettings(settingsPayload(settings, "gemini-2.5-flash-lite"));
  const warmId = db.collection("designs").doc().id;
  const { png, webp } = {
    png: await sharp({
      create: { width: 128, height: 128, channels: 3, background: { r: 250, g: 250, b: 250 } },
    })
      .png()
      .toBuffer(),
    webp: null,
  };
  const webpBuf = await sharp(png).webp().toBuffer();
  async function makeDesign(id, label) {
    const originalPath = `/originals/${id}.png`;
    const previewPath = `/previews/${id}.webp`;
    const thumbnailPath = `/thumbnails/${id}.webp`;
    await bucket.file(originalPath.slice(1)).save(png, { contentType: "image/png" });
    await bucket.file(previewPath.slice(1)).save(webpBuf, { contentType: "image/webp" });
    await bucket.file(thumbnailPath.slice(1)).save(webpBuf, { contentType: "image/webp" });
    await db.collection("designs").doc(id).set({
      id,
      title: `DEV QA FIXTURE — Luna cachefix ${label} — ${RUN_ID}`,
      description: "DEV QA FIXTURE — DO NOT USE FOR PRODUCTION",
      status: "imported",
      tags: [],
      originalPath,
      previewPath,
      thumbnailPath,
      width: 128,
      height: 128,
      dpi: 300,
      printWidthInches: 128 / 300,
      printHeightInches: 128 / 300,
      queueCount: 0,
      aiProcessed: false,
      aiReviewed: false,
      aiReviewStatus: "pending",
      uploadedBy: user.uid,
      createdBy: user.uid,
      updatedBy: user.uid,
      importSourceFileName: `luna-cachefix-${label}-${RUN_ID}.png`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await makeDesign(warmId, "warm-gemini");
  console.log("warm gemini", warmId);
  await enqueue({ designId: warmId });
  const warmAfter = await waitForEnrichment(db, warmId);

  await updateSettings(settingsPayload((await settingsRef.get()).data() || settings, "gpt-5.6-luna"));
  const settingsCheck = (await settingsRef.get()).data()?.visionModelId;

  const lunaId = db.collection("designs").doc().id;
  await makeDesign(lunaId, "luna-after-warm");
  console.log("luna after warm", lunaId);
  await enqueue({ designId: lunaId });
  const lunaAfter = await waitForEnrichment(db, lunaId);

  const tiny = (
    await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer()
  ).toString("base64");
  const playgroundPrompt = [
    "You catalog DTF transfer art. Return only valid JSON.",
    "Approved categories:",
    "{{approved_categories}}",
    "Do not use these tag words: {{excluded_tags}}",
    '{"title":"...","description":"...","category":"...","tags":[]}',
  ].join("\n");
  const lunaPg = await playground({
    prompt: playgroundPrompt,
    visionModelId: "gpt-5.6-luna",
    imageBase64: tiny,
    imageContentType: "image/png",
  });

  let openaiLogs = [];
  try {
    const filter =
      'resource.type="cloud_run_revision" AND jsonPayload.event="provider.selected" AND jsonPayload.providerId="openai"';
    openaiLogs = JSON.parse(
      execSync(
        `gcloud logging read ${JSON.stringify(filter)} --project=${PROJECT_ID} --limit=5 --format=json --freshness=20m`,
        { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
      ) || "[]",
    ).map((row) => ({
      providerId: row.jsonPayload?.providerId,
      modelId: row.jsonPayload?.modelId,
      reasoningEffort: row.jsonPayload?.reasoningEffort ?? null,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    openaiLogs = [{ error: String(error.message || error).slice(0, 160) }];
  }

  await updateSettings(
    settingsPayload((await settingsRef.get()).data() || settings, "gemini-2.5-flash-lite"),
  );
  const finalVisionModelId = (await settingsRef.get()).data()?.visionModelId;

  try {
    await getAuth().deleteUser(user.uid);
    await db.collection("users").doc(user.uid).delete();
  } catch {
    /* ignore */
  }

  const results = {
    warmGemini: {
      designId: warmId,
      provider: warmAfter.aiSuggestions?.provider,
      model: warmAfter.aiSuggestions?.model,
    },
    settingsAfterLunaSave: settingsCheck,
    lunaDefaultAfterWarmCache: {
      designId: lunaId,
      provider: lunaAfter.aiSuggestions?.provider,
      model: lunaAfter.aiSuggestions?.model,
      promptVersion: lunaAfter.aiSuggestions?.promptVersion,
    },
    lunaPlayground: {
      provider: lunaPg.data?.provider,
      visionModelId: lunaPg.data?.visionModelId,
    },
    openaiProviderSelectedLogs: openaiLogs,
    finalVisionModelId,
    pass:
      settingsCheck === "gpt-5.6-luna" &&
      lunaAfter.aiSuggestions?.provider === "openai" &&
      lunaAfter.aiSuggestions?.model === "gpt-5.6-luna" &&
      finalVisionModelId === "gemini-2.5-flash-lite",
  };
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (!results.pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
