import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAiReviewApprovedFields,
  buildAiReviewPendingFields,
  buildAiReviewRejectedFields,
  isAiReviewEligibleForReady,
  resolveDesignAiReviewDisplay,
} from "./aiReviewState";

describe("resolveDesignAiReviewDisplay", () => {
  it("A. displays pending fallback for imported designs without aiReviewStatus", () => {
    const display = resolveDesignAiReviewDisplay({
      status: "imported",
      aiReviewed: false,
      aiProcessed: false,
    });

    assert.equal(display.aiReviewStatus, "pending");
    assert.equal(display.usesDisplayFallback, true);
  });

  it("maps stored aiReviewStatus without fallback", () => {
    const display = resolveDesignAiReviewDisplay({
      status: "imported",
      aiReviewStatus: "needs_review",
      aiReviewed: false,
      aiProcessed: true,
      aiReviewNotes: "Manual check required",
    });

    assert.equal(display.aiReviewStatus, "needs_review");
    assert.equal(display.usesDisplayFallback, false);
    assert.equal(display.aiReviewNotes, "Manual check required");
  });

  it("treats legacy aiReviewed true as approved display fallback", () => {
    const display = resolveDesignAiReviewDisplay({
      status: "ready",
      aiReviewed: true,
      aiProcessed: true,
    });

    assert.equal(display.aiReviewStatus, "approved");
    assert.equal(display.usesDisplayFallback, true);
  });
});

describe("buildAiReview state fields", () => {
  it("B. approved review sets aiReviewed true without implying ready status transition", () => {
    const fields = buildAiReviewApprovedFields("staff-1", {
      aiReviewVersion: "rules-v1",
      aiReviewConfidence: 0.92,
    });

    assert.equal(fields.aiReviewStatus, "approved");
    assert.equal(fields.aiReviewed, true);
    assert.equal(fields.aiProcessed, true);
    assert.equal(fields.aiReviewedBy, "staff-1");
    assert.equal(fields.aiReviewVersion, "rules-v1");
    assert.equal(fields.aiReviewConfidence, 0.92);
    assert.equal(isAiReviewEligibleForReady(fields.aiReviewStatus), true);
  });

  it("rejected review keeps aiReviewed false", () => {
    const fields = buildAiReviewRejectedFields("staff-1");

    assert.equal(fields.aiReviewStatus, "rejected");
    assert.equal(fields.aiReviewed, false);
    assert.equal(isAiReviewEligibleForReady(fields.aiReviewStatus), false);
  });

  it("pending review resets processed flags", () => {
    const fields = buildAiReviewPendingFields();

    assert.equal(fields.aiReviewStatus, "pending");
    assert.equal(fields.aiReviewed, false);
    assert.equal(fields.aiProcessed, false);
  });

  it("rejects invalid confidence values", () => {
    assert.throws(() => {
      buildAiReviewApprovedFields("staff-1", { aiReviewConfidence: 1.5 });
    }, /confidence must be between 0 and 1/);
  });
});
