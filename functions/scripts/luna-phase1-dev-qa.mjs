/**
 * DEV-only Luna Phase 1 post-deploy QA against fresh-prints-dev deployed callables.
 * Does not print secret values. Restores prior visionModelId unless KEEP_LUNA_DEFAULT=1.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/luna-phase1-dev-qa.mjs
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
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_luna-phase1-dev-qa-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `LunaQa-${randomBytes(18).toString("base64url")}!aA1`;
const KEEP_LUNA = process.env.KEEP_LUNA_DEFAULT === "1";

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

async function renderTinyPng() {
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="256" y="270" text-anchor="middle" font-family="Arial" font-size="48" fill="#111">
    LUNA QA ${RUN_ID}
  </text>
</svg>`);
  const png = await sharp(svg).png().toBuffer();
  const webp = await sharp(png).webp({ quality: 85 }).toBuffer();
  return { png, webp, width: 512, height: 512 };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForEnrichment(db, designId, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snap = await db.collection("designs").doc(designId).get();
    const data = snap.data() || {};
    const stage = data.aiProcessingStage;
    if (stage === "ready_for_review" || stage === "failed") {
      return data;
    }
    if (data.aiReviewStatus === "needs_review" || data.aiReviewStatus === "approved") {
      return data;
    }
    await sleep(3000);
  }
  throw new Error(`Timeout waiting for enrichment on ${designId}`);
}

function settingsUpdatePayload(settings, visionModelId) {
  return {
    visionModelId,
    promptTemplate: settings.promptTemplate,
    tagRerankPromptTemplate: settings.tagRerankPromptTemplate || "",
    additionalTagExclusions: Array.isArray(settings.additionalTagExclusions)
      ? settings.additionalTagExclusions
      : [],
    tagRerankMode: settings.tagRerankMode || "off",
    suggestionAuthorMode: settings.suggestionAuthorMode || "off",
    suggestedNewTagsPolicy: settings.suggestedNewTagsPolicy || "balanced",
    explicitContentAutomationTerms: Array.isArray(settings.explicitContentAutomationTerms)
      ? settings.explicitContentAutomationTerms
      : [],
  };
}

function queryRecentProviderLogs(filterExtra = "") {
  try {
    const filter = [
      'resource.type="cloud_run_revision"',
      'jsonPayload.message="ai-pipeline"',
      'jsonPayload.event="provider.selected"',
      filterExtra,
    ]
      .filter(Boolean)
      .join(" AND ");
    const out = execSync(
      `gcloud logging read ${JSON.stringify(filter)} --project=${PROJECT_ID} --limit=8 --format=json --freshness=15m`,
      { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
    const rows = JSON.parse(out || "[]");
    return rows.map((row) => ({
      event: row.jsonPayload?.event ?? null,
      providerId: row.jsonPayload?.providerId ?? null,
      modelId: row.jsonPayload?.modelId ?? null,
      reasoningEffort: row.jsonPayload?.reasoningEffort ?? null,
      timestamp: row.timestamp ?? null,
    }));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "log_query_failed",
    };
  }
}

async function createImportedDesign(db, bucket, uid, label) {
  const designRef = db.collection("designs").doc();
  const designId = designRef.id;
  const originalPath = `/originals/${designId}.png`;
  const previewPath = `/previews/${designId}.webp`;
  const thumbnailPath = `/thumbnails/${designId}.webp`;
  const { png, webp, width, height } = await renderTinyPng();
  await bucket.file(originalPath.replace(/^\//, "")).save(png, { contentType: "image/png" });
  await bucket.file(previewPath.replace(/^\//, "")).save(webp, { contentType: "image/webp" });
  await bucket.file(thumbnailPath.replace(/^\//, "")).save(webp, { contentType: "image/webp" });
  await designRef.set({
    id: designId,
    title: `DEV QA FIXTURE — Luna Phase1 ${label} — ${RUN_ID}`,
    description: "DEV QA FIXTURE — DO NOT USE FOR PRODUCTION. Luna Phase 1 dual-provider QA.",
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
    importSourceFileName: `luna-phase1-${label}-${RUN_ID}.png`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { designId, designRef, previewPath };
}

async function main() {
  const { db, bucket } = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    runId: RUN_ID,
    revisions: {
      enqueueAiEnrichment: "enqueueaienrichment-00099-cuv",
      testAiEnrichmentPlayground: "testaienrichmentplayground-00059-kuw",
      testAiEnrichmentTagRerank: "testaienrichmenttagrerank-00021-tox",
      reprocessReadyDesignWithAi: "reprocessreadydesignwithai-00010-hab",
      onCatalogReprocessJobWritten: "oncatalogreprocessjobwritten-00021-naw",
    },
  };

  const settingsRef = db.collection("settings").doc("aiEnrichment");
  const settingsSnap = await settingsRef.get();
  const settings = settingsSnap.data() || {};
  const priorVisionModelId =
    typeof settings.visionModelId === "string" && settings.visionModelId.trim()
      ? settings.visionModelId.trim()
      : "gemini-2.5-flash-lite";
  results.priorVisionModelId = priorVisionModelId;
  results.catalogWorkflowMode = settings.catalogWorkflowMode ?? null;
  results.catalogAutonomousLiveEnabled = settings.catalogAutonomousLiveEnabled === true;

  if (results.catalogWorkflowMode !== "shadow" || results.catalogAutonomousLiveEnabled) {
    results.aborted = true;
    results.abortReason = "Autonomous gate not shadow/off";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  const email = `luna-phase1-qa-${RUN_ID}@freshprints.local`;
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
    displayName: `Luna Phase1 QA ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  results.qaUserUid = user.uid;

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
  const playground = httpsCallable(fns, "testAiEnrichmentPlayground", { timeout: 180_000 });
  const tagRerankPg = httpsCallable(fns, "testAiEnrichmentTagRerank", { timeout: 120_000 });
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });
  const updateSettings = httpsCallable(fns, "updateAiEnrichmentSettings", { timeout: 60_000 });
  const reprocess = httpsCallable(fns, "reprocessReadyDesignWithAi", { timeout: 180_000 });

  // Playground enforces 8k prompt max — use a short valid template (Settings prompt may exceed).
  const playgroundPrompt = [
    "You catalog DTF transfer art for apparel. Analyze the image and return only valid JSON.",
    "Approved categories (name — owner description; choose by dominant buyer intent):",
    "{{approved_categories}}",
    "Do not use these tag words: {{excluded_tags}}",
    'Return exactly this JSON and nothing else:',
    '{"title":"...","description":"...","category":"...","tags":["tag candidate"],"readableTextLines":[],"centralSubject":"","subjects":[],"objects":[],"styles":[],"themes":[],"interests":[],"professionsGroups":[],"occasions":[],"places":[],"colors":[],"searchConcepts":[],"categoryAlternatives":[],"categoryGapNote":"","halftoneShadowLikelihood":"none","halftoneShadowEvidence":""}',
  ].join("\n");

  // Tiny 1x1 png base64 for playground (optional image)
  const tiny = (await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer()).toString("base64");

  // 1) Gemini playground regression
  console.log("QA1 Gemini playground...");
  try {
    const geminiPg = await playground({
      prompt: playgroundPrompt,
      visionModelId: "gemini-2.5-flash-lite",
      imageBase64: tiny,
      imageContentType: "image/png",
    });
    results.geminiPlayground = {
      ok: true,
      provider: geminiPg.data?.provider ?? null,
      visionModelId: geminiPg.data?.visionModelId ?? null,
      elapsedMs: geminiPg.data?.elapsedMs ?? null,
      outputPreview: String(geminiPg.data?.outputText || "").slice(0, 120),
    };
  } catch (error) {
    results.geminiPlayground = {
      ok: false,
      errorCategory: error?.code || error?.name || "unknown",
      message: String(error?.message || error).slice(0, 240),
    };
  }

  // Ensure Settings is Gemini before normal enrichment regression
  console.log("QA1 set default Gemini...");
  await updateSettings(settingsUpdatePayload(settings, "gemini-2.5-flash-lite"));
  const afterGeminiDefault = (await settingsRef.get()).data() || {};
  results.geminiDefaultPersist = afterGeminiDefault.visionModelId === "gemini-2.5-flash-lite";

  const geminiDesign = await createImportedDesign(db, bucket, user.uid, "gemini-default");
  console.log("QA1 enqueue Gemini default", geminiDesign.designId);
  await enqueue({ designId: geminiDesign.designId });
  const geminiAfter = await waitForEnrichment(db, geminiDesign.designId);
  results.geminiEnrichment = {
    designId: geminiDesign.designId,
    stage: geminiAfter.aiProcessingStage ?? null,
    reviewStatus: geminiAfter.aiReviewStatus ?? null,
    provider: geminiAfter.aiSuggestions?.provider ?? null,
    model: geminiAfter.aiSuggestions?.model ?? null,
    promptVersion: geminiAfter.aiSuggestions?.promptVersion ?? null,
  };

  // 2) Luna playground live-auth (Playground only — no Settings save yet)
  console.log("QA2 Luna playground live-auth...");
  try {
    const lunaPg = await playground({
      prompt: playgroundPrompt,
      visionModelId: "gpt-5.6-luna",
      imageBase64: tiny,
      imageContentType: "image/png",
    });
    results.lunaPlayground = {
      ok: true,
      provider: lunaPg.data?.provider ?? null,
      visionModelId: lunaPg.data?.visionModelId ?? null,
      elapsedMs: lunaPg.data?.elapsedMs ?? null,
      outputPreview: String(lunaPg.data?.outputText || "").slice(0, 120),
      firstResponseOutputText: String(lunaPg.data?.outputText || ""),
    };
  } catch (error) {
    const msg = String(error?.message || error);
    const authFail =
      /401|403|invalid.?api.?key|incorrect.?api.?key|unauthorized|authentication/i.test(msg);
    results.lunaPlayground = {
      ok: false,
      errorCategory: authFail ? "openai_auth_rejected" : error?.code || error?.name || "unknown",
      message: msg.slice(0, 240),
    };
    results.stoppedForSecretRotation = authFail === true;
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    if (authFail) {
      throw new Error("[LUNA OPENAI AUTH CHECKPOINT] OpenAI rejected authentication/authorization");
    }
    throw error;
  }

  // Confirm Settings still Gemini after playground-only Luna call
  const afterLunaPgSettings = (await settingsRef.get()).data() || {};
  results.playgroundDidNotMutateSettings =
    afterLunaPgSettings.visionModelId === "gemini-2.5-flash-lite";

  // 3) Save Luna as global default + normal enrichment
  console.log("QA3 save Luna default...");
  const settingsNow = (await settingsRef.get()).data() || settings;
  await updateSettings(settingsUpdatePayload(settingsNow, "gpt-5.6-luna"));
  const afterLunaDefault = (await settingsRef.get()).data() || {};
  results.lunaDefaultPersist = afterLunaDefault.visionModelId === "gpt-5.6-luna";

  const lunaDesign = await createImportedDesign(db, bucket, user.uid, "luna-default");
  console.log("QA3 enqueue Luna default", lunaDesign.designId);
  await enqueue({ designId: lunaDesign.designId });
  const lunaAfter = await waitForEnrichment(db, lunaDesign.designId);
  results.lunaEnrichment = {
    designId: lunaDesign.designId,
    stage: lunaAfter.aiProcessingStage ?? null,
    reviewStatus: lunaAfter.aiReviewStatus ?? null,
    provider: lunaAfter.aiSuggestions?.provider ?? null,
    model: lunaAfter.aiSuggestions?.model ?? null,
    promptVersion: lunaAfter.aiSuggestions?.promptVersion ?? null,
  };

  // 4) Override isolation: Luna default + Gemini override
  console.log("QA4 Gemini override while Luna default...");
  const overrideDesign = await createImportedDesign(db, bucket, user.uid, "gemini-override");
  await enqueue({
    designId: overrideDesign.designId,
    visionModelIdOverride: "gemini-3.1-flash-lite",
  });
  const overrideAfter = await waitForEnrichment(db, overrideDesign.designId);
  const settingsAfterOverride = (await settingsRef.get()).data() || {};
  results.overrideIsolation = {
    designId: overrideDesign.designId,
    runProvider: overrideAfter.aiSuggestions?.provider ?? null,
    runModel: overrideAfter.aiSuggestions?.model ?? null,
    settingsVisionModelId: settingsAfterOverride.visionModelId ?? null,
    settingsRemainedLuna: settingsAfterOverride.visionModelId === "gpt-5.6-luna",
  };

  // 5) Secondary path: tag-rerank playground with Luna (uses first Luna playground output)
  console.log("QA5 Luna tag-rerank playground...");
  try {
    const rerank = await tagRerankPg({
      firstResponseOutputText: results.lunaPlayground.firstResponseOutputText,
      visionModelId: "gpt-5.6-luna",
    });
    results.lunaTagRerankPlayground = {
      ok: true,
      visionModelId: "gpt-5.6-luna",
      elapsedMs: rerank.data?.elapsedMs ?? null,
      approvedCandidateCount: Array.isArray(rerank.data?.approvedTagCandidates)
        ? rerank.data.approvedTagCandidates.length
        : null,
      discardedTagCount: Array.isArray(rerank.data?.discardedTags)
        ? rerank.data.discardedTags.length
        : null,
    };
  } catch (error) {
    results.lunaTagRerankPlayground = {
      ok: false,
      errorCategory: error?.code || error?.name || "unknown",
      message: String(error?.message || error).slice(0, 240),
    };
  }

  // Suggestion-author is independent secondary call inside pipeline when mode enabled.
  // Contract: with Luna default, enrichment already recorded provider openai — secondary would
  // share that target. We record current modes for transparency.
  results.secondaryModes = {
    tagRerankMode: afterLunaDefault.tagRerankMode ?? null,
    suggestionAuthorMode: afterLunaDefault.suggestionAuthorMode ?? null,
    note:
      "Pipeline secondary calls inherit resolved provider/model; Playground tag-rerank exercised Luna path above.",
  };

  // 6) Reprocess with Luna default: promote lunaDesign to Ready+approved then reprocess
  console.log("QA6 reprocess Luna...");
  await db.collection("designs").doc(lunaDesign.designId).update({
    status: "ready",
    aiReviewStatus: "approved",
    aiProcessed: true,
    aiReviewed: true,
    readyAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  try {
    const reprocessResult = await reprocess({ designId: lunaDesign.designId });
    const afterReprocess = await waitForEnrichment(db, lunaDesign.designId);
    results.reprocess = {
      ok: true,
      callable: reprocessResult.data ?? null,
      provider: afterReprocess.aiSuggestions?.provider ?? null,
      model: afterReprocess.aiSuggestions?.model ?? null,
      stage: afterReprocess.aiProcessingStage ?? null,
      reviewStatus: afterReprocess.aiReviewStatus ?? null,
    };
  } catch (error) {
    results.reprocess = {
      ok: false,
      errorCategory: error?.code || error?.name || "unknown",
      message: String(error?.message || error).slice(0, 240),
    };
  }

  // Provider logs (names only — no secrets)
  results.providerSelectedLogs = queryRecentProviderLogs();

  // 7) Restore prior default unless KEEP_LUNA_DEFAULT=1
  const restoreTo = KEEP_LUNA ? "gpt-5.6-luna" : priorVisionModelId === "gpt-5.6-luna"
    ? "gemini-2.5-flash-lite"
    : priorVisionModelId;
  const settingsForRestore = (await settingsRef.get()).data() || settingsNow;
  await updateSettings(settingsUpdatePayload(settingsForRestore, restoreTo));
  const finalSettings = (await settingsRef.get()).data() || {};
  results.finalVisionModelId = finalSettings.visionModelId ?? null;
  results.restoredPriorDefault = !KEEP_LUNA;
  results.keepLunaRequested = KEEP_LUNA;

  // Cleanup ephemeral QA user (leave designs for optional owner inspection; mark titles as fixtures)
  try {
    await authAdmin.deleteUser(user.uid);
    await db.collection("users").doc(user.uid).delete();
    results.qaUserCleanup = "deleted";
  } catch (error) {
    results.qaUserCleanup = String(error?.message || error).slice(0, 120);
  }

  // Drop bulky firstResponse from saved results
  if (results.lunaPlayground?.firstResponseOutputText) {
    results.lunaPlayground.firstResponseChars = results.lunaPlayground.firstResponseOutputText.length;
    delete results.lunaPlayground.firstResponseOutputText;
  }

  results.endedAt = new Date().toISOString();
  results.phase1ReadyForOwnerSignoff =
    results.geminiPlayground?.ok === true &&
    results.geminiEnrichment?.provider === "google" &&
    results.lunaPlayground?.ok === true &&
    results.lunaPlayground?.provider === "openai" &&
    results.lunaPlayground?.visionModelId === "gpt-5.6-luna" &&
    results.lunaDefaultPersist === true &&
    results.lunaEnrichment?.provider === "openai" &&
    results.lunaEnrichment?.model === "gpt-5.6-luna" &&
    results.overrideIsolation?.settingsRemainedLuna === true &&
    results.overrideIsolation?.runModel === "gemini-3.1-flash-lite" &&
    results.playgroundDidNotMutateSettings === true;

  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log("WROTE", OUT_PATH);
  console.log(JSON.stringify({
    geminiPg: results.geminiPlayground?.ok,
    lunaPg: results.lunaPlayground?.ok,
    lunaEnrichment: results.lunaEnrichment,
    override: results.overrideIsolation,
    reprocess: results.reprocess?.ok,
    finalVisionModelId: results.finalVisionModelId,
    ready: results.phase1ReadyForOwnerSignoff,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
