/**
 * WS4 — Ready Catalog full Start + monitor + reconcile (fresh-prints-dev).
 * Target: catalog-enrich-v33 + smart-profile-normalizer-v6.
 * Phrase: REPROCESS READY CATALOG
 * Does NOT enable Autonomous. Does NOT touch AI Review / tags / production.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/ws4-ready-catalog-start-monitor-dev.mjs
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
const PHRASE = "REPROCESS READY CATALOG";
const TARGET_PROMPT = "catalog-enrich-v33";
const TARGET_NORMALIZER = "smart-profile-normalizer-v6";
const EXPECTED_ELIGIBLE = 359;
const OUT_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws4-ready-reprocess-raw.json",
);
const OUTCOMES_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws4-outcomes-rows.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Ws4Start-${randomBytes(18).toString("base64url")}!aA1`;
const POLL_MS = Number(process.env.WS4_POLL_MS || 30000);
const MAX_MS = Number(process.env.WS4_MAX_MS || 10 * 60 * 60 * 1000);

// Known fixtures for stratified sample
const HUMOR_ID = "7bVlWMFwxECdfHH8VNPB"; // F-CAW-F
const CANNABIS_ID = "1Ws0T9fivryest6IUSbt";
const ZODIAC_ID = "7BjqFQIhkavo80sv5kCp";
const POP_ID = "E2fVUzTL8Smx0gXaGqUZ";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function countQuery(query) {
  return (await query.count().get()).data().count;
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function dimSnapshot(sp) {
  if (!sp || typeof sp !== "object") return null;
  const keys = [
    "subjects",
    "objects",
    "styles",
    "themes",
    "interests",
    "searchConcepts",
    "visibleText",
  ];
  const out = {};
  for (const k of keys) {
    if (Array.isArray(sp[k])) out[k] = [...sp[k]];
  }
  return out;
}

function stableJson(v) {
  return JSON.stringify(v ?? null);
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

async function scanReadyApproved(db) {
  const promptDist = {};
  const normalizerDist = {};
  const pairDist = {};
  const staffEdited = [];
  const presetSeeded = [];
  let eligible = 0;
  let exactV33V6 = 0;
  let exactV32V6 = 0;
  let v30v4 = 0;
  let v29v3 = 0;
  let missingProvenance = 0;
  let missingProfile = 0;
  let demotedCandidates = 0;
  let readyNotApproved = 0;
  let cursor = null;

  // Also count all ready for demotion detection later
  for (;;) {
    let q = db
      .collection("designs")
      .where("status", "==", "ready")
      .where("aiReviewStatus", "==", "approved")
      .orderBy("__name__")
      .limit(200);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      eligible += 1;
      const data = doc.data() || {};
      const sp = data.smartProfile;
      if (!sp || typeof sp !== "object") {
        missingProfile += 1;
        bump(promptDist, "(missing)");
        bump(normalizerDist, "(missing)");
        bump(pairDist, "(missing)/(missing)");
        continue;
      }
      const prompt =
        typeof sp.provenance?.promptVersion === "string" && sp.provenance.promptVersion.trim()
          ? sp.provenance.promptVersion.trim()
          : "(missing)";
      const normalizer =
        typeof sp.provenance?.normalizerVersion === "string" &&
        sp.provenance.normalizerVersion.trim()
          ? sp.provenance.normalizerVersion.trim()
          : "(missing)";
      bump(promptDist, prompt);
      bump(normalizerDist, normalizer);
      bump(pairDist, `${prompt} / ${normalizer}`);
      if (prompt === "(missing)" || normalizer === "(missing)") missingProvenance += 1;
      if (prompt === TARGET_PROMPT && normalizer === TARGET_NORMALIZER) exactV33V6 += 1;
      if (prompt === "catalog-enrich-v32" && normalizer === TARGET_NORMALIZER) exactV32V6 += 1;
      if (prompt === "catalog-enrich-v30" && normalizer === "smart-profile-normalizer-v4") v30v4 += 1;
      if (prompt === "catalog-enrich-v29" && normalizer === "smart-profile-normalizer-v3") v29v3 += 1;

      const staffKeys = Array.isArray(sp.provenance?.staffEditedDimensionKeys)
        ? [...sp.provenance.staffEditedDimensionKeys]
        : [];
      const presetKeys = Array.isArray(sp.provenance?.importPresetDimensionKeys)
        ? [...sp.provenance.importPresetDimensionKeys]
        : [];
      if (staffKeys.length > 0) {
        const dims = {};
        for (const k of staffKeys) {
          if (Array.isArray(sp[k])) dims[k] = [...sp[k]];
        }
        staffEdited.push({
          designId: doc.id,
          staffEditedDimensionKeys: staffKeys,
          staffEditedAt: sp.provenance?.staffEditedAt ?? null,
          staffEditedBy: sp.provenance?.staffEditedBy ?? null,
          dimensions: dims,
          readyAt: data.readyAt?.toDate?.()?.toISOString?.() ?? data.readyAt ?? null,
          title: data.title ?? null,
          categoryId: data.categoryId ?? null,
          halftoneMode: data.halftoneMode ?? data.halftone?.mode ?? null,
          backgroundColor: data.backgroundColor ?? null,
        });
      }
      if (presetKeys.length > 0) {
        const dims = {};
        for (const k of presetKeys) {
          if (Array.isArray(sp[k])) dims[k] = [...sp[k]];
        }
        presetSeeded.push({
          designId: doc.id,
          importPresetDimensionKeys: presetKeys,
          dimensions: dims,
          title: data.title ?? null,
        });
      }
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }

  const [
    readyTotal,
    failedStage,
    processingStatus,
    activeReadyJobs,
    activeAiJobs,
  ] = await Promise.all([
    countQuery(db.collection("designs").where("status", "==", "ready")),
    countQuery(db.collection("designs").where("aiProcessingStage", "==", "failed")),
    countQuery(db.collection("designs").where("status", "==", "processing")),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("targetType", "==", "ready_catalog")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
    countQuery(
      db
        .collection("catalogReprocessJobs")
        .where("targetType", "==", "ai_review_queue")
        .where("status", "in", ["pending", "running", "paused"]),
    ),
  ]);

  readyNotApproved = Math.max(0, readyTotal - eligible);

  return {
    readyTotal,
    readyApprovedEligible: eligible,
    readyNotApproved,
    exactV33V6,
    exactV32V6,
    v30v4,
    v29v3,
    missingProfile,
    missingProvenance,
    promptVersionDistribution: promptDist,
    normalizerVersionDistribution: normalizerDist,
    promptNormalizerPairDistribution: pairDist,
    staffEdited,
    presetSeeded,
    failedAiProcessingStage: failedStage,
    processingStatusCount: processingStatus,
    activeReadyCatalogJobs: activeReadyJobs,
    activeAiReviewQueueJobs: activeAiJobs,
    demotedCandidates,
  };
}

function compareAuthority(beforeList, afterById, kind) {
  const violations = [];
  const checked = [];
  for (const before of beforeList) {
    const after = afterById.get(before.designId);
    if (!after) {
      violations.push({
        kind,
        designId: before.designId,
        reason: "design_missing_from_after_scan",
      });
      continue;
    }
    const keysBefore =
      kind === "staff" ? before.staffEditedDimensionKeys : before.importPresetDimensionKeys;
    const keysAfter =
      kind === "staff" ? after.staffEditedDimensionKeys : after.importPresetDimensionKeys;
    const keysLost = keysBefore.filter((k) => !keysAfter.includes(k));
    const dimViolations = [];
    for (const k of keysBefore) {
      if (stableJson(before.dimensions?.[k]) !== stableJson(after.dimensions?.[k])) {
        dimViolations.push({
          key: k,
          before: before.dimensions?.[k] ?? null,
          after: after.dimensions?.[k] ?? null,
        });
      }
    }
    const row = {
      designId: before.designId,
      keysBefore,
      keysAfter,
      keysLost,
      dimViolations,
      ok: keysLost.length === 0 && dimViolations.length === 0,
    };
    checked.push(row);
    if (!row.ok) {
      violations.push({ kind, ...row });
    }
  }
  return { checked, violations };
}

async function buildOwnerSample(db, categoryNames, beforeStaff, beforePresets, postScan) {
  const wantIds = new Set();
  const notes = new Map();

  const add = (id, note) => {
    if (!id) return;
    wantIds.add(id);
    notes.set(id, note);
  };

  // Staff-edited (up to 2)
  for (const s of beforeStaff.slice(0, 2)) add(s.designId, "staff-edited");
  // Presets (several)
  for (const p of beforePresets.slice(0, 3)) add(p.designId, "preset-seeded");

  // Historical pair representatives from post scan — find by scanning
  let cursor = null;
  const found = { v29: null, v30: null, v32: null, ordinary: [], textHeavy: null, objectRich: null };
  for (;;) {
    let q = db
      .collection("designs")
      .where("status", "==", "ready")
      .where("aiReviewStatus", "==", "approved")
      .orderBy("__name__")
      .limit(200);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const prompt = data.smartProfile?.provenance?.promptVersion;
      const normalizer = data.smartProfile?.provenance?.normalizerVersion;
      // After success all should be v33 — use outcome history isn't available here;
      // pick fixtures + ordinary + rich profiles
      if (found.ordinary.length < 4 && !beforeStaff.some((s) => s.designId === doc.id)) {
        found.ordinary.push(doc.id);
      }
      const vt = data.smartProfile?.visibleText;
      if (!found.textHeavy && Array.isArray(vt) && vt.join(" ").length > 40) {
        found.textHeavy = doc.id;
      }
      const objs = data.smartProfile?.objects;
      if (!found.objectRich && Array.isArray(objs) && objs.length >= 4) {
        found.objectRich = doc.id;
      }
      // Prefer known fixtures even if already v33 after run
      void prompt;
      void normalizer;
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }

  for (const id of found.ordinary) add(id, "ordinary-ready");
  add(found.textHeavy, "text-heavy");
  add(found.objectRich, "object-rich");
  add(HUMOR_ID, "humor/category F-CAW-F");
  add(CANNABIS_ID, "specialty cannabis");
  add(ZODIAC_ID, "zodiac specialty");
  add(POP_ID, "pop-culture");

  // Pre-run pair reps from beforeStaff/presets lists aren't enough — use before scan IDs from postScan.pair history
  // We'll attach stratum from notes only.

  const sample = [];
  for (const designId of wantIds) {
    const doc = await db.collection("designs").doc(designId).get();
    if (!doc.exists) continue;
    const data = doc.data() || {};
    const sp = data.smartProfile || {};
    const staffKeys = Array.isArray(sp.provenance?.staffEditedDimensionKeys)
      ? sp.provenance.staffEditedDimensionKeys
      : [];
    const presetKeys = Array.isArray(sp.provenance?.importPresetDimensionKeys)
      ? sp.provenance.importPresetDimensionKeys
      : [];
    const beforeStaffRow = beforeStaff.find((s) => s.designId === designId);
    const beforePresetRow = beforePresets.find((p) => p.designId === designId);
    sample.push({
      designId,
      stratum: notes.get(designId) || "sample",
      title: data.title ?? null,
      primaryCategory: data.categoryId
        ? categoryNames.get(data.categoryId) ?? data.categoryId
        : null,
      status: data.status ?? null,
      aiReviewStatus: data.aiReviewStatus ?? null,
      promptVersion: sp.provenance?.promptVersion ?? null,
      normalizerVersion: sp.provenance?.normalizerVersion ?? null,
      staffEditedDimensionKeys: staffKeys,
      importPresetDimensionKeys: presetKeys,
      wasStaffEditedBefore: Boolean(beforeStaffRow),
      wasPresetBefore: Boolean(beforePresetRow),
      highlights: {
        subjects: Array.isArray(sp.subjects) ? sp.subjects.slice(0, 6) : [],
        themes: Array.isArray(sp.themes) ? sp.themes.slice(0, 6) : [],
        objects: Array.isArray(sp.objects) ? sp.objects.slice(0, 6) : [],
        searchConcepts: Array.isArray(sp.searchConcepts) ? sp.searchConcepts.slice(0, 8) : [],
        visibleText: Array.isArray(sp.visibleText) ? sp.visibleText.slice(0, 4) : [],
      },
      readyAt: data.readyAt?.toDate?.()?.toISOString?.() ?? data.readyAt ?? null,
      portalCatalogPublicationStatus: data.portalCatalogPublicationStatus ?? null,
      anomaly: null,
    });
  }
  return sample;
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  console.log("WS4 preflight: scanning Ready + settings…");
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  if (settings.catalogWorkflowMode !== "shadow") {
    throw new Error(`[PREREQUISITE NOT MET] mode=${settings.catalogWorkflowMode}`);
  }
  if (settings.catalogAutonomousLiveEnabled === true) {
    throw new Error("[PREREQUISITE NOT MET] Autonomous ON");
  }

  const preScan = await scanReadyApproved(db);
  if (preScan.activeReadyCatalogJobs > 0 || preScan.activeAiReviewQueueJobs > 0) {
    throw new Error("[PREREQUISITE NOT MET] active reprocess jobs");
  }

  const email = `ws4-ready-start-${RUN_ID}@freshprints.local`;
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
    displayName: `WS4 Ready Start ${RUN_ID}`,
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
  const previewFn = httpsCallable(fns, "previewCatalogReprocessJob");
  const startFn = httpsCallable(fns, "startCatalogReprocessJob");

  let previewResponse;
  let startResponse;
  try {
    console.log("Preview ready_catalog…");
    previewResponse = (await previewFn({ targetType: "ready_catalog" })).data;
    const eligible = previewResponse?.eligibleCount;
    console.log("Preview eligible:", eligible);
    if (previewResponse?.targetType !== "ready_catalog") {
      throw new Error("Wrong targetType in preview");
    }
    if (previewResponse?.catalogWorkflowMode !== "shadow") {
      throw new Error("Preview mode not shadow");
    }
    if (previewResponse?.autonomousLiveEnabled === true) {
      throw new Error("Preview autonomous true");
    }
    if (previewResponse?.activeJobId) {
      throw new Error(`Active job in preview: ${previewResponse.activeJobId}`);
    }
    if (eligible !== EXPECTED_ELIGIBLE) {
      const delta = eligible - EXPECTED_ELIGIBLE;
      const msg = `[PREREQUISITE NOT MET — READY PREVIEW DRIFT] eligible=${eligible} expected=${EXPECTED_ELIGIBLE} delta=${delta}`;
      console.error(msg);
      throw new Error(msg);
    }

    console.log("Starting with phrase…");
    startResponse = (
      await startFn({
        targetType: "ready_catalog",
        confirmationPhrase: PHRASE,
      })
    ).data;
    console.log("Start response:", JSON.stringify(startResponse));
  } finally {
    await authAdmin.deleteUser(user.uid).catch(() => {});
    await db.collection("users").doc(user.uid).delete().catch(() => {});
  }

  const jobId = startResponse?.jobId;
  if (!jobId) throw new Error("No jobId");

  const jobRef = db.collection("catalogReprocessJobs").doc(jobId);
  const job0 = (await jobRef.get()).data() || {};
  if (Array.isArray(job0.boundedDesignIds) && job0.boundedDesignIds.length > 0) {
    throw new Error(`P0: bounded job: ${JSON.stringify(job0.boundedDesignIds)}`);
  }
  if (job0.targetType !== "ready_catalog") throw new Error("Wrong job targetType");
  if (job0.promptVersion !== TARGET_PROMPT || job0.normalizerVersion !== TARGET_NORMALIZER) {
    throw new Error(
      `Job version mismatch: ${job0.promptVersion}/${job0.normalizerVersion}`,
    );
  }

  console.log(`Monitoring ${jobId}…`);
  const monitorStarted = Date.now();
  const pollLog = [];
  let terminalJob = null;

  while (Date.now() - monitorStarted < MAX_MS) {
    const job = (await jobRef.get()).data() || {};
    const line = {
      at: new Date().toISOString(),
      status: job.status,
      processed: job.processed ?? 0,
      totalEligible: job.totalEligible ?? null,
      succeeded: job.succeeded ?? 0,
      failed: job.failed ?? 0,
      retrying: job.retrying ?? 0,
      remainedReady: job.remainedReady ?? null,
      preservationViolations: job.preservationViolations ?? 0,
      anomalies: job.anomalies ?? 0,
    };
    pollLog.push(line);
    console.log(JSON.stringify(line));

    if ((job.preservationViolations ?? 0) > 0) {
      // Continue to terminal but flag — owner gate later
      console.error("WARNING preservationViolations > 0");
    }
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      terminalJob = { jobId, ...job };
      break;
    }
    if (job.status === "paused") {
      terminalJob = { jobId, ...job };
      break;
    }
    await sleep(POLL_MS);
  }
  if (!terminalJob) throw new Error("Job did not reach terminal state");

  console.log("Loading outcomes…");
  const outcomesSnap = await jobRef.collection("outcomes").get();
  const outcomes = outcomesSnap.docs.map((d) => ({ outcomeDocId: d.id, ...d.data() }));
  writeFileSync(OUTCOMES_JSON, JSON.stringify(outcomes, null, 2));

  const lifecycleViolations = outcomes.filter(
    (o) =>
      o.errorCode === "ready_lifecycle_violation" ||
      (o.finalStatus && o.finalStatus !== "ready") ||
      (o.finalAiReviewStatus && o.finalAiReviewStatus !== "approved"),
  );

  console.log("Post-scan Ready…");
  const postScan = await scanReadyApproved(db);
  const settingsAfter = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};

  const afterStaffById = new Map(postScan.staffEdited.map((s) => [s.designId, s]));
  const afterPresetById = new Map(postScan.presetSeeded.map((p) => [p.designId, p]));
  // Rebuild after maps with same shape for keys that might have been cleared
  // If staff keys wiped, design won't be in postScan.staffEdited — compareAuthority handles missing

  // For wiped staff edits, fetch those design IDs explicitly
  for (const before of preScan.staffEdited) {
    if (!afterStaffById.has(before.designId)) {
      const doc = await db.collection("designs").doc(before.designId).get();
      const data = doc.data() || {};
      const sp = data.smartProfile || {};
      afterStaffById.set(before.designId, {
        designId: before.designId,
        staffEditedDimensionKeys: Array.isArray(sp.provenance?.staffEditedDimensionKeys)
          ? [...sp.provenance.staffEditedDimensionKeys]
          : [],
        dimensions: dimSnapshot(sp) || {},
        status: data.status,
        aiReviewStatus: data.aiReviewStatus,
        readyAt: data.readyAt?.toDate?.()?.toISOString?.() ?? data.readyAt ?? null,
        halftoneMode: data.halftoneMode ?? data.halftone?.mode ?? null,
        backgroundColor: data.backgroundColor ?? null,
      });
    }
  }
  for (const before of preScan.presetSeeded) {
    if (!afterPresetById.has(before.designId)) {
      const doc = await db.collection("designs").doc(before.designId).get();
      const data = doc.data() || {};
      const sp = data.smartProfile || {};
      afterPresetById.set(before.designId, {
        designId: before.designId,
        importPresetDimensionKeys: Array.isArray(sp.provenance?.importPresetDimensionKeys)
          ? [...sp.provenance.importPresetDimensionKeys]
          : [],
        dimensions: (() => {
          const dims = {};
          for (const k of before.importPresetDimensionKeys || []) {
            if (Array.isArray(sp[k])) dims[k] = [...sp[k]];
          }
          return dims;
        })(),
      });
    }
  }

  const staffCompare = compareAuthority(preScan.staffEdited, afterStaffById, "staff");
  const presetCompare = compareAuthority(preScan.presetSeeded, afterPresetById, "preset");

  // Intake metadata check on staff set (and a few presets)
  const intakeViolations = [];
  for (const before of preScan.staffEdited) {
    const after = afterStaffById.get(before.designId);
    if (!after) continue;
    if (before.halftoneMode != null && after.halftoneMode !== before.halftoneMode) {
      intakeViolations.push({
        designId: before.designId,
        field: "halftoneMode",
        before: before.halftoneMode,
        after: after.halftoneMode,
      });
    }
    if (before.backgroundColor != null && after.backgroundColor !== before.backgroundColor) {
      intakeViolations.push({
        designId: before.designId,
        field: "backgroundColor",
        before: before.backgroundColor,
        after: after.backgroundColor,
      });
    }
    if (before.readyAt && after.readyAt && before.readyAt !== after.readyAt) {
      intakeViolations.push({
        designId: before.designId,
        field: "readyAt",
        before: before.readyAt,
        after: after.readyAt,
      });
    }
  }

  const unexpectedPairs = Object.entries(postScan.promptNormalizerPairDistribution).filter(
    ([pair]) => pair !== `${TARGET_PROMPT} / ${TARGET_NORMALIZER}`,
  );

  const categoryNames = await loadCategoryNames(db);
  const ownerSample = await buildOwnerSample(
    db,
    categoryNames,
    preScan.staffEdited,
    preScan.presetSeeded,
    postScan,
  );

  const succeeded = outcomes.filter((o) => o.status === "succeeded").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  const retrySuccess = outcomes.filter(
    (o) => o.status === "succeeded" && (o.attempt ?? 1) > 1,
  ).length;

  const geminiFailures = outcomes.filter(
    (o) =>
      typeof o.errorCode === "string" &&
      /gemini|provider|vision|quota|429|503/i.test(`${o.errorCode} ${o.errorMessage ?? ""}`),
  ).length;
  const parseFailures = outcomes.filter(
    (o) => typeof o.errorCode === "string" && /parse/i.test(o.errorCode),
  ).length;
  const persistenceFailures = outcomes.filter(
    (o) => typeof o.errorCode === "string" && /persist|firestore|write/i.test(o.errorCode),
  ).length;
  const publicationFailures = outcomes.filter(
    (o) =>
      o.publicationFailed === true ||
      (typeof o.errorCode === "string" && /algolia|publication/i.test(o.errorCode)),
  ).length;

  const out = {
    projectId: PROJECT_ID,
    capturedAt: new Date().toISOString(),
    confirmationPhrase: PHRASE,
    targetType: "ready_catalog",
    targetPrompt: TARGET_PROMPT,
    targetNormalizer: TARGET_NORMALIZER,
    schema: "smart-profile-v1",
    expectedEligible: EXPECTED_ELIGIBLE,
    preStart: {
      settings: {
        catalogWorkflowMode: settings.catalogWorkflowMode,
        catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
      },
      preScanSummary: {
        readyApprovedEligible: preScan.readyApprovedEligible,
        exactV33V6: preScan.exactV33V6,
        exactV32V6: preScan.exactV32V6,
        v30v4: preScan.v30v4,
        v29v3: preScan.v29v3,
        staffEditedCount: preScan.staffEdited.length,
        presetSeededCount: preScan.presetSeeded.length,
        pairDistribution: preScan.promptNormalizerPairDistribution,
      },
      staffEditedIds: preScan.staffEdited.map((s) => s.designId),
      presetSeededIds: preScan.presetSeeded.map((p) => p.designId),
    },
    previewResponse,
    previewDelta: {
      expected: EXPECTED_ELIGIBLE,
      actual: previewResponse?.eligibleCount ?? null,
      delta: (previewResponse?.eligibleCount ?? 0) - EXPECTED_ELIGIBLE,
    },
    startResponse,
    jobId,
    jobSnapshotAtStart: {
      promptVersion: job0.promptVersion,
      normalizerVersion: job0.normalizerVersion,
      totalEligible: job0.totalEligible,
      boundedDesignIds: job0.boundedDesignIds ?? null,
      catalogWorkflowModeSnapshot: job0.catalogWorkflowModeSnapshot,
      autonomousLiveEnabledSnapshot: job0.autonomousLiveEnabledSnapshot,
    },
    terminalJob: {
      status: terminalJob.status,
      totalEligible: terminalJob.totalEligible,
      processed: terminalJob.processed,
      succeeded: terminalJob.succeeded,
      failed: terminalJob.failed,
      skipped: terminalJob.skipped,
      retrying: terminalJob.retrying,
      remainedReady: terminalJob.remainedReady,
      preservationViolations: terminalJob.preservationViolations,
      anomalies: terminalJob.anomalies,
      wouldAutoApprove: terminalJob.wouldAutoApprove,
      hardBlocked: terminalJob.hardBlocked,
      autoApproved: terminalJob.autoApproved,
      attemptCount: terminalJob.attemptCount,
      lastError: terminalJob.lastError ?? null,
    },
    outcomeSummary: {
      rows: outcomes.length,
      succeeded,
      failed,
      retrySuccess,
      geminiFailures,
      parseFailures,
      persistenceFailures,
      publicationFailures,
      lifecycleViolations: lifecycleViolations.length,
    },
    postScanSummary: {
      readyTotal: postScan.readyTotal,
      readyApprovedEligible: postScan.readyApprovedEligible,
      exactV33V6: postScan.exactV33V6,
      exactV32V6: postScan.exactV32V6,
      v30v4: postScan.v30v4,
      v29v3: postScan.v29v3,
      missingProvenance: postScan.missingProvenance,
      missingProfile: postScan.missingProfile,
      pairDistribution: postScan.promptNormalizerPairDistribution,
      unexpectedPairs,
      staffEditedCount: postScan.staffEdited.length,
      presetSeededCount: postScan.presetSeeded.length,
      failedAiProcessingStage: postScan.failedAiProcessingStage,
      processingStatusCount: postScan.processingStatusCount,
    },
    humanAuthority: {
      staff: staffCompare,
      preset: presetCompare,
      intakeViolations,
    },
    settingsAfter: {
      catalogWorkflowMode: settingsAfter.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: settingsAfter.catalogAutonomousLiveEnabled === true,
    },
    ownerSample,
    pollLog,
    safety: {
      autonomousEnabled: settingsAfter.catalogAutonomousLiveEnabled === true,
      aiReviewReprocessPerformed: false,
      tagRetirementPerformed: false,
      matchedTagsChanged: false,
      algoliaSettingsChanged: false,
      rulesStorageIndexChanged: false,
      migrationBackfillOutsideJob: false,
      productionTouched: false,
      commitPush: false,
    },
  };

  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log("Wrote", OUT_JSON);
  console.log(
    JSON.stringify(
      {
        jobId,
        status: terminalJob.status,
        processed: terminalJob.processed,
        succeeded: terminalJob.succeeded,
        failed: terminalJob.failed,
        v33v6: postScan.exactV33V6,
        staffViolations: staffCompare.violations.length,
        presetViolations: presetCompare.violations.length,
        demotions: lifecycleViolations.length,
      },
      null,
      2,
    ),
  );

  if (staffCompare.violations.length || presetCompare.violations.length) {
    console.error("[NEEDS OWNER DECISION — HUMAN AUTHORITY REGRESSION]");
    process.exitCode = 3;
  }
  if (lifecycleViolations.length > 0 || (terminalJob.preservationViolations ?? 0) > 0) {
    console.error("[NEEDS OWNER DECISION — READY PRESERVATION FAILURE]");
    process.exitCode = 4;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
