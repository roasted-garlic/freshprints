import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  safeSemanticReviewErrorMessage,
  sanitizeSemanticReviewExtractedExcerpt,
  SemanticReviewError,
} from "./semanticReviewErrors";

describe("semantic review error contract", () => {
  it("keeps provider diagnostics bounded and exposes a safe category", () => {
    const error = new SemanticReviewError(
      safeSemanticReviewErrorMessage("malformed_json"),
      "malformed_json",
      "json_parse",
      {
        httpStatus: 200,
        responseContentShape: "string",
        responseChoiceCount: 1,
        rejectionReason: "No JSON object could be extracted.",
        validationFault: "result_not_object",
        sanitizedExtractedExcerpt: '{"decision":"APPROVE"',
      },
    );

    assert.equal(error.category, "malformed_json");
    assert.equal(error.stage, "json_parse");
    assert.equal(error.diagnostics.httpStatus, 200);
    assert.equal(error.diagnostics.validationFault, "result_not_object");
    assert.equal(
      error.message,
      "The AI provider returned an unsupported Semantic Review response.",
    );
  });

  it("redacts secrets and truncates sanitized excerpts", () => {
    const excerpt = sanitizeSemanticReviewExtractedExcerpt(
      `api_key=super-secret decision=APPROVE ${"x".repeat(900)}`,
      80,
    );
    assert.match(excerpt, /api_key=\[redacted\]/i);
    assert.doesNotMatch(excerpt, /super-secret/);
    assert.ok(excerpt.length <= 80);
  });

  it("uses distinct safe messages for provider, precondition, and timeout failures", () => {
    assert.match(
      safeSemanticReviewErrorMessage("provider_upstream_failure"),
      /provider could not complete/i,
    );
    assert.match(
      safeSemanticReviewErrorMessage("business_precondition"),
      /cannot run/i,
    );
    assert.match(
      safeSemanticReviewErrorMessage("timeout_network"),
      /timed out|could not reach/i,
    );
    assert.equal(
      safeSemanticReviewErrorMessage("semantic_review_noop"),
      "Semantic Review proposed no effective change. No changes were applied.",
    );
  });
});
