import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  findNextAwaitingIndex,
  mergeAppendedDesignsIntoList,
  resolveAdvanceIndexAfterProcessing,
  resolveAutoQueueContinuationAfterLoadMore,
  shouldAutoQueueContinue,
  shouldPrefetchNextAiProcessingPage,
} from "./aiProcessingQueueSelection";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Sample Design",
    tags: [],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    previewPath: "/previews/design-1.webp",
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
      createDesign({ id: "a", aiProcessingStage: "ready_for_review", aiReviewStatus: "needs_review" }),
      createDesign({ id: "b" }),
      createDesign({ id: "c" }),
    ];
    assert.equal(findNextAwaitingIndex(designs, 0), 1);
    assert.equal(findNextAwaitingIndex(designs, 1), 1);
  });

  it("resolveAdvanceIndexAfterProcessing skips the current row unless it failed", () => {
    const designs = [
      createDesign({ id: "a", aiProcessingStage: "ready_for_review", aiReviewStatus: "needs_review" }),
      createDesign({ id: "b" }),
      createDesign({ id: "c" }),
    ];
    assert.equal(resolveAdvanceIndexAfterProcessing(designs, 0, false), 1);
    assert.equal(resolveAdvanceIndexAfterProcessing(designs, 1, true), 2);
  });

  it("continues after a final cursor page that still has awaiting designs", () => {
    const next = createDesign({ id: "next" });
    const designs = [
      createDesign({
        id: "done",
        aiProcessingStage: "ready_for_review",
        aiReviewStatus: "needs_review",
      }),
      next,
    ];
    const continuation = resolveAutoQueueContinuationAfterLoadMore({
      designs,
      searchFromIndex: 1,
      page: { appendedDesigns: [next], hasMore: false },
    });
    assert.deepEqual(continuation, { action: "continue", nextIndex: 1 });
  });

  it("stops only when no awaiting designs remain and the cursor is exhausted", () => {
    const designs = [
      createDesign({
        id: "done",
        aiProcessingStage: "ready_for_review",
        aiReviewStatus: "needs_review",
      }),
    ];
    const continuation = resolveAutoQueueContinuationAfterLoadMore({
      designs,
      searchFromIndex: 0,
      page: { appendedDesigns: [], hasMore: false },
    });
    assert.deepEqual(continuation, { action: "stop" });
  });

  it("keeps consuming empty client-filter pages while hasMore is true", () => {
    const designs = [
      createDesign({
        id: "filtered",
        aiProcessingStage: "ready_for_review",
        aiReviewStatus: "needs_review",
      }),
    ];
    const continuation = resolveAutoQueueContinuationAfterLoadMore({
      designs,
      searchFromIndex: 1,
      page: { appendedDesigns: [], hasMore: true },
    });
    assert.deepEqual(continuation, { action: "continue", nextIndex: 1 });
  });

  it("merges appended designs without duplicating ids", () => {
    const current = [createDesign({ id: "a" })];
    const merged = mergeAppendedDesignsIntoList(current, [
      createDesign({ id: "a" }),
      createDesign({ id: "b" }),
    ]);
    assert.deepEqual(
      merged.map((entry) => entry.id),
      ["a", "b"],
    );
  });

  it("prefetches when few awaiting designs remain and more pages exist", () => {
    assert.equal(
      shouldPrefetchNextAiProcessingPage({
        hasMore: true,
        isLoadingMore: false,
        remainingAwaitingCount: 10,
      }),
      true,
    );
    assert.equal(
      shouldPrefetchNextAiProcessingPage({
        hasMore: true,
        isLoadingMore: false,
        remainingAwaitingCount: 11,
      }),
      false,
    );
    assert.equal(
      shouldPrefetchNextAiProcessingPage({
        hasMore: false,
        isLoadingMore: false,
        remainingAwaitingCount: 1,
      }),
      false,
    );
  });
});
