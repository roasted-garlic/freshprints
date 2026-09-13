/**
 * DEV-only: TD-034 catalog-enrich-v37 false category-gap cucumber QA.
 * Settings Use-current-default if needed; N Processing reprocesses; capture gap fields.
 *
 *   node functions/scripts/td034-v37-cucumber-qa-dev.mjs
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
const TARGET_PROMPT = "catalog-enrich-v37";
const RUN_COUNT = 5;
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_td034-v37-cucumber-qa-dev-results.json",
);
const PASSWORD = `Td034V37-${randomBytes(18).toString("base64url")}!aA1`;
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

function captureDesign(data) {
  const sp = data.smartProfile || {};
  const prov = sp.provenance || {};
  const sug = data.aiSuggestions || {};
  const reasonCodes = Array.isArray(prov.automationReasonCodes)
    ? prov.automationReasonCodes
    : [];
  const hardBlockers = reasonCodes.filter(
    (c) =>
      [
        "category_gap_suggested",
        "category_unresolved",
        "description_missing",
        "category_dominant_intent_conflict",
        "verifier_unresolved",
        "explicit_automation_settings_unavailable",
      ].includes(String(c)) ||
      String(c).startsWith("evidence:") ||
      String(c).startsWith("title:") ||
      String(c).startsWith("validation:"),
  );
  const decision = prov.automationDecision ?? null;
  const wouldAutoApprove =
    decision === "shadow" ||
    decision === "auto_approved" ||
    reasonCodes.includes("shadow_would_auto_approve");
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
    category: sug.categoryName || sug.category || data.categoryName || sp.categoryName || null,
    categoryId: sug.categoryId || data.categoryId || sp.categoryId || null,
    categoryAlternatives: sp.categoryAlternatives ?? sug.categoryAlternatives ?? null,
    categoryGapSuggested: sp.categoryGapSuggested === true,
    categoryGapNote: sp.categoryGapEvidence ?? sug.categoryGapNote ?? "",
    categoryGapEvidence: sp.categoryGapEvidence ?? null,
    subjects: sp.subjects ?? null,
    objects: sp.objects ?? null,
    styles: sp.styles ?? null,
    themes: sp.themes ?? null,
    reasonCodes,
    hardBlockers,
    softReasons: prov.softReasonCodes ?? null,
    wouldAutoApprove,
    automationDecision: decision,
  };
}



async function waitForFreshRun(db, startedAt, priorGeneratedAt) {
  let data = {};
  let capture = null;
  for (let i = 0; i < 100; i++) {
    await sleep(3000);
    const snap = await db.collection("designs").doc(DESIGN_ID).get();
    data = snap.data() || {};
    capture = captureDesign(data);
    const stage = data.aiProcessingStage;
    const updatedMs =
      data.updatedAt?.toMillis?.() ||
      (typeof data.updatedAt?._seconds === "number" ? data.updatedAt._seconds * 1000 : 0);
    const newGeneration =
      capture.generatedAt &&
      capture.generatedAt !== priorGeneratedAt &&
      Date.parse(capture.generatedAt) >= startedAt - 15_000;
    const fresh =
      updatedMs >= startedAt - 10_000 ||
      capture.promptVersion === TARGET_PROMPT;
    if (
      fresh &&
      newGeneration &&
      (stage === "ready_for_review" ||
        stage === "failed" ||
        (data.aiReviewStatus === "needs_review" && capture.promptVersion === TARGET_PROMPT) ||
        (data.aiReviewStatus === "approved" && capture.promptVersion === TARGET_PROMPT))
    ) {
      return { data, capture };
    }
    process.stdout.write(".");
  }
  console.log("");
  return { data, capture: captureDesign(data), timedOut: true };
}

async function main() {
  const { db } = ensureAdmin();
  const authAdmin = getAuth();
  const settingsRef = db.collection("settings").doc("aiEnrichment");
  const settingsBefore = (await settingsRef.get()).data() || {};

  if (
    settingsBefore.catalogWorkflowMode !== "shadow" ||
    settingsBefore.catalogAutonomousLiveEnabled === true
  ) {
    throw new Error(
      `Autonomous gate not shadow/off: ${JSON.stringify({
        catalogWorkflowMode: settingsBefore.catalogWorkflowMode,
        catalogAutonomousLiveEnabled: settingsBefore.catalogAutonomousLiveEnabled,
      })}`,
    );
  }

  const persistedBefore = settingsBefore.promptTemplate || "";
  const email = `td034-v37-cucumber-${RUN_ID}@freshprints.local`;
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
    displayName: `TD034 v37 Cucumber QA ${RUN_ID}`,
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
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });

  let saveError = null;
  let autoUpgradedOnSave = false;
  const needsDefault =
    !isDefaultAiEnrichmentPromptTemplate(persistedBefore) &&
    (isPreviousDefaultAiEnrichmentPromptTemplate(persistedBefore) ||
      resolveAiEnrichmentPromptTemplate(persistedBefore) === DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE ||
      !isDefaultAiEnrichmentPromptTemplate(persistedBefore));

  // Always ensure Settings text matches current code default when previous stock default
  // (v36) is stored — do not overwrite genuine customs.
  if (
    isPreviousDefaultAiEnrichmentPromptTemplate(persistedBefore) ||
    !isDefaultAiEnrichmentPromptTemplate(persistedBefore)
  ) {
    if (
      isPreviousDefaultAiEnrichmentPromptTemplate(persistedBefore) ||
      resolveAiEnrichmentPromptTemplate(persistedBefore) === DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE
    ) {
      console.log("Saving Use current default (v37) via updateAiEnrichmentSettings...");
      try {
        await updateSettings(
          settingsPayload(settingsBefore, DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE),
        );
        autoUpgradedOnSave = true;
      } catch (err) {
        saveError = {
          message: err instanceof Error ? err.message : String(err),
          code: err?.code ?? null,
          details: err?.details ?? null,
        };
        console.error("Settings save failed:", saveError);
      }
    } else {
      console.log("Leaving custom Settings prompt unchanged.");
    }
  } else {
    console.log("Settings already on current default.");
  }

  const settingsAfter = (await settingsRef.get()).data() || {};
  const runs = [];

  for (let n = 1; n <= RUN_COUNT; n++) {
    console.log(`\n=== Processing run ${n}/${RUN_COUNT} ===`);
    const priorRaw = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
    const prior = captureDesign(priorRaw);
    const startedAt = Date.now();
    const reviewStatus = priorRaw.aiReviewStatus;
    const enqueuePayload =
      reviewStatus === "needs_review" || reviewStatus === "rejected"
        ? { designId: DESIGN_ID, rerunFromReview: true }
        : { designId: DESIGN_ID };
    const call = await enqueue(enqueuePayload);
    const waited = await waitForFreshRun(db, startedAt, prior.generatedAt);
    const capture = waited.capture;
    if (capture.promptVersion !== TARGET_PROMPT) {
      throw new Error(
        `[V37 PROVENANCE DEPLOY MISMATCH] run ${n} got ${capture.promptVersion}`,
      );
    }
    const summary = {
      run: n,
      timedOut: Boolean(waited.timedOut),
      callable: call.data ?? null,
      promptVersion: capture.promptVersion,
      profileVersion: capture.profileVersion,
      normalizerVersion: capture.normalizerVersion,
      category: capture.category,
      categoryAlternatives: capture.categoryAlternatives,
      categoryGapNote: capture.categoryGapNote,
      categoryGapSuggested: capture.categoryGapSuggested,
      hardBlockers: capture.hardBlockers,
      wouldAutoApprove: capture.wouldAutoApprove,
      automationDecision: capture.automationDecision,
      subjects: capture.subjects,
      objects: capture.objects,
      styles: capture.styles,
      title: capture.title,
      description: capture.description,
      generatedAt: capture.generatedAt,
    };
    runs.push(summary);
    console.log(
      JSON.stringify(
        {
          run: n,
          category: summary.category,
          categoryGapNote: summary.categoryGapNote,
          categoryGapSuggested: summary.categoryGapSuggested,
          hardBlockers: summary.hardBlockers,
          wouldAutoApprove: summary.wouldAutoApprove,
          alternatives: summary.categoryAlternatives,
        },
        null,
        2,
      ),
    );
  }

  const gapSuggestedCount = runs.filter((r) => r.categoryGapSuggested).length;
  const gapHardCount = runs.filter((r) =>
    (r.hardBlockers || []).some((c) => String(c) === "category_gap_suggested"),
  ).length;

  const out = {
    projectId: PROJECT_ID,
    runId: RUN_ID,
    finishedAt: new Date().toISOString(),
    settings: {
      catalogWorkflowMode: settingsAfter.catalogWorkflowMode ?? null,
      catalogAutonomousLiveEnabled: settingsAfter.catalogAutonomousLiveEnabled === true,
      visionModelId: settingsAfter.visionModelId ?? null,
      isDefaultAfter: isDefaultAiEnrichmentPromptTemplate(settingsAfter.promptTemplate || ""),
      autoUpgradedOnSave,
      saveError,
      needsDefault,
      promptHasGapSemantics: String(settingsAfter.promptTemplate || "").includes(
        "Use categoryGapNote only when no approved category is a reasonable fit",
      ),
    },
    runs,
    summary: {
      runCount: runs.length,
      categories: runs.map((r) => r.category),
      categoryAlternatives: runs.map((r) => r.categoryAlternatives),
      categoryGapNotes: runs.map((r) => r.categoryGapNote),
      categoryGapSuggestedCount: gapSuggestedCount,
      categoryGapHardBlockerCount: gapHardCount,
      wouldAutoApprove: runs.map((r) => r.wouldAutoApprove),
      otherHardBlockers: runs.map((r) =>
        (r.hardBlockers || []).filter((c) => String(c) !== "category_gap_suggested"),
      ),
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log("\nWrote", OUT_PATH);
  console.log(JSON.stringify(out.summary, null, 2));

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
