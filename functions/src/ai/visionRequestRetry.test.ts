import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VisionEmptyOutputError } from "./visionCompletion";
import { sanitizeVisionProviderError, VisionRequestError, resolveVisionErrorCode } from "./visionRequestRetry";

describe("resolveVisionErrorCode", () => {
  it("maps VisionRequestError status 400 to vision_invalid_request", () => {
    const error = new VisionRequestError("Unsupported parameter: 'max_tokens'.", 400);
    assert.equal(resolveVisionErrorCode(error), "vision_invalid_request");
  });

  it("maps VisionRequestError status 429 to vision_rate_limited", () => {
    const error = new VisionRequestError("Rate limit exceeded.", 429);
    assert.equal(resolveVisionErrorCode(error), "vision_rate_limited");
  });

  it("maps VisionRequestError status 500 to vision_server_error", () => {
    const error = new VisionRequestError("Internal server error.", 500);
    assert.equal(resolveVisionErrorCode(error), "vision_server_error");
  });

  it("maps legacy message with unsupported parameter to vision_invalid_request", () => {
    assert.equal(
      resolveVisionErrorCode(new Error("Unsupported parameter: 'max_tokens' is not supported.")),
      "vision_invalid_request",
    );
  });

  it("maps VisionEmptyOutputError to its error code", () => {
    const error = new VisionEmptyOutputError(
      "The AI provider returned no visible output (reason: length). Try again or switch model in Settings.",
      "vision_empty_output",
      "length",
    );
    assert.equal(resolveVisionErrorCode(error), "vision_empty_output");
  });

  it("falls back to ai_processing_failed for unknown errors", () => {
    assert.equal(resolveVisionErrorCode(new Error("Something went wrong.")), "ai_processing_failed");
  });
});

describe("sanitizeVisionProviderError", () => {
  it("preserves safe provider fields and strips secrets", () => {
    const result = sanitizeVisionProviderError(400, {
      error: { code: "INVALID_ARGUMENT", type: "schema", message: "Bad field", field: "response_format", requestId: "req-1", apiKey: "secret" },
      Authorization: "Bearer secret",
    });
    assert.deepEqual(result, { status: 400, retryable: false, classification: "vision_invalid_request", code: "INVALID_ARGUMENT", type: "schema", message: "Bad field", path: "response_format", requestId: "req-1" });
    assert.equal("apiKey" in result, false);
    assert.equal("Authorization" in result, false);
  });
});
