/**
 * Slice 6 — bounded 3-design Ready Catalog canary on fresh-prints-dev.
 * Select → before snapshot → Start → monitor → verify.
 *
 *   node functions/scripts/slice6-ready-catalog-canary-dev.mjs
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
  "docs/workflow/reviews/_slice6-ready-catalog-canary-dev-results.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Slice6Canary-${randomBytes(18).toString("base64url")}!aA1`;
const POLL_MS = Number(process.env.SLICE6_CANARY_POLL_MS || 20000);
const MAX_MS = Number(process.env.SLICE6_CANARY_MAX_MS || 45 * 60 * 1000);

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

function classifyTagDensity(tagCount) {
  if (tagCount === 0) return "zeroTags";
  if (tagCount <= 3) return "lowTags";
  return "highTags";
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

function designSnapshot(doc, categoryNames, stratum) {
  const data = doc.data();
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((t) => typeof t === "string")
    : [];
  const versions = profileVersions(data);
  return {
    designId: doc.id,
    stratum,
    title: data.title ?? null,
    categoryId: data.categoryId ?? null,
    categoryName: data.categoryId ? categoryNames.get(data.categoryId) ?? null : null,
    status: data.status ?? null,
    aiReviewStatus: data.aiReviewStatus ?? null,
    aiReviewed: data.aiReviewed ?? null,
    aiReviewedAt: data.aiReviewedAt?.toDate?.()?.toISOString?.() ?? data.aiReviewedAt ?? null,
    aiReviewedBy: data.aiReviewedBy ?? null,
    readyAt: data.readyAt?.toDate?.()?.toISOString?.() ?? data.readyAt ?? null,
    promptVersion: versions.promptVersion,
    normalizerVersion: versions.normalizerVersion,
    smartProfilePresent: versions.hasProfile,
    tagCount: tags.length,
    tagDensityBucket: classifyTagDensity(tags.length),
    tags: tags.slice(0, 12),
    description: typeof data.description === "string" ? data.description.slice(0, 200) : null,
    aiProcessingStage: data.aiProcessingStage ?? null,
    artworkBackgroundHex: data.artworkBackgroundHex ?? null,
    artworkBackgroundSource: data.artworkBackgroundSource ?? null,
    halftoneStaffDecision: data.halftoneStaffDecision ?? null,
    explicitContent: data.explicitContent ?? null,
    censored: data.censored ?? null,
    companionSetId: data.companionSetId ?? null,
    thumbnailPath: data.thumbnailPath ?? null,
    previewPath: data.previewPath ?? null,
  };
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

async function selectCanaryDesigns(db) {
  const categoryNames = await loadCategoryNames(db);
  let cursor;
  const missingProfile = [];
  const oldPipeline = [];
  const highTags = [];

  while (true) {
    let q = db
      .collection("designs")
      .where("status", "==", "ready")
      .where("aiReviewStatus", "==", "approved")
      .orderBy("__name__")
      .limit(100);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const data = doc.data();
      const versions = profileVersions(data);
      const tags = Array.isArray(data.tags)
        ? data.tags.filter((t) => typeof t === "string")
        : [];
      const bucket = classifyTagDensity(tags.length);
      const entry = { doc, categoryId: data.categoryId ?? null, title: data.title ?? "" };

      if (!versions.hasProfile) {
        missingProfile.push(entry);
      }
      if (versions.promptVersion === PROMPT_V27 && versions.normalizerVersion === NORMALIZER_V1) {
        oldPipeline.push(entry);
      }
      if (bucket === "highTags") {
        highTags.push(entry);
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 100) break;
    if (missingProfile.length >= 5 && oldPipeline.length >= 3 && highTags.length >= 10) break;
  }

  if (missingProfile.length === 0) throw new Error("No missing-profile Ready design found");
  if (oldPipeline.length === 0) throw new Error("No v27/v1 Ready design found");
  if (highTags.length === 0) throw new Error("No highTags Ready design found");

  const pickDistinct = (candidates, excludeIds, preferDifferentCategory) => {
    for (const c of candidates) {
      if (excludeIds.has(c.doc.id)) continue;
      if (
        preferDifferentCategory &&
        [...excludeIds].some((id) => {
          const other = candidates.find((x) => x.doc.id === id);
          return other && other.categoryId === c.categoryId;
        })
      ) {
        continue;
      }
      return c.doc;
    }
    for (const c of candidates) {
      if (!excludeIds.has(c.doc.id)) return c.doc;
    }
    return null;
  };

  const chosen = new Set();
  const canaryA = pickDistinct(missingProfile, chosen, false);
  chosen.add(canaryA.id);
  const canaryB = pickDistinct(oldPipeline, chosen, true);
  if (!canaryB) throw new Error("Could not pick distinct old-pipeline design");
  chosen.add(canaryB.id);
  const canaryC = pickDistinct(highTags, chosen, true);
  if (!canaryC) throw new Error("Could not pick distinct highTags design");
  chosen.add(canaryC.id);

  return {
    categoryNames,
    canaryIds: [canaryA.id, canaryB.id, canaryC.id],
    before: {
      A: designSnapshot(canaryA, categoryNames, "missing_profile"),
      B: designSnapshot(canaryB, categoryNames, "old_v27_v1"),
      C: designSnapshot(canaryC, categoryNames, "high_tags"),
    },
  };
}

async function preStartRecheck(db) {
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  const activeReady = await db
    .collection("catalogReprocessJobs")
    .where("projectId", "==", PROJECT_ID)
    .where("targetType", "==", "ready_catalog")
    .where("status", "in", ["pending", "running", "paused"])
    .limit(1)
    .get();
  const activeQueue = await db
    .collection("catalogReprocessJobs")
    .where("projectId", "==", PROJECT_ID)
    .where("targetType", "==", "ai_review_queue")
    .where("status", "in", ["pending", "running", "paused"])
    .limit(1)
    .get();
  return {
    projectId: PROJECT_ID,
    catalogWorkflowMode: settings.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
    activeReadyCatalogJobs: activeReady.size,
    activeAiReviewQueueJobs: activeQueue.size,
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
      indexName,
      objectPresent: Boolean(hit),
      objectID: hit?.objectID ?? null,
      hasSmartProfileProjection: Boolean(hit?.smartProfile || hit?.smartSubjects || hit?.searchConcepts),
      title: hit?.title ?? null,
    };
  } catch (error) {
    return {
      checked: false,
      reason: error instanceof Error ? error.message : "algolia_error",
    };
  }
}

function extractSmartProfileSummary(data) {
  const sp = data.smartProfile;
  if (!sp || typeof sp !== "object") return null;
  const pick = (key) => {
    const v = sp[key];
    if (Array.isArray(v)) return v.slice(0, 8);
    return v ?? null;
  };
  return {
    subjects: pick("subjects"),
    objects: pick("objects"),
    styles: pick("styles"),
    themes: pick("themes"),
    interests: pick("interests"),
    professionsGroups: pick("professionsGroups"),
    occasions: pick("occasions"),
    places: pick("places"),
    colors: pick("colors"),
    visibleText: pick("visibleText"),
    searchConcepts: pick("searchConcepts"),
    category: sp.category ?? null,
    provenance: sp.provenance ?? null,
    automationDecision: sp.automationDecision ?? data.automationDecision ?? null,
    automationReasonCodes:
      sp.automationReasonCodes ?? data.automationReasonCodes ?? sp.reasonCodes ?? null,
  };
}

function comparePreservation(before, afterDoc, outcome) {
  const after = afterDoc.data();
  const issues = [];
  if (after.status !== "ready") issues.push(`status=${after.status}`);
  if (after.aiReviewStatus !== "approved") issues.push(`aiReviewStatus=${after.aiReviewStatus}`);
  if (after.aiReviewed !== before.aiReviewed) issues.push("aiReviewed changed");
  if (String(after.aiReviewedAt ?? "") !== String(before.aiReviewedAt ?? ""))
    issues.push("aiReviewedAt changed");
  if (after.aiReviewedBy !== before.aiReviewedBy) issues.push("aiReviewedBy changed");
  if (String(after.readyAt ?? "") !== String(before.readyAt ?? "")) issues.push("readyAt changed");
  if (after.title !== before.title) issues.push("title changed");
  if (after.categoryId !== before.categoryId) issues.push("categoryId changed");
  const beforeTags = JSON.stringify(before.tags ?? []);
  const afterTagsArr = Array.isArray(after.tags)
    ? after.tags.filter((t) => typeof t === "string")
    : [];
  if (JSON.stringify(afterTagsArr.slice(0, 12)) !== beforeTags) issues.push("tags changed");
  if (after.artworkBackgroundHex !== before.artworkBackgroundHex)
    issues.push("artworkBackgroundHex changed");
  if (after.artworkBackgroundSource !== before.artworkBackgroundSource)
    issues.push("artworkBackgroundSource changed");
  if (after.aiProcessingStage !== "ready_for_review" && outcome?.status === "succeeded") {
    issues.push(`aiProcessingStage=${after.aiProcessingStage}`);
  }
  return {
    lifecycleOk: after.status === "ready" && after.aiReviewStatus === "approved",
    preservationOk: issues.length === 0,
    issues,
    outcomeStatus: outcome?.status ?? null,
    remainedReady: outcome?.remainedReady ?? null,
    promptVersion: outcome?.promptVersion ?? profileVersions(after).promptVersion,
    normalizerVersion: outcome?.normalizerVersion ?? profileVersions(after).normalizerVersion,
    wouldAutoApprove: outcome?.wouldAutoApprove ?? null,
    automationDecision: outcome?.automationDecision ?? null,
    automationReasonCodes: outcome?.automationReasonCodes ?? null,
    verifierInvoked: outcome?.verifierInvoked ?? null,
    verifierOutcome: outcome?.verifierOutcome ?? null,
    categoryDominantIntentConflict: outcome?.categoryDominantIntentConflict ?? null,
    categoryGap: outcome?.categoryGap ?? null,
    titleUnchanged: outcome?.titleUnchanged ?? null,
    categoryIdUnchanged: outcome?.categoryIdUnchanged ?? null,
    approvalAuditUnchanged: outcome?.approvalAuditUnchanged ?? null,
  };
}

async function main() {
  const db = ensureAdmin();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  console.log("Selecting canary designs …");
  const selection = await selectCanaryDesigns(db);
  const canaryIds = selection.canaryIds;
  console.log("Selected:", canaryIds);

  for (const [label, id] of [
    ["A", canaryIds[0]],
    ["B", canaryIds[1]],
    ["C", canaryIds[2]],
  ]) {
    selection.before[label].algoliaBefore = await algoliaCheck(portalEnv, id);
  }

  const recheck = await preStartRecheck(db);
  if (recheck.catalogWorkflowMode !== "shadow") {
    throw new Error(`Expected shadow, got ${recheck.catalogWorkflowMode}`);
  }
  if (recheck.catalogAutonomousLiveEnabled) throw new Error("Autonomous live ON");
  if (recheck.activeReadyCatalogJobs > 0 || recheck.activeAiReviewQueueJobs > 0) {
    throw new Error("Active jobs exist");
  }

  const authAdmin = getAuth();
  const email = `slice6-canary-${RUN_ID}@freshprints.local`;
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
    displayName: `Slice6 Canary ${RUN_ID}`,
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
  const start = httpsCallable(getFunctions(app, "us-central1"), "startCatalogReprocessJob");

  const startPayload = {
    targetType: "ready_catalog",
    confirmationPhrase: PHRASE,
    canaryDesignIds: canaryIds,
  };

  let startResponse;
  try {
    console.log("Starting bounded canary …", JSON.stringify(startPayload));
    const result = await start(startPayload);
    startResponse = result.data;
    console.log("Start response:", JSON.stringify(startResponse, null, 2));
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

  const jobId = startResponse?.jobId;
  if (!jobId) throw new Error("No jobId from Start");

  const jobRef = db.collection("catalogReprocessJobs").doc(jobId);
  const jobSnap0 = await jobRef.get();
  const job0 = jobSnap0.data() || {};
  const bounded = Array.isArray(job0.boundedDesignIds) ? job0.boundedDesignIds : [];
  if (bounded.length !== 3 || !canaryIds.every((id) => bounded.includes(id))) {
    throw new Error(`P0 boundedDesignIds mismatch: ${JSON.stringify(bounded)}`);
  }

  console.log(`Monitoring job ${jobId} …`);
  const startedMonitor = Date.now();
  let terminalJob = null;
  while (Date.now() - startedMonitor < MAX_MS) {
    const snap = await jobRef.get();
    const job = snap.data() || {};
    console.log(
      `[${new Date().toISOString()}] status=${job.status} processed=${job.processed ?? 0}/${job.totalEligible ?? "?"} preservationViolations=${job.preservationViolations ?? 0}`,
    );
    if (job.preservationViolations > 0 || job.status === "paused") {
      throw new Error(`P0 job paused or preservation violation: ${JSON.stringify(job)}`);
    }
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      terminalJob = { jobId, ...job };
      break;
    }
    await sleep(POLL_MS);
  }
  if (!terminalJob) throw new Error("Job did not reach terminal state in time");

  const outcomesSnap = await jobRef.collection("outcomes").get();
  const outcomes = outcomesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const outcomeByDesign = new Map(outcomes.map((o) => [o.designId || o.id, o]));

  const afterVerification = {};
  for (const [label, before] of Object.entries(selection.before)) {
    const designId = before.designId;
    const afterDoc = await db.collection("designs").doc(designId).get();
    const outcome = outcomeByDesign.get(designId);
    const algAfter = await algoliaCheck(portalEnv, designId);
    afterVerification[label] = {
      before,
      after: designSnapshot(afterDoc, selection.categoryNames, before.stratum),
      smartProfile: extractSmartProfileSummary(afterDoc.data() || {}),
      preservation: comparePreservation(before, afterDoc, outcome),
      outcome: outcome ?? null,
      algoliaAfter: algAfter,
    };
  }

  const processedOther = outcomes.filter((o) => !canaryIds.includes(o.designId || o.id));
  if (processedOther.length > 0) {
    throw new Error(`P0 processed designs outside canary: ${JSON.stringify(processedOther)}`);
  }

  const out = {
    projectId: PROJECT_ID,
    startedAt: new Date(startedMonitor - (Date.now() - startedMonitor)).toISOString(),
    finishedAt: new Date().toISOString(),
    recheck,
    selection: {
      canaryIds,
      rationale: selection.before,
    },
    startPayload,
    startResponse,
    boundedDesignIds: bounded,
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
    },
    outcomes,
    afterVerification,
    safety: {
      processedEqualsThree: terminalJob.processed === 3,
      remainedReadyEqualsThree: terminalJob.remainedReady === 3,
      preservationViolationsZero: (terminalJob.preservationViolations ?? 0) === 0,
      noExtraDesigns: processedOther.length === 0,
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(JSON.stringify({ terminalJob: out.terminalJob, safety: out.safety }, null, 2));

  if (
    !out.safety.processedEqualsThree ||
    !out.safety.remainedReadyEqualsThree ||
    !out.safety.preservationViolationsZero
  ) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
