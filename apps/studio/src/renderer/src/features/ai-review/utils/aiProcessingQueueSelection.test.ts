import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  findNextAwaitingIndex,
  resolveAdvanceIndexAfterProcessing,
  shouldAutoQueueContinue,
  shouldHaltAutoQueue,
} from "./aiProcessingQueueSelection";

function createDesign(id: string, overrides: Partial<Design> = {}): Design {
  return {
    id,
    title: `Design ${id}`,
    tags: [],
    status: "imported",
    originalPath: `/originals/${id}.png`,
    thumbnailPath: `/thumbnails/${id}.webp`,
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiProcessingQueueSelection", () => {
  it("shouldAutoQueueContinue is true only while running or pausing", () => {
    assert.equal(shouldAutoQueueContinue("running"), true);
    assert.equal(shouldAutoQueueContinue("pausing"), true);
    assert.equal(shouldAutoQueueContinue("idle"), false);
  });

  it("findNextAwaitingIndex returns the first awaiting design at or after start", () => {
    const designs = [
      createDesign("a", { aiProcessingStage: "sending_to_ai" }),
      createDesign("b"),
      createDesign("c"),
    ];

    assert.equal(findNextAwaitingIndex(designs, 0), 1);
    assert.equal(findNextAwaitingIndex(designs, 1), 1);
  });

  it("resolveAdvanceIndexAfterProcessing does not skip after success", () => {
    const afterSuccess = [createDesign("b"), createDesign("c")];

    assert.equal(resolveAdvanceIndexAfterProcessing(afterSuccess, 0, false), 0);
    assert.equal(afterSuccess[0]?.id, "b");
  });

  it("resolveAdvanceIndexAfterProcessing advances past failed design", () => {
    const designs = [
      createDesign("a", {
        aiProcessingStage: "failed",
        aiSuggestions: { errorCode: "ai_failed" },
      }),
      createDesign("b"),
    ];

    assert.equal(resolveAdvanceIndexAfterProcessing(designs, 0, true), 1);
  });

  it("shouldHaltAutoQueue is true when stop was requested", () => {
    assert.equal(shouldHaltAutoQueue(true), true);
    assert.equal(shouldHaltAutoQueue(false), false);
  });
});
