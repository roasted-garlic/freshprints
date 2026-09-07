import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_HALLOWEEN_GUARD,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { resolveAiPromptTemplate } from "./loadAiEnrichmentSettings";

describe("resolveAiPromptTemplate", () => {
  it("resolves recognized historical stock defaults to the current default", () => {
    for (const historicalPrompt of [
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_HALLOWEEN_GUARD,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
    ]) {
      assert.equal(resolveAiPromptTemplate(historicalPrompt), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
    }
  });

  it("preserves a valid custom prompt", () => {
    const customPrompt = `Custom production prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER}`;

    assert.equal(resolveAiPromptTemplate(customPrompt), customPrompt);
  });

  it("falls back when a prompt only has the retired names-only or excluded-tags contract", () => {
    const namesOnly = `Custom production prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER}

Do not use: ${AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER}`;

    assert.equal(resolveAiPromptTemplate(namesOnly), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  });

  it("falls back to the current default for invalid prompt values", () => {
    assert.equal(resolveAiPromptTemplate("missing placeholders"), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
    assert.equal(resolveAiPromptTemplate(undefined), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  });
});
