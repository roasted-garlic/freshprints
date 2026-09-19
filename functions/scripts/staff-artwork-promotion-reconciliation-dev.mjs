/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStaffArtworkReconciliationProjectId,
  classifyStaffArtworkPromotionReconciliation,
} from "./lib/staffArtworkPromotionReconciliationGuard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const PAGE_SIZE = 100;
const requestedMaxDocs = Number(process.env.MAX_DOCS || 5000);
const MAX_DOCS = Number.isFinite(requestedMaxDocs) ? Math.max(1, Math.trunc(requestedMaxDocs)) : 5000;

function projectId() {
  const value = String(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "",
  ).trim();
  assertStaffArtworkReconciliationProjectId(value);
  return value;
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function objectName(path) {
  return text(path).replace(/^\/+/, "");
}

function canonicalDesignPath(root, designId) {
  return `/${root}/${designId}.${root === "originals" ? "png" : "webp"}`;
}

function defaultStaffArtworkPath(staffArtworkId, name) {
  return `/staff-artwork/${staffArtworkId}/${name}`;
}

async function exists(bucket, path) {
  if (!text(path)) return false;
  const [found] = await bucket.file(objectName(path)).exists();
  return found === true;
}

async function inspectDesign(db, bucket, snapshot) {
  const design = snapshot.data() || {};
  const staffArtworkId = text(design.sourceStaffArtworkId);
  const staffSnapshot = staffArtworkId
    ? await db.collection("staffArtworks").doc(staffArtworkId).get()
    : null;
  const staffArtwork = staffSnapshot?.exists ? staffSnapshot.data() || {} : undefined;

  const expectedPreviewPath = canonicalDesignPath("previews", snapshot.id);
  const expectedThumbnailPath = canonicalDesignPath("thumbnails", snapshot.id);
  const canonicalPreview =
    text(design.previewPath) === expectedPreviewPath && (await exists(bucket, expectedPreviewPath));
  const canonicalThumbnail =
    text(design.thumbnailPath) === expectedThumbnailPath &&
    (await exists(bucket, expectedThumbnailPath));

  const staffPreviewPath =
    text(staffArtwork?.previewStoragePath) || defaultStaffArtworkPath(staffArtworkId, "preview.webp");
  const staffThumbnailPath =
    text(staffArtwork?.thumbnailStoragePath) ||
    defaultStaffArtworkPath(staffArtworkId, "thumbnail.webp");
  const assets = {
    canonicalPreview,
    canonicalThumbnail,
    staffPreview: Boolean(staffArtwork) && (await exists(bucket, staffPreviewPath)),
    staffThumbnail: Boolean(staffArtwork) && (await exists(bucket, staffThumbnailPath)),
  };
  const classification = classifyStaffArtworkPromotionReconciliation({
    design,
    staffArtwork,
    assets,
  });

  return {
    designId: snapshot.id,
    sourceStaffArtworkId: staffArtworkId,
    sourceStaffArtworkRecordExists: Boolean(staffArtwork),
    title: text(design.title) || null,
    catalogTitleSource: text(design.catalogTitleSource) || null,
    importSourceFileName: text(design.importSourceFileName) || null,
    aiSuggestionTitle: text(design.aiSuggestions?.title) || null,
    canonicalPreview,
    canonicalThumbnail,
    staffPreview: assets.staffPreview,
    staffThumbnail: assets.staffThumbnail,
    ...classification,
  };
}

async function readDesignCandidates(db, bucket) {
  const rows = [];
  let lastSourceId;
  let truncated = false;
  while (rows.length < MAX_DOCS) {
    let query = db
      .collection("designs")
      .where("sourceStaffArtworkId", ">", "")
      .orderBy("sourceStaffArtworkId", "asc")
      .limit(Math.min(PAGE_SIZE, MAX_DOCS - rows.length));
    if (lastSourceId) query = query.startAfter(lastSourceId);
    const page = await query.get();
    if (page.empty) break;
    for (const snapshot of page.docs) {
      rows.push(await inspectDesign(db, bucket, snapshot));
    }
    lastSourceId = text(page.docs.at(-1)?.data()?.sourceStaffArtworkId);
    if (page.size < Math.min(PAGE_SIZE, MAX_DOCS - rows.length + page.size)) break;
  }
  if (rows.length >= MAX_DOCS) truncated = true;
  return { rows, truncated };
}

async function readLegacyStaffArtworkInventory(db) {
  const rows = [];
  let lastId;
  let truncated = false;
  while (rows.length < MAX_DOCS) {
    let query = db.collection("staffArtworks").orderBy("__name__", "asc").limit(Math.min(PAGE_SIZE, MAX_DOCS - rows.length));
    if (lastId) query = query.startAfter(lastId);
    const page = await query.get();
    if (page.empty) break;
    for (const snapshot of page.docs) {
      const data = snapshot.data() || {};
      if (Object.prototype.hasOwnProperty.call(data, "catalogTitleSource")) continue;
      rows.push({
        staffArtworkId: snapshot.id,
        status: text(data.status) || null,
        title: text(data.title) || null,
        sourceFileName: text(data.sourceFileName) || null,
        hasProductionStoragePath: Boolean(text(data.productionStoragePath)),
        hasPreviewStoragePath: Boolean(text(data.previewStoragePath)),
        hasThumbnailStoragePath: Boolean(text(data.thumbnailStoragePath)),
        promotionStatus: text(data.promotionStatus) || null,
        normalization: data.status === "ready" && text(data.productionStoragePath)
          ? "deterministic_at_promotion"
          : "report_before_promotion",
      });
    }
    lastId = page.docs.at(-1)?.id;
    if (page.size < Math.min(PAGE_SIZE, MAX_DOCS - rows.length + page.size)) break;
  }
  if (rows.length >= MAX_DOCS) truncated = true;
  return { rows, truncated };
}

function summarize(rows) {
  const counts = {};
  for (const row of rows) {
    counts[row.kind] = (counts[row.kind] || 0) + 1;
  }
  return counts;
}

async function main() {
  if (process.env.APPLY === "1" || process.env.CONFIRM_DEV_STAFF_ARTWORK_REPAIR === "1") {
    throw new Error("This reconciliation command is read-only; no apply mode is available in this phase.");
  }
  const activeProjectId = projectId();
  const app = getApps()[0] || initializeApp({
    credential: applicationDefault(),
    projectId: activeProjectId,
    storageBucket: `${activeProjectId}.firebasestorage.app`,
  });
  const db = getFirestore();
  const bucket = getStorage(app).bucket(`${activeProjectId}.firebasestorage.app`);
  const designs = await readDesignCandidates(db, bucket);
  const staffArtwork = await readLegacyStaffArtworkInventory(db);
  const report = {
    tool: "staff-artwork-promotion-reconciliation-dev",
    projectId: activeProjectId,
    mode: "DRY_RUN_READ_ONLY",
    writesPerformed: false,
    queryScope: "Designs with non-empty sourceStaffArtworkId plus Staff Artwork records missing catalogTitleSource",
    designCandidateCount: designs.rows.length,
    designCandidateCountsByKind: summarize(designs.rows),
    designQueryTruncated: designs.truncated,
    legacyStaffArtworkCount: staffArtwork.rows.length,
    legacyStaffArtworkQueryTruncated: staffArtwork.truncated,
    records: designs.rows,
    legacyStaffArtwork: staffArtwork.rows,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
