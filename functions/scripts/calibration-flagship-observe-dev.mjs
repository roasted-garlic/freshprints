/**
 * Bounded Smart Profile v28 flagship calibration OBSERVE — fresh-prints-dev ONLY.
 * Non-mutating: shared candidate core only; SHA-256 immutability proof; local JSON output.
 *
 * Usage:
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   $env:GEMINI_API_KEY = (gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=fresh-prints-dev)
 *   node functions/scripts/calibration-flagship-observe-dev.mjs
 *
 * Binding: R4–R10 from Formal Review. Exactly six hard-coded IDs. Abort on hash mismatch.
 */
/* eslint-env node */

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(FUNCTIONS_ROOT, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const ALLOWED_PROJECT = "fresh-prints-dev";
const OUT_PATH = resolve(REPO_ROOT, "docs/workflow/reviews/_calibration-flagship-observe-results.json");

/** Exact six IDs — no CLI override (R4 / R9). */
const FLAGSHIP_IDS = [
  "yJm2VBRvecPNjx79aSnK",
  "6x2LyTvG3ewIePeWHanV",
  "KI7Ncd1O9JCuX9uCq505",
  "mZWO3Lsra91EhNRNEkhR",
  "W1bwk4jrCoQFn0OiyiSU",
  "ltn0gzs2YGXPADqCejr8",
];

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function ensureDevApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID || ALLOWED_PROJECT;
  if (projectId !== ALLOWED_PROJECT) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${ALLOWED_PROJECT}`);
  }
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }
  return projectId;
}

function resolveGeminiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    return execSync(
      "gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=fresh-prints-dev",
      { encoding: "utf8" },
    ).trim();
  } catch {
    throw new Error("GEMINI_API_KEY required (env or gcloud secret)");
  }
}

function loadModules() {
  // Load after ensureDevApp() so admin.ts binds fresh-prints-dev.
  const immutability = require(
    resolve(FUNCTIONS_ROOT, "lib/functions/src/ai/calibrationDesignImmutability.js"),
  );
  const { runAiEnrichmentObserveForDesign } = require(
    resolve(FUNCTIONS_ROOT, "lib/functions/src/ai/aiEnrichmentObserve.js"),
  );

  return {
    FLAGSHIP_OBSERVE_DESIGN_IDS: immutability.FLAGSHIP_OBSERVE_DESIGN_IDS,
    assertFlagshipObserveAllowed: immutability.assertFlagshipObserveAllowed,
    hashCanonicalDesignBusinessSnapshot: immutability.hashCanonicalDesignBusinessSnapshot,
    runAiEnrichmentObserveForDesign,
  };
}

function baselineFromDesign(data) {
  const sp = data?.smartProfile || {};
  const prov = sp.provenance || {};
  return {
    title: data?.title ?? null,
    description: data?.description ?? null,
    categoryId: data?.categoryId ?? null,
    categoryName: data?.categoryName ?? null,
    status: data?.status ?? null,
    aiReviewStatus: data?.aiReviewStatus ?? null,
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    subjects: Array.isArray(sp.subjects) ? sp.subjects : [],
    objects: Array.isArray(sp.objects) ? sp.objects : [],
    themes: Array.isArray(sp.themes) ? sp.themes : [],
    interests: Array.isArray(sp.interests) ? sp.interests : [],
    professionsGroups: Array.isArray(sp.professionsGroups) ? sp.professionsGroups : [],
    occasions: Array.isArray(sp.occasions) ? sp.occasions : [],
    searchConcepts: Array.isArray(sp.searchConcepts) ? sp.searchConcepts : [],
    visibleText: Array.isArray(sp.visibleText) ? sp.visibleText : [],
    smartProfile: sp,
  };
}

function candidateSummary(result) {
  const sp = result.smartProfile || {};
  const prov = sp.provenance || {};
  const suggestions = result.suggestions || {};
  return {
    title: suggestions.title ?? null,
    description: suggestions.description ?? null,
    categoryId: suggestions.categoryId ?? null,
    categoryName: suggestions.categoryName ?? null,
    tags: suggestions.tags ?? [],
    promptVersion: suggestions.promptVersion ?? prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    subjects: Array.isArray(sp.subjects) ? sp.subjects : [],
    objects: Array.isArray(sp.objects) ? sp.objects : [],
    themes: Array.isArray(sp.themes) ? sp.themes : [],
    interests: Array.isArray(sp.interests) ? sp.interests : [],
    professionsGroups: Array.isArray(sp.professionsGroups) ? sp.professionsGroups : [],
    occasions: Array.isArray(sp.occasions) ? sp.occasions : [],
    searchConcepts: Array.isArray(sp.searchConcepts) ? sp.searchConcepts : [],
    visibleText: Array.isArray(result.analysis?.visibleText)
      ? result.analysis.visibleText
      : Array.isArray(sp.visibleText)
        ? sp.visibleText
        : [],
    automationDecision: result.automationDecision?.decision ?? prov.automationDecision ?? null,
    automationReasonCodes:
      result.automationDecision?.reasonCodes ?? prov.automationReasonCodes ?? [],
    provider: result.providerId ?? suggestions.provider ?? null,
    model: result.modelId ?? suggestions.model ?? null,
    smartProfile: sp,
  };
}

async function main() {
  const projectId = ensureDevApp();
  const {
    FLAGSHIP_OBSERVE_DESIGN_IDS,
    assertFlagshipObserveAllowed,
    hashCanonicalDesignBusinessSnapshot,
    runAiEnrichmentObserveForDesign,
  } = loadModules();

  if (FLAGSHIP_OBSERVE_DESIGN_IDS.length !== 6) {
    throw new Error("FLAGSHIP_OBSERVE_DESIGN_IDS must have exactly 6 entries");
  }
  for (let i = 0; i < 6; i++) {
    if (FLAGSHIP_IDS[i] !== FLAGSHIP_OBSERVE_DESIGN_IDS[i]) {
      throw new Error(`Script ID list must match module allowlist at index ${i}`);
    }
  }

  const geminiKey = resolveGeminiKey();
  const db = getFirestore();
  const startedAt = new Date().toISOString();
  const fixtures = [];
  let aborted = false;
  let abortReason = null;

  for (const designId of FLAGSHIP_IDS) {
    assertFlagshipObserveAllowed(projectId, designId);

    const ref = db.collection("designs").doc(designId);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) {
      fixtures.push({
        designId,
        outcome: "missing",
        immutability: "FAIL",
        error: "design_not_found",
      });
      aborted = true;
      abortReason = `design_not_found:${designId}`;
      break;
    }

    const beforeData = beforeSnap.data() || {};
    const beforeHash = hashCanonicalDesignBusinessSnapshot(beforeData);
    const baseline = baselineFromDesign(beforeData);

    let observeResult = null;
    let observeError = null;
    try {
      observeResult = await runAiEnrichmentObserveForDesign({
        designId,
        geminiApiKey: geminiKey,
      });
    } catch (err) {
      observeError = String(err?.message || err);
    }

    const afterSnap = await ref.get();
    const afterData = afterSnap.data() || {};
    const afterHash = hashCanonicalDesignBusinessSnapshot(afterData);
    const immutabilityPass = beforeHash === afterHash;

    const row = {
      designId,
      baseline,
      beforeHash,
      afterHash,
      immutability: immutabilityPass ? "PASS" : "FAIL",
      outcome: observeError ? "error" : "observed",
      error: observeError,
      candidate: observeResult ? candidateSummary(observeResult) : null,
      observedAt: observeResult?.observedAt ?? null,
    };
    fixtures.push(row);

    if (!immutabilityPass) {
      aborted = true;
      abortReason = `immutability_violation:${designId}`;
      console.error(`IMMUTABILITY FAIL on ${designId} — aborting remaining observes`);
      break;
    }

    if (observeError) {
      console.error(`Observe error on ${designId}: ${observeError} — continuing (immutability OK)`);
    } else {
      console.error(
        `OK ${designId} ${row.candidate?.promptVersion} subjects=${JSON.stringify(row.candidate?.subjects?.slice(0, 3))}`,
      );
    }
  }

  const report = {
    projectId,
    startedAt,
    completedAt: new Date().toISOString(),
    aborted,
    abortReason,
    fixtureCountAuthorized: 6,
    fixtureCountAttempted: fixtures.length,
    fixtures,
    note: "Local JSON only. No design writes. No secrets in this file.",
  };

  writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({ outPath: OUT_PATH, aborted, attempted: fixtures.length }, null, 2)}\n`,
  );

  if (aborted) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
