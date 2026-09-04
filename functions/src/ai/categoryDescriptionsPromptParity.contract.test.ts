/**
 * Path parity: v34 category-description prompt is built once and shared.
 * Run: npx tsx --test functions/src/ai/categoryDescriptionsPromptParity.contract.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("v34 category-description prompt path parity", () => {
  it("Gemini provider, Playground, and candidate core share buildSimpleCatalogEnrichmentUserPrompt", () => {
    assert.match(
      read("functions/src/ai/providers/geminiVisionEnrichmentProvider.ts"),
      /buildSimpleCatalogEnrichmentUserPrompt/,
    );
    assert.match(read("functions/src/ai/aiEnrichmentPlayground.ts"), /buildSimpleCatalogEnrichmentUserPrompt/);
    assert.match(read("functions/src/ai/aiEnrichmentCandidateCore.ts"), /loadCachedActiveCategories/);
    assert.match(read("functions/src/ai/aiEnrichmentCandidateCore.ts"), /categoryOptions: categories\.categories/);
  });

  it("enqueue, Ready reprocess worker, and Design Library reprocess use the shared pipeline/provider path", () => {
    assert.match(read("functions/src/enqueueAiEnrichment.ts"), /runAiEnrichmentPipeline/);
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
    const constants = read("packages/shared/src/constants/aiEnrichment.constants.ts");
    const defaultStart = constants.indexOf("export const DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE = `");
    const defaultEnd = constants.indexOf("`;", defaultStart + 50);
    const defaultBody = constants.slice(defaultStart, defaultEnd);
    assert.match(defaultBody, /\{\{approved_categories\}\}/);
    assert.doesNotMatch(defaultBody, /\{\{approved_category_names\}\}/);
    assert.doesNotMatch(defaultBody, /\{\{approved_tags\}\}/);
    assert.doesNotMatch(defaultBody, /\{\{approved_tag_names\}\}/);
    assert.match(
      constants,
      /AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS = \[[\s\S]*AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER/,
    );
  });

  it("prompt and normalizer/schema versions stay on the v34 / v6 / v1 contract", () => {
    assert.match(
      read("packages/shared/src/constants/smartProfile.constants.ts"),
      /CURRENT_CATALOG_ENRICH_PROMPT_VERSION = "catalog-enrich-v34"/,
    );
    assert.match(
      read("packages/shared/src/constants/smartProfile.constants.ts"),
      /SMART_PROFILE_NORMALIZER_VERSION = "smart-profile-normalizer-v6"/,
    );
    assert.match(
      read("functions/src/ai/catalogTitleRules.ts"),
      /CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-v34"/,
    );
  });
});
