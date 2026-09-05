/**
 * WS5 Autonomous DEV canary — MODEL 2 CONTINUATION (fresh-prints-dev ONLY).
 * Runs only remaining rows: LYJ, Dr8, 1Ws. Safety-invariant evaluation.
 * Required rollback to shadow / live false.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/ws5-autonomous-dev-canary-model2-continuation-dev.mjs
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
  "docs/workflow/reviews/_ws5-autonomous-dev-canary-model2-continuation-raw.json",
);
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Ws5M2-${randomBytes(18).toString("base64url")}!aA1`;
const PUB_WAIT_MS = 90_000;
const ALGOLIA_WAIT_MS = 90_000;
const POLL_MS = 2_000;

const HARD_EXACT = new Set([
  "category_unresolved",
  "description_missing",
  "title:title_missing",
  "title:title_exceeds_max_characters",
  "category_gap_suggested",
  "category_dominant_intent_conflict",
  "verifier_unresolved",
]);

const ROWS = [
  { id: "LYJcsxnfUyacRWtntEkd", label: "MODEL2 CONT 1 — LYJ", historicalContext: "Needs Review / subject_specificity_risk:cow" },
  { id: "Dr8lcyPE8imTQlNESP8X", label: "MODEL2 CONT 2 — Dr8", historicalContext: "Ready" },
  { id: "1Ws0T9fivryest6IUSbt", label: "MODEL2 CONT 3 — 1Ws", historicalContext: "Ready" },
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
  return { db: getFirestore(), authAdmin: getAuth() };
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
      ? s.explicitContentAutomationTerms.includes("damn")
      : false,
  };
}

function deriveHardBlockers(reasons) {
  const list = Array.isArray(reasons) ? reasons : [];
  return [
    ...new Set(
      list.filter((code) => {
        const c = String(code);
        if (HARD_EXACT.has(c)) return true;
        if (c.startsWith("structured_evidence_gap:")) return true;
        if (c.startsWith("subject_specificity_risk:")) return true;
        if (c.startsWith("validation:") && !c.includes("missing_generated_at")) return true;
        return false;
      }),
    ),
  ];
}

function auditDesign(data) {
  const prov = data.smartProfile?.provenance ?? {};
  const reasons = prov.automationReasonCodes ?? null;
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
    automationReasonCodes: reasons,
    hardBlockers: deriveHardBlockers(reasons),
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    schemaVersion: prov.version ?? null,
    model: prov.model ?? null,
    staffEditedKeys: Array.isArray(data.smartProfileStaffEdited)
      ? data.smartProfileStaffEdited
      : data.staffEditedFields ?? null,
    hasImportPreset: Boolean(data.importPresetId || data.smartProfile?.importPresetSeed),
    title: data.title ?? data.aiSuggestions?.title ?? null,
    aiTitle: data.aiSuggestions?.title ?? data.smartProfile?.title ?? null,
  };
}

async function waitPublicationIfReady(db, designId, isReady) {
  if (!isReady) return { waited: false, reason: "not_ready" };
  const started = Date.now();
  while (Date.now() - started < PUB_WAIT_MS) {
    const data = (await db.collection("designs").doc(designId).get()).data() || {};
    const status = data.portalCatalogPublicationStatus;
    if (status === "synced" || status === "failed") {
      return {
        waited: true,
        status,
        error: data.portalCatalogPublicationError ?? null,
        ms: Date.now() - started,
      };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  const data = (await db.collection("designs").doc(designId).get()).data() || {};
  return {
    waited: true,
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

/**
 * Model 2 safety-invariant evaluation — does NOT require exact historical class.
 */
function evaluateModel2(audit, publication, algolia) {
  const failures = [];
  const hard = audit.hardBlockers || [];
  const isReady =
    audit.status === "ready" &&
    audit.aiReviewStatus === "approved" &&
    audit.aiReviewedBy === "system:catalog-autonomy";
  const isNeedsReview =
    audit.status === "imported" && audit.aiReviewStatus === "needs_review";

  let disposition = "UNKNOWN";
  let model2Class = "other";

  // CRITICAL: Ready with hard blockers
  if (isReady && hard.length > 0) {
    failures.push("CRITICAL_Ready_with_hard_blockers");
    disposition = "CRITICAL FAIL — Ready with hard blockers";
    model2Class = "Ready";
  } else if (isReady) {
    model2Class = "Ready";
    if (audit.aiReviewedBy !== "system:catalog-autonomy") failures.push("aiReviewedBy_mismatch");
    if (!audit.readyAt) failures.push("readyAt_missing");
    if (publication.status !== "synced") failures.push("publication_not_synced");
    if (publication.status === "failed") failures.push("publication_failed");
    if (algolia.checked && !algolia.objectPresent) failures.push("algolia_object_missing");
    if (audit.hasImportPreset) failures.push("unexpected_import_preset");
    disposition =
      failures.length === 0 ? "PASS — Ready (policy-clear)" : "FAIL — Ready audit incomplete";
  } else if (isNeedsReview) {
    model2Class = "Needs Review";
    if (audit.aiReviewedBy === "system:catalog-autonomy") {
      failures.push("unexpected_system_approval_on_Needs_Review");
    }
    if (audit.status === "ready") failures.push("CRITICAL_status_ready");
    if (hard.length === 0) {
      failures.push("unexplained_zero_blocker_Needs_Review");
      disposition = "STOP — unexplained zero-blocker Needs Review";
    } else {
      disposition =
        failures.length === 0
          ? "PASS — CONSERVATIVE BLOCK"
          : "FAIL — Needs Review audit issues";
    }
  } else {
    failures.push(`unexpected_lifecycle:${audit.status}/${audit.aiReviewStatus}`);
    disposition = "STOP — unexpected lifecycle";
  }

  return {
    model2Class,
    disposition,
    hardBlockers: hard,
    pass: failures.length === 0,
    failures,
  };
}

