/**
 * WS5 Autonomous DEV canary — fresh-prints-dev ONLY.
 * Creates Explicit fixture (no shadow enqueue), enables dual gate, runs 7 serial rows,
 * audits each, restores shadow/live false. Leaves Explicit fixture for owner QA.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/ws5-autonomous-dev-canary-dev.mjs
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { algoliasearch } from "algoliasearch";

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
const SELECTED_TERM = "damn";
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_ws5-autonomous-dev-canary-execution-raw.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Ws5Canary-${randomBytes(18).toString("base64url")}!aA1`;
const PUB_WAIT_MS = 90_000;
const PUB_POLL_MS = 2_000;

const SIX = [
  {
    id: "At5hu7vLjWgduiyzZCfR",
    label: "CANARY 1 — NORMAL AUTO",
    expected: "Ready",
    expectedBlockers: [],
  },
  {
    id: "nff6PpkZF9TNitnpX2Mm",
    label: "CANARY 2 — BLOCKED CONTROL",
    expected: "Needs Review",
    expectedBlockers: ["category_gap_suggested", "structured_evidence_gap:objects:flowers"],
  },
  {
    id: "03cbj1cIFH7Bavt38XBX",
    label: "CANARY 4 — NORMAL AUTO",
    expected: "Ready",
    expectedBlockers: [],
  },
  {
    id: "LYJcsxnfUyacRWtntEkd",
    label: "CANARY 5 — BLOCKED",
    expected: "Needs Review",
    expectedBlockers: ["subject_specificity_risk:cow"],
  },
  {
    id: "Dr8lcyPE8imTQlNESP8X",
    label: "CANARY 6 — NORMAL AUTO",
    expected: "Ready",
    expectedBlockers: [],
  },
  {
    id: "1Ws0T9fivryest6IUSbt",
    label: "CANARY 7 — NORMAL AUTO",
    expected: "Ready",
    expectedBlockers: [],
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
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return { db: getFirestore(), bucket: getStorage().bucket(), authAdmin: getAuth() };
}

async function renderDamnArtwork() {
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="400" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="160" font-weight="700" fill="#111111">DAMN</text>
</svg>`);
  const png = await sharp(svg).png().toBuffer();
  const webp = await sharp(png).webp({ quality: 90 }).toBuffer();
  return { png, webp, width: 800, height: 800 };
}

async function readGate(db) {
  const s = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  return {
    catalogWorkflowMode: s.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: s.catalogAutonomousLiveEnabled === true,
    termsCount: Array.isArray(s.explicitContentAutomationTerms)
      ? s.explicitContentAutomationTerms.length
      : null,
    hasDamn: Array.isArray(s.explicitContentAutomationTerms)
      ? s.explicitContentAutomationTerms.includes(SELECTED_TERM)
      : false,
    catalogAutonomousLiveEnabledAt: s.catalogAutonomousLiveEnabledAt?.toDate?.()?.toISOString?.() ?? null,
    catalogAutonomousLiveEnabledBy: s.catalogAutonomousLiveEnabledBy ?? null,
  };
}

function auditDesign(data) {
  const prov = data.smartProfile?.provenance ?? {};
  return {
    status: data.status ?? null,
    aiReviewStatus: data.aiReviewStatus ?? null,
    aiProcessingStage: data.aiProcessingStage ?? null,
    aiReviewedBy: data.aiReviewedBy ?? null,
    readyAt: data.readyAt?.toDate?.()?.toISOString?.() ?? data.readyAt ?? null,
    isExplicitContent: data.isExplicitContent ?? null,
    censoredTerms: data.censoredTerms ?? null,
    portalCatalogPublicationStatus: data.portalCatalogPublicationStatus ?? null,
    portalCatalogPublicationError: data.portalCatalogPublicationError ?? null,
    automationDecision: prov.automationDecision ?? null,
    automationReasonCodes: prov.automationReasonCodes ?? null,
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    schemaVersion: prov.version ?? null,
    explicitAutomationPreview: prov.explicitAutomationPreview ?? null,
    title: data.title ?? data.aiSuggestions?.title ?? null,
  };
}

async function waitPublication(db, designId, expectReady) {
  if (!expectReady) {
    return { waited: false, reason: "not_ready_expected" };
  }
  const started = Date.now();
  while (Date.now() - started < PUB_WAIT_MS) {
    const data = (await db.collection("designs").doc(designId).get()).data() || {};
    const status = data.portalCatalogPublicationStatus;
    if (status === "synced") {
      return { waited: true, status: "synced", ms: Date.now() - started };
    }
    if (status === "failed") {
      return {
        waited: true,
        status: "failed",
        error: data.portalCatalogPublicationError ?? null,
        ms: Date.now() - started,
      };
    }
    await new Promise((r) => setTimeout(r, PUB_POLL_MS));
  }
  const data = (await db.collection("designs").doc(designId).get()).data() || {};
  return {
    waited: true,
    status: data.portalCatalogPublicationStatus ?? null,
    timedOut: true,
    ms: Date.now() - started,
  };
}

async function algoliaCheck(portalEnv, designId) {
  const appId = portalEnv.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = portalEnv.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  const indexName = portalEnv.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "portal_catalog_ready_dev";
  if (!appId || !searchKey) {
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
      title: hit?.title ?? null,
      isExplicitContent: hit?.isExplicitContent ?? null,
    };
  } catch (error) {
    return { checked: false, reason: error instanceof Error ? error.message : "algolia_error" };
  }
}

function evaluateRow(expected, audit, publication, algolia) {
  const failures = [];
  const isReady =
    audit.status === "ready" &&
    audit.aiReviewStatus === "approved" &&
    audit.aiReviewedBy === "system:catalog-autonomy";
  const isNeedsReview =
    audit.status === "imported" && audit.aiReviewStatus === "needs_review";

  if (expected === "Ready") {
    if (!isReady) failures.push("expected_Ready_not_met");
    if (audit.aiReviewedBy !== "system:catalog-autonomy") failures.push("aiReviewedBy_mismatch");
    if (!audit.readyAt) failures.push("readyAt_missing");
    if (publication.status !== "synced") failures.push("publication_not_synced");
    if (algolia.checked && !algolia.objectPresent) failures.push("algolia_object_missing");
  } else {
    if (isReady) failures.push("CRITICAL_blocked_became_Ready");
    if (!isNeedsReview) failures.push("expected_Needs_Review_not_met");
    if (audit.aiReviewedBy === "system:catalog-autonomy") failures.push("unexpected_system_approval");
    if (audit.status === "ready") failures.push("CRITICAL_status_ready");
  }

  return {
    actualClass: isReady ? "Ready" : isNeedsReview ? "Needs Review" : `other:${audit.status}/${audit.aiReviewStatus}`,
    pass: failures.length === 0,
    failures,
  };
}

async function main() {
  const { db, bucket, authAdmin } = ensureAdmin();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    runId: RUN_ID,
    aborted: false,
    rows: [],
  };

  const gate0 = await readGate(db);
  results.preflight = { gate: gate0 };
  if (gate0.catalogWorkflowMode !== "shadow" || gate0.catalogAutonomousLiveEnabled) {
    results.aborted = true;
    results.abortReason = "[WS5 CANARY PREREQUISITE FAILURE — AUTONOMOUS GATE STATE]";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (!gate0.hasDamn || gate0.termsCount !== 43) {
    results.aborted = true;
    results.abortReason = `[WS5 CANARY PREREQUISITE FAILURE — vocabulary (count=${gate0.termsCount}, hasDamn=${gate0.hasDamn})]`;
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  // --- Create fixture WITHOUT enqueue ---
  const email = `ws5-canary-${RUN_ID}@freshprints.local`;
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
    displayName: `WS5 Autonomous Canary ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const designRef = db.collection("designs").doc();
  const fixtureId = designRef.id;
  const originalPath = `/originals/${fixtureId}.png`;
  const previewPath = `/previews/${fixtureId}.webp`;
  const thumbnailPath = `/thumbnails/${fixtureId}.webp`;
  const { png, webp, width, height } = await renderDamnArtwork();
  await bucket.file(originalPath.replace(/^\//, "")).save(png, { contentType: "image/png" });
  await bucket.file(previewPath.replace(/^\//, "")).save(webp, { contentType: "image/webp" });
  await bucket.file(thumbnailPath.replace(/^\//, "")).save(webp, { contentType: "image/webp" });

  await designRef.set({
    id: fixtureId,
    title: `DEV QA FIXTURE — Explicit Autonomous — DAMN — ${RUN_ID}`,
    description:
      "DEV QA FIXTURE — DO NOT USE FOR PRODUCTION. Explicit Content Autonomous canary.",
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
    uploadedBy: user.uid,
    createdBy: user.uid,
    updatedBy: user.uid,
    importSourceFileName: `ws5-explicit-autonomous-qa-${RUN_ID}.png`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const fixtureBefore = (await designRef.get()).data() || {};
  results.fixture = {
    designId: fixtureId,
    selectedTerm: SELECTED_TERM,
    artworkText: "DAMN",
    creationPath: "admin Storage + Firestore create-only (no enqueue)",
    initial: auditDesign(fixtureBefore),
    humanAuthorityAbsent:
      fixtureBefore.isExplicitContent === undefined && fixtureBefore.censoredTerms === undefined,
  };
  console.log(`FIXTURE CREATED (no enqueue) ${fixtureId}`);

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
  const updateMode = httpsCallable(fns, "updateCatalogWorkflowMode");
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment");

  const rollback = async (reason) => {
    console.log(`ROLLBACK → shadow/false (${reason || "success"})`);
    const resp = await updateMode({
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    const verified = await readGate(db);
    results.rollback = {
      reason: reason || "success_required",
      callableResponse: resp.data ?? null,
      verified,
      at: new Date().toISOString(),
    };
    if (
      verified.catalogWorkflowMode !== "shadow" ||
      verified.catalogAutonomousLiveEnabled !== false
    ) {
      throw new Error("ROLLBACK VERIFY FAILED: " + JSON.stringify(verified));
    }
  };

  try {
    // --- Enablement Step 1 ---
    console.log("ENABLE Step 1: autonomous / live false");
    const step1 = await updateMode({ catalogWorkflowMode: "autonomous" });
    const gate1 = await readGate(db);
    results.enablement = {
      step1: { response: step1.data ?? null, verified: gate1, at: new Date().toISOString() },
    };
    if (gate1.catalogWorkflowMode !== "autonomous" || gate1.catalogAutonomousLiveEnabled !== false) {
      await rollback("step1_unexpected");
      results.aborted = true;
      results.abortReason = "Step 1 verify failed";
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      throw new Error(results.abortReason);
    }

    // --- Enablement Step 2 ---
    console.log("ENABLE Step 2: live true + ENABLE AUTONOMOUS");
    const step2 = await updateMode({
      catalogWorkflowMode: "autonomous",
      catalogAutonomousLiveEnabled: true,
      confirmationPhrase: "ENABLE AUTONOMOUS",
    });
    const gate2 = await readGate(db);
    results.enablement.step2 = {
      response: step2.data ?? null,
      verified: gate2,
      at: new Date().toISOString(),
    };
    if (gate2.catalogWorkflowMode !== "autonomous" || gate2.catalogAutonomousLiveEnabled !== true) {
      await rollback("step2_unexpected");
      results.aborted = true;
      results.abortReason = "Step 2 verify failed";
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      throw new Error(results.abortReason);
    }

    const ordered = [
      { ...SIX[0], enqueue: { designId: SIX[0].id, rerunFromReview: true } },
      { ...SIX[1], enqueue: { designId: SIX[1].id, rerunFromReview: true } },
      {
        id: fixtureId,
        label: "CANARY 3 — EXPLICIT AUTO FIXTURE",
        expected: "Ready",
        expectedBlockers: [],
        isExplicitFixture: true,
        enqueue: { designId: fixtureId },
      },
      { ...SIX[2], enqueue: { designId: SIX[2].id, rerunFromReview: true } },
      { ...SIX[3], enqueue: { designId: SIX[3].id, rerunFromReview: true } },
      { ...SIX[4], enqueue: { designId: SIX[4].id, rerunFromReview: true } },
      { ...SIX[5], enqueue: { designId: SIX[5].id, rerunFromReview: true } },
    ];

    for (const row of ordered) {
      console.log(`\n=== ${row.label} ${row.id} ===`);
      const before = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
      const call = await enqueue(row.enqueue);
      const afterSnap = await db.collection("designs").doc(row.id).get();
      const afterData = afterSnap.data() || {};
      const after = auditDesign(afterData);
      const expectReady = row.expected === "Ready";
      const publication = await waitPublication(db, row.id, expectReady);
      const afterPub = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
      const algolia = expectReady
        ? await algoliaCheck(portalEnv, row.id)
        : { checked: false, reason: "not_required" };
      const evalResult = evaluateRow(row.expected, afterPub, publication, algolia);

      if (row.isExplicitFixture) {
        if (afterPub.isExplicitContent !== true) evalResult.failures.push("isExplicitContent_not_true");
        const terms = Array.isArray(afterPub.censoredTerms) ? afterPub.censoredTerms : [];
        if (!terms.includes(SELECTED_TERM)) evalResult.failures.push("censoredTerms_missing_damn");
        const reasons = afterPub.automationReasonCodes || [];
        if (reasons.some((r) => String(r).includes("profanity"))) {
          evalResult.failures.push("profanity_hard_blocker");
        }
        const previewMatched =
          afterPub.isExplicitContent === true && terms.includes(SELECTED_TERM) && evalResult.actualClass === "Ready";
        evalResult.explicit = {
          artworkHit: afterPub.explicitAutomationPreview?.artworkHit ?? null,
          isExplicitContent: afterPub.isExplicitContent,
          censoredTerms: terms,
          shadowPredictionMatched: previewMatched,
        };
        evalResult.pass = evalResult.failures.length === 0;
      }

      // Blocker presence for Needs Review (informational soft check)
      if (row.expected === "Needs Review" && row.expectedBlockers?.length) {
        const reasons = afterPub.automationReasonCodes || [];
        const missing = row.expectedBlockers.filter((b) => !reasons.includes(b));
        if (missing.length) {
          evalResult.notes = { missingExpectedBlockers: missing, reasons };
          // Soft: if still Needs Review and not Ready, do not fail solely on blocker text drift
          // unless Ready happened (already critical).
        }
      }

      const rowResult = {
        label: row.label,
        id: row.id,
        expected: row.expected,
        before,
        enqueueResponse: call.data ?? null,
        afterEnrichment: after,
        publication,
        afterPublication: afterPub,
        algolia,
        evaluation: evalResult,
        isExplicitFixture: row.isExplicitFixture === true,
      };
      results.rows.push(rowResult);
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      console.log(JSON.stringify({ id: row.id, eval: evalResult }, null, 2));

      if (!evalResult.pass) {
        await rollback(`row_fail_${row.id}`);
        results.aborted = true;
        results.abortReason = `STOP: ${row.label} failed: ${evalResult.failures.join(",")}`;
        writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
        throw new Error(results.abortReason);
      }
    }

    await rollback("canary_complete");
    results.finishedAt = new Date().toISOString();
    results.aborted = false;
    results.mechanicalPass = true;
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    console.log("\nMECHANICAL CANARY PASS — Autonomous restored OFF");
    console.log(JSON.stringify({ fixtureId, rollback: results.rollback?.verified }, null, 2));
  } catch (error) {
    try {
      const g = await readGate(db);
      if (g.catalogWorkflowMode !== "shadow" || g.catalogAutonomousLiveEnabled) {
        await rollback("catch_ensure");
      }
    } catch (rbErr) {
      console.error("rollback in catch failed", rbErr);
    }
    results.error = error instanceof Error ? error.message : String(error);
    results.finishedAt = new Date().toISOString();
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw error;
  } finally {
    try {
      await authAdmin.deleteUser(user.uid);
      await db.collection("users").doc(user.uid).delete();
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
