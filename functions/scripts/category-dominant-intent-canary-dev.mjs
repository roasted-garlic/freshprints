/**
 * Category dominant-intent calibration — Gate A #9 + four-design canary (fresh-prints-dev ONLY).
 * Uses trusted Studio path: enqueueAiEnrichment({ designId, rerunFromReview: true }).
 * No Ready Catalog / bulk reprocess. Leaves enriched profiles for owner QA.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/category-dominant-intent-canary-dev.mjs
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
const OUT_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_category-dominant-intent-canary-dev-results.json",
);
const GATE_A_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_category-dominant-intent-gate-a-9-dev-result.json",
);

const RUN_ID = Date.now().toString(36);
const PASSWORD = `CatCanary33-${randomBytes(18).toString("base64url")}!aA1`;

const EXPECTED_PROMPT = "catalog-enrich-v33";
const EXPECTED_NORMALIZER = "smart-profile-normalizer-v6";

const FIXTURES = [
  {
    slot: 1,
    id: "7bVlWMFwxECdfHH8VNPB",
    label: "F-CAW-F raven joke",
    expectedPrimary: "Funny & Sarcastic",
    forbiddenPrimary: "Animals",
    allowedAltIncludes: ["Animals"],
  },
  {
    slot: 9,
    id: "1Ws0T9fivryest6IUSbt",
    label: "Just Hit It / cannabis leaves",
    expectedPrimary: "Cannabis & 420",
    forbiddenPrimary: null,
    allowedAltIncludes: ["Funny & Sarcastic"],
  },
  {
    slot: 12,
    id: "7BjqFQIhkavo80sv5kCp",
    label: "Aries / zodiac / ram",
    expectedPrimary: "Astrology & Zodiac",
    forbiddenPrimary: "Pop Culture & Characters",
    allowedAltIncludes: [],
  },
  {
    slot: 13,
    id: "E2fVUzTL8Smx0gXaGqUZ",
    label: "I Am Their Father / Darth Vader",
    expectedPrimary: "Pop Culture & Characters",
    forbiddenPrimary: "Family",
    allowedAltIncludes: [],
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
  const projectId = process.env.FIREBASE_PROJECT_ID || PROJECT_ID;
  if (projectId !== PROJECT_ID) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${PROJECT_ID}`);
  }
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }
  return getFirestore();
}

function altNames(alternatives) {
  if (!Array.isArray(alternatives)) return [];
  return alternatives
    .map((a) => (typeof a === "string" ? a : a?.name))
    .filter((n) => typeof n === "string" && n.trim().length > 0);
}

function summarizeDesign(data) {
  const sp = data?.smartProfile ?? {};
  const prov = sp.provenance ?? {};
  const suggestions = data?.aiSuggestions ?? {};
  const reasons = Array.isArray(prov.automationReasonCodes) ? prov.automationReasonCodes : [];
  return {
    status: data?.status ?? null,
    aiReviewStatus: data?.aiReviewStatus ?? null,
    rootTitle: data?.title ?? null,
    aiSuggestedTitle: suggestions.title ?? null,
    aiSuggestedDescription: suggestions.description ?? null,
    categoryId: data?.categoryId ?? suggestions.categoryId ?? null,
    categoryName: data?.categoryName ?? suggestions.categoryName ?? null,
    categoryAlternatives: sp.categoryAlternatives ?? [],
    categoryAlternativeNames: altNames(sp.categoryAlternatives),
    subjects: Array.isArray(sp.subjects) ? sp.subjects : [],
    objects: Array.isArray(sp.objects) ? sp.objects : [],
    themes: Array.isArray(sp.themes) ? sp.themes : [],
    interests: Array.isArray(sp.interests) ? sp.interests : [],
    searchConcepts: Array.isArray(sp.searchConcepts) ? sp.searchConcepts : [],
    visibleText: Array.isArray(sp.visibleText) ? sp.visibleText : [],
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    schemaVersion: prov.schemaVersion ?? sp.schemaVersion ?? null,
    automationDecision: prov.automationDecision ?? null,
    automationReasonCodes: reasons,
    wouldAutoApprove: reasons.includes("shadow_would_auto_approve"),
  };
}

function evaluateFixture(fixture, after) {
  const notes = [];
  const primary = after.categoryName ?? "";
  const provenanceOk =
    after.promptVersion === EXPECTED_PROMPT && after.normalizerVersion === EXPECTED_NORMALIZER;
  if (!provenanceOk) {
    return {
      passFail: "FAIL",
      notes: [
        `provenance expected ${EXPECTED_PROMPT}/${EXPECTED_NORMALIZER} got ${after.promptVersion}/${after.normalizerVersion}`,
      ],
    };
  }

  if (after.status === "ready") {
    return { passFail: "FAIL", notes: ["unexpected Ready transition"] };
  }

  let passFail = "PASS";
  if (primary !== fixture.expectedPrimary) {
    passFail = "FAIL";
    notes.push(`primary expected "${fixture.expectedPrimary}" got "${primary || "(none)"}"`);
  }
  if (fixture.forbiddenPrimary && primary === fixture.forbiddenPrimary) {
    passFail = "FAIL";
    notes.push(`forbidden primary still selected: ${fixture.forbiddenPrimary}`);
  }

  for (const allowed of fixture.allowedAltIncludes) {
    if (!after.categoryAlternativeNames.includes(allowed)) {
      notes.push(`optional alternative "${allowed}" absent (note only)`);
    }
  }

  return { passFail, notes };
}

async function waitForEnrichment(ref, { maxPolls = 36, intervalMs = 5000, priorUpdatedAtMs = null } = {}) {
  let data = (await ref.get()).data() || {};
  for (let i = 0; i < maxPolls; i += 1) {
    const prompt = data?.smartProfile?.provenance?.promptVersion;
    const stage = data?.aiProcessingStage;
    const review = data?.aiReviewStatus;
    const updatedAtMs = data?.updatedAt?.toMillis?.() ?? null;
    const advanced =
      priorUpdatedAtMs == null ||
      (updatedAtMs != null && updatedAtMs > priorUpdatedAtMs) ||
      stage === "analyzing" ||
      stage === "processing" ||
      stage === "ready_for_review";
    const done =
      advanced &&
      prompt &&
      (review === "needs_review" || stage === "ready_for_review" || stage === "failed") &&
      stage !== "analyzing" &&
      stage !== "processing";
    if (done) break;
    await new Promise((r) => setTimeout(r, intervalMs));
    data = (await ref.get()).data() || {};
    console.log(
      `  wait ${i + 1}/${maxPolls} stage=${stage} review=${review} prompt=${prompt ?? "(none)"} updated=${updatedAtMs}`,
    );
  }
  return data;
}

async function readTaxonomyEvidence(db) {
  const metaSnap = await db.collection("taxonomyMaterialization").doc("meta").get();
  const meta = metaSnap.exists ? metaSnap.data() : null;
  const revision = typeof meta?.revision === "number" ? meta.revision : null;
  const ready = meta?.ready === true;

  let cannabisPresent = false;
  let astrologyPresent = false;
  let categoryNameSampleCount = 0;
  let corpusSource = "none";

  const chunkCount = typeof meta?.chunkCount === "number" ? meta.chunkCount : 0;
  const names = [];
  for (let i = 0; i < chunkCount; i += 1) {
    const chunkSnap = await db.collection("taxonomyMaterialization").doc(`chunk-${i}`).get();
    if (!chunkSnap.exists) continue;
    corpusSource = "taxonomyMaterialization/chunk-*";
    const cats = chunkSnap.data()?.categories ?? [];
    if (!Array.isArray(cats)) continue;
    for (const c of cats) {
      const n = typeof c === "string" ? c : c?.name;
      if (typeof n === "string" && n.trim()) names.push(n);
    }
  }
  categoryNameSampleCount = names.length;
  cannabisPresent = names.includes("Cannabis & 420");
  astrologyPresent = names.includes("Astrology & Zodiac");

  if (names.length === 0) {
    corpusSource = "categories (active query fallback)";
    const catSnap = await db.collection("categories").where("status", "==", "active").limit(500).get();
    const fallbackNames = catSnap.docs.map((d) => d.data()?.name).filter(Boolean);
    categoryNameSampleCount = fallbackNames.length;
    cannabisPresent = fallbackNames.includes("Cannabis & 420");
    astrologyPresent = fallbackNames.includes("Astrology & Zodiac");
  }

  return {
    revision,
    ready,
    metaKeys: meta ? Object.keys(meta) : [],
    corpusSource,
    cannabisPresent,
    astrologyPresent,
    categoryNameSampleCount,
    categoryCountMeta: meta?.categoryCount ?? null,
  };
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const settingsSnap = await db.collection("settings").doc("aiEnrichment").get();
  const settings = settingsSnap.data() || {};
  const catalogWorkflowMode = settings.catalogWorkflowMode ?? null;
  const catalogAutonomousLiveEnabled = settings.catalogAutonomousLiveEnabled === true;

  const activeJobs = await db
    .collection("catalogReprocessJobs")
    .where("status", "in", ["pending", "running", "paused"])
    .limit(5)
    .get();

  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
    activeReprocessJobs: activeJobs.size,
    expectedPrompt: EXPECTED_PROMPT,
    expectedNormalizer: EXPECTED_NORMALIZER,
    taxonomy: null,
    gateA: null,
    fixtures: [],
    aborted: false,
  };

  if (catalogAutonomousLiveEnabled) {
    results.aborted = true;
    results.abortReason = "catalogAutonomousLiveEnabled is ON";
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (catalogWorkflowMode !== "shadow") {
    results.aborted = true;
    results.abortReason = `expected shadow mode, got ${catalogWorkflowMode}`;
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (activeJobs.size > 0) {
    results.aborted = true;
    results.abortReason = `active reprocess jobs: ${activeJobs.docs.map((d) => d.id).join(",")}`;
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  results.taxonomy = await readTaxonomyEvidence(db);
  console.log("TAXONOMY", JSON.stringify(results.taxonomy, null, 2));

  const email = `cat-canary-v33-${RUN_ID}@freshprints.local`;
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
    displayName: `Category Canary v33 ${RUN_ID}`,
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

  async function enqueueDesign(designId) {
    const snap = await db.collection("designs").doc(designId).get();
    const data = snap.data() || {};
    const payload =
      data.status === "imported" && data.aiReviewStatus === "needs_review"
        ? { designId, rerunFromReview: true }
        : { designId };
    console.log(
      `  enqueue path=${payload.rerunFromReview ? "rerunFromReview" : "plain"} status=${data.status} review=${data.aiReviewStatus}`,
    );
    return enqueue(payload);
  }

  try {
    // Gate A: design #9 first
    const gateFixture = FIXTURES.find((f) => f.slot === 9);
    const gateRef = db.collection("designs").doc(gateFixture.id);
    const gateBefore = summarizeDesign((await gateRef.get()).data() || {});
    console.log(`\n=== GATE A #9 ${gateFixture.id}`);
    let gateCallError = null;
    let gateCallData = null;
    try {
      const callResult = await enqueueDesign(gateFixture.id);
      gateCallData = callResult.data ?? null;
    } catch (err) {
      gateCallError = String(err?.message ?? err);
      console.error("GATE A ENQUEUE FAILED", gateCallError);
    }
    const gateAfterData = await waitForEnrichment(gateRef);
    const gateAfter = summarizeDesign(gateAfterData);
    const gateEval = gateCallError
      ? { passFail: "FAIL", notes: [`enqueue error: ${gateCallError}`] }
      : evaluateFixture(gateFixture, gateAfter);

    let cacheAttribution = "C";
    if (!results.taxonomy.cannabisPresent) {
      cacheAttribution = "C";
      gateEval.notes.push("Cannabis & 420 not found in taxonomy evidence — cannot attribute");
    } else if (gateEval.passFail === "PASS") {
      // Prior WS3 result was Funny; now Cannabis with current taxonomy + calibration.
      // Calibration was required per IR; cache may also have contributed historically.
      cacheAttribution = "B";
      gateEval.notes.push(
        "Attribution B: calibration logic required for reliable outcome; cache-only not proven as sole prior cause (historical TTL possible but not re-created)",
      );
    } else if (gateAfter.categoryName === "Funny & Sarcastic" && results.taxonomy.cannabisPresent) {
      cacheAttribution = "B";
      gateEval.notes.push("Cannabis present but primary still Funny — calibration failure");
    }

    results.gateA = {
      designId: gateFixture.id,
      taxonomy: results.taxonomy,
      before: gateBefore,
      after: gateAfter,
      callableData: gateCallData,
      evaluation: gateEval,
      cacheAttribution,
      cacheAttributionLegend: {
        A: "cache-only contributed materially",
        B: "category-calibration logic was also required",
        C: "cannot determine",
      },
    };
    writeFileSync(GATE_A_JSON, JSON.stringify(results.gateA, null, 2));
    console.log(
      JSON.stringify(
        {
          gateA: true,
          passFail: gateEval.passFail,
          primary: gateAfter.categoryName,
          alts: gateAfter.categoryAlternativeNames,
          prompt: gateAfter.promptVersion,
          attribution: cacheAttribution,
          notes: gateEval.notes,
        },
        null,
        2,
      ),
    );

    if (
      results.taxonomy.cannabisPresent &&
      gateAfter.categoryName === "Funny & Sarcastic" &&
      gateAfter.promptVersion === EXPECTED_PROMPT
    ) {
      results.aborted = true;
      results.abortReason = "[NEEDS OWNER DECISION — CATEGORY CANARY FAILURE #9]";
      writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
      throw new Error(results.abortReason);
    }

    // Full four-design canary (re-run #9 again is OK for consistent evidence set; skip if just done)
    for (const fixture of FIXTURES) {
      const ref = db.collection("designs").doc(fixture.id);
      const before = summarizeDesign((await ref.get()).data() || {});

      // #9 already reprocessed in Gate A — reuse unless provenance wrong
      if (fixture.slot === 9 && results.gateA?.after?.promptVersion === EXPECTED_PROMPT) {
        const evaluation = evaluateFixture(fixture, results.gateA.after);
        results.fixtures.push({
          ...fixture,
          outcome: "reused_gate_a",
          before,
          after: results.gateA.after,
          evaluation,
          passFail: evaluation.passFail,
        });
        console.log(`\n=== CANARY #${fixture.slot} reused Gate A → ${evaluation.passFail}`);
        continue;
      }

      console.log(`\n=== CANARY #${fixture.slot} ${fixture.label} ${fixture.id}`);
      let callError = null;
      let callData = null;
      try {
        const callResult = await enqueueDesign(fixture.id);
        callData = callResult.data ?? null;
      } catch (err) {
        callError = String(err?.message ?? err);
        console.error("ENQUEUE FAILED", callError);
      }
      const afterData = await waitForEnrichment(ref);
      const after = summarizeDesign(afterData);
      const evaluation = callError
        ? { passFail: "FAIL", notes: [`enqueue error: ${callError}`] }
        : evaluateFixture(fixture, after);
      results.fixtures.push({
        ...fixture,
        outcome: callError ? "enqueue_failed" : "enriched",
        before,
        after,
        callableData: callData,
        evaluation,
        passFail: evaluation.passFail,
      });
      console.log(
        JSON.stringify(
          {
            slot: fixture.slot,
            passFail: evaluation.passFail,
            primary: after.categoryName,
            alts: after.categoryAlternativeNames,
            prompt: after.promptVersion,
            normalizer: after.normalizerVersion,
            decision: after.automationDecision,
            reasons: after.automationReasonCodes,
            notes: evaluation.notes,
          },
          null,
          2,
        ),
      );
    }
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

  results.finishedAt = new Date().toISOString();
  results.summary = {
    pass: results.fixtures.filter((f) => f.passFail === "PASS").length,
    fail: results.fixtures.filter((f) => f.passFail === "FAIL").length,
    readyTransitions: results.fixtures.filter((f) => f.after?.status === "ready").length,
  };
  writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log("\nSUMMARY", results.summary);
  console.log("Wrote", OUT_JSON);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
