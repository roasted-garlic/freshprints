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
      { designId: "abc", rerunRejected: false, rerunFromReview: true },
    );
  });
});
