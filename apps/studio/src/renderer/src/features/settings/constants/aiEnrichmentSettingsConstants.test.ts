import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  GEMINI_VISION_MODEL_OPTIONS,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
  SUGGESTED_NEW_TAGS_POLICY_OPTIONS,
  SUGGESTION_AUTHOR_MODE_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientPromptTemplate,
  resolveClientSuggestedNewTagsPolicy,
  resolveClientSuggestionAuthorMode,
  resolveClientTagRerankPromptTemplate,
  resolveClientVisionModelId,
} from "./aiEnrichmentSettingsConstants";

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

  it("includes Luna in the selectable Phase 1 model list", () => {
    assert.equal(resolveClientVisionModelId("gpt-5.6-luna"), "gpt-5.6-luna");
  });

  it("accepts gemini-3.1-flash-lite as a saved client model selection", () => {
    assert.equal(
      resolveClientVisionModelId("gemini-3.1-flash-lite"),
      "gemini-3.1-flash-lite",
    );
  });

  it("falls back to the default vision model for an unknown selection", () => {
    assert.equal(resolveClientVisionModelId("gpt-5.4-mini-2026-03-17"), DEFAULT_VISION_MODEL_ID);
  });

  it("keeps the default AI Processing prompt with approved category name+description context (v34)", () => {
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /description:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /category:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /title:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /tags:/);
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER));
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER));
    assert.ok(!DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER));
    assert.ok(hasRequiredAiEnrichmentPromptPlaceholders(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE));
  });

  it("v32: semantic title/visible-text rules and contraction rules", () => {
    // Business context framing + text-quality title rules (ADR-FP-160).
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /catalog DTF transfer art for apparel/);
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /dominant identity, main message, buyer intent, occasion, role, or theme/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /count only when truly central/,
    );
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /Title rules:/);
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /complete readable slogan in natural reading order/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /WHAT THE DESIGN IS/,
    );
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /Keep contractions intact/);
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Never build the title from style words, mood words, category words, or inferred tag words/,
    );
    // Framing must come before the field instructions, not after.
    const contextIndex = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.indexOf("catalog DTF transfer art");
    const returnFieldsIndex = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.indexOf("Return:");
    assert.ok(contextIndex >= 0 && returnFieldsIndex >= 0 && contextIndex < returnFieldsIndex);
  });

  it("includes style/halftone tagging guidance in the default prompt", () => {
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Include style tags only when visually important and searchable/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Use halftone only for clear dot-screen shading/,
    );
  });

  it("resolves a saved copy of the previous v20 default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a saved copy of the previous v21 default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a saved copy of the pre-title-rules default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_PRE_TITLE_RULES),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a saved copy of the previous v23 default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V23),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a saved copy of the previous v24 default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V24),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a saved copy of the previous v25 default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V25),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a saved copy of the previous v31 default to the current default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves previous v20 default with line-ending/spacing drift to the current default", () => {
    const savedWithDifferentWhitespace = PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20
      .replace(/\n/g, "\r\n")
      .replace("Return:\r\n", "Return:\r\n\r\n");

    assert.equal(
      resolveClientPromptTemplate(savedWithDifferentWhitespace),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves a current-default paste with curly apostrophe / trailing newline to the shipped default", () => {
    // Chat/docs paste often uses U+2019 in "design's" and adds a final newline — that must not
    // look like a custom prompt (Save after paste, then Save again after Use current default).
    const pastedLikeDocs = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.replace(
      "design's",
      "design\u2019s",
    ).concat("\n");

    assert.notEqual(pastedLikeDocs, DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
    assert.equal(resolveClientPromptTemplate(pastedLikeDocs), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  });

  it("preserves a valid custom prompt instead of silently replacing it", () => {
    const customPrompt = `Custom catalog prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER}

Do not use these tag words: ${AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER}`;

    assert.equal(resolveClientPromptTemplate(customPrompt), customPrompt);
  });

  it("defaults suggestion author mode to off", () => {
    assert.equal(DEFAULT_SUGGESTION_AUTHOR_MODE, "off");
  });

  it("resolveClientSuggestionAuthorMode accepts off, auto, and always", () => {
    assert.equal(resolveClientSuggestionAuthorMode("off"), "off");
    assert.equal(resolveClientSuggestionAuthorMode("auto"), "auto");
    assert.equal(resolveClientSuggestionAuthorMode("always"), "always");
  });

  it("resolveClientSuggestionAuthorMode falls back to off for an unknown value", () => {
    assert.equal(resolveClientSuggestionAuthorMode("not-a-real-mode"), "off");
    assert.equal(resolveClientSuggestionAuthorMode(undefined), "off");
  });

  it("SUGGESTION_AUTHOR_MODE_OPTIONS covers exactly off/auto/always", () => {
    assert.deepEqual(
      SUGGESTION_AUTHOR_MODE_OPTIONS.map((option) => option.value),
      ["off", "auto", "always"],
    );
  });

  it("defaults suggested new tags policy to balanced", () => {
    assert.equal(DEFAULT_SUGGESTED_NEW_TAGS_POLICY, "balanced");
  });

  it("resolveClientSuggestedNewTagsPolicy accepts all policy values and falls back to balanced", () => {
    assert.equal(resolveClientSuggestedNewTagsPolicy("off"), "off");
    assert.equal(resolveClientSuggestedNewTagsPolicy("strict"), "strict");
    assert.equal(resolveClientSuggestedNewTagsPolicy("balanced"), "balanced");
    assert.equal(resolveClientSuggestedNewTagsPolicy("generous"), "generous");
    assert.equal(resolveClientSuggestedNewTagsPolicy("always"), "always");
    assert.equal(resolveClientSuggestedNewTagsPolicy("nope"), "balanced");
    assert.equal(resolveClientSuggestedNewTagsPolicy(undefined), "balanced");
  });

  it("SUGGESTED_NEW_TAGS_POLICY_OPTIONS covers off/strict/balanced/generous/always", () => {
    assert.deepEqual(
      SUGGESTED_NEW_TAGS_POLICY_OPTIONS.map((option) => option.value),
      ["off", "strict", "balanced", "generous", "always"],
    );
  });

  it("resolveClientTagRerankPromptTemplate falls back to the default for missing/invalid input", () => {
    assert.equal(resolveClientTagRerankPromptTemplate(undefined), DEFAULT_TAG_RERANK_PROMPT_TEMPLATE);
    assert.equal(resolveClientTagRerankPromptTemplate(""), DEFAULT_TAG_RERANK_PROMPT_TEMPLATE);
    assert.equal(resolveClientTagRerankPromptTemplate("   "), DEFAULT_TAG_RERANK_PROMPT_TEMPLATE);
    assert.equal(resolveClientTagRerankPromptTemplate(42), DEFAULT_TAG_RERANK_PROMPT_TEMPLATE);
  });

  it("resolveClientTagRerankPromptTemplate preserves a valid custom prompt", () => {
    const customPrompt = "Only ever return the tag motherhood.";
    assert.equal(resolveClientTagRerankPromptTemplate(customPrompt), customPrompt);
  });
});
