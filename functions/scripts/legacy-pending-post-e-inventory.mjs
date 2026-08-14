/**
 * Read-only post-E inventory of production pending_staff_review customerUploads.
 * Hard-pinned to fresh-prints-prod. NO writes to Firestore.
 *
 * Usage:
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   node functions/scripts/legacy-pending-post-e-inventory.mjs
 */

/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";

import {
  LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID,
  assertLegacyPendingRepairProjectId,
  classifyCustomerUploadPurpose,
  classifyLegacyPendingFalsePendingCandidate,
  hasBiddingAcknowledgment,
  hasLiveShowAllocation,
  isLiveShowAllocation,
} from "./lib/legacyPendingFalsePendingRepairGuard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(FUNCTIONS_ROOT, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function resolveProjectId() {
  const projectId = String(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "",
  ).trim();
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID must be set to fresh-prints-prod.");
  }
  assertLegacyPendingRepairProjectId(projectId);
  return projectId;
}

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

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

async function main() {
  const projectId = resolveProjectId();
  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();

  console.info(
    JSON.stringify({
      tool: "legacy-pending-post-e-inventory",
      projectId,
      mode: "READ_ONLY",
      note: "No Firestore writes",
    }),
  );

  const pendingSnap = await db
    .collection("customerUploads")
    .where("catalogReviewStatus", "==", "pending_staff_review")
    .get();

  /** @type {object[]} */
  const printRequestRows = [];
  let donationOrOtherCount = 0;

  for (const doc of pendingSnap.docs) {
    const upload = doc.data();
    const purposeClass = classifyCustomerUploadPurpose(upload.purpose);
    if (purposeClass !== "print_request" && purposeClass !== "missing") {
      donationOrOtherCount += 1;
      continue;
    }

    const printRequestId =
      typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";
    let request = null;
    if (printRequestId) {
      const requestSnap = await db.collection("printRequests").doc(printRequestId).get();
      request = requestSnap.exists ? requestSnap.data() : null;
    }
    const allocations = await loadAllocations(db, doc.id, printRequestId);
    const liveAllocations = allocations.filter((row) => isLiveShowAllocation(row));

    // Classify as if allowlisted (inventory discovery).
    const classification = classifyLegacyPendingFalsePendingCandidate({
      uploadId: doc.id,
      allowlist: new Set([doc.id]),
      upload,
      request,
      allocations,
    });

    printRequestRows.push({
      uploadId: doc.id,
      purpose: typeof upload.purpose === "string" ? upload.purpose : null,
      purposeClass,
      technicalStatus:
        typeof upload.technicalStatus === "string" ? upload.technicalStatus : null,
      printRequestId: printRequestId || null,
      createdAt: toIso(upload.createdAt),
      confirmedAt: toIso(upload.confirmedAt),
      requestStatus: request && typeof request.status === "string" ? request.status : null,
      biddingAckPresent: hasBiddingAcknowledgment(request?.showQueueBiddingAcknowledgment),
      liveAllocationCount: liveAllocations.length,
      allocationCount: allocations.length,
      hasLiveAllocation: hasLiveShowAllocation(allocations),
      classification,
    });
  }

  const provenFalse = printRequestRows.filter(
    (row) => row.classification.decision === "would_patch",
  );
  const provenLegitimate = printRequestRows.filter(
    (row) =>
      row.classification.decision === "skip" &&
      (row.classification.reason === "request_active" ||
        row.classification.reason === "request_editing" ||
        row.classification.reason === "bidding_ack_present" ||
        row.classification.reason === "live_allocation_present"),
  );
  const ambiguous = printRequestRows.filter(
    (row) =>
      !provenFalse.includes(row) &&
      !provenLegitimate.includes(row) &&
      row.classification.decision !== "noop_already_repaired",
  );

  const frozenAllowlist = provenFalse.map((row) => row.uploadId).sort();

  const record = {
    tool: "legacy-pending-post-e-inventory",
    projectId: LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID,
    mode: "READ_ONLY",
    generatedAt: new Date().toISOString(),
    productionGitShaHint: "76205da8eeab43c545112f7399522e6b4106a03e",
    summary: {
      pendingStaffReviewTotal: pendingSnap.size,
      printRequestClassCount: printRequestRows.length,
      donationOrOtherCount,
      provenFalsePendingCount: provenFalse.length,
      provenLegitimatePrintRequestPendingCount: provenLegitimate.length,
      ambiguousPrintRequestCount: ambiguous.length,
    },
    frozenApplyAllowlistProposal: frozenAllowlist,
    printRequestCandidates: printRequestRows,
    provenFalsePending: provenFalse,
    provenLegitimatePrintRequestPending: provenLegitimate,
    ambiguousPrintRequestPending: ambiguous,
  };

  const outDir = resolve(REPO_ROOT, "docs/workflow/reviews");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = resolve(outDir, `legacy-pending-post-e-inventory-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.info(JSON.stringify(record.summary));
  console.info(`Wrote inventory: ${outPath}`);
  console.info(`Frozen allowlist proposal: ${frozenAllowlist.join(",") || "(empty)"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
