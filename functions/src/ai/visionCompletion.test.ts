import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  VisionEmptyOutputError,
  assertVisionCompletionHasContent,
  buildEmptyOutputUserMessage,
} from "./visionCompletion";

describe("visionCompletion", () => {
  it("returns content when message.content is present", () => {
    const content = assertVisionCompletionHasContent({
      model: "gemini-2.5-flash-lite",
      choices: [{ finish_reason: "stop", message: { content: '{"title":"Test"}' } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });

    assert.equal(content, '{"title":"Test"}');
  });

  it("throws a user-safe error when the model returns no visible output", () => {
    const payload = {
      model: "gemini-2.5-flash-lite",
      choices: [{ finish_reason: "content_filter", message: { content: "" } }],
      usage: { prompt_tokens: 1200, completion_tokens: 0 },
    };

    assert.throws(
      () => assertVisionCompletionHasContent(payload),
      (error: unknown) => {
        assert.ok(error instanceof VisionEmptyOutputError);
        assert.equal(error.errorCode, "vision_empty_output");
        assert.equal(error.finishReason, "content_filter");
        assert.equal(error.message, buildEmptyOutputUserMessage("content_filter"));
        return true;
      },
    );
  });
});
