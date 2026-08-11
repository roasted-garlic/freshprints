/**
 * Bounded legacy false-Pending print-request upload repair (production only).
 *
 * Local Admin SDK procedure — NOT a deployed callable.
 * Hard-pinned to `fresh-prints-prod`. Default mode is DRY RUN (no writes).
 *
 * Usage (from repo root, with ADC / GOOGLE_APPLICATION_CREDENTIALS):
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   node functions/scripts/legacy-pending-false-pending-repair.mjs
 *     → dry-run: re-read + classify allowlisted IDs; write JSON report; NO writes
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   $env:CONFIRM_PROD_LEGACY_PENDING_REPAIR = "1"
 *   $env:APPLY = "1"
 *   node functions/scripts/legacy-pending-false-pending-repair.mjs
 *     → APPLY: per-doc transaction re-check; patch only catalogReviewStatus + updatedAt
 *
 * Optional allowlist override (CSV):
 *   $env:LEGACY_PENDING_REPAIR_ALLOWLIST = "id1,id2"
 *
 * Owner gates (do not bypass):
 *   APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR — before APPLY=1
 *
 * DO NOT run APPLY unless separately authorized. This script defaults to dry-run.
 */

/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";

import {
  LEGACY_PENDING_REPAIR_CONFIRM_ENV,
  assertLegacyPendingRepairApplyConfirm,
  assertLegacyPendingRepairProjectId,
  buildLegacyPendingRepairDryRunRecord,
  classifyLegacyPendingFalsePendingCandidate,
  resolveLegacyPendingRepairAllowlist,
} from "./lib/legacyPendingFalsePendingRepairGuard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(FUNCTIONS_ROOT, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

function resolveProjectId() {
  const fromEnv =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "";
  const projectId = String(fromEnv).trim();
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID (or GCLOUD_PROJECT) must be set explicitly to fresh-prints-prod.",
    );
  }
  assertLegacyPendingRepairProjectId(projectId);
  return projectId;
}

function ensureApp(projectId) {
  if (getApps().length > 0) {
    return;
  }
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

/**
 * Load allocations for upload + request. Live = non-canceled + qty > 0 (classifier).
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uploadId
 * @param {string} printRequestId
 */
async function loadAllocations(db, uploadId, printRequestId) {
  const byId = new Map();
  const queries = [];
  if (printRequestId) {
    queries.push(db.collection("showAllocations").where("printRequestId", "==", printRequestId).get());
  }
  if (uploadId) {
    queries.push(db.collection("showAllocations").where("customerUploadId", "==", uploadId).get());
  }
  const snaps = await Promise.all(queries);
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      byId.set(doc.id, { id: doc.id, ...doc.data() });
    }
  }
  return [...byId.values()];
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uploadId
 * @param {ReadonlySet<string>} allowlist
 */
async function evaluateCandidate(db, uploadId, allowlist) {
  const uploadRef = db.collection("customerUploads").doc(uploadId);
  const uploadSnap = await uploadRef.get();
  const upload = uploadSnap.exists ? uploadSnap.data() : null;
  const printRequestId =
    upload && typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";

  let request = null;
  if (printRequestId) {
    const requestSnap = await db.collection("printRequests").doc(printRequestId).get();
    request = requestSnap.exists ? requestSnap.data() : null;
  }

  const allocations = await loadAllocations(db, uploadId, printRequestId);
  const classified = classifyLegacyPendingFalsePendingCandidate({
    uploadId,
    allowlist,
    upload,
    request,
    allocations,
  });

  return {
    uploadId,
    printRequestId: printRequestId || null,
    requestStatus: request && typeof request.status === "string" ? request.status : null,
    catalogReviewStatus:
      upload && typeof upload.catalogReviewStatus === "string" ? upload.catalogReviewStatus : null,
    purpose: upload && typeof upload.purpose === "string" ? upload.purpose : null,
    allocationCount: allocations.length,
    ...classified,
  };
}

