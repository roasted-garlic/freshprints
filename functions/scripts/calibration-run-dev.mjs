/**
 * Bounded Smart Profile v28 calibration runner — fresh-prints-dev ONLY.
 * Mirrors resetAiEnrichmentForProcessing + enqueueAiEnrichment (direct pipeline).
 *
 * Usage:
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   $env:GEMINI_API_KEY = (gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=fresh-prints-dev)
 *   node functions/scripts/calibration-run-dev.mjs
 */
/* eslint-env node */

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(FUNCTIONS_ROOT, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const ALLOWED_PROJECT = "fresh-prints-dev";

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function ensureDevApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID || ALLOWED_PROJECT;
  if (projectId !== ALLOWED_PROJECT) {
    throw new Error(`Project must be ${ALLOWED_PROJECT}`);
  }
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }
  return projectId;
}

/** Load pipeline AFTER dev app init — admin.ts must not bind wrong project. */
function loadPipelineModules() {
  const {
    checkRequiredCoreConcepts,
    evaluateSemanticConsistency,
    textDominantSoftCheck,
    aggregateCoreSemanticOverlap,
  } = require(resolve(FUNCTIONS_ROOT, "lib/packages/shared/src/utils/smartProfileConsistency.js"));
  const { runAiEnrichmentPipeline } = require(
    resolve(FUNCTIONS_ROOT, "lib/functions/src/ai/aiEnrichmentPipeline.js"),
  );
  const { smartCanonicalKey } = require(
    resolve(FUNCTIONS_ROOT, "lib/packages/shared/src/utils/smartCanonicalKey.js"),
  );
  return {
    checkRequiredCoreConcepts,
    evaluateSemanticConsistency,
    textDominantSoftCheck,
    aggregateCoreSemanticOverlap,
    runAiEnrichmentPipeline,
    smartCanonicalKey,
  };
}
const V28 = "catalog-enrich-v28";
const NORM_V2 = "smart-profile-normalizer-v2";
const MAX_DIM = 12;
const MAX_SEARCH = 24;

/** Approved 24-fixture set (owner 2026-08-25). */
const FIXTURES = [
  { n: 1, id: "yJm2VBRvecPNjx79aSnK", slot: "animal_highland", title: "Highland Cow With Bow" },
  { n: 2, id: "6x2LyTvG3ewIePeWHanV", slot: "animal_jimothy", title: "Jimothy Seattle Wildlife…" },
  { n: 3, id: "KI7Ncd1O9JCuX9uCq505", slot: "plant_humor", title: "Oops I Got Another Plant Goose" },
  { n: 4, id: "mZWO3Lsra91EhNRNEkhR", slot: "profession_nurse", title: "Nurse Brain…" },
  { n: 5, id: "W1bwk4jrCoQFn0OiyiSU", slot: "holiday_santa", title: "Santa" },
  { n: 6, id: "ltn0gzs2YGXPADqCejr8", slot: "seasonal", title: "Summer Vibes Fruits" },
  { n: 7, id: "SrDNWipuL0kBj3EuXY2c", slot: "color_variant_a", title: "Sarcastic Skeleton" },
  { n: 8, id: "lvTN328EOc9JWazOAs7I", slot: "color_variant_a", title: "Sarcastic Hand" },
  { n: 9, id: "lbbMZuHQFILqZZmsUWit", slot: "color_variant_b", title: "keepgrowingB" },
  { n: 10, id: "S9ZeylZt0z0AyA0WFAoX", slot: "color_variant_b", title: "keepgrowingW" },
  { n: 11, id: "mN90KyEM2rEOmOXeIbaL", slot: "color_variant_c", title: "stonernikeswish-black" },
  { n: 12, id: "yd2pLu6VsemM2mv9pYUQ", slot: "color_variant_c", title: "stonernikeswish-white" },
  { n: 13, id: "Vlsg0P2CbuhTlhVmgYU8", slot: "complex_illustration", title: "Grinch stipple" },
  { n: 14, id: "4rG1uHbmqBtOevnDFon6", slot: "typography_political", title: "Human Rights text" },
  { n: 15, id: "xFrxcn48oXdCmxJCFW9x", slot: "typography_books", title: "too many books" },
  { n: 16, id: "NilC9nqaBALTPgDM1j4q", slot: "text_plus_illustration", title: "faith floral" },
  { n: 17, id: "jnw12AWGtI7bCkM7y9KI", slot: "illustration_only", title: "Book Reading Skeleton" },
  { n: 18, id: "vVimyNMgfF9jEbJSaNSx", slot: "hobby_pet", title: "dog mom" },
  { n: 19, id: "SToRmjOZTLwj5upzjijC", slot: "simple_logo", title: "HippyRikkylogo" },
  { n: 20, id: "F3lop71TCy9yEAVktY8s", slot: "humor_couple", title: "Halloween couple" },
  { n: 21, id: "vMxoB23WlTRIiaTnLkpF", slot: "humor_edgy_text", title: "Lastflyingfuck" },
  { n: 22, id: "GIgIAznocv8JJi3gtVCS", slot: "humor_sarcasm", title: "Stop Asking… Crazy" },
  { n: 23, id: "9EGDdQJbi2q15UBqE5Sf", slot: "animal_simple", title: "HolyCow" },
  { n: 24, id: "QdTEYMNj0GmEk80lPmGq", slot: "animal_other", title: "goat-trans" },
];

