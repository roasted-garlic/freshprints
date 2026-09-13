import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapPlaygroundError } from "./playgroundErrorMapping";
import { mapSemanticReviewError } from "./semanticReviewErrorMapping";
import { SemanticReviewError } from "./semanticReviewErrors";
import { VisionEmptyOutputError } from "./visionCompletion";
import { VisionRequestError } from "./visionRequestRetry";

describe("AI enrichment callable error boundaries", () => {
  it("maps Playground upstream, timeout, and validation failures distinctly", () => {
    const upstream = mapPlaygroundError(new VisionRequestError("bad", 400));
    const timeout = mapPlaygroundError(new VisionRequestError("timed out", 504));
    const empty = mapPlaygroundError(
      new VisionEmptyOutputError("no output", "vision_empty_output", null),
    );
    const invalid = mapPlaygroundError(new Error("Prompt is required."));

    assert.equal(upstream.code, "failed-precondition");
    assert.deepEqual(upstream.details, { aiErrorCategory: "provider_upstream_failure" });
    assert.equal(timeout.code, "deadline-exceeded");
    assert.deepEqual(timeout.details, { aiErrorCategory: "timeout_network" });
    assert.equal(empty.code, "failed-precondition");
    assert.equal(invalid.code, "invalid-argument");
  });

  it("maps semantic provider/parser/precondition failures without exposing internals", () => {
    const provider = mapSemanticReviewError(
      new SemanticReviewError(
        "safe",
        "provider_upstream_failure",
        "provider_request",
        { httpStatus: 400, rejectionReason: "secret-free" },
      ),
    );
    const parser = mapSemanticReviewError(
      new SemanticReviewError("safe", "malformed_json", "json_parse"),
    );
    const precondition = mapSemanticReviewError(
      new SemanticReviewError("safe", "business_precondition", "precondition"),
    );
    const noOp = mapSemanticReviewError(
      new SemanticReviewError(
        "safe",
        "semantic_review_noop",
        "patch_validation",
      ),
    );
    const unknown = mapSemanticReviewError(new Error("implementation detail"));

    assert.equal(provider.code, "failed-precondition");
    assert.equal(provider.message.includes("safe"), false);
    assert.equal(provider.details?.aiErrorCategory, "provider_upstream_failure");
    assert.equal(parser.code, "failed-precondition");
    assert.equal(parser.details?.aiErrorCategory, "malformed_json");
    assert.equal(precondition.code, "failed-precondition");
    assert.equal(precondition.details?.aiErrorCategory, "business_precondition");
    assert.equal(noOp.code, "failed-precondition");
    assert.equal(noOp.details?.aiErrorCategory, "semantic_review_noop");
    assert.equal(unknown.code, "internal");
    assert.equal(unknown.details?.aiErrorCategory, "unknown_internal");
  });
});
