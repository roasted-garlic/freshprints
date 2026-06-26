import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALLOWED_OPENAI_VISION_MODEL_IDS,
  DEFAULT_OPENAI_VISION_MODEL_ID,
  resolveOpenAiVisionModelId,
} from "./aiEnrichmentConfig";

describe("resolveOpenAiVisionModelId", () => {
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
});
