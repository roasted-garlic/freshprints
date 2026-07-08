import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatAiEstimatedCost,
  formatAiReviewConfidence,
  formatAiReviewStatusLabel,
  formatTagRerankStatusLabel,
  getAiReviewStatusBadgeVariant,
  resolveCombinedAiEstimatedCost,
} from "./aiReviewDisplay";

describe("formatAiReviewStatusLabel", () => {
  it("maps known statuses to display labels", () => {
    assert.equal(formatAiReviewStatusLabel("pending"), "Pending");
    assert.equal(formatAiReviewStatusLabel("approved"), "Approved");
    assert.equal(formatAiReviewStatusLabel("rejected"), "Rejected");
    assert.equal(formatAiReviewStatusLabel("needs_review"), "Needs review");
  });
});

describe("getAiReviewStatusBadgeVariant", () => {
  it("maps known statuses to badge variants", () => {
    assert.equal(getAiReviewStatusBadgeVariant("approved"), "success");
    assert.equal(getAiReviewStatusBadgeVariant("rejected"), "danger");
    assert.equal(getAiReviewStatusBadgeVariant("needs_review"), "warning");
    assert.equal(getAiReviewStatusBadgeVariant("pending"), "default");
  });
});

describe("formatAiReviewConfidence", () => {
  it("formats a fraction as a rounded percentage", () => {
    assert.equal(formatAiReviewConfidence(0.72), "72%");
  });

  it("returns an em dash placeholder when confidence is undefined", () => {
    assert.equal(formatAiReviewConfidence(undefined), "—");
  });
});

describe("formatAiEstimatedCost", () => {
  it("formats a numeric cost with 6 decimal places, matching the Settings AI Playground format", () => {
    assert.equal(formatAiEstimatedCost(0.0001234), "$0.000123");
  });

  it("formats zero cost", () => {
    assert.equal(formatAiEstimatedCost(0), "$0.000000");
  });

  it("returns N/A for null", () => {
    assert.equal(formatAiEstimatedCost(null), "N/A");
  });

  it("returns N/A for undefined", () => {
    assert.equal(formatAiEstimatedCost(undefined), "N/A");
  });
});

describe("resolveCombinedAiEstimatedCost", () => {
  it("sums first-call and tag-rerank cost when both are known", () => {
    const result = resolveCombinedAiEstimatedCost(0.000128, 0.000032);
    assert.ok(result != null && Math.abs(result - 0.00016) < 1e-9);
  });

  it("treats a missing tag-rerank cost as zero when the first-call cost is known", () => {
    assert.equal(resolveCombinedAiEstimatedCost(0.000128, null), 0.000128);
    assert.equal(resolveCombinedAiEstimatedCost(0.000128, undefined), 0.000128);
  });

  it("treats a missing first-call cost as zero when the tag-rerank cost is known", () => {
    assert.equal(resolveCombinedAiEstimatedCost(null, 0.000032), 0.000032);
  });

  it("returns null when neither cost is known", () => {
    assert.equal(resolveCombinedAiEstimatedCost(null, null), null);
    assert.equal(resolveCombinedAiEstimatedCost(undefined, undefined), null);
  });
});

describe("formatTagRerankStatusLabel", () => {
  it("maps known statuses to display labels", () => {
    assert.equal(formatTagRerankStatusLabel("succeeded"), "Succeeded");
    assert.equal(formatTagRerankStatusLabel("failed"), "Failed");
    assert.equal(formatTagRerankStatusLabel("skipped"), "Skipped");
  });

  it("returns an em dash placeholder when status is undefined", () => {
    assert.equal(formatTagRerankStatusLabel(undefined), "—");
  });
});
