/**
 * Path parity: catalog enrichment prompt is built once and shared across Playground + providers.
 * Paths resolve from this file so the suite works when cwd is `functions/` or repo root.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("v36 category-description prompt path parity", () => {
  it("Gemini provider, Playground, and candidate core share buildSimpleCatalogEnrichmentUserPrompt", () => {
    assert.match(
      read("functions/src/ai/providers/geminiVisionEnrichmentProvider.ts"),
      /buildSimpleCatalogEnrichmentUserPrompt/,
    );
    assert.match(
      read("functions/src/ai/aiEnrichmentPlayground.ts"),
      /buildSimpleCatalogEnrichmentUserPrompt/,
    );
    assert.match(
      read("functions/src/ai/aiEnrichmentCandidateCore.ts"),
      /loadCachedActiveCategories/,
    );
    assert.match(
      read("functions/src/ai/aiEnrichmentCandidateCore.ts"),
      /categoryOptions: categories\.categories/,
    );
  });

  it("enqueue, Ready reprocess worker, and Design Library reprocess use the shared pipeline/provider path", () => {
    assert.match(
      read("functions/src/enqueueAiEnrichment.ts"),
      /runAiEnrichmentPipeline/,
    );
    assert.match(
      read("functions/src/catalogReprocess/catalogReprocessWorker.ts"),
      /runAiEnrichmentPipeline/,
    );
    assert.match(
      read("functions/src/reprocessReadyDesignWithAi.ts"),
      /runAiEnrichmentPipeline/,
    );
  });

  it("default template requires approved_categories and does not inject tag taxonomy placeholders", () => {
    const constants = read(
      "packages/shared/src/constants/aiEnrichment.constants.ts",
    );
    const defaultStart = constants.indexOf(
      "export const DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE = `",
    );
    const defaultEnd = constants.indexOf("`;", defaultStart + 50);
    const defaultBody = constants.slice(defaultStart, defaultEnd);
    assert.match(defaultBody, /\{\{approved_categories\}\}/);
    assert.doesNotMatch(defaultBody, /\{\{excluded_tags\}\}/);
    assert.match(defaultBody, /4–10 words|4-10 words/);
    assert.doesNotMatch(defaultBody, /\{\{approved_category_names\}\}/);
    assert.doesNotMatch(defaultBody, /\{\{approved_tags\}\}/);
    assert.doesNotMatch(defaultBody, /\{\{approved_tag_names\}\}/);
    assert.doesNotMatch(defaultBody, /Structured evidence self-consistency/);
    assert.doesNotMatch(
      defaultBody,
      /\{\{existing_smart_profile_response_schema\}\}/,
    );
    assert.match(
      constants,
      /AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS = \[[\s\S]*AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER/,
    );
  });

  it("prompt and normalizer/schema versions stay on the v39 / v6 / v1 contract", () => {
    assert.match(
      read("packages/shared/src/constants/smartProfile.constants.ts"),
      /CURRENT_CATALOG_ENRICH_PROMPT_VERSION\s*=\s*[\s\S]*"catalog-enrich-v39"/,
    );
    assert.match(
      read("packages/shared/src/constants/smartProfile.constants.ts"),
      /SMART_PROFILE_NORMALIZER_VERSION = "smart-profile-normalizer-v6"/,
    );
    assert.match(
      read("functions/src/ai/catalogTitleRules.ts"),
      /CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-v39"/,
    );
  });
});
