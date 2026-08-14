/**
 * Studio 1.0.4 P4 — one-shot production smoke fixture cleanup.
 *
 * Hard-pinned to fresh-prints-prod and an exact 8-ID allowlist from
 * docs/workflow/plans/2026-08-13-studio-1.0.4-ai-processing-preview-cleanup-corrective-plan.md.
 *
 * Eligibility mirrors functions/src/deleteEligibleUnapprovedDesign.ts (fail-closed).
 *
 * Usage (from repo / worktree root, with ADC):
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   node functions/scripts/studio-104-prod-smoke-fixture-cleanup.mjs
 *     → DRY RUN (default): classify + table + JSON report; NO deletes
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   $env:CONFIRM_PROD_STUDIO104_FIXTURE_CLEANUP = "1"
 *   $env:APPLY = "1"
 *   node functions/scripts/studio-104-prod-smoke-fixture-cleanup.mjs
 *     → destructive: Storage then Firestore for eligible IDs only
 *
 * STOP before any deletes if ANY allowlisted doc has status "ready" or an unexpected
 * status (not imported|processing|rejected). Already-missing docs are OK.
 */

/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(FUNCTIONS_ROOT, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const ALLOWED_PROJECT = "fresh-prints-prod";
const CONFIRM_ENV = "CONFIRM_PROD_STUDIO104_FIXTURE_CLEANUP";

/** Exact allowlist — NEVER accept env overrides that add IDs. */
const ALLOWLIST = Object.freeze([
  { id: "qT7Mnxo0IRABj92io3jF", expectedTitle: "grace" },
  { id: "XTa3CyMGDDGiOhXfmXA2", expectedTitle: "faithoverfeartimothy" },
  { id: "U3FCUbWEQGKJ3HEHXc0z", expectedTitle: "jesus the way 1" },
  { id: "lSygK6mUYT8lCz87ykKK", expectedTitle: "GraffitiJesusPNG" },
  { id: "apMfj3bI4kLt50rjM0Ff", expectedTitle: "jesus the way" },
  { id: "09wKlenmbdbKkdvd8Mph", expectedTitle: "jesusmysavior" },
  { id: "YgOYS3awViwDZCIL50Cz", expectedTitle: "prayer" },
  { id: "DjStnvXeV6gahnnaBxox", expectedTitle: "faithoverfeartimothy" },
]);

const ALLOWLIST_IDS = Object.freeze(ALLOWLIST.map((e) => e.id));
const ALLOWLIST_SET = new Set(ALLOWLIST_IDS);

const ELIGIBLE_STATUSES = new Set(["imported", "processing", "rejected"]);
const ACTIVE_AI_STAGES = new Set([
  "queued",
  "preparing_image",
  "sending_to_ai",
  "receiving_response",
  "validating_response",
]);

function resolveProjectId() {
  const projectId = String(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "",
  ).trim();
  if (projectId !== ALLOWED_PROJECT) {
    throw new Error(
      `FIREBASE_PROJECT_ID must be exactly "${ALLOWED_PROJECT}" (got "${projectId || "(empty)"}").`,
    );
  }
  return projectId;
}

/**
 * Reject any env attempt to expand the allowlist.
 * DESIGN_IDS / FIXTURE_IDS / EXTRA_IDS etc. may only equal the exact set (or be unset).
 */
function assertNoAllowlistOverride() {
  const candidates = [
    "DESIGN_IDS",
    "FIXTURE_IDS",
    "EXTRA_DESIGN_IDS",
    "ADDITIONAL_DESIGN_IDS",
    "STUDIO104_FIXTURE_IDS",
  ];
  for (const key of candidates) {
    const raw = process.env[key];
    if (raw == null || String(raw).trim() === "") continue;
    const ids = String(raw)
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const extras = ids.filter((id) => !ALLOWLIST_SET.has(id));
    if (extras.length > 0) {
      throw new Error(
        `Refusing env ${key}: adds non-allowlisted IDs: ${extras.join(", ")}. Allowlist is hard-pinned.`,
      );
    }
    const missing = ALLOWLIST_IDS.filter((id) => !ids.includes(id));
    if (ids.length !== ALLOWLIST_IDS.length || missing.length > 0) {
      throw new Error(
        `Refusing env ${key}: must be unset or exactly the 8 hard-pinned IDs (no subset/superset).`,
      );
    }
  }
}

function stripLeadingSlash(path) {
  return String(path || "").replace(/^\//, "");
}

function storagePathsFor(designId) {
  return {
    original: `originals/${designId}.png`,
    thumbnail: `thumbnails/${designId}.webp`,
    preview: `previews/${designId}.webp`,
  };
}

async function objectExists(bucket, objectPath) {
  const path = stripLeadingSlash(objectPath);
  try {
    const [exists] = await bucket.file(path).exists();
    return Boolean(exists);
  } catch (err) {
    return { error: String(err?.message || err).slice(0, 200) };
  }
}

async function collectReferenceBlockers(db, designId) {
  const blockers = [];
  const [printItems, showAllocations, companionLinks] = await Promise.all([
    db.collection("printRequestItems").where("designId", "==", designId).limit(1).get(),
    db.collection("showAllocations").where("designId", "==", designId).limit(1).get(),
    db.collection("companionLinks").where("designIds", "array-contains", designId).limit(1).get(),
  ]);
  if (!printItems.empty) blockers.push("Referenced by one or more print request items.");
  if (!showAllocations.empty) blockers.push("Referenced by one or more show allocations.");
  if (!companionLinks.empty) blockers.push("Linked in a companion relationship.");
  return blockers;
}

/**
 * @returns {Promise<{
 *   designId: string,
 *   expectedTitle: string,
 *   exists: boolean,
 *   title: string|null,
 *   status: string|null,
 *   aiProcessingStage: string|null,
 *   eligible: boolean,
 *   alreadyDeleted: boolean,
 *   stopBeforeApply: boolean,
 *   stopReason: string|null,
 *   reasons: string[],
 *   storage: { original: boolean|object, thumbnail: boolean|object, preview: boolean|object }
 * }>}
 */
async function classifyOne(db, bucket, entry) {
  const { id: designId, expectedTitle } = entry;
  const paths = storagePathsFor(designId);
  const [origEx, thumbEx, previewEx] = await Promise.all([
    objectExists(bucket, paths.original),
    objectExists(bucket, paths.thumbnail),
    objectExists(bucket, paths.preview),
  ]);

  const snap = await db.collection("designs").doc(designId).get();
  if (!snap.exists) {
    return {
      designId,
      expectedTitle,
      exists: false,
      title: null,
      status: null,
      aiProcessingStage: null,
      eligible: false,
      alreadyDeleted: true,
      stopBeforeApply: false,
      stopReason: null,
      reasons: ["already_deleted"],
      storage: { original: origEx, thumbnail: thumbEx, preview: previewEx },
    };
  }

  const data = snap.data() ?? {};
  const title = typeof data.title === "string" ? data.title : null;
  const status = typeof data.status === "string" ? data.status : String(data.status ?? "");
  const aiProcessingStage =
    data.aiProcessingStage == null ? null : String(data.aiProcessingStage);

  const reasons = [];
  let stopBeforeApply = false;
  let stopReason = null;

  if (status === "ready") {
    stopBeforeApply = true;
    stopReason = "ready";
    reasons.push("Ready (catalog-approved) designs cannot be permanently deleted with this workflow.");
  } else if (!ELIGIBLE_STATUSES.has(status)) {
    stopBeforeApply = true;
    stopReason = "unexpected_status";
    reasons.push(`Status "${status}" is not eligible for permanent unapproved delete.`);
  }

  if (ACTIVE_AI_STAGES.has(aiProcessingStage || "")) {
    reasons.push("Design is actively mid AI pipeline and cannot be deleted until it settles.");
  }

  const blockers = await collectReferenceBlockers(db, designId);
  if (typeof data.sourceCustomerUploadId === "string" && data.sourceCustomerUploadId.trim()) {
    blockers.push("Design was promoted from a customer upload (sourceCustomerUpload provenance).");
  }
  const companionIds = data.companionDesignIds;
  if (Array.isArray(companionIds) && companionIds.length > 0) {
    blockers.push("Design has companionDesignIds denorm links.");
  }
  if (typeof data.companionSetId === "string" && data.companionSetId.trim()) {
    blockers.push("Design is linked to a companion set.");
  }
  reasons.push(...blockers);

  const eligible = reasons.length === 0 && !stopBeforeApply;

  return {
    designId,
    expectedTitle,
    exists: true,
    title,
    status,
    aiProcessingStage,
    eligible,
    alreadyDeleted: false,
    stopBeforeApply,
    stopReason,
    reasons,
    storage: { original: origEx, thumbnail: thumbEx, preview: previewEx },
  };
}

async function deleteStorageObject(bucket, objectPath) {
  const path = stripLeadingSlash(objectPath);
  try {
    await bucket.file(path).delete({ ignoreNotFound: true });
    return { path, deleted: true };
  } catch (err) {
    return { path, deleted: false, error: String(err?.message || err).slice(0, 200) };
  }
}

async function applyOne(db, bucket, row) {
  if (row.alreadyDeleted) {
    return {
      designId: row.designId,
      status: "skipped_already_deleted",
      title: row.title,
    };
  }
  if (!row.eligible) {
    return {
      designId: row.designId,
      status: "failed",
      title: row.title,
      error: row.reasons[0] || "Not eligible",
      blockers: row.reasons,
    };
  }

  const paths = storagePathsFor(row.designId);
  const storageResults = [];
  for (const p of [paths.original, paths.thumbnail, paths.preview]) {
    storageResults.push(await deleteStorageObject(bucket, p));
  }
  const storageFilesDeleted = storageResults.filter((r) => r.deleted).length;

  try {
    await db.collection("designs").doc(row.designId).delete();
  } catch (error) {
    return {
      designId: row.designId,
      status: "failed",
      title: row.title,
      storageFilesDeleted,
      storageResults,
      error:
        error instanceof Error
          ? `Storage cleaned but Firestore delete failed: ${error.message}. Retry to finish.`
          : "Storage cleaned but Firestore delete failed. Retry to finish.",
    };
  }

  return {
    designId: row.designId,
    status: "deleted",
    title: row.title,
    storageFilesDeleted,
    storageResults,
  };
}

function printTable(rows) {
  const header = [
    "designId",
    "exists",
    "status",
    "title",
    "eligible",
    "orig",
    "thumb",
    "preview",
    "notes",
  ];
  const lines = [header.join("\t")];
  for (const r of rows) {
    const fmtEx = (v) => (typeof v === "object" && v && "error" in v ? "err" : v ? "Y" : "N");
    lines.push(
      [
        r.designId,
        r.exists ? "Y" : "N",
        r.status ?? "(missing)",
        (r.title ?? r.expectedTitle ?? "").slice(0, 40),
        r.alreadyDeleted ? "already_deleted" : r.eligible ? "Y" : "N",
        fmtEx(r.storage.original),
        fmtEx(r.storage.thumbnail),
        fmtEx(r.storage.preview),
        (r.reasons || []).join("; ").slice(0, 80),
      ].join("\t"),
    );
  }
  console.log(lines.join("\n"));
}

function isApplyMode() {
  return process.env.APPLY === "1" && process.env[CONFIRM_ENV] === "1";
}

async function main() {
  assertNoAllowlistOverride();
  const projectId = resolveProjectId();

  if (ALLOWLIST_IDS.length !== 8 || new Set(ALLOWLIST_IDS).size !== 8) {
    throw new Error("Internal error: allowlist must be exactly 8 unique IDs.");
  }

  let credential;
  try {
    credential = applicationDefault();
  } catch (err) {
    console.error(
      "FATAL: Application Default Credentials unavailable.\n" +
        "Tried applicationDefault(). Fix with one of:\n" +
        "  - gcloud auth application-default login\n" +
        "  - set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON\n" +
        `Detail: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential,
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }

  const db = getFirestore();
  const bucket = getStorage().bucket();
  const apply = isApplyMode();

  console.log(`Project: ${projectId}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY_RUN"}`);
  console.log(`Allowlist: ${ALLOWLIST_IDS.length} IDs (hard-pinned)`);
  console.log("");

  const rows = [];
  for (const entry of ALLOWLIST) {
    rows.push(await classifyOne(db, bucket, entry));
  }

  printTable(rows);

  const stopRows = rows.filter((r) => r.stopBeforeApply);
  const eligibleOrGone = rows.filter((r) => r.eligible || r.alreadyDeleted);
  const ineligibleNonStop = rows.filter(
    (r) => !r.eligible && !r.alreadyDeleted && !r.stopBeforeApply,
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = resolve(REPO_ROOT, "docs", "workflow", "reviews");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(
    reportDir,
    `2026-08-13-studio-1.0.4-p4-prod-fixture-cleanup-${apply ? "apply" : "dry-run"}-${stamp}.json`,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    mode: apply ? "APPLY" : "DRY_RUN",
    allowlist: ALLOWLIST,
    rows,
    summary: {
      total: rows.length,
      exists: rows.filter((r) => r.exists).length,
      alreadyDeleted: rows.filter((r) => r.alreadyDeleted).length,
      eligible: rows.filter((r) => r.eligible).length,
      stopBeforeApply: stopRows.length,
      ineligibleNonStop: ineligibleNonStop.length,
    },
  };

  if (!apply) {
    writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nDry-run JSON report: ${reportPath}`);
    if (stopRows.length > 0) {
      console.error(
        `\nSTOP gate would fire on APPLY: ${stopRows.length} ID(s) ready/unexpected:`,
      );
      for (const r of stopRows) {
        console.error(`  - ${r.designId} status=${r.status} reason=${r.stopReason}`);
      }
      process.exitCode = 3;
      return;
    }
    console.log(
      `\nReady for APPLY: ${eligibleOrGone.length}/8 eligible or already deleted` +
        (ineligibleNonStop.length
          ? `; ${ineligibleNonStop.length} ineligible (refs/AI) would fail closed`
          : ""),
    );
    return;
  }

  // APPLY gates
  if (stopRows.length > 0) {
    console.error(
      "\nSTOP: one or more allowlisted designs are ready or have unexpected status. No deletes performed.",
    );
    for (const r of stopRows) {
      console.error(`  - ${r.designId} status=${r.status} stopReason=${r.stopReason}`);
    }
    report.applyBlocked = true;
    report.applyBlockReason = "ready_or_unexpected_status";
    writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.error(`Report: ${reportPath}`);
    process.exit(4);
  }

  console.log("\nAPPLY: deleting eligible designs (Storage then Firestore)...");
  const applyResults = [];
  for (const row of rows) {
    const result = await applyOne(db, bucket, row);
    applyResults.push(result);
    console.log(
      `  ${result.designId}: ${result.status}` +
        (result.error ? ` — ${result.error}` : "") +
        (result.storageFilesDeleted != null ? ` (storage=${result.storageFilesDeleted})` : ""),
    );
  }

  // Post-verify: re-read all 8 docs + spot-check originals
  console.log("\nPost-verify: re-read docs + originals...");
  const postVerify = [];
  for (const entry of ALLOWLIST) {
    const snap = await db.collection("designs").doc(entry.id).get();
    const origPath = storagePathsFor(entry.id).original;
    const origEx = await objectExists(bucket, origPath);
    postVerify.push({
      designId: entry.id,
      docExists: snap.exists,
      originalExists: origEx,
    });
    console.log(
      `  ${entry.id}: doc=${snap.exists ? "PRESENT" : "gone"} original=${
        typeof origEx === "object" ? "err" : origEx ? "PRESENT" : "gone"
      }`,
    );
  }

  const allDocsGone = postVerify.every((p) => !p.docExists);
  const allOriginalsGone = postVerify.every(
    (p) => p.originalExists === false || (typeof p.originalExists === "object" && p.originalExists),
  );

  report.applyResults = applyResults;
  report.postVerify = postVerify;
  report.allDocsGone = allDocsGone;
  report.summary.deleted = applyResults.filter((r) => r.status === "deleted").length;
  report.summary.skipped = applyResults.filter((r) => r.status === "skipped_already_deleted").length;
  report.summary.failed = applyResults.filter((r) => r.status === "failed").length;

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nApply JSON report: ${reportPath}`);
  console.log(`allDocsGone=${allDocsGone}`);

  if (!allDocsGone) {
    console.error("FATAL: one or more design docs still present after APPLY.");
    process.exit(5);
  }
  if (report.summary.failed > 0) {
    console.error("APPLY completed with failures (fail-closed on ineligible).");
    process.exit(6);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
