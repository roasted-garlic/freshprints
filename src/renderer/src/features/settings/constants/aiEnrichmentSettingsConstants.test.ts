import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_VISION_MODEL_ID,
  GEMINI_VISION_MODEL_OPTIONS,
  SUGGESTION_AUTHOR_MODE_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientSuggestionAuthorMode,
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

  it("keeps the default AI Processing prompt small, vision-only, plus approved category names (v20)", () => {
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /description:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /category:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /title:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /tags:/);
    // The v20 lean prompt injects only approved category names (cheap, ~0.8% cost increase) — the
    // full approved category/tag list with descriptions/aliases stays server-side and gated behind
    // an accuracy test (see ADR-FP-041) because it measured ~4.4x the per-image cost.
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER));
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER));
    assert.ok(hasRequiredAiEnrichmentPromptPlaceholders(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE));
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
});
