import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { SMART_PROFILE_MAX_ITEMS_PER_DIMENSION } from "../../../packages/shared/src/constants/smartProfile.constants";
import { buildDesignSmartProfile } from "./smartProfileBuilder";
import { buildSimpleCatalogEnrichmentUserPrompt } from "./simpleCatalogEnrichmentPrompt";
import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";

const here = dirname(fileURLToPath(import.meta.url));

describe("smart profile quality contract", () => {
  it("ships catalog-enrich-v39 and keeps current caps", () => {
    assert.equal(CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-v39");
    assert.equal(SMART_PROFILE_MAX_ITEMS_PER_DIMENSION, 12);
  });

  it("default prompt is visual-first with required placeholders and canonical JSON keys", () => {
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /4–10 words|4-10 words/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /2–4 sentences|2-4 sentences/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /display mat/i);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /\{\{approved_categories\}\}/);
    assert.doesNotMatch(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /\{\{excluded_tags\}\}/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /Use subjects and objects/);
    assert.doesNotMatch(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /\{\{smart_profile_vocab\}\}/);
    assert.doesNotMatch(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /dominant BUYER INTENT/);
    assert.doesNotMatch(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /"prompt":/);
  });

  it("injects bounded vocab when template requests it and does not inject approved-tag synonym boards", () => {
    const prompt = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategoryNames: ["Animals"],
      promptTemplate: `${DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE}\n{{smart_profile_vocab}}`,
      smartProfileVocab: { subjects: ["raccoon", "cow"] },
    });
    assert.match(prompt, /subjects: raccoon, cow/);
    assert.doesNotMatch(prompt, /legacy-tag-should-not-be-vocab/);
    assert.doesNotMatch(prompt, /manually curated/);
  });

  it("canonicalizes exact matches via vocab and preserves novel highland cow", () => {
    const profile = buildDesignSmartProfile({
      parsed: {
        category: "Animals",
        description: "Highland cow art",
        suggestedNewTags: [],
        title: "Highland Cow",
        tags: [],
        rawTags: [],
        subjects: ["highland-cow", "Jimothy"],
        objects: [],
        styles: [],
        themes: ["typography"],
        interests: [],
        professionsGroups: [],
        occasions: [],
        places: [],
        colors: ["black"],
        searchConcepts: ["funny highland cow shirt"],
        readableTextLines: ["Moo"],
        categoryAlternatives: [],
        categoryGapNote: "",
        halftoneShadowLikelihood: "none",
        halftoneShadowEvidence: "",
      },
      suggestions: {
        title: "Highland Cow",
        description: "Highland cow art",
        promptVersion: CATALOG_ENRICHMENT_PROMPT_VERSION,
        provider: "google",
        model: "gemini-2.5-flash-lite",
        generatedAt: "2026-08-25T00:00:00.000Z",
      },
      categoryIdsByName: {},
      smartProfileVocab: { subjects: ["Highland Cow"] },
    });

    assert.deepEqual(profile.subjects, ["Highland Cow", "Jimothy"]);
    assert.ok(profile.searchConcepts?.includes("funny highland cow shirt"));
    assert.match(profile.provenance.normalizerVersion ?? "", /normalizer-v6/);
  });

  it("promotes highland cow into subjects when model emits only cow", () => {
    const profile = buildDesignSmartProfile({
      parsed: {
        category: "Animals",
        description: "A cartoon highland cow with a bow.",
        suggestedNewTags: [],
        title: "Highland Cow With Bow",
        tags: [],
        rawTags: [],
        subjects: ["cow"],
        objects: ["bow"],
        styles: [],
        themes: [],
        interests: [],
        professionsGroups: [],
        occasions: [],
        places: [],
        colors: [],
        searchConcepts: ["cute highland cow"],
        readableTextLines: [],
        categoryAlternatives: [],
        categoryGapNote: "",
        halftoneShadowLikelihood: "none",
        halftoneShadowEvidence: "",
        centralSubject: "highland cow",
      },
      suggestions: {
        title: "Highland Cow With Bow",
        description: "A cartoon highland cow with a bow.",
        promptVersion: CATALOG_ENRICHMENT_PROMPT_VERSION,
        provider: "google",
        model: "gemini-2.5-flash-lite",
        generatedAt: "2026-08-25T00:00:00.000Z",
      },
      categoryIdsByName: {},
    });

    assert.ok(
      profile.subjects?.some((s) => s.toLowerCase() === "highland cow"),
      `subjects=${JSON.stringify(profile.subjects)}`,
    );
  });

  it("source tree has no curated highland/santa/nurse seed list module", () => {
    const vocabUtil = readFileSync(
      join(here, "../../../packages/shared/src/utils/smartProfileVocab.ts"),
      "utf8",
    );
    assert.doesNotMatch(vocabUtil, /highland cow.*santa.*nurse/i);
    assert.doesNotMatch(vocabUtil, /CURATED_SEED|manualSeed|synonymTable/i);
  });

  it("enrichment pipeline does not register Algolia admin for vocab", () => {
    const pipeline = readFileSync(join(here, "aiEnrichmentPipeline.ts"), "utf8");
    const core = readFileSync(join(here, "aiEnrichmentCandidateCore.ts"), "utf8");
    assert.match(core, /loadSmartProfileVocabSnapshot/);
    assert.match(pipeline, /maybeRefreshSmartProfileVocabSnapshot/);
    assert.doesNotMatch(pipeline, /ALGOLIA_ADMIN_API_KEY|algoliaAdminClient/);
    assert.doesNotMatch(core, /ALGOLIA_ADMIN_API_KEY|algoliaAdminClient/);
  });

  it("category authority trusts only the exact active category snapshot", () => {
    const core = readFileSync(join(here, "aiEnrichmentCandidateCore.ts"), "utf8");
    assert.match(core, /categories\.categories\.find\(/);
    assert.match(core, /category\.name\.trim\(\)\.toLowerCase\(\)/);
    assert.match(core, /resolvedCategory/);
    assert.doesNotMatch(core, /buildThemeCategoryResolveInput|resolveThemeCategory/);
    assert.match(core, /Historical design\.tags/);
  });

  it("auto-refreshes settings/aiSmartProfileVocab via bounded Firestore sample (not manual)", () => {
    const refresh = readFileSync(join(here, "refreshSmartProfileVocabSnapshot.ts"), "utf8");
    assert.match(refresh, /settings\/aiSmartProfileVocab/);
    assert.match(refresh, /firestore_sample/);
    assert.match(refresh, /SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT/);
    assert.match(refresh, /refreshSmartProfileVocabSnapshotScheduled/);
    assert.match(refresh, /refreshSmartProfileVocabSnapshotCallable/);
    assert.doesNotMatch(refresh, /ALGOLIA_ADMIN_API_KEY|algoliaAdminClient|CURATED_SEED|synonymTable/);

    const index = readFileSync(join(here, "../index.ts"), "utf8");
    assert.match(index, /refreshSmartProfileVocabSnapshotCallable/);
    assert.match(index, /refreshSmartProfileVocabSnapshotScheduled/);

    const aggregate = readFileSync(
      join(here, "../../../packages/shared/src/utils/aggregateSmartProfileVocab.ts"),
      "utf8",
    );
    assert.doesNotMatch(aggregate, /CURATED_SEED|manualSeed|synonymTable|highland cow.*santa/i);
  });
});
