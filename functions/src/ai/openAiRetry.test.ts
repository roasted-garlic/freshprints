import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OpenAiEmptyOutputError } from "./openAiVisionCompletion";
import { OpenAiRequestError, resolveOpenAiErrorCode } from "./openAiRetry";

describe("resolveOpenAiErrorCode", () => {
  it("maps OpenAiRequestError status 400 to openai_invalid_request", () => {
    const error = new OpenAiRequestError("Unsupported parameter: 'max_tokens'.", 400);
    assert.equal(resolveOpenAiErrorCode(error), "openai_invalid_request");
  });

  it("maps OpenAiRequestError status 429 to openai_rate_limited", () => {
    const error = new OpenAiRequestError("Rate limit exceeded.", 429);
    assert.equal(resolveOpenAiErrorCode(error), "openai_rate_limited");
  });

  it("maps OpenAiRequestError status 500 to openai_server_error", () => {
    const error = new OpenAiRequestError("Internal server error.", 500);
    assert.equal(resolveOpenAiErrorCode(error), "openai_server_error");
  });

  it("maps legacy message with unsupported parameter to openai_invalid_request", () => {
    assert.equal(
      resolveOpenAiErrorCode(new Error("Unsupported parameter: 'max_tokens' is not supported.")),
      "openai_invalid_request",
    );
  });

  it("maps OpenAiEmptyOutputError to its error code", () => {
    const error = new OpenAiEmptyOutputError(
      "OpenAI returned no visible output (reason: length). Try again or switch model in Settings.",
      "openai_token_budget_exhausted",
      "length",
    );
    assert.equal(resolveOpenAiErrorCode(error), "openai_token_budget_exhausted");
  });

  it("falls back to ai_processing_failed for unknown errors", () => {
    assert.equal(resolveOpenAiErrorCode(new Error("Something went wrong.")), "ai_processing_failed");
  });
});
