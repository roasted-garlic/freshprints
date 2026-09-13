/**
 * DEV-only: direct Gemini A/B for v33 names-only vs v34 names+descriptions.
 * Mirrors production vision request shape (system + user prompt + image).
 * Does NOT mutate designs or settings. Bypasses Playground 8k template limit.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/v34-category-description-playground-ab-dev.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const PROJECT_ID = "fresh-prints-dev";
const OUT = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_v34-category-description-playground-ab-dev.json",
);
const IMAGE_DESIGN_ID = "0MpiuK4ERPawPEsUoZLn"; // staff-edited Ready, not owner canary set
const VISION_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MAX_COMPLETION_TOKENS = 4096;
const OWNER_BASELINE = 0.000521;

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
  return { db: getFirestore(), storage: getStorage() };
}

function resolveGeminiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  return execSync(
    "gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=fresh-prints-dev",
    { encoding: "utf8" },
  ).trim();
}

function extractDefaultAndPreviousV33() {
  const src = readFileSync(
    resolve(REPO_ROOT, "packages/shared/src/constants/aiEnrichment.constants.ts"),
    "utf8",
  );
  function extract(name) {
    const marker = `export const ${name} = \``;
    const start = src.indexOf(marker);
    if (start < 0) throw new Error(`missing ${name}`);
    const contentStart = start + marker.length;
    const end = src.indexOf("`;", contentStart);
    if (end < 0) throw new Error(`unterminated ${name}`);
    return src.slice(contentStart, end);
  }
  return {
    v34: extract("DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE"),
    v33: extract("PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33"),
  };
}

function loadPromptBuilder() {
  return require(resolve(FUNCTIONS_ROOT, "lib/functions/src/ai/simpleCatalogEnrichmentPrompt.js"));
}

function loadCostEstimator() {
  return require(
    resolve(FUNCTIONS_ROOT, "lib/packages/shared/src/constants/aiEnrichment.constants.js"),
  );
}

async function downloadPreviewBase64(storage, previewPath) {
  const normalized = String(previewPath || "").replace(/^\/+/, "");
  const bucket = storage.bucket();
  const [buf] = await bucket.file(normalized).download();
  return { base64: buf.toString("base64"), contentType: "image/webp", storagePath: normalized };
}

function buildRequestBody(systemPrompt, userPrompt, base64, contentType) {
  return JSON.stringify({
    model: VISION_MODEL,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: { url: `data:${contentType};base64,${base64}`, detail: "high" },
          },
        ],
      },
    ],
  });
}

async function callGemini(apiKey, systemPrompt, userPrompt, base64, contentType) {
  const started = Date.now();
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: buildRequestBody(systemPrompt, userPrompt, base64, contentType),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  }
  const usage = json.usage || {};
  const content = json.choices?.[0]?.message?.content ?? "";
  return {
    elapsedMs: Date.now() - started,
    promptTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
    completionTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
    outputPreview: String(content).slice(0, 320),
  };
}

async function loadActiveCategories(db) {
  const meta = (await db.collection("taxonomyMaterialization").doc("meta").get()).data() || {};
  const chunk0 = (await db.collection("taxonomyMaterialization").doc("chunk-0").get()).data() || {};
  const cats = (chunk0.categories || []).filter((c) => c && c.active !== false && c.status !== "inactive");
  // Prefer materialization categories as stored (already active set in chunk).
  const all = chunk0.categories || [];
  return { meta, all, cats: all.length ? all : cats };
}

async function main() {
  const { db, storage } = ensureAdmin();
  const apiKey = resolveGeminiKey();
  const templates = extractDefaultAndPreviousV33();
  if (!templates.v34.includes("{{approved_categories}}")) {
    throw new Error("v34 default missing approved_categories");
  }
  if (!templates.v33.includes("{{approved_category_names}}")) {
    throw new Error("v33 previous missing approved_category_names");
  }

  const designSnap = await db.collection("designs").doc(IMAGE_DESIGN_ID).get();
  if (!designSnap.exists) throw new Error(`design ${IMAGE_DESIGN_ID} missing`);
  const design = designSnap.data();
  const previewPath = design.previewPath || design.thumbnailPath;
  if (!previewPath) throw new Error("design has no previewPath");
  const image = await downloadPreviewBase64(storage, previewPath);

  const { meta, all: cats } = await loadActiveCategories(db);
  const categoryOptions = cats.map((c) => ({
    id: c.id || c.name,
    name: c.name,
    description: c.description || "",
  }));
  const categoryNames = categoryOptions.map((c) => c.name);

  const { buildSimpleCatalogEnrichmentSystemPrompt, buildSimpleCatalogEnrichmentUserPrompt } =
    loadPromptBuilder();
  const { estimateVisionCostUsd } = loadCostEstimator();
  const systemPrompt = buildSimpleCatalogEnrichmentSystemPrompt();

  const userV33 = buildSimpleCatalogEnrichmentUserPrompt({
    promptTemplate: templates.v33,
    approvedCategories: categoryOptions,
    approvedCategoryNames: categoryNames,
    approvedTagNames: [],
    effectiveTagExclusions: [],
  });
  const userV34 = buildSimpleCatalogEnrichmentUserPrompt({
    promptTemplate: templates.v34,
    approvedCategories: categoryOptions,
    approvedCategoryNames: categoryNames,
    approvedTagNames: [],
    effectiveTagExclusions: [],
  });

  const faith = categoryOptions.find((c) => c.name === "Faith & Worship");
  const descInV34 =
    Boolean(faith?.description) &&
    userV34.includes(faith.name) &&
    userV34.includes(String(faith.description).replace(/\s+/g, " ").trim().slice(0, 40));
  const namesOnlyInV33 =
    userV33.includes("- Faith & Worship") && !userV33.includes(String(faith?.description || "").slice(0, 40));

  const aUsage = await callGemini(apiKey, systemPrompt, userV33, image.base64, image.contentType);
  const bUsage = await callGemini(apiKey, systemPrompt, userV34, image.base64, image.contentType);

  const aCost = estimateVisionCostUsd(VISION_MODEL, aUsage.promptTokens, aUsage.completionTokens);
  const bCost = estimateVisionCostUsd(VISION_MODEL, bUsage.promptTokens, bUsage.completionTokens);

  const a = { label: "v33_names_only_template", visionModelId: VISION_MODEL, ...aUsage, estimatedCostUsd: aCost };
  const b = { label: "v34_names_plus_descriptions_template", visionModelId: VISION_MODEL, ...bUsage, estimatedCostUsd: bCost };

  const out = {
    projectId: PROJECT_ID,
    method: "direct_gemini_openai_compat_same_as_provider",
    imageDesignId: IMAGE_DESIGN_ID,
    imageTitle: design.title || null,
    previewPath: image.storagePath,
    taxonomyRevision: meta.revision ?? null,
    materializationReady: meta.ready === true,
    categoryCount: cats.length,
    userPromptCharsV33: userV33.length,
    userPromptCharsV34: userV34.length,
    descriptionsObservedInBuiltV34Prompt: descInV34,
    namesOnlyObservedInBuiltV33Prompt: namesOnlyInV33,
    sampleCategoryLine: faith
      ? `- ${faith.name} — ${String(faith.description || "").replace(/\s+/g, " ").trim().slice(0, 120)}…`
      : null,
    ownerBaselineCombinedUsd: OWNER_BASELINE,
    a,
    b,
    deltas: {
      promptTokens: (b.promptTokens ?? 0) - (a.promptTokens ?? 0),
      completionTokens: (b.completionTokens ?? 0) - (a.completionTokens ?? 0),
      estimatedCostUsd: (b.estimatedCostUsd ?? 0) - (a.estimatedCostUsd ?? 0),
      pctCostVsA:
        a.estimatedCostUsd && b.estimatedCostUsd
          ? ((b.estimatedCostUsd - a.estimatedCostUsd) / a.estimatedCostUsd) * 100
          : null,
      pctCostVsOwnerBaseline:
        b.estimatedCostUsd != null ? ((b.estimatedCostUsd - OWNER_BASELINE) / OWNER_BASELINE) * 100 : null,
      costDeltaVsOwnerBaseline:
        b.estimatedCostUsd != null ? b.estimatedCostUsd - OWNER_BASELINE : null,
    },
    notes: [
      "Playground 8k template limit cannot accept full DEFAULT (~10.7k); used direct Gemini call matching geminiVisionEnrichmentProvider request shape.",
      "A = PREVIOUS v33 ({{approved_category_names}}); B = DEFAULT v34 ({{approved_categories}}).",
      "Same image; no settings or design mutation.",
      "estimatedCostUsd is primary vision call only (no tag author / rerank second call).",
      "Owner baseline $0.000521 was Studio combined cost (vision + tag/reranker). Vision-only B vs that baseline understates full-pipeline apples-to-apples.",
    ],
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
