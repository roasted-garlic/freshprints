import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALLOWED_OPENAI_REASONING_EFFORTS,
  ALLOWED_OPENAI_VISION_MODEL_IDS,
  DEFAULT_OPENAI_REASONING_EFFORT,
  DEFAULT_OPENAI_VISION_MODEL_ID,
  OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS,
  resolveEffectiveOpenAiVisionModelId,
  resolveOpenAiReasoningEffort,
  resolveOpenAiVisionModelId,
} from "./aiEnrichmentConfig";

describe("resolveOpenAiVisionModelId", () => {
  it("uses gpt-5.4-nano as the default model", () => {
    assert.equal(DEFAULT_OPENAI_VISION_MODEL_ID, "gpt-5.4-nano-2026-03-17");
  });

  it("returns default when configured value is missing", () => {
    assert.equal(resolveOpenAiVisionModelId(), DEFAULT_OPENAI_VISION_MODEL_ID);
    assert.equal(resolveOpenAiVisionModelId(undefined), DEFAULT_OPENAI_VISION_MODEL_ID);
    assert.equal(resolveOpenAiVisionModelId(""), DEFAULT_OPENAI_VISION_MODEL_ID);
  });

  it("returns default for values outside the allowlist", () => {
    assert.equal(resolveOpenAiVisionModelId("gpt-5.4-nano"), DEFAULT_OPENAI_VISION_MODEL_ID);
    assert.equal(resolveOpenAiVisionModelId("gpt-4o-mini"), DEFAULT_OPENAI_VISION_MODEL_ID);
    assert.equal(resolveOpenAiVisionModelId("unknown-model"), DEFAULT_OPENAI_VISION_MODEL_ID);
  });

  it("accepts each allowlisted model id", () => {
    for (const modelId of ALLOWED_OPENAI_VISION_MODEL_IDS) {
      assert.equal(resolveOpenAiVisionModelId(modelId), modelId);
      assert.equal(resolveOpenAiVisionModelId(`  ${modelId}  `), modelId);
    }
  });

  it("prefers an allowlisted override model over saved settings", () => {
    assert.equal(
      resolveEffectiveOpenAiVisionModelId({
        configured: "gpt-5.4-nano-2026-03-17",
        override: "gpt-5.4-mini-2026-03-17",
      }),
      "gpt-5.4-mini-2026-03-17",
    );
  });

  it("falls back to saved settings when override is missing or invalid", () => {
    assert.equal(
      resolveEffectiveOpenAiVisionModelId({
        configured: "gpt-5.4-nano-2026-03-17",
      }),
      "gpt-5.4-nano-2026-03-17",
    );
    assert.equal(
      resolveEffectiveOpenAiVisionModelId({
        configured: "gpt-5.4-nano-2026-03-17",
        override: "invalid-model",
      }),
      "gpt-5.4-nano-2026-03-17",
    );
  });
});

describe("resolveOpenAiReasoningEffort", () => {
  it("uses medium as the default reasoning effort", () => {
    assert.equal(DEFAULT_OPENAI_REASONING_EFFORT, "medium");
  });

  it("returns default when configured reasoning effort is missing or invalid", () => {
    assert.equal(resolveOpenAiReasoningEffort(), DEFAULT_OPENAI_REASONING_EFFORT);
    assert.equal(resolveOpenAiReasoningEffort(""), DEFAULT_OPENAI_REASONING_EFFORT);
    assert.equal(resolveOpenAiReasoningEffort("xhigh"), DEFAULT_OPENAI_REASONING_EFFORT);
    assert.equal(resolveOpenAiReasoningEffort("bad-value"), DEFAULT_OPENAI_REASONING_EFFORT);
  });

  it("accepts each allowlisted reasoning effort value", () => {
    for (const reasoningEffort of ALLOWED_OPENAI_REASONING_EFFORTS) {
      assert.equal(resolveOpenAiReasoningEffort(reasoningEffort), reasoningEffort);
      assert.equal(resolveOpenAiReasoningEffort(` ${reasoningEffort} `), reasoningEffort);
    }
  });
});

describe("AI processing output limits", () => {
  it("keeps the simple catalog tag cap at 8", () => {
    assert.equal(OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS, 8);
  });
});
