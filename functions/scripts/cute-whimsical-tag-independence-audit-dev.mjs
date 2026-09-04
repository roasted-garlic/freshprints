/**
 * Read-only: Music/Cute goldens + Highland cow — resolver WITH vs WITHOUT matchedTags.
 * No Firestore mutation.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/cute-whimsical-tag-independence-audit-dev.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO = resolve(import.meta.dirname, "../..");
const FUNCTIONS = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS, "package.json"));
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { resolveThemeCategory } = require(
  resolve(FUNCTIONS, "lib/functions/src/ai/catalogThemeCategoryResolver.js"),
);
const { normalizeComparableTitle } = require(
  resolve(FUNCTIONS, "lib/functions/src/ai/catalogTitleRules.js"),
);

const OUT = resolve(
  REPO,
  "docs/workflow/reviews/_cute-whimsical-tag-independence-audit-dev.json",
);

const STOPWORDS = new Set(["a", "an", "and", "for", "in", "of", "or", "the", "to", "with"]);

function tokenize(value) {
  if (!value?.trim()) return [];
  return normalizeComparableTitle(value)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function flatten(phrases) {
  return (phrases || []).flatMap((p) => tokenize(p));
}

function ensureAdmin() {
  if ((process.env.FIREBASE_PROJECT_ID || "fresh-prints-dev") !== "fresh-prints-dev") {
    throw new Error("fresh-prints-dev only");
  }
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: "fresh-prints-dev" });
  }
  return getFirestore();
}

function signalBag(input, includeTags) {
  return [
    ...tokenize(input.rawCategory),
    ...tokenize(input.title),
    ...tokenize(input.description),
    ...(input.visibleText || []).flatMap(tokenize),
    ...(includeTags ? (input.matchedTags || []).flatMap(tokenize) : []),
    ...flatten(input.subjects),
    ...flatten(input.objects),
    ...flatten(input.themes),
    ...flatten(input.interests),
    ...flatten(input.professionsGroups),
    ...flatten(input.searchConcepts),
    // styles are NOT in resolver today — noted for plan
  ];
}

function roughOverlapScore(category, signals) {
  const catTokens = new Set([...tokenize(category.name), ...tokenize(category.description)]);
  const set = new Set(signals);
  let overlap = 0;
  for (const t of signals) {
    if (catTokens.has(t)) overlap += 1;
  }
  const distinctHits = [...set].filter((t) => catTokens.has(t)).length;
  return { overlap, distinctHits, sampleHits: [...set].filter((t) => catTokens.has(t)).slice(0, 12) };
}

function spInput(design, cats, { rawCategory, matchedTags }) {
  const sp = design.smartProfile || {};
  const sug = design.aiSuggestions || {};
  return {
    rawCategory,
    title: sug.title || design.title,
    description: sug.description || design.description,
    visibleText: sp.visibleText || [],
    matchedTags: matchedTags ?? sug.tags ?? [],
    subjects: sp.subjects,
    objects: sp.objects,
    themes: sp.themes,
    interests: sp.interests,
    professionsGroups: sp.professionsGroups,
    searchConcepts: sp.searchConcepts,
    approvedCategories: cats,
  };
}

async function loadDesign(db, id) {
  const snap = await db.collection("designs").doc(id).get();
  if (!snap.exists) throw new Error(`missing ${id}`);
  return { id, ...snap.data() };
}

async function main() {
  // ensure build exists
  require(resolve(FUNCTIONS, "lib/functions/src/ai/catalogThemeCategoryResolver.js"));
  const db = ensureAdmin();
  const chunk0 = (await db.collection("taxonomyMaterialization").doc("chunk-0").get()).data() || {};
  const cats = (chunk0.categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || "",
  }));
  const idsByName = Object.fromEntries(cats.map((c) => [c.name.toLowerCase(), c.id]));
  const cute = cats.find((c) => c.name === "Cute & Whimsical");
  const animals = cats.find((c) => c.name === "Animals");

  const cases = [
    { label: "highland_cow_flowers_bow", id: "swcJl3RvjTFsf5hp04Ze", expectRaw: "Animals" },
    { label: "judas_priest", id: "Wt5eILv4uyCnYNoJI8uZ", expectRaw: "Pop Culture & Characters" },
    { label: "dolly_music", id: "Ai4Wmfp4Vd6Ady2WCsKC", expectRaw: null },
    { label: "scooby_pop", id: "0UsPRAh0tggzuX8xwWqq", expectRaw: "Pop Culture & Characters" },
    { label: "faith", id: "8pSowFU1o1H1EjXBaXaA", expectRaw: null },
    { label: "inspirational", id: "74BdnNQuNWz0N0GaL4CO", expectRaw: null },
    { label: "humor_animals_fcawf", id: "7bVlWMFwxECdfHH8VNPB", expectRaw: null },
    { label: "cannabis_420", id: "w4w0E66YWioBYTkR0aIH", expectRaw: null },
    { label: "family_only_dads", id: "EBK8d0skHLCXtHssIr9C", expectRaw: null },
    { label: "occupations_nurse", id: "mZWO3Lsra91EhNRNEkhR", expectRaw: null },
  ];

  // optional astrology if present
  const allReady = await db.collection("designs").where("status", "==", "ready").limit(400).get();
  for (const doc of allReady.docs) {
    const d = doc.data();
    const cat = d.aiSuggestions?.categoryName || d.categoryName || "";
    const themes = (d.smartProfile?.themes || []).join(" ");
    if (/zodiac|astrology|horoscope/i.test(themes) || /Astrology/i.test(cat)) {
      cases.push({ label: "astrology_sample", id: doc.id, expectRaw: null });
      break;
    }
  }
  for (const doc of allReady.docs) {
    const d = doc.data();
    const cat = d.aiSuggestions?.categoryName || d.categoryName || "";
    if (/Teacher|Occupations/i.test(cat) && /teacher|school/i.test(String(d.title || ""))) {
      cases.push({ label: "teacher_sample", id: doc.id, expectRaw: null });
      break;
    }
  }

  const results = [];
  for (const c of cases) {
    let design;
    try {
      design = await loadDesign(db, c.id);
    } catch (e) {
      results.push({ ...c, error: String(e.message || e) });
      continue;
    }
    const sug = design.aiSuggestions || {};
    const finalLive = sug.categoryName || design.categoryName;
    const rawGuess = c.expectRaw || finalLive;
    const tags = Array.isArray(sug.tags) ? sug.tags : [];

    const withTagsExact = resolveThemeCategory(
      spInput(design, cats, { rawCategory: rawGuess, matchedTags: tags }),
      idsByName,
    );
    const withoutTagsExact = resolveThemeCategory(
      spInput(design, cats, { rawCategory: rawGuess, matchedTags: [] }),
      idsByName,
    );
    const withTagsFallback = resolveThemeCategory(
      spInput(design, cats, { rawCategory: "Completely Made Up Category XYZ", matchedTags: tags }),
      idsByName,
    );
    const withoutTagsFallback = resolveThemeCategory(
      spInput(design, cats, { rawCategory: "Completely Made Up Category XYZ", matchedTags: [] }),
      idsByName,
    );

    const baseForScore = spInput(design, cats, { rawCategory: rawGuess, matchedTags: tags });
    const signalsWith = signalBag(baseForScore, true);
    const signalsWithout = signalBag(baseForScore, false);
    const animalsScoreWith = animals ? roughOverlapScore(animals, signalsWith) : null;
    const cuteScoreWith = cute ? roughOverlapScore(cute, signalsWith) : null;
    const animalsScoreWithout = animals ? roughOverlapScore(animals, signalsWithout) : null;
    const cuteScoreWithout = cute ? roughOverlapScore(cute, signalsWithout) : null;

    results.push({
      label: c.label,
      id: c.id,
      title: design.title,
      liveFinalCategory: finalLive,
      livePromptVersion: design.smartProfile?.provenance?.promptVersion,
      tagCount: tags.length,
      tagsSample: tags.slice(0, 8),
      rawUsedForExactReplay: rawGuess,
      exactWithTags: withTagsExact.categoryName || null,
      exactWithoutTags: withoutTagsExact.categoryName || null,
      exactBranchChanged: (withTagsExact.categoryName || null) !== (withoutTagsExact.categoryName || null),
      fallbackWithTags: withTagsFallback.categoryName || null,
      fallbackWithoutTags: withoutTagsFallback.categoryName || null,
      fallbackBranchChanged:
        (withTagsFallback.categoryName || null) !== (withoutTagsFallback.categoryName || null),
      animalsRough: { withTags: animalsScoreWith, withoutTags: animalsScoreWithout },
      cuteRough: { withTags: cuteScoreWith, withoutTags: cuteScoreWithout },
      stylesPresentButNotInResolver: design.smartProfile?.styles || [],
    });
  }

  const materialExact = results.filter((r) => r.exactBranchChanged);
  const materialFallback = results.filter((r) => r.fallbackBranchChanged);

  const out = {
    projectId: "fresh-prints-dev",
    taxonomyRevision: chunk0.revision ?? null,
    cuteDescription: cute?.description ?? null,
    animalsDescription: animals?.description ?? null,
    resolverConsumesMatchedTags: true,
    resolverConsumesStyles: false,
    note:
      "exact replay uses live final category as raw when unknown (rawCategory not persisted). Highland uses Animals. Rough scores are token-overlap against name+description only (not full PRIORITY_FAMILY boosts).",
    results,
    summary: {
      cases: results.length,
      exactCategoryChangedCount: materialExact.length,
      fallbackCategoryChangedCount: materialFallback.length,
      exactChangedLabels: materialExact.map((r) => r.label),
      fallbackChangedLabels: materialFallback.map((r) => r.label),
      legacyTagInfluence:
        materialExact.length === 0 && materialFallback.length === 0
          ? "NON-MATERIAL"
          : materialExact.length > 0
            ? "MATERIAL"
            : "NON-MATERIAL_FALLBACK_ONLY",
    },
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log("wrote", OUT);
  const highland = results.find((r) => r.label === "highland_cow_flowers_bow");
  console.log("highland", JSON.stringify(highland, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
