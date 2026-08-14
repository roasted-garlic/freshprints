/**
 * READ-ONLY inventory of Studio 1.0.4 Windows smoke fixture designs on fresh-prints-prod.
 * NO writes. NO downloads of full originals. Storage metadata get() only.
 *
 * Usage:
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
 *   node functions/scripts/studio-104-smoke-fixture-readonly-inventory.mjs
 */

/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const ALLOWED_PROJECT = "fresh-prints-prod";

const TITLE_NEEDLES = [
  "grace",
  "faithoverfeartimothy",
  "jesus the way 1",
  "GraffitijesusPNG",
  "jesus the way",
  "jesusmysavior",
].map((t) => t.toLowerCase());

function resolveProjectId() {
  const projectId = String(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "",
  ).trim();
  if (projectId !== ALLOWED_PROJECT) {
    throw new Error(`FIREBASE_PROJECT_ID must be exactly ${ALLOWED_PROJECT}`);
  }
  return projectId;
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

function stripLeadingSlash(path) {
  return String(path || "").replace(/^\//, "");
}

function isCanonical(path, kind) {
  const p = String(path || "");
  if (kind === "original") return /^\/originals\/[A-Za-z0-9_-]+\.png$/.test(p);
  if (kind === "thumbnail") return /^\/thumbnails\/[A-Za-z0-9_-]+\.webp$/.test(p);
  if (kind === "preview") return /^\/previews\/[A-Za-z0-9_-]+\.webp$/.test(p);
  return false;
}

async function objectMeta(bucket, objectPath) {
  const path = stripLeadingSlash(objectPath);
  if (!path) {
    return { exists: false, contentType: null, size: null, path: null };
  }
  const file = bucket.file(path);
  try {
    const [meta] = await file.getMetadata();
    return {
      exists: true,
      contentType: meta.contentType || null,
      size: meta.size != null ? Number(meta.size) : null,
      path,
    };
  } catch (err) {
    const code = err?.code || err?.errors?.[0]?.reason || "";
    if (code === 404 || String(err?.message || "").includes("No such object")) {
      return { exists: false, contentType: null, size: null, path };
    }
    return {
      exists: "error",
      contentType: null,
      size: null,
      path,
      error: String(err?.message || err).slice(0, 200),
    };
  }
}

async function main() {
  const projectId = resolveProjectId();
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }

  const db = getFirestore();
  const bucket = getStorage().bucket();

  // Owner window ~ 2026-08-13 14:30–14:31 CDT = 19:30–19:31 UTC; widen ±2h for safety
  const windowStart = Timestamp.fromDate(new Date("2026-08-13T17:00:00.000Z"));
  const windowEnd = Timestamp.fromDate(new Date("2026-08-13T22:00:00.000Z"));

  const snap = await db
    .collection("designs")
    .where("createdAt", ">=", windowStart)
    .where("createdAt", "<=", windowEnd)
    .orderBy("createdAt", "asc")
    .get();

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const title = String(d.title || "");
    const titleLc = title.toLowerCase();
    const titleMatch = TITLE_NEEDLES.some((n) => titleLc.includes(n) || n.includes(titleLc));
    const pendingish =
      d.aiReviewStatus === "pending" ||
      d.status === "imported" ||
      d.status === "processing" ||
      d.aiProcessed === false;

    // Prefer title matches; also keep pending imported in window if title empty-ish
    if (!titleMatch && !(pendingish && title.length > 0)) {
      // still include all in window for inventory, mark match flag
    }

    const originalPath = d.originalPath || "";
    const thumbnailPath = d.thumbnailPath || "";
    const previewPath = d.previewPath || "";

    const expectedOriginal = `/originals/${doc.id}.png`;
    const expectedThumb = `/thumbnails/${doc.id}.webp`;
    const expectedPreview = `/previews/${doc.id}.webp`;

    const [origMeta, thumbMeta, previewMeta] = await Promise.all([
      objectMeta(bucket, originalPath || expectedOriginal),
      objectMeta(bucket, thumbnailPath || expectedThumb),
      objectMeta(bucket, previewPath || expectedPreview),
    ]);

    rows.push({
      designId: doc.id,
      title,
      titleMatch,
      status: d.status ?? null,
      aiReviewStatus: d.aiReviewStatus ?? null,
      aiProcessingStage: d.aiProcessingStage ?? null,
      aiProcessed: d.aiProcessed ?? null,
      aiReviewed: d.aiReviewed ?? null,
      originalPath: originalPath || null,
      thumbnailPath: thumbnailPath || null,
      previewPath: previewPath || null,
      originalPathCanonical: isCanonical(originalPath, "original"),
      thumbnailPathCanonical: isCanonical(thumbnailPath, "thumbnail"),
      previewPathCanonical: isCanonical(previewPath, "preview"),
      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
      storage: {
        original: origMeta,
        thumbnail: thumbMeta,
        preview: previewMeta,
      },
    });
  }

  const matched = rows.filter((r) => r.titleMatch);
  const report = {
    projectId,
    query: {
      collection: "designs",
      createdAt: ["2026-08-13T17:00:00.000Z", "2026-08-13T22:00:00.000Z"],
      titleNeedles: TITLE_NEEDLES,
    },
    totalInWindow: rows.length,
    titleMatchedCount: matched.length,
    titleMatched: matched,
    allInWindow: rows,
  };

  // JSON only to stdout (no secrets)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
