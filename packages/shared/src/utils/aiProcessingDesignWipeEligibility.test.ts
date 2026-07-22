import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAiProcessingDesignStoragePaths,
  isAiProcessingPageDesign,
} from "./aiProcessingDesignWipeEligibility";

describe("isAiProcessingPageDesign", () => {
  it("matches Processing tab (imported/processing + pending)", () => {
    assert.equal(isAiProcessingPageDesign({ status: "imported", aiReviewStatus: "pending" }), true);
    assert.equal(
      isAiProcessingPageDesign({ status: "processing", aiReviewStatus: "pending" }),
      true,
    );
  });

  it("matches Needs Review tab", () => {
    assert.equal(
      isAiProcessingPageDesign({ status: "imported", aiReviewStatus: "needs_review" }),
      true,
    );
  });

  it("matches Rejected tab regardless of aiReviewStatus", () => {
    assert.equal(isAiProcessingPageDesign({ status: "rejected" }), true);
    assert.equal(
      isAiProcessingPageDesign({ status: "rejected", aiReviewStatus: "rejected" }),
      true,
    );
  });

  it("excludes ready and archived Design Library / retention rows", () => {
    assert.equal(isAiProcessingPageDesign({ status: "ready", aiReviewStatus: "approved" }), false);
    assert.equal(isAiProcessingPageDesign({ status: "archived", aiReviewStatus: "rejected" }), false);
  });

  it("excludes imported without pending/needs_review", () => {
    assert.equal(isAiProcessingPageDesign({ status: "imported", aiReviewStatus: "approved" }), false);
    assert.equal(isAiProcessingPageDesign({ status: "imported" }), false);
  });
});

describe("buildAiProcessingDesignStoragePaths", () => {
  it("returns canonical originals/thumbnails/previews paths", () => {
    assert.deepEqual(buildAiProcessingDesignStoragePaths("abc123"), [
      "originals/abc123.png",
      "thumbnails/abc123.webp",
      "previews/abc123.webp",
    ]);
  });

  it("returns empty for blank id", () => {
    assert.deepEqual(buildAiProcessingDesignStoragePaths("  "), []);
  });
});
