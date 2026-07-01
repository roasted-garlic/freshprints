import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OPENAI_VISION_MAX_COMPLETION_TOKENS } from "./aiEnrichmentConfig";
import {
  OpenAiEmptyOutputError,
  assertOpenAiCompletionHasContent,
  buildEmptyOutputUserMessage,
  isReasoningBudgetExhausted,
  resolveEmptyOutputErrorCode,
  shouldRetryEmptyOutputWithHigherCap,
} from "./openAiVisionCompletion";

describe("openAiVisionCompletion", () => {
  it("returns content when message.content is present", () => {
    const content = assertOpenAiCompletionHasContent(
      {
        model: "gpt-5.4-nano-2026-03-17",
        choices: [{ finish_reason: "stop", message: { content: '{"title":"Test"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      },
      "gpt-5.4-nano-2026-03-17",
      OPENAI_VISION_MAX_COMPLETION_TOKENS,
    );

    assert.equal(content, '{"title":"Test"}');
  });

  it("throws user-safe error with token budget code when reasoning exhausts cap", () => {
    const payload = {
      model: "gpt-5.4-nano-2026-03-17",
      choices: [{ finish_reason: "length", message: { content: "" } }],
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 600,
        completion_tokens_details: { reasoning_tokens: 580 },
      },
    };

    assert.throws(
      () => assertOpenAiCompletionHasContent(payload, "gpt-5.4-nano-2026-03-17", 600),
      (error: unknown) => {
        assert.ok(error instanceof OpenAiEmptyOutputError);
        assert.equal(error.errorCode, "openai_token_budget_exhausted");
        assert.equal(error.finishReason, "length");
        assert.equal(
          error.message,
          buildEmptyOutputUserMessage("length"),
        );
        return true;
      },
    );
  });

  it("maps non-length empty output to openai_empty_output", () => {
    assert.equal(
      resolveEmptyOutputErrorCode("content_filter", null, OPENAI_VISION_MAX_COMPLETION_TOKENS),
      "openai_empty_output",
    );
  });

  it("detects reasoning budget exhaustion at 90% threshold", () => {
    assert.equal(isReasoningBudgetExhausted("length", 540, 600), true);
    assert.equal(isReasoningBudgetExhausted("length", 400, 600), false);
    assert.equal(isReasoningBudgetExhausted("stop", 580, 600), false);
  });

  it("requests higher-cap retry when reasoning exhausts primary budget", () => {
    const payload = {
      choices: [{ finish_reason: "length", message: { content: null } }],
      usage: {
        completion_tokens: 600,
        completion_tokens_details: { reasoning_tokens: 580 },
      },
    };

    assert.equal(
      shouldRetryEmptyOutputWithHigherCap(payload, OPENAI_VISION_MAX_COMPLETION_TOKENS),
      false,
    );
    assert.equal(shouldRetryEmptyOutputWithHigherCap(payload, 600), true);
  });
});
