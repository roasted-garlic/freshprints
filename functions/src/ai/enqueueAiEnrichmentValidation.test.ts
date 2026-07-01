import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isRerunFromReviewEligible,
  parseEnqueueAiEnrichmentRequest,
  shouldAllowAiEnqueueForReviewStatus,
} from "./enqueueAiEnrichmentValidation";

describe("enqueueAiEnrichmentValidation", () => {
  it("allows rerunFromReview for imported needs_review designs", () => {
    const design = { status: "imported", aiReviewStatus: "needs_review" };
    assert.equal(isRerunFromReviewEligible(design), true);
    assert.equal(
      shouldAllowAiEnqueueForReviewStatus(design, { rerunFromReview: true }),
      true,
    );
  });

  it("rejects rerunFromReview for pending processing designs", () => {
    const design = { status: "imported", aiReviewStatus: "pending" };
    assert.equal(isRerunFromReviewEligible(design), false);
  });

  it("blocks automatic enqueue when review status is needs_review", () => {
    const design = { status: "imported", aiReviewStatus: "needs_review" };
    assert.equal(shouldAllowAiEnqueueForReviewStatus(design, {}), false);
  });

  it("parses rerunFromReview request flag", () => {
    assert.deepEqual(
      parseEnqueueAiEnrichmentRequest({ designId: "abc", rerunFromReview: true }),
      {
        designId: "abc",
        rerunRejected: false,
        rerunFromReview: true,
        visionModelIdOverride: undefined,
        reasoningEffortOverride: undefined,
      },
    );
  });

  it("parses an allowlisted vision model override", () => {
    assert.deepEqual(
      parseEnqueueAiEnrichmentRequest({
        designId: "abc",
        rerunRejected: true,
        visionModelIdOverride: "gpt-5.4-mini-2026-03-17",
      }),
      {
        designId: "abc",
        rerunRejected: true,
        rerunFromReview: false,
        visionModelIdOverride: "gpt-5.4-mini-2026-03-17",
        reasoningEffortOverride: undefined,
      },
    );
  });

  it("rejects invalid vision model overrides", () => {
    assert.throws(
      () =>
        parseEnqueueAiEnrichmentRequest({
          designId: "abc",
          rerunRejected: true,
          visionModelIdOverride: "bad-model",
        }),
      /not allowed/i,
    );
  });
});
