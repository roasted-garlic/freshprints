import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAiReviewApprovedFields, buildAiReviewRejectedFields } from "../utils/aiReviewState";

describe("catalog approval persistence shape", () => {
  it("D. approve fields align with ready catalog outcome", () => {
    const fields = buildAiReviewApprovedFields("staff-owner");

    assert.equal(fields.aiReviewStatus, "approved");
    assert.equal(fields.aiReviewed, true);
    assert.equal(fields.aiProcessed, true);
    assert.equal(fields.aiReviewedBy, "staff-owner");
  });

  it("E. reject fields support catalog rejection with review completion", () => {
    const fields = buildAiReviewRejectedFields("staff-admin", {
      aiReviewNotes: "Logo quality insufficient",
    });

    assert.equal(fields.aiReviewStatus, "rejected");
    assert.equal(fields.aiProcessed, true);
    assert.equal(fields.aiReviewedBy, "staff-admin");
    assert.equal(fields.aiReviewNotes, "Logo quality insufficient");
  });
});
