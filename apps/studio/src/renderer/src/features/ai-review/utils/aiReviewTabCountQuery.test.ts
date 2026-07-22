import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAiReviewInboxListQuery } from "../constants/aiReviewInboxConstants";

describe("AI Review tab count query shape (A4/A5)", () => {
  it("processing tab requests pending aiReviewStatus for server filter + count", () => {
    const query = buildAiReviewInboxListQuery({ tab: "processing" });
    assert.deepEqual(query.statusIn, ["imported", "processing"]);
    assert.equal(query.aiReviewStatus, "pending");
  });

  it("needs_review and rejected keep prior server filter shapes", () => {
    const needsReview = buildAiReviewInboxListQuery({ tab: "needs_review" });
    assert.equal(needsReview.status, "imported");
    assert.equal(needsReview.aiReviewStatus, "needs_review");

    const rejected = buildAiReviewInboxListQuery({ tab: "rejected" });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.aiReviewStatus, undefined);
  });
});
