import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_OPENAI_REASONING_EFFORT,
  DEFAULT_VISION_MODEL_ID,
  OPENAI_REASONING_EFFORT_OPTIONS,
  DEFAULT_OPENAI_VISION_MODEL_ID,
  OPENAI_VISION_MODEL_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientReasoningEffort,
  resolveClientVisionModelId,
} from "./aiEnrichmentSettingsConstants";

describe("aiEnrichmentSettingsConstants", () => {
  it("uses the shared current default vision model", () => {
    assert.equal(DEFAULT_VISION_MODEL_ID, "gemini-2.5-flash-lite");
    assert.equal(DEFAULT_OPENAI_VISION_MODEL_ID, DEFAULT_VISION_MODEL_ID);
  });

  it("includes all supported selectable OpenAI vision model ids", () => {
    assert.deepEqual(
      OPENAI_VISION_MODEL_OPTIONS.map((option) => option.value),
      [
        "gpt-5.4-nano-2026-03-17",
        "gpt-5.4-mini-2026-03-17",
      ],
    );
  });

  it("accepts gpt-5.4-mini as a saved client model selection", () => {
    assert.equal(
      resolveClientVisionModelId("gpt-5.4-mini-2026-03-17"),
      "gpt-5.4-mini-2026-03-17",
    );
  });

  it("uses medium as the default client reasoning effort", () => {
    assert.equal(DEFAULT_OPENAI_REASONING_EFFORT, "medium");
  });

  it("includes the supported reasoning effort options", () => {
    assert.deepEqual(
      OPENAI_REASONING_EFFORT_OPTIONS.map((option) => option.value),
      ["none", "minimal", "low", "medium", "high"],
    );
  });

  it("accepts none as a saved client reasoning effort", () => {
    assert.equal(resolveClientReasoningEffort("none"), "none");
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