/**
 * APPLY with fresh allocation read immediately before TX, then re-check upload+request in TX.
 * Fail closed if classification is not would_patch / noop.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uploadId
 * @param {ReadonlySet<string>} allowlist
 */
async function applyCandidateWithFreshReads(db, uploadId, allowlist) {
  const uploadRef = db.collection("customerUploads").doc(uploadId);
  const uploadSnapPre = await uploadRef.get();
  const uploadPre = uploadSnapPre.exists ? uploadSnapPre.data() : null;
  const printRequestId =
    uploadPre && typeof uploadPre.printRequestId === "string"
      ? uploadPre.printRequestId.trim()
      : "";
  const allocations = await loadAllocations(db, uploadId, printRequestId);

  return db.runTransaction(async (tx) => {
    const uploadSnap = await tx.get(uploadRef);
    const upload = uploadSnap.exists ? uploadSnap.data() : null;
    let request = null;
    const requestId =
      upload && typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";
    if (requestId) {
      const requestSnap = await tx.get(db.collection("printRequests").doc(requestId));
      request = requestSnap.exists ? requestSnap.data() : null;
    }

    const classified = classifyLegacyPendingFalsePendingCandidate({
      uploadId,
      allowlist,
      upload,
      request,
      allocations,
    });

    if (classified.decision === "noop_already_repaired") {
      return {
        uploadId,
        decision: "noop_already_repaired",
        reason: classified.reason,
        repaired: false,
      };
    }

    if (classified.decision !== "would_patch" || !classified.repairPatch) {
      return {
        uploadId,
        decision: "skip",
        reason: classified.reason || "stale_or_ambiguous",
        repaired: false,
      };
    }

    tx.update(uploadRef, {
      catalogReviewStatus: classified.repairPatch.catalogReviewStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      uploadId,
      decision: "patched",
      reason: classified.reason,
      repaired: true,
      repairPatch: classified.repairPatch,
    };
  });
}

async function main() {
  const projectId = resolveProjectId();
  const applyRequested = process.env.APPLY === "1";
  if (applyRequested) {
    assertLegacyPendingRepairApplyConfirm({
      apply: process.env.APPLY,
      confirm: process.env[LEGACY_PENDING_REPAIR_CONFIRM_ENV],
    });
  }

  const allowlistArr = resolveLegacyPendingRepairAllowlist();
  const allowlist = new Set(allowlistArr);
  ensureApp(projectId);
  const db = getFirestore();

  console.info(
    JSON.stringify({
      tool: "legacy-pending-false-pending-repair",
      projectId,
      mode: applyRequested ? "APPLY" : "DRY_RUN",
      allowlist: allowlistArr,
      note: applyRequested
        ? "APPLY authorized by env confirms — mutating allowlisted docs only when predicates hold"
        : "DRY_RUN default — no Firestore writes",
    }),
  );

  /** @type {object[]} */
  const results = [];

  for (const uploadId of allowlistArr) {
    if (applyRequested) {
      const applied = await applyCandidateWithFreshReads(db, uploadId, allowlist);
      results.push(applied);
      console.info(JSON.stringify(applied));
    } else {
      const evaluated = await evaluateCandidate(db, uploadId, allowlist);
      results.push(evaluated);
      console.info(JSON.stringify(evaluated));
    }
  }

  const record = buildLegacyPendingRepairDryRunRecord({
    projectId,
    apply: applyRequested,
    allowlist: allowlistArr,
    results,
  });

  const outDir = resolve(REPO_ROOT, "docs/workflow/reviews");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = resolve(
    outDir,
    `legacy-pending-false-pending-repair-${applyRequested ? "apply" : "dry-run"}-${stamp}.json`,
  );
  writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.info(`Wrote report: ${outPath}`);

  const unexpectedSkips = results.filter(
    (row) => row.decision === "skip" && row.reason !== "not_allowlisted",
  );
  if (applyRequested && unexpectedSkips.length > 0) {
    console.error("APPLY completed with skip(s) — fail closed summary non-zero.");
    process.exitCode = 2;
    return;
  }

}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