const VOCAB_DIMS = [
  "subjects",
  "objects",
  "styles",
  "themes",
  "interests",
  "professionsGroups",
  "occasions",
  "places",
];

function parseVocabDoc(data) {
  const vocab = {};
  if (!data || typeof data !== "object") return vocab;
  for (const dim of VOCAB_DIMS) {
    if (Array.isArray(data[dim])) {
      vocab[dim] = data[dim];
    }
  }
  return vocab;
}

const STABILITY_FIXTURE_IDS = new Set([
  "Vlsg0P2CbuhTlhVmgYU8",
  "SrDNWipuL0kBj3EuXY2c",
  "4rG1uHbmqBtOevnDFon6",
  "9EGDdQJbi2q15UBqE5Sf",
  "NilC9nqaBALTPgDM1j4q",
]);

const COLOR_PAIRS = [
  { label: "Sarcastic Skeleton/Hand", left: "SrDNWipuL0kBj3EuXY2c", right: "lvTN328EOc9JWazOAs7I", theme: "sarcastic day" },
  { label: "keepgrowing B/W", left: "lbbMZuHQFILqZZmsUWit", right: "S9ZeylZt0z0AyA0WFAoX", theme: "keep growing" },
  { label: "stonernikeswish black/white", left: "mN90KyEM2rEOmOXeIbaL", right: "yd2pLu6VsemM2mv9pYUQ", theme: "stoner nike swish" },
];

const REQUIRED_BY_SLOT = {
  animal_highland: [{ dimension: "subjects", concept: "highland", label: "highland specificity" }],
  animal_jimothy: [{ dimension: "subjects", concept: "raccoon" }],
  plant_humor: [
    { dimension: "subjects", concept: "goose", label: "goose" },
    { dimension: "objects", concept: "plant", label: "plant" },
  ],
  profession_nurse: [{ dimension: "professionsGroups", concept: "nurse" }],
  holiday_santa: [{ dimension: "subjects", concept: "santa" }],
  seasonal: [{ dimension: "themes", concept: "summer" }],
  typography_political: [{ dimension: "visibleText", concept: "rights", label: "readable rights text" }],
  typography_books: [{ dimension: "themes", concept: "books", label: "books theme" }],
  text_plus_illustration: [{ dimension: "themes", concept: "faith", label: "faith theme" }],
  illustration_only: [{ dimension: "subjects", concept: "skeleton", label: "skeleton subject" }],
  hobby_pet: [{ dimension: "interests", concept: "dog", label: "dog interest" }],
  animal_simple: [{ dimension: "subjects", concept: "cow", label: "cow subject" }],
  animal_other: [{ dimension: "subjects", concept: "goat", label: "goat subject" }],
  color_variant_a: [{ dimension: "themes", concept: "sarcastic", label: "sarcasm theme" }],
  color_variant_b: [{ dimension: "themes", concept: "growth", label: "growth theme" }],
  color_variant_c: [{ dimension: "objects", concept: "swoosh", label: "swoosh object" }],
  complex_illustration: [{ dimension: "subjects", concept: "grinch", label: "grinch subject" }],
  humor_edgy_text: [{ dimension: "visibleText", concept: "fuck", label: "edgy visible text" }],
  humor_sarcasm: [{ dimension: "themes", concept: "sarcastic", label: "sarcasm" }],
};

