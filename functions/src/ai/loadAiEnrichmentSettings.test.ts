import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
} from "../../../shared/constants/aiEnrichment.constants";
import {
  resolveAiPromptTemplate,
  resolveSuggestionAuthorMode,
  resolveTagRerankMode,
} from "./loadAiEnrichmentSettings";

describe("resolveTagRerankMode", () => {
  it("defaults to off for undefined/missing values", () => {
    assert.equal(resolveTagRerankMode(undefined), "off");
  });

  it("defaults to off for an invalid string", () => {
    assert.equal(resolveTagRerankMode("not-a-real-mode"), "off");
  });

  it("defaults to off for a non-string value", () => {
    assert.equal(resolveTagRerankMode(42), "off");
  });

  it("accepts off, auto, and always", () => {
    assert.equal(resolveTagRerankMode("off"), "off");
    assert.equal(resolveTagRerankMode("auto"), "auto");
    assert.equal(resolveTagRerankMode("always"), "always");
  });
});

describe("resolveSuggestionAuthorMode", () => {
  it("defaults to off for undefined/missing values", () => {
    assert.equal(resolveSuggestionAuthorMode(undefined), "off");
  });

  it("defaults to off for an invalid string", () => {
    assert.equal(resolveSuggestionAuthorMode("not-a-real-mode"), "off");
  });

  it("defaults to off for a non-string value", () => {
    assert.equal(resolveSuggestionAuthorMode(42), "off");
  });

  it("accepts off, auto, and always", () => {
    assert.equal(resolveSuggestionAuthorMode("off"), "off");
    assert.equal(resolveSuggestionAuthorMode("auto"), "auto");
    assert.equal(resolveSuggestionAuthorMode("always"), "always");
  });

  it("is independent from resolveTagRerankMode — an invalid tagRerankMode does not affect this", () => {
    assert.equal(resolveSuggestionAuthorMode("auto"), "auto");
    assert.equal(resolveTagRerankMode("not-a-real-mode"), "off");
  });
});

describe("resolveAiPromptTemplate", () => {
  it("resolves a saved copy of the previous v20 default to the current v21 default", () => {
    assert.equal(
      resolveAiPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("preserves a valid custom prompt", () => {
    const customPrompt = `Custom production prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER}

Do not use: ${AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER}`;

    assert.equal(resolveAiPromptTemplate(customPrompt), customPrompt);
  });

  it("falls back to the current default for invalid prompt values", () => {
    assert.equal(resolveAiPromptTemplate("missing placeholders"), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
    assert.equal(resolveAiPromptTemplate(undefined), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  });
});
