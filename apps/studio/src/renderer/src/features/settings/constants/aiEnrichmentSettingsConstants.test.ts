import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  GEMINI_VISION_MODEL_OPTIONS,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientPromptTemplate,
  resolveClientVisionModelId,
} from "./aiEnrichmentSettingsConstants";
import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";

describe("aiEnrichmentSettingsConstants", () => {
  it("uses the shared current default vision model", () => {
    assert.equal(DEFAULT_VISION_MODEL_ID, "gemini-2.5-flash-lite");
  });

  it("includes all supported selectable Gemini vision model ids", () => {
    assert.deepEqual(
      GEMINI_VISION_MODEL_OPTIONS.map((option) => option.value),
      ["gemini-2.5-flash-lite", "gemini-3.1-flash-lite"],
    );
  });

  it("accepts supported models and falls back for an unknown selection", () => {
    assert.equal(resolveClientVisionModelId("gpt-5.6-luna"), "gpt-5.6-luna");
    assert.equal(
      resolveClientVisionModelId("gemini-3.1-flash-lite"),
      "gemini-3.1-flash-lite",
    );
    assert.equal(
      resolveClientVisionModelId("unknown-model"),
      DEFAULT_VISION_MODEL_ID,
    );
  });

  it("uses the v39 visual-only default prompt contract", () => {
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Analyze the attached artwork/,
    );
    assert.ok(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(
        AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
      ),
    );
    assert.ok(
      !DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(
        AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
      ),
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /tags|halftone|readableTextLines/i,
    );
    assert.ok(
      hasRequiredAiEnrichmentPromptPlaceholders(
        DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      ),
    );
  });

  it("resolves recognized historical stock defaults to the current default", () => {
    for (const historicalPrompt of [
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
    ]) {
      assert.equal(
        resolveClientPromptTemplate(historicalPrompt),
        DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      );
    }
  });

  it("preserves genuine custom prompts", () => {
    const customPrompt = `Custom catalog prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER}`;

    assert.equal(resolveClientPromptTemplate(customPrompt), customPrompt);
  });

  it("rejects the retired names-only/excluded-tags placeholder contract", () => {
    const retired = `Custom catalog prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER}

Do not use: ${AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER}`;

    assert.equal(
      resolveClientPromptTemplate(retired),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });
});