async function main() {
  const { db, authAdmin } = ensureAdmin();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const results = {
    projectId: PROJECT_ID,
    model: "MODEL_2_SAFETY_INVARIANT",
    startedAt: new Date().toISOString(),
    runId: RUN_ID,
    aborted: false,
    rows: [],
  };

  const gate0 = await readGate(db);
  results.preflight = { gate: gate0 };
  if (gate0.catalogWorkflowMode !== "shadow" || gate0.catalogAutonomousLiveEnabled) {
    results.abortReason = "[WS5 CONTINUATION PREREQUISITE FAILURE — AUTONOMOUS GATE STATE]";
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (gate0.termsCount !== 43 || !gate0.hasDamn) {
    results.abortReason = `[WS5 CONTINUATION PREREQUISITE FAILURE — vocabulary (count=${gate0.termsCount}, hasDamn=${gate0.hasDamn})]`;
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  for (const row of ROWS) {
    const d = (await db.collection("designs").doc(row.id).get()).data() || {};
    if (d.status !== "imported" || d.aiReviewStatus !== "needs_review") {
      results.abortReason = `[WS5 CONTINUATION PREREQUISITE FAILURE — ${row.id} not imported/needs_review]`;
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      throw new Error(results.abortReason);
    }
  }

  const email = `ws5-m2-${RUN_ID}@freshprints.local`;
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
    displayName: `WS5 Model2 Cont ${RUN_ID}`,
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
    console.log(`ROLLBACK → shadow/false (${reason})`);
    const resp = await updateMode({
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    const verified = await readGate(db);
    results.rollback = {
      reason,
      response: resp.data ?? null,
      verified,
      at: new Date().toISOString(),
    };
    if (verified.catalogWorkflowMode !== "shadow" || verified.catalogAutonomousLiveEnabled) {
      throw new Error("ROLLBACK VERIFY FAILED: " + JSON.stringify(verified));
    }
  };

  try {
    console.log("ENABLE Step 1: autonomous / live false");
    const step1 = await updateMode({ catalogWorkflowMode: "autonomous" });
    const gate1 = await readGate(db);
    results.enablement = {
      step1: { response: step1.data ?? null, verified: gate1, at: new Date().toISOString() },
    };
    if (gate1.catalogWorkflowMode !== "autonomous" || gate1.catalogAutonomousLiveEnabled !== false) {
      await rollback("step1_unexpected");
      throw new Error("Step 1 verify failed");
    }

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
      throw new Error("Step 2 verify failed");
    }
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

    for (const row of ROWS) {
      console.log(`\n=== ${row.label} ${row.id} ===`);
      const before = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
      const call = await enqueue({ designId: row.id, rerunFromReview: true });
      let after = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
      const isReady =
        after.status === "ready" &&
        after.aiReviewStatus === "approved" &&
        after.aiReviewedBy === "system:catalog-autonomy";
      const publication = await waitPublicationIfReady(db, row.id, isReady);
      after = auditDesign((await db.collection("designs").doc(row.id).get()).data() || {});
      const stillReady =
        after.status === "ready" &&
        after.aiReviewStatus === "approved" &&
        after.aiReviewedBy === "system:catalog-autonomy";
      const algolia = stillReady
        ? await waitAlgolia(portalEnv, row.id)
        : { checked: false, reason: "not_required" };

      const evaluation = evaluateModel2(after, publication, algolia);
      const rowResult = {
        label: row.label,
        id: row.id,
        historicalContext: row.historicalContext,
        before,
        enqueueResponse: call.data ?? null,
        after,
        publication,
        algolia,
        evaluation,
      };
      results.rows.push(rowResult);
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      console.log(JSON.stringify(evaluation, null, 2));

      if (!evaluation.pass) {
        await rollback(`fail_${row.id}`);
        results.aborted = true;
        results.abortReason = `${row.label}: ${evaluation.failures.join(",")}`;
        writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
        throw new Error(results.abortReason);
      }
    }

    await rollback("model2_continuation_complete");
    results.mechanicalPass = true;
    results.finishedAt = new Date().toISOString();
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    console.log("\nMODEL 2 CONTINUATION PASS — Autonomous restored OFF");
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

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
