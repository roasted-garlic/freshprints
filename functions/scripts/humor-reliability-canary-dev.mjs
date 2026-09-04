/**
 * Humor override reliability — DEV deploy canary (fresh-prints-dev ONLY).
 * 10 consecutive reprocesses of #1, then once each #9/#12/#13.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/humor-reliability-canary-dev.mjs
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
  "docs/workflow/reviews/_humor-reliability-canary-dev-results.json",
);

const EXPECTED_PROMPT = "catalog-enrich-v33";
const EXPECTED_NORMALIZER = "smart-profile-normalizer-v6";
const DESIGN_1 = "7bVlWMFwxECdfHH8VNPB";
const RUNS_1 = 10;

const REGRESSIONS = [
  { slot: 9, id: "1Ws0T9fivryest6IUSbt", expected: "Cannabis & 420", forbidden: "Funny & Sarcastic" },
  { slot: 12, id: "7BjqFQIhkavo80sv5kCp", expected: "Astrology & Zodiac", forbidden: "Pop Culture & Characters" },
  { slot: 13, id: "E2fVUzTL8Smx0gXaGqUZ", expected: "Pop Culture & Characters", forbidden: "Family" },
];

const RUN_ID = Date.now().toString(36);
const PASSWORD = `HumorRel-${randomBytes(18).toString("base64url")}!aA1`;

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
  return getFirestore();
}

function altNames(alternatives) {
  if (!Array.isArray(alternatives)) return [];
  return alternatives
    .map((a) => (typeof a === "string" ? a : a?.name))
    .filter((n) => typeof n === "string" && n.trim());
}

function summarize(data) {
  const sp = data?.smartProfile ?? {};
  const prov = sp.provenance ?? {};
  const sug = data?.aiSuggestions ?? {};
  const reasons = Array.isArray(prov.automationReasonCodes) ? prov.automationReasonCodes : [];
  return {
    status: data?.status ?? null,
    aiReviewStatus: data?.aiReviewStatus ?? null,
    rootTitle: data?.title ?? null,
    aiSuggestedTitle: sug.title ?? null,
    aiSuggestedDescription: sug.description ?? null,
    rawModelCategory: data?.aiAnalysis?.rawCategory ?? null,
    finalCategory: data?.categoryName ?? sug.categoryName ?? null,
    categoryAlternatives: altNames(sp.categoryAlternatives),
    subjects: Array.isArray(sp.subjects) ? sp.subjects : [],
    objects: Array.isArray(sp.objects) ? sp.objects : [],
    themes: Array.isArray(sp.themes) ? sp.themes : [],
    searchConcepts: Array.isArray(sp.searchConcepts) ? sp.searchConcepts : [],
    visibleText: Array.isArray(sp.visibleText) ? sp.visibleText : [],
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    automationDecision: prov.automationDecision ?? null,
    automationReasonCodes: reasons,
    wouldAutoApprove: reasons.includes("shadow_would_auto_approve"),
  };
}

async function waitForAdvance(ref, priorUpdatedAtMs, { maxPolls = 40, intervalMs = 5000 } = {}) {
  let data = (await ref.get()).data() || {};
  for (let i = 0; i < maxPolls; i += 1) {
    const ms = data?.updatedAt?.toMillis?.() ?? 0;
    const prompt = data?.smartProfile?.provenance?.promptVersion;
    const stage = data?.aiProcessingStage;
    const review = data?.aiReviewStatus;
    const advanced = ms > priorUpdatedAtMs;
    const done =
      advanced &&
      prompt === EXPECTED_PROMPT &&
      review === "needs_review" &&
      stage !== "analyzing" &&
      stage !== "processing";
    if (done) return data;
    await new Promise((r) => setTimeout(r, intervalMs));
    data = (await ref.get()).data() || {};
    console.log(`  wait ${i + 1}/${maxPolls} ms=${ms} stage=${stage} review=${review} prompt=${prompt ?? "(none)"}`);
  }
  return data;
}

async function enqueueDesign(db, enqueue, designId) {
  const snap = await db.collection("designs").doc(designId).get();
  const data = snap.data() || {};
  const priorMs = data?.updatedAt?.toMillis?.() ?? 0;
  const payload =
    data.status === "imported" && data.aiReviewStatus === "needs_review"
      ? { designId, rerunFromReview: true }
      : { designId };
  console.log(
    `  enqueue path=${payload.rerunFromReview ? "rerunFromReview" : "plain"} status=${data.status} review=${data.aiReviewStatus}`,
  );
  const call = await enqueue(payload);
  const after = await waitForAdvance(db.collection("designs").doc(designId), priorMs);
  return { callData: call.data ?? null, after: summarize(after), priorMs };
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
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
    design1Runs: [],
    regressions: [],
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
    results.abortReason = `expected shadow, got ${catalogWorkflowMode}`;
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (activeJobs.size > 0) {
    results.aborted = true;
    results.abortReason = `active reprocess jobs: ${activeJobs.docs.map((d) => d.id).join(",")}`;
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  const email = `humor-rel-${RUN_ID}@freshprints.local`;
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
    displayName: `Humor Reliability ${RUN_ID}`,
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
  const enqueue = httpsCallable(getFunctions(app, "us-central1"), "enqueueAiEnrichment");

  try {
    for (let run = 1; run <= RUNS_1; run += 1) {
      console.log(`\n=== #1 RUN ${run}/${RUNS_1} ${DESIGN_1}`);
      let row;
      try {
        const { callData, after } = await enqueueDesign(db, enqueue, DESIGN_1);
        const passFail =
          after.finalCategory === "Funny & Sarcastic" &&
          after.promptVersion === EXPECTED_PROMPT &&
          after.normalizerVersion === EXPECTED_NORMALIZER &&
          after.status !== "ready"
            ? "PASS"
            : "FAIL";
        row = {
          run,
          designId: DESIGN_1,
          rawModelCategory: after.rawModelCategory,
          finalCategory: after.finalCategory,
          alternatives: after.categoryAlternatives,
          promptVersion: after.promptVersion,
          normalizerVersion: after.normalizerVersion,
          automationDecision: after.automationDecision,
          themes: after.themes,
          searchConcepts: after.searchConcepts,
          subjects: after.subjects,
          visibleText: after.visibleText,
          title: after.aiSuggestedTitle,
          description: after.aiSuggestedDescription,
          status: after.status,
          aiReviewStatus: after.aiReviewStatus,
          callableData: callData,
          passFail,
        };
      } catch (err) {
        row = {
          run,
          designId: DESIGN_1,
          passFail: "FAIL",
          error: String(err?.message ?? err),
        };
      }
      results.design1Runs.push(row);
      console.log(
        JSON.stringify(
          {
            run,
            passFail: row.passFail,
            raw: row.rawModelCategory,
            final: row.finalCategory,
            themes: row.themes,
            prompt: row.promptVersion,
          },
          null,
          2,
        ),
      );
      writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));

      if (row.passFail === "FAIL") {
        results.aborted = true;
        results.abortReason = "[NEEDS OWNER DECISION — HUMOR RELIABILITY CANARY FAILURE]";
        results.design1Summary = {
          funnyCount: results.design1Runs.filter((r) => r.finalCategory === "Funny & Sarcastic").length,
          failAtRun: run,
          overall: "FAIL",
        };
        writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
        throw new Error(`${results.abortReason} at run ${run}: final=${row.finalCategory} err=${row.error ?? ""}`);
      }
    }

    results.design1Summary = {
      funnyCount: results.design1Runs.filter((r) => r.finalCategory === "Funny & Sarcastic").length,
      nonFunnyCount: results.design1Runs.filter((r) => r.finalCategory !== "Funny & Sarcastic").length,
      overall: "PASS",
    };

    for (const fixture of REGRESSIONS) {
      console.log(`\n=== REGRESSION #${fixture.slot} ${fixture.id}`);
      const { callData, after } = await enqueueDesign(db, enqueue, fixture.id);
      const passFail =
        after.finalCategory === fixture.expected &&
        after.finalCategory !== fixture.forbidden &&
        after.promptVersion === EXPECTED_PROMPT &&
        after.status !== "ready"
          ? "PASS"
          : "FAIL";
      const row = {
        ...fixture,
        rawModelCategory: after.rawModelCategory,
        finalCategory: after.finalCategory,
        alternatives: after.categoryAlternatives,
        promptVersion: after.promptVersion,
        normalizerVersion: after.normalizerVersion,
        automationDecision: after.automationDecision,
        themes: after.themes,
        searchConcepts: after.searchConcepts,
        subjects: after.subjects,
        visibleText: after.visibleText,
        title: after.aiSuggestedTitle,
        description: after.aiSuggestedDescription,
        status: after.status,
        callableData: callData,
        passFail,
      };
      results.regressions.push(row);
      console.log(JSON.stringify({ slot: fixture.slot, passFail, final: after.finalCategory }, null, 2));
      writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
      if (passFail === "FAIL") {
        results.aborted = true;
        results.abortReason = `[NEEDS OWNER DECISION — HUMOR RELIABILITY CANARY FAILURE] regression #${fixture.slot}`;
        throw new Error(results.abortReason);
      }
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
  results.readyTransitions = [...results.design1Runs, ...results.regressions].filter(
    (r) => r.status === "ready",
  ).length;
  writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log("\nSUMMARY", {
    design1: results.design1Summary,
    regressions: results.regressions.map((r) => ({ slot: r.slot, passFail: r.passFail, final: r.finalCategory })),
    readyTransitions: results.readyTransitions,
  });
  console.log("Wrote", OUT_JSON);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