const TEXT_DOMINANT_SLOTS = new Set([
  "typography_political",
  "typography_books",
  "humor_edgy_text",
  "humor_sarcasm",
]);

function resolveGeminiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    return execSync(
      "gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=fresh-prints-dev",
      { encoding: "utf8" },
    ).trim();
  } catch {
    throw new Error("GEMINI_API_KEY required (env or gcloud secret)");
  }
}

function resetEligible(d) {
  return (
    (d.status === "imported" && d.aiReviewStatus === "needs_review") || d.status === "rejected"
  );
}

function extractProfileLists(sp) {
  if (!sp || typeof sp !== "object") {
    return {};
  }
  const pick = (k) => (Array.isArray(sp[k]) ? sp[k] : []);
  return {
    subjects: pick("subjects"),
    objects: pick("objects"),
    styles: pick("styles"),
    themes: pick("themes"),
    interests: pick("interests"),
    professionsGroups: pick("professionsGroups"),
    occasions: pick("occasions"),
    places: pick("places"),
    colors: pick("colors"),
    visibleText: pick("visibleText"),
    searchConcepts: pick("searchConcepts"),
  };
}

function summarizeProfile(sp) {
  const lists = extractProfileLists(sp);
  const prov = sp?.provenance || {};
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
  const populated = dims.filter((k) => lists[k]?.length > 0);
  const atDimCap = dims.some((k) => k !== "searchConcepts" && lists[k]?.length >= MAX_DIM);
  const atSearchCap = (lists.searchConcepts?.length ?? 0) >= MAX_SEARCH;
  return {
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    automationDecision: prov.automationDecision ?? null,
    populatedDimensions: populated,
    populatedCount: populated.length,
    atDimCap,
    atSearchCap,
    lists,
  };
}

function hasUnsupportedPeople(subjects) {
  const lc = (subjects || []).map((s) => String(s).toLowerCase());
  return lc.some((s) => s === "people" || s === "person" || s === "human");
}

function nearDuplicateCount(lists, smartCanonicalKey) {
  let dupes = 0;
  for (const dim of Object.keys(lists)) {
    const keys = new Set();
    for (const v of lists[dim] || []) {
      const k = smartCanonicalKey(v);
      if (!k) continue;
      if (keys.has(k)) dupes += 1;
      keys.add(k);
    }
  }
  return dupes;
}

function vocabReuseRate(lists, vocab, smartCanonicalKey) {
  const vocabKeys = new Set();
  for (const dim of VOCAB_DIMS) {
    for (const term of vocab[dim] || []) {
      const k = smartCanonicalKey(term);
      if (k) vocabKeys.add(`${dim}:${k}`);
    }
  }
  let total = 0;
  let reused = 0;
  for (const dim of Object.keys(lists)) {
    if (dim === "searchConcepts") continue;
    for (const v of lists[dim] || []) {
      const k = smartCanonicalKey(v);
      if (!k) continue;
      total += 1;
      if (vocabKeys.has(`${dim}:${k}`)) reused += 1;
    }
  }
  return total === 0 ? null : reused / total;
}

