import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  GEMINI_VISION_MODEL_OPTIONS,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  SUGGESTION_AUTHOR_MODE_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientPromptTemplate,
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

  it("accepts gemini-3.1-flash-lite as a saved client model selection", () => {
    assert.equal(
      resolveClientVisionModelId("gemini-3.1-flash-lite"),
      "gemini-3.1-flash-lite",
    );
  });

  it("falls back to the default vision model for an unknown selection", () => {
    assert.equal(resolveClientVisionModelId("gpt-5.4-mini-2026-03-17"), DEFAULT_VISION_MODEL_ID);
  });

  it("keeps the default AI Processing prompt small, vision-only, plus approved category names (v21)", () => {
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /description:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /category:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /title:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /tags:/);
    // The lean prompt injects only approved category names (cheap, ~0.8% cost increase) — the
    // full approved category/tag list with descriptions/aliases stays server-side and gated behind
    // an accuracy test (see ADR-FP-041) because it measured ~4.4x the per-image cost.
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER));
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER));
    assert.ok(hasRequiredAiEnrichmentPromptPlaceholders(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE));
  });

  it("v22: opens with DTF/apparel business-context framing that judges by subject over style", () => {
    // ADR-FP-044: without this framing the model free-associated from visual style (e.g. elegant
    // script + lash imagery) toward a fashion/luxury category for a design that was actually a
    // sarcastic joke — see docs/workflow/plans/2026-07-02-ai-business-context-prompt-plan.md.
    // v22 (2026-07-03) shortened the wording while preserving the same rule: judge by subject over
    // style, and only count decorative elements when truly central.
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /catalog DTF transfer art for apparel/);
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /core subject, message, joke, buyer intent, occasion, role, or theme/,
    );
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /not style alone/);
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /only count when truly central/,
    );
    // The business-context framing must come before the field instructions, not after — it needs
    // to frame every subsequent judgment, not read as an afterthought rule.
    const contextIndex = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.indexOf("catalog DTF transfer art");
    const returnFieldsIndex = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.indexOf("Return:");
    assert.ok(contextIndex >= 0 && returnFieldsIndex >= 0 && contextIndex < returnFieldsIndex);
  });

  it("resolves a saved copy of the previous v20 default to the current v21 default", () => {
    assert.equal(
      resolveClientPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("resolves previous v20 default with line-ending/spacing drift to the current v21 default", () => {
    const savedWithDifferentWhitespace = PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20
      .replace(/\n/g, "\r\n")
      .replace("Return:\r\n", "Return:\r\n\r\n");

    assert.equal(
      resolveClientPromptTemplate(savedWithDifferentWhitespace),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("preserves a valid custom prompt instead of silently replacing it", () => {
    const customPrompt = `Custom catalog prompt.

Approved categories:
${AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER}

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
