import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  GEMINI_VISION_MODEL_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
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

  it("keeps the default AI Processing prompt small and vision-only (v18)", () => {
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /description:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /category:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /title:/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /tags:/);
    // The v18 lean prompt no longer injects the full approved category/tag list — that
    // resolution moved server-side. Only {{excluded_tags}} remains a required placeholder.
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes(AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER));
    assert.ok(hasRequiredAiEnrichmentPromptPlaceholders(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE));
  });
});
