import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  computeTrackedReprocessReturnCountDeltas,
  resolveTrackedReprocessTerminalWithBaseline,
  resolveTrackedReprocessTerminal,
  shouldUpsertTrackedReprocessReturn,
} from "./trackedReprocessReturn";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Design",
    tags: [],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1, toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toMillis: () => 1, toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("trackedReprocessReturn", () => {
  it("detects needs_review return", () => {
    const result = resolveTrackedReprocessTerminal(
      createDesign({ aiReviewStatus: "needs_review", aiProcessed: true }),
    );
    assert.equal(result.kind, "returned_to_review");
    assert.equal(result.reviewTab, "needs_review");
  });

  it("detects rejected return", () => {
    const result = resolveTrackedReprocessTerminal(
      createDesign({ aiReviewStatus: "rejected" }),
    );
    assert.equal(result.kind, "returned_to_review");
    assert.equal(result.reviewTab, "rejected");
  });

  it("detects failed processing", () => {
    const result = resolveTrackedReprocessTerminal(
      createDesign({ aiProcessingStage: "failed" }),
    );
    assert.equal(result.kind, "failed");
  });

  it("treats pending queued as still in flight", () => {
    const result = resolveTrackedReprocessTerminal(
      createDesign({ aiReviewStatus: "pending", aiProcessingStage: "queued" }),
    );
    assert.equal(result.kind, "still_in_flight");
  });

  it("ignores a cached pre-reset terminal snapshot at the baseline timestamp", () => {
    const result = resolveTrackedReprocessTerminalWithBaseline(
      createDesign({ aiReviewStatus: "needs_review", aiProcessed: true }),
      1,
    );
    assert.equal(result.kind, "still_in_flight");
  });

  it("fails closed when a tracked rerun has no usable timestamp baseline", () => {
    const result = resolveTrackedReprocessTerminalWithBaseline(
      createDesign({ aiReviewStatus: "needs_review", aiProcessed: true }),
      null,
    );
    assert.equal(result.kind, "still_in_flight");
  });

  it("accepts a newer terminal snapshot without requiring an observed pending snapshot", () => {
    const result = resolveTrackedReprocessTerminalWithBaseline(
      createDesign({
        aiReviewStatus: "needs_review",
        aiProcessed: true,
        updatedAt: { toMillis: () => 2, toDate: () => new Date() } as Design["updatedAt"],
      }),
      1,
    );
    assert.equal(result.kind, "returned_to_review");
  });

  it("keeps three rapid pre-reset snapshots out of the rail until each has a newer update", () => {
    const designs = ["a", "b", "c"].map((id) =>
      createDesign({
        id,
        aiReviewStatus: "needs_review",
        updatedAt: { toMillis: () => 10, toDate: () => new Date() } as Design["updatedAt"],
      }),
    );
    assert.deepEqual(
      designs.map((design) => resolveTrackedReprocessTerminalWithBaseline(design, 10).kind),
      ["still_in_flight", "still_in_flight", "still_in_flight"],
    );
  });

  it("upserts only when active tab matches return tab", () => {
    assert.equal(
      shouldUpsertTrackedReprocessReturn({
        activeTab: "needs_review",
        reviewTab: "needs_review",
      }),
      true,
    );
    assert.equal(
      shouldUpsertTrackedReprocessReturn({
        activeTab: "processing",
        reviewTab: "needs_review",
      }),
      false,
    );
  });

  it("computes count deltas for needs_review return", () => {
    assert.deepEqual(
      computeTrackedReprocessReturnCountDeltas({
        activeTab: "needs_review",
        reviewTab: "needs_review",
      }),
      { needs_review: 1, processing: -1 },
    );
  });
});
