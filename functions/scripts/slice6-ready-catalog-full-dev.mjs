/**
 * Slice 6 — full Ready Catalog reprocess on fresh-prints-dev (unbounded).
 *
 *   node functions/scripts/slice6-ready-catalog-full-dev.mjs
 *
 * Env:
 *   SLICE6_FULL_POLL_MS   — poll interval (default 30000)
 *   SLICE6_FULL_MAX_MS    — max wait (default 10h)
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
const { algoliasearch } = require("algoliasearch");

const PROJECT_ID = "fresh-prints-dev";
const PHRASE = "REPROCESS READY CATALOG";
const PROMPT_V30 = "catalog-enrich-v30";
const NORMALIZER_V4 = "smart-profile-normalizer-v4";
const PROMPT_V27 = "catalog-enrich-v27";
const NORMALIZER_V1 = "smart-profile-normalizer-v1";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_slice6-ready-catalog-full-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Slice6Full-${randomBytes(18).toString("base64url")}!aA1`;
const POLL_MS = Number(process.env.SLICE6_FULL_POLL_MS || 30000);
const MAX_MS = Number(process.env.SLICE6_FULL_MAX_MS || 10 * 60 * 60 * 1000);
const JIMOTHY_ID = "6x2LyTvG3ewIePeWHanV";

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
    initAdmin({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
  return getFirestore();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function countQuery(query) {
  const snap = await query.count().get();
  return snap.data().count;
}

function profileVersions(data) {
  const profile = data.smartProfile;
  if (!profile || typeof profile !== "object") {
    return { promptVersion: "(missing)", normalizerVersion: "(missing)", hasProfile: false };
  }
  const promptVersion =
    typeof profile.provenance?.promptVersion === "string" && profile.provenance.promptVersion.trim()
      ? profile.provenance.promptVersion.trim()
      : "(missing)";
  const normalizerVersion =
    typeof profile.provenance?.normalizerVersion === "string" &&
    profile.provenance.normalizerVersion.trim()
      ? profile.provenance.normalizerVersion.trim()
      : "(missing)";
  return { promptVersion, normalizerVersion, hasProfile: true };
}

function classifyTagDensity(tagCount) {
  if (tagCount === 0) return "zeroTags";
  if (tagCount <= 3) return "lowTags";
  return "highTags";
}

async function loadCategoryNames(db) {
  const snap = await db.collection("categories").get();
  const map = new Map();
  for (const doc of snap.docs) {
    const name = doc.data()?.name;
    if (typeof name === "string") map.set(doc.id, name);
  }
  return map;
}

async function snapshotRuntime(db) {
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  const [
    readyTotal,
    readyApproved,
    activeReadyJobs,
    activeQueueJobs,
  ] = await Promise.all([
    countQuery(db.collection("designs").where("status", "==", "ready")),
    countQuery(
      db
        .collection("designs")
        .where("status", "==", "ready")
        .where("aiReviewStatus", "==", "approved"),
    ),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("projectId", "==", PROJECT_ID)
        .where("targetType", "==", "ready_catalog")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("projectId", "==", PROJECT_ID)
        .where("targetType", "==", "ai_review_queue")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
  ]);
  return {
    projectId: PROJECT_ID,
    catalogWorkflowMode: settings.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
    readyTotal,
    readyApprovedEligible: readyApproved,
    readyNotApprovedApprox: Math.max(0, readyTotal - readyApproved),
    activeReadyCatalogJobs: activeReadyJobs,
    activeAiReviewQueueJobs: activeQueueJobs,
  };
}

function assertPreStart(runtime, preview) {
  if (runtime.projectId !== PROJECT_ID) throw new Error("Wrong project");
  if (runtime.catalogWorkflowMode !== "shadow") {
    throw new Error(`Expected shadow, got ${runtime.catalogWorkflowMode}`);
  }
  if (runtime.catalogAutonomousLiveEnabled) throw new Error("Autonomous live ON");
  if (runtime.activeReadyCatalogJobs > 0 || runtime.activeAiReviewQueueJobs > 0) {
    throw new Error("Active reprocess jobs exist");
  }
  if (!preview?.targetEnabled) throw new Error("Ready catalog target not enabled");
}

async function scanReadyInventory(db) {
  const categoryNames = await loadCategoryNames(db);
  let cursor;
  const promptVersionDistribution = {};
  const normalizerVersionDistribution = {};
  let missingProfile = 0;
  let v30v4 = 0;
  let olderPipeline = 0;
  let missingSnapshot = 0;
  let staffEdited = 0;
  let readyNotApproved = 0;
  let totalReady = 0;

  while (true) {
    let q = db.collection("designs").where("status", "==", "ready").orderBy("__name__").limit(100);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      totalReady += 1;
      const data = doc.data();
      if (data.aiReviewStatus !== "approved") readyNotApproved += 1;
      const versions = profileVersions(data);
      promptVersionDistribution[versions.promptVersion] =
        (promptVersionDistribution[versions.promptVersion] || 0) + 1;
      normalizerVersionDistribution[versions.normalizerVersion] =
        (normalizerVersionDistribution[versions.normalizerVersion] || 0) + 1;
      if (!versions.hasProfile) missingProfile += 1;
      else if (versions.promptVersion === PROMPT_V30 && versions.normalizerVersion === NORMALIZER_V4) {
        v30v4 += 1;
      } else if (
        versions.promptVersion === PROMPT_V27 &&
        versions.normalizerVersion === NORMALIZER_V1
      ) {
        olderPipeline += 1;
      }
      if (!data.smartProfileAiSnapshot) missingSnapshot += 1;
      const staffKeys = data.smartProfile?.provenance?.staffEditedDimensionKeys;
      if (Array.isArray(staffKeys) && staffKeys.length > 0) staffEdited += 1;
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 100) break;
  }

  const readyApproved = totalReady - readyNotApproved;
  return {
    totalReady,
    readyApproved,
    readyNotApproved,
    v30v4,
    missingProfile,
    olderPipeline,
    missingSnapshot,
    staffEdited,
    promptVersionDistribution,
    normalizerVersionDistribution,
    categoryNamesSize: categoryNames.size,
  };
}

async function algoliaCheck(portalEnv, designId) {
  const appId = portalEnv.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = portalEnv.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  const indexName = portalEnv.NEXT_PUBLIC_ALGOLIA_INDEX_NAME;
  if (!appId || !searchKey || !indexName) {
    return { checked: false, reason: "algolia_env_missing" };
  }
  try {
    const client = algoliasearch(appId, searchKey);
    const result = await client.searchSingleIndex({
      indexName,
      searchParams: { filters: `objectID:${designId}`, hitsPerPage: 1 },
    });
    const hit = result.hits?.[0];
    return {
      checked: true,
      objectPresent: Boolean(hit),
      hasTitle: Boolean(hit?.title),
      hasSearchText: Boolean(hit?.searchText),
      hasCategoryName: Boolean(hit?.categoryName),
      hasSmartProfileProjection: Boolean(
        hit?.smartSubjects || hit?.searchConcepts || hit?.smartProfile,
      ),
    };
  } catch (error) {
    return { checked: false, reason: error instanceof Error ? error.message : "algolia_error" };
  }
}

function extractSmartProfileHighlights(data) {
  const sp = data.smartProfile;
  if (!sp || typeof sp !== "object") return null;
  const pick = (key) => {
    const v = sp[key];
    return Array.isArray(v) ? v.slice(0, 5) : v ?? null;
  };
  return {
    subjects: pick("subjects"),
    styles: pick("styles"),
    themes: pick("themes"),
    searchConcepts: pick("searchConcepts"),
    visibleText: pick("visibleText"),
  };
}

function bucketOutcome(outcome) {
  const codes = Array.isArray(outcome.automationReasonCodes)
    ? outcome.automationReasonCodes.join(" ")
    : "";
  const buckets = [];
  if (outcome.wouldAutoApprove) buckets.push("wouldAutoApprove");
  if (outcome.hardBlocked) buckets.push("hardBlocked");
  if (outcome.verifierInvoked && outcome.verifierOutcome === "unresolved") {
    buckets.push("verifierUnresolved");
  } else if (outcome.verifierInvoked) buckets.push("verifierInvoked");
  if (outcome.categoryDominantIntentConflict) buckets.push("categoryConflict");
  if (outcome.categoryGap) buckets.push("categoryGap");
  if (/animal|raccoon|dog|cat|bird|bear|wolf|deer|fish|horse|lion|tiger|elephant|monkey|pig|cow|duck|owl|fox|bunny|rabbit|pet|wildlife/i.test(codes)) {
    buckets.push("animals");
  }
  if (/person|character|face|portrait|human|celebrity|cartoon character/i.test(codes)) {
    buckets.push("peopleCharacters");
  }
  if (/profession|group|occupation|job|career|nurse|teacher|doctor|police|firefighter|military|veteran/i.test(codes)) {
    buckets.push("professionsGroups");
  }
  if (/holiday|christmas|halloween|thanksgiving|easter|valentine|fourth|july|new year/i.test(codes)) {
    buckets.push("holidays");
  }
  if (/faith|religion|christian|church|bible|cross|prayer|spiritual/i.test(codes)) {
    buckets.push("faith");
  }
  if (/humor|funny|sarcastic|joke|meme|comedy/i.test(codes)) {
    buckets.push("humor");
  }
  if (outcome.status === "failed" || outcome.status === "anomaly") buckets.push("failedOrAnomaly");
  return buckets.length ? buckets : ["other"];
}

function aggregateDistributions(outcomes) {
  const automationDecision = {};
  const automationReasonCodes = {};
  const promptVersion = {};
  const normalizerVersion = {};
  const outcomeStatus = {};

  for (const o of outcomes) {
    const ad = o.automationDecision ?? "(missing)";
    automationDecision[ad] = (automationDecision[ad] || 0) + 1;
    outcomeStatus[o.status ?? "(missing)"] = (outcomeStatus[o.status ?? "(missing)"] || 0) + 1;
    promptVersion[o.promptVersion ?? "(missing)"] = (promptVersion[o.promptVersion ?? "(missing)"] || 0) + 1;
    normalizerVersion[o.normalizerVersion ?? "(missing)"] =
      (normalizerVersion[o.normalizerVersion ?? "(missing)"] || 0) + 1;
    for (const code of o.automationReasonCodes ?? []) {
      const key = typeof code === "string" ? code : String(code);
      automationReasonCodes[key] = (automationReasonCodes[key] || 0) + 1;
    }
  }

  const topReasonCodes = Object.entries(automationReasonCodes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([code, count]) => ({ code, count }));

  return { automationDecision, automationReasonCodes, topReasonCodes, promptVersion, normalizerVersion, outcomeStatus };
}

async function buildOwnerQASample(db, outcomes, categoryNames, targetSize = 35) {
  const succeeded = outcomes.filter((o) => o.status === "succeeded");
  const byBucket = new Map();
  for (const o of succeeded) {
    for (const b of bucketOutcome(o)) {
      if (!byBucket.has(b)) byBucket.set(b, []);
      byBucket.get(b).push(o);
    }
  }

  const chosen = new Map();
  const priorityBuckets = [
    "wouldAutoApprove",
    "hardBlocked",
    "verifierUnresolved",
    "categoryConflict",
    "categoryGap",
    "animals",
    "peopleCharacters",
    "professionsGroups",
    "holidays",
    "faith",
    "humor",
    "failedOrAnomaly",
    "other",
  ];

  for (const bucket of priorityBuckets) {
    const list = byBucket.get(bucket) ?? [];
    for (const o of list) {
      if (chosen.size >= targetSize) break;
      if (!chosen.has(o.designId)) chosen.set(o.designId, bucket);
    }
    if (chosen.size >= targetSize) break;
  }

  if (!chosen.has(JIMOTHY_ID) && succeeded.some((o) => o.designId === JIMOTHY_ID)) {
    if (chosen.size >= targetSize) {
      const first = chosen.keys().next().value;
      chosen.delete(first);
    }
    chosen.set(JIMOTHY_ID, "jimothyReference");
  }

  for (const o of succeeded) {
    if (chosen.size >= targetSize) break;
    if (!chosen.has(o.designId)) chosen.set(o.designId, "fill");
  }

  const sample = [];
  for (const [designId, stratum] of chosen) {
    const outcome = outcomes.find((o) => o.designId === designId);
    const doc = await db.collection("designs").doc(designId).get();
    const data = doc.data() || {};
    const tags = Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === "string") : [];
    sample.push({
      designId,
      stratum,
      title: data.title ?? null,
      category: data.categoryId ? categoryNames.get(data.categoryId) ?? data.categoryId : null,
      tagCount: tags.length,
      tagDensity: classifyTagDensity(tags.length),
      automationDecision: outcome?.automationDecision ?? data.smartProfile?.automationDecision ?? null,
      wouldAutoApprove: outcome?.wouldAutoApprove ?? null,
      verifierInvoked: outcome?.verifierInvoked ?? null,
      verifierOutcome: outcome?.verifierOutcome ?? null,
      hardBlocked: outcome?.hardBlocked ?? null,
      automationReasonCodes: outcome?.automationReasonCodes ?? null,
      smartProfileHighlights: extractSmartProfileHighlights(data),
      promptVersion: outcome?.promptVersion ?? profileVersions(data).promptVersion,
      normalizerVersion: outcome?.normalizerVersion ?? profileVersions(data).normalizerVersion,
      ownerQAQuestion:
        "Would I trust this Smart Profile and automation decision if this design were imported unattended today?",
      ownerVerdict: null,
    });
  }
  return sample;
}

async function main() {
  const db = ensureAdmin();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const preStartRuntime = await snapshotRuntime(db);
  console.log("Pre-start runtime:", JSON.stringify(preStartRuntime, null, 2));

  const authAdmin = getAuth();
  const email = `slice6-full-${RUN_ID}@freshprints.local`;
  const user = await authAdmin.createUser({
    email,
    password: PASSWORD,
    emailVerified: true,
    disabled: false,
  });
  await db.collection("users").doc(user.uid).set({
    role: "owner",
    email,
    displayName: `Slice6 Full Ready ${RUN_ID}`,
    isActive: true,
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

  const previewFn = httpsCallable(getFunctions(app, "us-central1"), "previewCatalogReprocessJob");
  const startFn = httpsCallable(getFunctions(app, "us-central1"), "startCatalogReprocessJob");

  let previewResponse;
  try {
    console.log("Running preview …");
    previewResponse = (await previewFn({ targetType: "ready_catalog" })).data;
    console.log("Preview eligibleCount:", previewResponse?.eligibleCount);
  } catch (error) {
    await authAdmin.deleteUser(user.uid).catch(() => {});
    await db.collection("users").doc(user.uid).delete().catch(() => {});
    throw error;
  }

  assertPreStart(preStartRuntime, previewResponse);

  const preInventory = await scanReadyInventory(db);
  const startPayload = {
    targetType: "ready_catalog",
    confirmationPhrase: PHRASE,
  };

  let startResponse;
  try {
    console.log("Starting full Ready Catalog job …", JSON.stringify(startPayload));
    startResponse = (await startFn(startPayload)).data;
    console.log("Start response:", JSON.stringify(startResponse, null, 2));
  } finally {
    await authAdmin.deleteUser(user.uid).catch(() => {});
    await db.collection("users").doc(user.uid).delete().catch(() => {});
  }

  const jobId = startResponse?.jobId;
  if (!jobId) throw new Error("No jobId from Start");

  const jobRef = db.collection("catalogReprocessJobs").doc(jobId);
  const jobSnap0 = await jobRef.get();
  const job0 = jobSnap0.data() || {};
  if (Array.isArray(job0.boundedDesignIds) && job0.boundedDesignIds.length > 0) {
    throw new Error(`P0: job is bounded: ${JSON.stringify(job0.boundedDesignIds)}`);
  }

  const activeSnap = await db
    .collection("catalogReprocessJobs")
    .where("projectId", "==", PROJECT_ID)
    .where("targetType", "==", "ready_catalog")
    .where("status", "in", ["pending", "running", "paused"])
    .get();
  if (activeSnap.size !== 1 || activeSnap.docs[0].id !== jobId) {
    throw new Error(`P0: expected exactly one active ready_catalog job (${jobId})`);
  }

  console.log(`Monitoring job ${jobId} (max ${MAX_MS}ms, poll ${POLL_MS}ms) …`);
  const monitorStarted = Date.now();
  let terminalJob = null;
  const pollLog = [];

  while (Date.now() - monitorStarted < MAX_MS) {
    const snap = await jobRef.get();
    const job = snap.data() || {};
    const line = {
      at: new Date().toISOString(),
      status: job.status,
      processed: job.processed ?? 0,
      totalEligible: job.totalEligible ?? null,
      preservationViolations: job.preservationViolations ?? 0,
      remainedReady: job.remainedReady ?? null,
      failed: job.failed ?? 0,
      anomalies: job.anomalies ?? 0,
    };
    pollLog.push(line);
    console.log(JSON.stringify(line));

    if ((job.preservationViolations ?? 0) > 0) {
      throw new Error(`P0 preservationViolations=${job.preservationViolations}`);
    }
    if (job.status === "paused") {
      throw new Error(`P0 job paused: ${job.lastError ?? "unknown"}`);
    }
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      terminalJob = { jobId, ...job };
      break;
    }
    await sleep(POLL_MS);
  }
  if (!terminalJob) throw new Error("Job did not reach terminal state in time");

  const outcomesSnap = await jobRef.collection("outcomes").get();
  const outcomes = outcomesSnap.docs.map((d) => ({ outcomeDocId: d.id, ...d.data() }));
  const distributions = aggregateDistributions(outcomes);

  const lifecycleViolations = outcomes.filter(
    (o) =>
      o.status === "anomaly" ||
      o.errorCode === "ready_lifecycle_violation" ||
      o.finalStatus !== "ready" ||
      (o.finalAiReviewStatus && o.finalAiReviewStatus !== "approved"),
  );

  const categoryNames = await loadCategoryNames(db);
  const postInventory = await scanReadyInventory(db);

  const algoliaSamples = [];
  for (const id of [outcomes[0]?.designId, JIMOTHY_ID, outcomes[outcomes.length - 1]?.designId].filter(
    Boolean,
  )) {
    algoliaSamples.push({ designId: id, ...(await algoliaCheck(portalEnv, id)) });
  }

  const ownerQASample = await buildOwnerQASample(db, outcomes, categoryNames, 35);

  const preservationViolations = terminalJob.preservationViolations ?? 0;
  const safetyGates = {
    preservationViolationsZero: preservationViolations === 0,
    noLifecycleDemotions: lifecycleViolations.length === 0,
    terminalStatusCompleted: terminalJob.status === "completed",
    unboundedJob: !Array.isArray(job0.boundedDesignIds) || job0.boundedDesignIds.length === 0,
    algoliaSpotChecksOk: algoliaSamples.every((s) => !s.checked || s.objectPresent),
  };

  const recommendation =
    safetyGates.preservationViolationsZero &&
    safetyGates.noLifecycleDemotions &&
    safetyGates.terminalStatusCompleted &&
    safetyGates.algoliaSpotChecksOk
      ? "READY FOR OWNER READY-CATALOG QA"
      : "BLOCKED BEFORE OWNER QA";

  const out = {
    projectId: PROJECT_ID,
    branch: "development",
    startedAt: new Date(monitorStarted).toISOString(),
    finishedAt: new Date().toISOString(),
    preStartRuntime,
    previewResponse,
    previewBaselineDelta: {
      priorPreviewEligible: 270,
      currentPreviewEligible: previewResponse?.eligibleCount ?? null,
      currentFirestoreReadyApproved: preStartRuntime.readyApprovedEligible,
      preInventory,
    },
    startPayload,
    startResponse,
    jobId,
    boundedDesignIds: job0.boundedDesignIds ?? null,
    terminalJob: {
      jobId,
      status: terminalJob.status,
      targetType: terminalJob.targetType,
      totalEligible: terminalJob.totalEligible,
      processed: terminalJob.processed,
      succeeded: terminalJob.succeeded,
      failed: terminalJob.failed,
      skipped: terminalJob.skipped,
      remainedReady: terminalJob.remainedReady,
      preservationViolations: terminalJob.preservationViolations,
      wouldAutoApprove: terminalJob.wouldAutoApprove,
      verifierInvoked: terminalJob.verifierInvoked,
      verifierUnresolved: terminalJob.verifierUnresolved,
      hardBlocked: terminalJob.hardBlocked,
      categoryDominantIntentConflict: terminalJob.categoryDominantIntentConflict,
      categoryGap: terminalJob.categoryGap,
      anomalies: terminalJob.anomalies,
      autoApproved: terminalJob.autoApproved,
    },
    distributions,
    lifecycleViolations,
    postInventory,
    algoliaSamples,
    ownerQASample,
    pollLog,
    safetyGates,
    recommendation,
    productionUntouched: true,
    jimothyCalibrationNote: {
      designId: JIMOTHY_ID,
      classification: "owner-accepted false-negative / over-conservative candidate",
    },
    autonomousEnabled: false,
    shadowMode: preStartRuntime.catalogWorkflowMode === "shadow",
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(JSON.stringify({ terminalJob: out.terminalJob, safetyGates, recommendation }, null, 2));

  if (recommendation === "BLOCKED BEFORE OWNER QA") process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
