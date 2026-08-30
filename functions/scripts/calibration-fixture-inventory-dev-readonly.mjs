/**
 * READ-ONLY Smart Profile calibration fixture discovery on fresh-prints-dev.
 * NO writes. Lists candidate designs for ~20–30 slot coverage.
 *
 * Usage:
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/calibration-fixture-inventory-dev-readonly.mjs
 */
/* eslint-env node */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const ALLOWED_PROJECT = "fresh-prints-dev";
const SAMPLE_LIMIT = 500;

/** Slice 2 QA titles + plan archetypes (title substring match, case-insensitive). */
const SLOT_PATTERNS = [
  { slot: "animal_highland", needles: ["highland cow", "highland"] },
  { slot: "animal_jimothy", needles: ["jimothy", "raccoon"] },
  { slot: "holiday_santa", needles: ["sarcastic santa", " santa"] },
  { slot: "plant_humor", needles: ["plant goose", "oops plant", "goose"] },
  { slot: "profession_nurse", needles: ["nurse brain", "nurse"] },
  { slot: "seasonal", needles: ["summer vibes", "summer"] },
  { slot: "typography_text", needles: ["typography", "quote", "saying", "slogan"] },
  { slot: "humor_sarcasm", needles: ["sarcastic", "funny", "humor"] },
  { slot: "hobby_interest", needles: ["coffee", "fishing", "camping", "gaming"] },
  { slot: "place", needles: ["seattle", "texas", "america", "city"] },
  { slot: "simple_logo", needles: ["logo", "monogram", "minimal"] },
];

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

function matchSlots(title) {
  const lc = String(title || "").toLowerCase();
  const hits = [];
  for (const { slot, needles } of SLOT_PATTERNS) {
    if (needles.some((n) => lc.includes(n))) {
      hits.push(slot);
    }
  }
  return hits;
}

function summarizeProfile(d) {
  const sp = d.smartProfile;
  if (!sp || typeof sp !== "object") {
    return null;
  }
  const prov = sp.provenance || {};
  const dims = [
    "subjects",
    "objects",
    "styles",
    "themes",
    "interests",
    "professionsGroups",
    "occasions",
    "places",
    "colors",
    "visibleText",
    "searchConcepts",
  ];
  const populated = dims.filter((k) => Array.isArray(sp[k]) && sp[k].length > 0);
  return {
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    automationDecision: prov.automationDecision ?? null,
    populatedDimensions: populated,
    subjectSample: (sp.subjects || []).slice(0, 3),
    searchConceptSample: (sp.searchConcepts || []).slice(0, 4),
  };
}

async function main() {
  const projectId = resolveProjectId();
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const snap = await db
    .collection("designs")
    .where("smartProfile.provenance.version", "==", "smart-profile-v1")
    .limit(SAMPLE_LIMIT)
    .get();

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const title = String(d.title || "");
    rows.push({
      designId: doc.id,
      title,
      status: d.status ?? null,
      aiReviewStatus: d.aiReviewStatus ?? null,
      importBatchId: d.importBatchId ?? null,
      importSourceFileName: d.importSourceFileName ?? null,
      slotHints: matchSlots(title),
      smartProfile: summarizeProfile(d),
    });
  }

  const bySlot = {};
  for (const row of rows) {
    for (const slot of row.slotHints) {
      if (!bySlot[slot]) {
        bySlot[slot] = [];
      }
      bySlot[slot].push({ designId: row.designId, title: row.title });
    }
  }

  const v28Count = rows.filter(
    (r) => r.smartProfile?.promptVersion === "catalog-enrich-v28",
  ).length;

  const report = {
    projectId,
    queriedAt: new Date().toISOString(),
    query: {
      collection: "designs",
      filter: "smartProfile.provenance.version == smart-profile-v1",
      limit: SAMPLE_LIMIT,
    },
    totalSampled: rows.length,
    catalogEnrichV28Count: v28Count,
    slotCandidates: bySlot,
    designs: rows.sort((a, b) => a.title.localeCompare(b.title)),
    notes: [
      "Read-only sample; not guaranteed complete catalog coverage.",
      "Color-variant pairs require manual pairing — not inferred here.",
      "Confirm derivative paths + preview availability before calibration runs.",
    ],
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
