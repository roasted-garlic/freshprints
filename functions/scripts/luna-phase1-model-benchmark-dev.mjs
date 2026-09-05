/**
 * Bounded three-model DEV benchmark (Luna Phase 1 signoff support).
 * Same designs × gemini-2.5-flash-lite / gemini-3.1-flash-lite / gpt-5.6-luna
 * via run-scoped visionModelIdOverride only — does NOT mutate settings default.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/luna-phase1-model-benchmark-dev.mjs
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
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_luna-phase1-model-benchmark-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `LunaBench-${randomBytes(18).toString("base64url")}!aA1`;

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gpt-5.6-luna",
];

/** Representative TD-034 friction + ordinary controls (imported / needs_review). */
const BENCHMARK_DESIGNS = [
  {
    id: "Y2IQuCgAPgnqrBIeJuap",
    label: "cucumber / woman subject gap",
    bucket: "evidence_friction_subject",
  },
  {
    id: "03cbj1cIFH7Bavt38XBX",
    label: "MJ / hat object gap",
    bucket: "evidence_friction_object",
  },
  {
    id: "1Ws0T9fivryest6IUSbt",
    label: "cannabis leaves object gap",
    bucket: "evidence_friction_object",
  },
  {
    id: "LYJcsxnfUyacRWtntEkd",
    label: "highland cow / stars object gap",
    bucket: "evidence_friction_object",
  },
  {
    id: "nff6PpkZF9TNitnpX2Mm",
    label: "Boston Terrier / flowers object gap",
    bucket: "evidence_friction_object",
  },
  {
    id: "Bilulhd5Hm7nwv1uZfbA",
    label: "laundry occupation control",
    bucket: "control_occupation",
  },
  {
    id: "6fBRl87jaXyYYGlhapS9",
    label: "Looney Tunes pop-culture control",
    bucket: "control_pop_culture",
  },
  {
    id: "8bGvOZVxkx54Am5rx1EW",
    label: "teddy bear cute control",
    bucket: "control_uncomplicated",
  },
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
  if ((process.env.FIREBASE_PROJECT_ID || PROJECT_ID) !== PROJECT_ID) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${PROJECT_ID}`);
  }
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
    });
  }
  return { db: getFirestore() };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForEnrichment(db, designId, expectedModel, timeoutMs = 240_000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    const snap = await db.collection("designs").doc(designId).get();
    const data = snap.data() || {};
    last = data;
    const stage = data.aiProcessingStage;
    const model = data.aiSuggestions?.model || data.smartProfile?.provenance?.model;
    const generatedAt = data.aiSuggestions?.generatedAt || data.smartProfile?.provenance?.generatedAt;
    const terminal =
      stage === "ready_for_review" ||
      stage === "failed" ||
      data.aiReviewStatus === "needs_review" ||
      data.aiReviewStatus === "approved";
    if (terminal && model === expectedModel && generatedAt) {
      const genMs = Date.parse(generatedAt);
      if (!Number.isNaN(genMs) && genMs >= started - 5_000) {
        return data;
      }
    }
    await sleep(3000);
  }
  throw new Error(
    `Timeout waiting for ${expectedModel} on ${designId}; lastStage=${last?.aiProcessingStage} lastModel=${last?.aiSuggestions?.model}`,
  );
}

function snapshotRun(designMeta, model, data, elapsedMs, error) {
  const suggestions = data?.aiSuggestions || {};
  const profile = data?.smartProfile || {};
  const provenance = profile.provenance || {};
  const reasons = Array.isArray(provenance.automationReasonCodes)
    ? provenance.automationReasonCodes
    : [];
  const evidenceGaps = reasons.filter((r) => String(r).startsWith("structured_evidence_gap:"));
  const wouldAutoApprove =
    reasons.includes("shadow_would_auto_approve") ||
    provenance.automationDecision === "shadow" ||
    (provenance.automationDecision !== "needs_review" &&
      provenance.automationDecision !== "failed" &&
      evidenceGaps.length === 0 &&
      reasons.some((r) => String(r).includes("would_auto_approve")));

  // Prefer explicit shadow_would_auto_approve; else derive from decision+gaps
  let shadowPath = "unknown";
  if (error) {
    shadowPath = "error";
  } else if (provenance.automationDecision === "needs_review" || evidenceGaps.length > 0) {
    shadowPath = "needs_review";
  } else if (
    reasons.includes("shadow_would_auto_approve") ||
    provenance.automationDecision === "shadow"
  ) {
    shadowPath = "would_auto_approve";
  } else if (provenance.automationDecision === "failed") {
    shadowPath = "failed";
  }

  return {
    designId: designMeta.id,
    label: designMeta.label,
    bucket: designMeta.bucket,
    modelId: model,
    providerId: suggestions.provider || provenance.provider || null,
    title: suggestions.title || data?.title || null,
    description: suggestions.description || null,
    visibleText: profile.visibleText || null,
    subjects: profile.subjects || null,
    objects: profile.objects || null,
    searchConcepts: profile.searchConcepts || null,
    categoryName: profile.categoryName || suggestions.categoryName || null,
    categoryAlternatives: profile.categoryAlternatives || null,
    promptVersion: suggestions.promptVersion || provenance.promptVersion || null,
    normalizerVersion: provenance.normalizerVersion || null,
    profileVersion: provenance.version || null,
    automationDecision: provenance.automationDecision || null,
    automationReasonCodes: reasons,
    evidenceGaps,
    shadowPath,
    wouldAutoApproveHeuristic: shadowPath === "would_auto_approve",
    promptTokens: suggestions.promptTokens ?? null,
    completionTokens: suggestions.completionTokens ?? null,
    estimatedCostUsd: suggestions.estimatedCostUsd ?? null,
    generatedAt: suggestions.generatedAt || provenance.generatedAt || null,
    elapsedMs,
    error: error || null,
    aiProcessingStage: data?.aiProcessingStage ?? null,
    aiFailureReason: data?.aiFailureReason ?? data?.aiErrorMessage ?? null,
  };
}

async function main() {
  const { db } = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    runId: RUN_ID,
    models: MODELS,
    designs: BENCHMARK_DESIGNS,
    runs: [],
  };

  const settingsRef = db.collection("settings").doc("aiEnrichment");
  const settingsBefore = (await settingsRef.get()).data() || {};
  results.settingsBefore = {
    visionModelId: settingsBefore.visionModelId ?? null,
    catalogWorkflowMode: settingsBefore.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: settingsBefore.catalogAutonomousLiveEnabled === true,
  };

  if (
    results.settingsBefore.catalogWorkflowMode !== "shadow" ||
    results.settingsBefore.catalogAutonomousLiveEnabled
  ) {
    results.aborted = true;
    results.abortReason = "Autonomous gate not shadow/off";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  // Verify designs exist and are imported/needs_review
  for (const design of BENCHMARK_DESIGNS) {
    const snap = await db.collection("designs").doc(design.id).get();
    if (!snap.exists) {
      throw new Error(`Missing design ${design.id}`);
    }
    const d = snap.data();
    if (d.status !== "imported" || d.aiReviewStatus !== "needs_review") {
      throw new Error(
        `Design ${design.id} not eligible (status=${d.status} aiReviewStatus=${d.aiReviewStatus})`,
      );
    }
  }

  const email = `luna-bench-${RUN_ID}@freshprints.local`;
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
    displayName: `Luna Benchmark ${RUN_ID}`,
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
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });

  try {
    for (const design of BENCHMARK_DESIGNS) {
      for (const model of MODELS) {
        const t0 = Date.now();
        console.log(`[bench] ${design.id} × ${model} …`);
        try {
          await enqueue({
            designId: design.id,
            rerunFromReview: true,
            visionModelIdOverride: model,
          });
          const data = await waitForEnrichment(db, design.id, model);
          const run = snapshotRun(design, model, data, Date.now() - t0, null);
          results.runs.push(run);
          console.log(
            `  → provider=${run.providerId} decision=${run.automationDecision} gaps=${run.evidenceGaps.length} cost=${run.estimatedCostUsd}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`  FAIL ${design.id} ${model}: ${message}`);
          let data = null;
          try {
            data = (await db.collection("designs").doc(design.id).get()).data() || null;
          } catch {
            /* ignore */
          }
          results.runs.push(snapshotRun(design, model, data, Date.now() - t0, message));
        }

        // Confirm global default untouched after each override run
        const mid = (await settingsRef.get()).data() || {};
        if (mid.visionModelId !== results.settingsBefore.visionModelId) {
          throw new Error(
            `Global visionModelId mutated mid-benchmark: ${mid.visionModelId} (expected ${results.settingsBefore.visionModelId})`,
          );
        }
      }
    }
  } finally {
    const settingsAfter = (await settingsRef.get()).data() || {};
    results.settingsAfter = {
      visionModelId: settingsAfter.visionModelId ?? null,
      catalogWorkflowMode: settingsAfter.catalogWorkflowMode ?? null,
      catalogAutonomousLiveEnabled: settingsAfter.catalogAutonomousLiveEnabled === true,
    };
    results.globalDefaultUnchanged =
      results.settingsAfter.visionModelId === results.settingsBefore.visionModelId;
    results.finishedAt = new Date().toISOString();
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    console.log(`Wrote ${OUT_PATH}`);

    try {
      await authAdmin.deleteUser(user.uid);
      await db.collection("users").doc(user.uid).delete();
    } catch (cleanupError) {
      console.warn("QA user cleanup failed", cleanupError);
    }
  }

  if (!results.globalDefaultUnchanged) {
    throw new Error("Global visionModelId changed — investigate");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
