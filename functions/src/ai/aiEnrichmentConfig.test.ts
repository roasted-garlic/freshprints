import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALLOWED_VISION_MODEL_ID_LIST,
  DEFAULT_VISION_MODEL_ID,
  SIMPLE_ENRICHMENT_MAX_TAGS,
  resolveEffectiveVisionModelId,
  resolveVisionModelId,
} from "./aiEnrichmentConfig";

describe("resolveVisionModelId", () => {
  it("uses gemini-2.5-flash-lite as the default model", () => {
    assert.equal(DEFAULT_VISION_MODEL_ID, "gemini-2.5-flash-lite");
  });

  it("returns default when configured value is missing", () => {
    assert.equal(resolveVisionModelId(), DEFAULT_VISION_MODEL_ID);
    assert.equal(resolveVisionModelId(undefined), DEFAULT_VISION_MODEL_ID);
    assert.equal(resolveVisionModelId(""), DEFAULT_VISION_MODEL_ID);
  });

  it("returns default for values outside the allowlist", () => {
    assert.equal(resolveVisionModelId("gpt-5.4-nano-2026-03-17"), DEFAULT_VISION_MODEL_ID);
    assert.equal(resolveVisionModelId("gpt-4o-mini"), DEFAULT_VISION_MODEL_ID);
    assert.equal(resolveVisionModelId("unknown-model"), DEFAULT_VISION_MODEL_ID);
  });

  it("accepts each allowlisted model id", () => {
    for (const modelId of ALLOWED_VISION_MODEL_ID_LIST) {
      assert.equal(resolveVisionModelId(modelId), modelId);
      assert.equal(resolveVisionModelId(`  ${modelId}  `), modelId);
    }
  });

  it("prefers an allowlisted override model over saved settings", () => {
    assert.equal(
      resolveEffectiveVisionModelId({
        configured: "gemini-2.5-flash-lite",
        override: "gemini-3.1-flash-lite",
      }),
      "gemini-3.1-flash-lite",
    );
  });

  it("falls back to saved settings when override is missing or invalid", () => {
    assert.equal(
      resolveEffectiveVisionModelId({
        configured: "gemini-2.5-flash-lite",
      }),
      "gemini-2.5-flash-lite",
    );
    assert.equal(
      resolveEffectiveVisionModelId({
        configured: "gemini-2.5-flash-lite",
        override: "invalid-model",
      }),
      "gemini-2.5-flash-lite",
    );
  });
});

describe("AI processing output limits", () => {
  it("keeps the simple catalog tag cap at 8", () => {
    assert.equal(SIMPLE_ENRICHMENT_MAX_TAGS, 8);
  });
});
