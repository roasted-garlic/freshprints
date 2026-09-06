/**
 * DEV-only: TD-034 catalog-enrich-v36 cucumber deploy QA.
 * Settings Use-current-default via updateAiEnrichmentSettings; Playground + Processing.
 *
 *   node functions/scripts/td034-v36-cucumber-qa-dev.mjs
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
const { getStorage } = require("firebase-admin/storage");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  isDefaultAiEnrichmentPromptTemplate,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
} = require(resolve(
  FUNCTIONS_ROOT,
  "lib/packages/shared/src/constants/aiEnrichment.constants.js",
));

const PROJECT_ID = "fresh-prints-dev";
const DESIGN_ID = "Y2IQuCgAPgnqrBIeJuap";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_td034-v36-cucumber-qa-dev-results.json",
);
const PASSWORD = `Td034V36-${randomBytes(18).toString("base64url")}!aA1`;
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
  return { db: getFirestore(), storage: getStorage() };
}

function settingsPayload(settings, promptTemplate) {
  return {
    visionModelId: settings.visionModelId || "gemini-2.5-flash-lite",
    promptTemplate,
    tagRerankPromptTemplate: settings.tagRerankPromptTemplate || "",
    additionalTagExclusions: settings.additionalTagExclusions || [],
    tagRerankMode: settings.tagRerankMode || "off",
    suggestionAuthorMode: settings.suggestionAuthorMode || "off",
    suggestedNewTagsPolicy: settings.suggestedNewTagsPolicy || "balanced",
    explicitContentAutomationTerms: settings.explicitContentAutomationTerms || [],
  };
}

function summarizePrompt(text) {
  const t = String(text || "");
  return {
    length: t.length,
    hasApprovedCategories: t.includes("{{approved_categories}}"),
    hasExcludedTags: t.includes("{{excluded_tags}}"),
    hasVisualFirst: /4–10 words|4-10 words/.test(t),
    hasReturnTagsEmpty: t.includes("Return tags as []"),
    hasV35SelfConsistency: t.includes("Structured evidence self-consistency"),
    head: t.slice(0, 120).replace(/\s+/g, " "),
  };
}

function captureDesign(data) {
  const sp = data.smartProfile || {};
  const prov = sp.provenance || {};
  const sug = data.aiSuggestions || {};
  return {
    designId: DESIGN_ID,
    status: data.status ?? null,
    aiReviewStatus: data.aiReviewStatus ?? null,
    aiProcessingStage: data.aiProcessingStage ?? null,
    model: prov.model || sug.model || null,
    provider: prov.provider || sug.provider || null,
    promptVersion: prov.promptVersion || sug.promptVersion || null,
    normalizerVersion: prov.normalizerVersion || null,
    profileVersion: prov.version || sp.version || null,
    generatedAt: prov.generatedAt || sug.generatedAt || null,
    title: sug.title || data.title || null,
    description: sug.description || data.description || null,
    category: sug.categoryName || sug.category || data.categoryName || null,
    suggestedTags: sug.tags ?? null,
    suggestedNewTags: sug.suggestedNewTags ?? null,
    tagRerankStatus: sug.tagRerankStatus ?? null,
    tagRerankPromptVersion: sug.tagRerankPromptVersion ?? null,
    centralSubject: sp.centralSubject ?? null,
    subjects: sp.subjects ?? null,
    objects: sp.objects ?? null,
    styles: sp.styles ?? null,
    themes: sp.themes ?? null,
    interests: sp.interests ?? null,
    professionsGroups: sp.professionsGroups ?? null,
    occasions: sp.occasions ?? null,
    places: sp.places ?? null,
    colors: sp.colors ?? null,
    searchConcepts: sp.searchConcepts ?? null,
    visibleText: sp.visibleText ?? null,
    hardBlockers: prov.automationReasonCodes ?? null,
    softReasons: prov.softReasonCodes ?? null,
    wouldAutoApprove:
      typeof prov.wouldAutoApprove === "boolean" ? prov.wouldAutoApprove : null,
    automationDecision: prov.automationDecision ?? null,
    explicit: data.isExplicitContent ?? data.explicitContent ?? null,
    censoredTerms: data.censoredTerms ?? null,
    lifecycleStatus: data.status ?? null,
  };
}

function parsePlaygroundOutput(outputText) {
  try {
    return JSON.parse(outputText);
  } catch {
    return { _parseError: true, raw: String(outputText || "").slice(0, 2000) };
  }
}

async function downloadDesignImageBase64(db, storage, designId) {
  const data = (await db.collection("designs").doc(designId).get()).data() || {};
  const candidates = [
    data.previewPath,
    data.previewStoragePath,
    data.artworkPreviewPath,
    data.printReadyPath,
    data.storagePath,
    data.originalPath,
    data.files?.previewPath,
    data.files?.printReadyPath,
  ].filter((v) => typeof v === "string" && v.trim());
  if (candidates.length === 0) {
    throw new Error(`No image path on design ${designId}`);
  }
  const path = String(candidates[0]).replace(/^\/+/, "");
  const [buf] = await storage.bucket().file(path).download();
  return {
    imageBase64: buf.toString("base64"),
    imageContentType: path.endsWith(".png") ? "image/png" : "image/webp",
    storagePath: path,
  };
}

async function main() {
  const { db, storage } = ensureAdmin();
  const authAdmin = getAuth();
  const settingsRef = db.collection("settings").doc("aiEnrichment");
  const settingsBefore = (await settingsRef.get()).data() || {};

  if (
    settingsBefore.catalogWorkflowMode !== "shadow" ||
    settingsBefore.catalogAutonomousLiveEnabled === true
  ) {
    throw new Error(`Autonomous gate not shadow/off: ${JSON.stringify({
      catalogWorkflowMode: settingsBefore.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: settingsBefore.catalogAutonomousLiveEnabled,
    })}`);
  }

  const persistedBefore = settingsBefore.promptTemplate || "";
  const settingsState = {
    before: summarizePrompt(persistedBefore),
    isDefaultBefore: isDefaultAiEnrichmentPromptTemplate(persistedBefore),
    isPreviousDefaultBefore: isPreviousDefaultAiEnrichmentPromptTemplate(persistedBefore),
    resolvedWouldBeDefault: resolveAiEnrichmentPromptTemplate(persistedBefore) ===
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    customDetected:
      !isDefaultAiEnrichmentPromptTemplate(persistedBefore) &&
      !isPreviousDefaultAiEnrichmentPromptTemplate(persistedBefore),
  };

  const email = `td034-v36-cucumber-${RUN_ID}@freshprints.local`;
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
    displayName: `TD034 v36 Cucumber QA ${RUN_ID}`,
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
  const updateSettings = httpsCallable(fns, "updateAiEnrichmentSettings", { timeout: 60_000 });
  const playground = httpsCallable(fns, "testAiEnrichmentPlayground", { timeout: 180_000 });
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });

  let useCurrentDefaultRequired = !settingsState.isDefaultBefore;
  let saveRequired = useCurrentDefaultRequired;
  let saveResult = null;
  let saveError = null;
  let autoUpgradedOnSave = false;

  if (saveRequired) {
    console.log("Saving Use current default (v36) via updateAiEnrichmentSettings...");
    try {
      const resp = await updateSettings(
        settingsPayload(settingsBefore, DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE),
      );
      saveResult = resp.data;
      autoUpgradedOnSave = true;
    } catch (err) {
      saveError = {
        message: err instanceof Error ? err.message : String(err),
        code: err?.code ?? null,
        details: err?.details ?? null,
      };
      console.error("Settings save failed:", saveError);
    }
  }

  const settingsAfterSave = (await settingsRef.get()).data() || {};
  const persistedAfter = settingsAfterSave.promptTemplate || "";
  const persistedIsV36Default = isDefaultAiEnrichmentPromptTemplate(persistedAfter);

  const image = await downloadDesignImageBase64(db, storage, DESIGN_ID);
  const playgroundPrompt = persistedIsV36Default
    ? persistedAfter
    : DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;

  console.log("Running Playground with v36 default text...");
  const playgroundStarted = Date.now();
  const playgroundCall = await playground({
    prompt: playgroundPrompt,
    visionModelId: settingsAfterSave.visionModelId || "gemini-2.5-flash-lite",
    imageBase64: image.imageBase64,
    imageContentType: image.imageContentType,
  });
  const playgroundData = playgroundCall.data || {};
  const playgroundJson = parsePlaygroundOutput(playgroundData.outputText || "");
  const unexpectedKeys = Object.keys(playgroundJson).filter(
    (k) =>
      ![
        "title",
        "description",
        "category",
        "tags",
        "readableTextLines",
        "centralSubject",
        "subjects",
        "objects",
        "styles",
        "themes",
        "interests",
        "professionsGroups",
        "occasions",
        "places",
        "colors",
        "searchConcepts",
        "categoryAlternatives",
        "categoryGapNote",
        "halftoneShadowLikelihood",
        "halftoneShadowEvidence",
        "_parseError",
        "raw",
      ].includes(k),
  );

  console.log("Enqueue Processing reprocess...");
  const priorRaw = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
  const prior = captureDesign(priorRaw);
  const startedAt = Date.now();
  const reviewStatus = priorRaw.aiReviewStatus;
  const enqueuePayload =
    reviewStatus === "needs_review" || reviewStatus === "rejected"
      ? { designId: DESIGN_ID, rerunFromReview: true }
      : { designId: DESIGN_ID };
  console.log("enqueuePayload", JSON.stringify(enqueuePayload), "aiReviewStatus=", reviewStatus);
  const call = await enqueue(enqueuePayload);

  let data = priorRaw;
  let capture = prior;
  for (let i = 0; i < 90; i++) {
    await sleep(3000);
    const snap = await db.collection("designs").doc(DESIGN_ID).get();
    data = snap.data() || {};
    capture = captureDesign(data);
    const stage = data.aiProcessingStage;
    const updatedMs =
      data.updatedAt?.toMillis?.() ||
      (typeof data.updatedAt?._seconds === "number" ? data.updatedAt._seconds * 1000 : 0);
    const fresh =
      updatedMs >= startedAt - 10_000 || capture.promptVersion === "catalog-enrich-v36";
    if (
      fresh &&
      (stage === "ready_for_review" ||
        stage === "failed" ||
        (data.aiReviewStatus === "needs_review" &&
          capture.promptVersion === "catalog-enrich-v36"))
    ) {
      break;
    }
    process.stdout.write(".");
  }
  console.log("");

  if (capture.promptVersion && capture.promptVersion !== "catalog-enrich-v36") {
    const mismatch = {
      error: "[V36 PROVENANCE DEPLOY MISMATCH]",
      promptVersion: capture.promptVersion,
    };
    writeFileSync(OUT_PATH, JSON.stringify({ mismatch, capture, playgroundData }, null, 2));
    throw new Error(`[V36 PROVENANCE DEPLOY MISMATCH] got ${capture.promptVersion}`);
  }

  const womanGapStill =
    Array.isArray(capture.hardBlockers) &&
    capture.hardBlockers.some((c) => String(c).includes("subjects:woman"));

  const out = {
    projectId: PROJECT_ID,
    runId: RUN_ID,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    settings: {
      ...settingsState,
      useCurrentDefaultRequired,
      saveRequired,
      saveError,
      autoUpgradedOnSave,
      after: summarizePrompt(persistedAfter),
      persistedIsV36Default,
      visionModelId: settingsAfterSave.visionModelId ?? null,
      tagRerankMode: settingsAfterSave.tagRerankMode ?? null,
      catalogWorkflowMode: settingsAfterSave.catalogWorkflowMode ?? null,
      catalogAutonomousLiveEnabled:
        settingsAfterSave.catalogAutonomousLiveEnabled === true,
    },
    playground: {
      elapsedMs: Date.now() - playgroundStarted,
      model: playgroundData.visionModelId ?? null,
      provider: playgroundData.provider ?? null,
      version: playgroundData.version ?? null,
      promptTokens: playgroundData.promptTokens ?? null,
      completionTokens: playgroundData.completionTokens ?? null,
      usedSavedV36Text: persistedIsV36Default,
      imagePath: image.storagePath,
      output: playgroundJson,
      unexpectedKeys,
      tagsIsEmptyArray: Array.isArray(playgroundJson.tags) && playgroundJson.tags.length === 0,
      hasPromptKey: Object.prototype.hasOwnProperty.call(playgroundJson, "prompt"),
    },
    processing: {
      callable: call.data ?? null,
      prior,
      capture,
      womanGapStill,
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        settings: out.settings,
        playground: {
          model: out.playground.model,
          provider: out.playground.provider,
          title: playgroundJson.title,
          description: playgroundJson.description,
          category: playgroundJson.category,
          tags: playgroundJson.tags,
          subjects: playgroundJson.subjects,
          objects: playgroundJson.objects,
          unexpectedKeys,
        },
        processing: {
          promptVersion: capture.promptVersion,
          title: capture.title,
          description: capture.description,
          category: capture.category,
          suggestedTags: capture.suggestedTags,
          tagRerankStatus: capture.tagRerankStatus,
          subjects: capture.subjects,
          objects: capture.objects,
          hardBlockers: capture.hardBlockers,
          automationDecision: capture.automationDecision,
          womanGapStill,
        },
      },
      null,
      2,
    ),
  );

  try {
    await authAdmin.deleteUser(user.uid);
    await db.collection("users").doc(user.uid).delete();
  } catch {
    /* best-effort */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
