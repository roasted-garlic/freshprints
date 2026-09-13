/**
 * WS5 Autonomous canary CONTINUATION — remaining six-candidate rows after Explicit fixture
 * already Ready (Algolia lag false-stop). Re-enables dual gate, runs 4 rows, restores shadow.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/ws5-autonomous-dev-canary-continue-dev.mjs
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
const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_ws5-autonomous-dev-canary-continue-raw.json",
);
const PRIOR_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_ws5-autonomous-dev-canary-execution-raw.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Ws5Cont-${randomBytes(18).toString("base64url")}!aA1`;
const PUB_WAIT_MS = 90_000;
const ALGOLIA_WAIT_MS = 45_000;
const POLL_MS = 2_000;

const ROWS = [
  { id: "03cbj1cIFH7Bavt38XBX", label: "CANARY 4", expected: "Ready" },
  {
    id: "LYJcsxnfUyacRWtntEkd",
    label: "CANARY 5",
    expected: "Needs Review",
    expectedBlockers: ["subject_specificity_risk:cow"],
  },
  { id: "Dr8lcyPE8imTQlNESP8X", label: "CANARY 6", expected: "Ready" },
  { id: "1Ws0T9fivryest6IUSbt", label: "CANARY 7", expected: "Ready" },
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
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return { db: getFirestore(), authAdmin: getAuth() };
}

async function readGate(db) {
  const s = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  return {
    catalogWorkflowMode: s.catalogWorkflowMode ?? null,
    catalogAutonomousLiveEnabled: s.catalogAutonomousLiveEnabled === true,
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
  };
}

async function waitPublication(db, designId) {
  const started = Date.now();
  while (Date.now() - started < PUB_WAIT_MS) {
    const data = (await db.collection("designs").doc(designId).get()).data() || {};
    const status = data.portalCatalogPublicationStatus;
    if (status === "synced" || status === "failed") {
      return { status, error: data.portalCatalogPublicationError ?? null, ms: Date.now() - started };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  const data = (await db.collection("designs").doc(designId).get()).data() || {};
  return {
    status: data.portalCatalogPublicationStatus ?? null,
    timedOut: true,
    ms: Date.now() - started,
  };
}

async function waitAlgolia(portalEnv, designId) {
  const appId = portalEnv.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = portalEnv.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  const indexName = portalEnv.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "portal_catalog_ready_dev";
  const client = algoliasearch(appId, searchKey);
  const started = Date.now();
  while (Date.now() - started < ALGOLIA_WAIT_MS) {
    try {
      const result = await client.searchSingleIndex({
        indexName,
        searchParams: { filters: `objectID:${designId}`, hitsPerPage: 1 },
      });
      const hit = result.hits?.[0];
      if (hit) {
        return {
          checked: true,
          indexName,
          objectPresent: true,
          objectID: hit.objectID,
          title: hit.title ?? null,
          ms: Date.now() - started,
        };
      }
    } catch (error) {
      return { checked: false, reason: error instanceof Error ? error.message : "algolia_error" };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return { checked: true, indexName, objectPresent: false, timedOut: true, ms: Date.now() - started };
}

async function main() {
  const { db, authAdmin } = ensureAdmin();
  const portalEnv = loadPortalEnv();
  const prior = JSON.parse(readFileSync(PRIOR_PATH, "utf8"));
  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    continuationOf: PRIOR_PATH,
    priorFixtureId: prior.fixture?.designId ?? null,
    note: "Resuming after Algolia search lag false-stop on Explicit fixture; fixture already Ready+Explicit+synced",
    rows: [],
  };

  // Confirm Explicit fixture still correct
  const fxId = prior.fixture?.designId;
  const fx = (await db.collection("designs").doc(fxId).get()).data() || {};
  results.fixtureRecheck = auditDesign(fx);
  const fxAlgolia = await waitAlgolia(portalEnv, fxId);
  results.fixtureAlgoliaNow = fxAlgolia;
  if (
    fx.status !== "ready" ||
    fx.isExplicitContent !== true ||
    !Array.isArray(fx.censoredTerms) ||
    !fx.censoredTerms.includes("damn") ||
    fx.portalCatalogPublicationStatus !== "synced" ||
    !fxAlgolia.objectPresent
  ) {
    throw new Error("Explicit fixture no longer satisfies Ready+Explicit+synced+Algolia");
  }

  const email = `ws5-cont-${RUN_ID}@freshprints.local`;
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
    displayName: `WS5 Canary Continue ${RUN_ID}`,
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
  const updateMode = httpsCallable(fns, "updateCatalogWorkflowMode");
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment");

  const rollback = async (reason) => {
    const resp = await updateMode({
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    const verified = await readGate(db);
    results.rollback = { reason, response: resp.data ?? null, verified, at: new Date().toISOString() };
    if (verified.catalogWorkflowMode !== "shadow" || verified.catalogAutonomousLiveEnabled) {
      throw new Error("rollback verify failed");
    }
  };

  try {
    await updateMode({ catalogWorkflowMode: "autonomous" });
    let g = await readGate(db);
    if (g.catalogWorkflowMode !== "autonomous" || g.catalogAutonomousLiveEnabled) {
      throw new Error("step1 failed");
    }
    await updateMode({
      catalogWorkflowMode: "autonomous",
      catalogAutonomousLiveEnabled: true,
      confirmationPhrase: "ENABLE AUTONOMOUS",
    });
    g = await readGate(db);
    if (g.catalogWorkflowMode !== "autonomous" || !g.catalogAutonomousLiveEnabled) {
      throw new Error("step2 failed");
    }
    results.enablement = { verified: g, at: new Date().toISOString() };

    for (const row of ROWS) {
      console.log(`=== ${row.label} ${row.id} ===`);
      const call = await enqueue({ designId: row.id, rerunFromReview: true });
      let after = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
      let publication = { status: null };
      let algolia = { checked: false, reason: "n/a" };
      const failures = [];

      if (row.expected === "Ready") {
        publication = await waitPublication(db, row.id);
        after = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
        algolia = await waitAlgolia(portalEnv, row.id);
        if (!(after.status === "ready" && after.aiReviewedBy === "system:catalog-autonomy")) {
          failures.push("expected_Ready_not_met");
        }
        if (publication.status !== "synced") failures.push("publication_not_synced");
        if (!algolia.objectPresent) failures.push("algolia_object_missing");
      } else {
        after = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
        if (after.status === "ready" || after.aiReviewedBy === "system:catalog-autonomy") {
          failures.push("CRITICAL_blocked_became_Ready");
        }
        if (!(after.status === "imported" && after.aiReviewStatus === "needs_review")) {
          failures.push("expected_Needs_Review_not_met");
        }
      }

      const rowResult = {
        label: row.label,
        id: row.id,
        expected: row.expected,
        enqueueResponse: call.data ?? null,
        after,
        publication,
        algolia,
        evaluation: {
          pass: failures.length === 0,
          failures,
          actualClass:
            after.status === "ready"
              ? "Ready"
              : after.aiReviewStatus === "needs_review"
                ? "Needs Review"
                : `other`,
        },
      };
      results.rows.push(rowResult);
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      console.log(JSON.stringify(rowResult.evaluation, null, 2));
      if (failures.length) {
        await rollback(`fail_${row.id}`);
        results.aborted = true;
        results.abortReason = failures.join(",");
        writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
        throw new Error(results.abortReason);
      }
    }

    await rollback("continue_complete");
    results.mechanicalPass = true;
    results.finishedAt = new Date().toISOString();
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    console.log("CONTINUATION PASS");
  } catch (error) {
    try {
      const g = await readGate(db);
      if (g.catalogWorkflowMode !== "shadow" || g.catalogAutonomousLiveEnabled) {
        await rollback("catch");
      }
    } catch (e) {
      console.error(e);
    }
    results.error = error instanceof Error ? error.message : String(error);
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

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