async function resetDesign(db, designId) {
  const ref = db.collection("designs").doc(designId);
  await ref.update({
    status: "imported",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiProcessingStage: FieldValue.delete(),
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    aiSuggestions: FieldValue.delete(),
    aiAnalysis: FieldValue.delete(),
    smartProfile: FieldValue.delete(),
    aiReviewedAt: FieldValue.delete(),
    aiReviewedBy: FieldValue.delete(),
    aiReviewNotes: FieldValue.delete(),
    aiReviewConfidence: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function retryEligible(d) {
  return (
    d.status === "imported" &&
    d.aiReviewStatus === "pending" &&
    d.aiProcessingStage === "failed" &&
    !d.smartProfile
  );
}

async function processFixture(db, fixture, geminiKey, runAiEnrichmentPipeline, vocab, helpers) {
  const ref = db.collection("designs").doc(fixture.id);
  const beforeSnap = await ref.get();
  if (!beforeSnap.exists) {
    return {
      ...fixture,
      outcome: "missing",
      verdict: "FAIL",
      blockReason: "design_not_found",
    };
  }
  const before = beforeSnap.data() || {};
  const beforeSummary = summarizeProfile(before.smartProfile);
  const baseline = {
    status: before.status,
    aiReviewStatus: before.aiReviewStatus,
    aiProcessingStage: before.aiProcessingStage ?? null,
    promptVersion: beforeSummary.promptVersion,
    normalizerVersion: beforeSummary.normalizerVersion,
  };

  if (!resetEligible(before) && !retryEligible(before)) {
    const evalResult = evaluateFixture(fixture, before, vocab, helpers);
    return {
      ...fixture,
      outcome: "blocked_reset",
      baseline,
      blockReason: `status=${before.status}, aiReviewStatus=${before.aiReviewStatus}`,
      eval: evalResult,
      verdict: "NOTE",
      notes: [
        "Cannot reset approved/ready design — v28 not obtained via approved path; scored v27 baseline only",
      ],
    };
  }

  if (!before.previewPath && !before.thumbnailPath) {
    return {
      ...fixture,
      outcome: "blocked_no_preview",
      baseline,
      verdict: "FAIL",
      blockReason: "no_preview",
    };
  }

  const runLog = [];
  try {
    if (resetEligible(before)) {
      runLog.push(`${new Date().toISOString()} RESET ${fixture.id}`);
      await resetDesign(db, fixture.id);
    } else {
      runLog.push(`${new Date().toISOString()} RETRY ${fixture.id} (failed/pending, no reset)`);
    }
    runLog.push(`${new Date().toISOString()} ENQUEUE ${fixture.id}`);
    const after = await queueAndRun(db, fixture.id, geminiKey, runAiEnrichmentPipeline);
    const evalResult = evaluateFixture(fixture, after, vocab, helpers);
    return {
      ...fixture,
      outcome: resetEligible(before) ? "processed" : "retried",
      baseline,
      after: {
        status: after.status,
        aiReviewStatus: after.aiReviewStatus,
        aiProcessingStage: after.aiProcessingStage,
        promptVersion: evalResult.summary.promptVersion,
        normalizerVersion: evalResult.summary.normalizerVersion,
        errorMessage: after.aiSuggestions?.errorMessage ?? null,
      },
      eval: evalResult,
      verdict: evalResult.verdict,
      runLog,
      profile: evalResult.summary.lists,
    };
  } catch (err) {
    return {
      ...fixture,
      outcome: "error",
      baseline,
      verdict: "FAIL",
      error: String(err?.message || err),
      runLog,
    };
  }
}

async function queueAndRun(db, designId, geminiKey, runAiEnrichmentPipeline) {
  const ref = db.collection("designs").doc(designId);
  await ref.update({
    aiProcessingStage: "queued",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiSuggestions: FieldValue.delete(),
    aiAnalysis: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await runAiEnrichmentPipeline(designId, geminiKey);
  const snap = await ref.get();
  return snap.data() || {};
}

function evaluateFixture(fixture, design, vocab, helpers) {
  const {
    checkRequiredCoreConcepts,
    textDominantSoftCheck,
    smartCanonicalKey,
  } = helpers;
  const sp = design.smartProfile;
  const summary = summarizeProfile(sp);
  const lists = summary.lists;
  const required = REQUIRED_BY_SLOT[fixture.slot] || [];
  const coreCheck = checkRequiredCoreConcepts(lists, required);
  const readable =
    design.aiAnalysis?.readableTextLines ||
    design.aiSuggestions?.readableTextLines ||
    lists.visibleText ||
    [];
  const parsedSubjects = design.aiAnalysis?.subjects || design.aiSuggestions?.subjects || lists.subjects;
  const parsedObjects = design.aiAnalysis?.objects || design.aiSuggestions?.objects || lists.objects;
  const textCheck = textDominantSoftCheck({
    readableTextLines: readable,
    subjects: parsedSubjects,
    objects: parsedObjects,
    profile: lists,
  });
  const isV28 = summary.promptVersion === V28 && summary.normalizerVersion === NORM_V2;
  const issues = [];
  const notes = [];

  if (!isV28) {
    issues.push(`not_v28:${summary.promptVersion}/${summary.normalizerVersion}`);
  }
  if (!coreCheck.pass) {
    for (const m of coreCheck.missing) {
      issues.push(`missing_core:${m.dimension}:${m.concept}`);
    }
  }
  if (fixture.slot === "animal_jimothy" && hasUnsupportedPeople(lists.subjects)) {
    issues.push("unsupported_people_in_subjects");
  }
  if (TEXT_DOMINANT_SLOTS.has(fixture.slot) && textCheck.softFail) {
    issues.push("text_dominant_missing_meta");
  }
  if (summary.atDimCap) {
    notes.push("hit_dim_cap_12");
  }
  if (summary.atSearchCap) {
    notes.push("hit_search_cap_24");
  }
  const reuse = vocabReuseRate(lists, vocab, smartCanonicalKey);
  const dupes = nearDuplicateCount(lists, smartCanonicalKey);

  let verdict = "PASS";
  if (issues.some((i) => i.startsWith("not_v28") || i.startsWith("missing_core") || i.startsWith("unsupported"))) {
    verdict = "FAIL";
  } else if (issues.length > 0 || notes.length > 0) {
    verdict = "NOTE";
  }

  return {
    verdict,
    issues,
    notes,
    summary,
    textCheck,
    coreCheck,
    vocabReuseRate: reuse,
    nearDuplicateCount: dupes,
    readableTextSample: (readable || []).slice(0, 3),
  };
}

async function main() {
  const projectId = ensureDevApp();
  const helpers = loadPipelineModules();
  const {
    checkRequiredCoreConcepts,
    evaluateSemanticConsistency,
    aggregateCoreSemanticOverlap,
    runAiEnrichmentPipeline,
  } = helpers;
  const db = getFirestore();
  const geminiKey = resolveGeminiKey();
  const vocabSnap = await db.doc("settings/aiSmartProfileVocab").get();
  const vocab = parseVocabDoc(vocabSnap.exists ? vocabSnap.data() : {});

  const startedAt = new Date().toISOString();
  const results = [];
  const profilesById = {};
  const runLog = [];

  for (const fixture of FIXTURES) {
    const ref = db.collection("designs").doc(fixture.id);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) {
      results.push({
        ...fixture,
        outcome: "missing",
        verdict: "FAIL",
        blockReason: "design_not_found",
      });
      continue;
    }
    const before = beforeSnap.data() || {};
    const beforeSummary = summarizeProfile(before.smartProfile);
    const baseline = {
      status: before.status,
      aiReviewStatus: before.aiReviewStatus,
      promptVersion: beforeSummary.promptVersion,
      normalizerVersion: beforeSummary.normalizerVersion,
    };

    if (!resetEligible(before) && !retryEligible(before)) {
      const evalResult = evaluateFixture(fixture, before, vocab, helpers);
      results.push({
        ...fixture,
        outcome: "blocked_reset",
        baseline,
        blockReason: `status=${before.status}, aiReviewStatus=${before.aiReviewStatus}`,
        eval: evalResult,
        verdict: "NOTE",
        notes: ["Cannot reset approved/ready design — v28 not obtained via approved path; scored v27 baseline only"],
      });
      profilesById[fixture.id] = extractProfileLists(before.smartProfile);
      runLog.push(`${startedAt} BLOCKED ${fixture.id} ${baseline.status}/${baseline.aiReviewStatus}`);
      continue;
    }

    if (!before.previewPath && !before.thumbnailPath) {
      results.push({
        ...fixture,
        outcome: "blocked_no_preview",
        baseline,
        verdict: "FAIL",
        blockReason: "no_preview",
      });
      continue;
    }

    try {
      if (resetEligible(before)) {
        runLog.push(`${new Date().toISOString()} RESET ${fixture.id}`);
        await resetDesign(db, fixture.id);
      } else {
        runLog.push(`${new Date().toISOString()} RETRY ${fixture.id}`);
      }
      runLog.push(`${new Date().toISOString()} ENQUEUE ${fixture.id}`);
      const after = await queueAndRun(db, fixture.id, geminiKey, runAiEnrichmentPipeline);
      const evalResult = evaluateFixture(fixture, after, vocab, helpers);
      profilesById[fixture.id] = extractProfileLists(after.smartProfile);
      results.push({
        ...fixture,
        outcome: resetEligible(before) ? "processed" : "retried",
        baseline,
        after: {
          status: after.status,
          aiReviewStatus: after.aiReviewStatus,
          aiProcessingStage: after.aiProcessingStage,
          promptVersion: evalResult.summary.promptVersion,
          normalizerVersion: evalResult.summary.normalizerVersion,
          errorMessage: after.aiSuggestions?.errorMessage ?? null,
        },
        eval: evalResult,
        verdict: evalResult.verdict,
      });
      runLog.push(`${new Date().toISOString()} DONE ${fixture.id} ${evalResult.verdict} ${evalResult.summary.promptVersion}`);
    } catch (err) {
      results.push({
        ...fixture,
        outcome: "error",
        baseline,
        verdict: "FAIL",
        error: String(err?.message || err),
      });
      runLog.push(`${new Date().toISOString()} ERROR ${fixture.id} ${String(err?.message || err)}`);
    }
  }

  // Color pair parity
  const pairResults = [];
  for (const pair of COLOR_PAIRS) {
    const left = profilesById[pair.left];
    const right = profilesById[pair.right];
    if (!left || !right) {
      pairResults.push({ ...pair, verdict: "FAIL", reason: "missing_profile" });
      continue;
    }
    const required = [
      { dimension: "themes", concept: "sarcastic", label: pair.label },
    ];
    if (pair.label.includes("keepgrowing")) {
      required[0] = { dimension: "themes", concept: "growth", label: pair.label };
    }
    if (pair.label.includes("stonernikeswish")) {
      required[0] = { dimension: "themes", concept: "stoner", label: pair.label };
    }
    const consistency = evaluateSemanticConsistency({
      left,
      right,
      requiredCoreConcepts: required,
      minAggregateOverlap: 0.5,
    });
    pairResults.push({
      ...pair,
      aggregateOverlap: consistency.aggregateOverlap,
      pass: consistency.pass,
      verdict: consistency.pass ? "PASS" : "FAIL",
      reasons: consistency.reasons,
    });
  }

  // Repeated-run stability (second run on 5 fixtures)
  const stabilityResults = [];
  for (const fixture of FIXTURES.filter((f) => STABILITY_FIXTURE_IDS.has(f.id))) {
    const first = profilesById[fixture.id];
    if (!first) {
      stabilityResults.push({ id: fixture.id, verdict: "SKIP", reason: "no_first_run" });
      continue;
    }
    const beforeSnap = await db.collection("designs").doc(fixture.id).get();
    const before = beforeSnap.data() || {};
    if (!resetEligible(before)) {
      stabilityResults.push({ id: fixture.id, verdict: "SKIP", reason: "not_reset_eligible_after_run" });
      continue;
    }
    try {
      await resetDesign(db, fixture.id);
      const afterDesign = await queueAndRun(db, fixture.id, geminiKey, runAiEnrichmentPipeline);
      const second = extractProfileLists(afterDesign.smartProfile);
      const overlap = aggregateCoreSemanticOverlap(first, second);
      const required = REQUIRED_BY_SLOT[fixture.slot] || [];
      const core1 = checkRequiredCoreConcepts(first, required);
      const core2 = checkRequiredCoreConcepts(second, required);
      const pass = overlap >= 0.8 && core1.pass && core2.pass;
      stabilityResults.push({
        id: fixture.id,
        title: fixture.title,
        aggregateOverlap: overlap,
        run1CorePass: core1.pass,
        run2CorePass: core2.pass,
        verdict: pass ? "PASS" : "NOTE",
        run2Profile: summarizeProfile(afterDesign.smartProfile),
      });
      profilesById[`${fixture.id}_run2`] = second;
    } catch (err) {
      stabilityResults.push({ id: fixture.id, verdict: "FAIL", error: String(err?.message || err) });
    }
  }

  const processed = results.filter((r) => r.outcome === "processed");
  const passCount = results.filter((r) => r.verdict === "PASS").length;
  const noteCount = results.filter((r) => r.verdict === "NOTE").length;
  const failCount = results.filter((r) => r.verdict === "FAIL").length;
  const v28Count = processed.filter((r) => r.eval?.summary?.promptVersion === V28).length;

  const report = {
    projectId,
    startedAt,
    completedAt: new Date().toISOString(),
    fixtureCount: FIXTURES.length,
    processedCount: processed.length,
    blockedCount: results.filter((r) => r.outcome === "blocked_reset").length,
    passCount,
    noteCount,
    failCount,
    v28ProcessedCount: v28Count,
    pairResults,
    stabilityResults,
    runLog,
    results,
  };

  const outPath = resolve(
    REPO_ROOT,
    "docs/workflow/reviews/_calibration-run-dev-results.json",
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ outPath, passCount, noteCount, failCount, v28Count }, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
