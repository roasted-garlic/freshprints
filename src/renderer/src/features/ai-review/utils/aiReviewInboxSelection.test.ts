import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  resolveIsPinnedNeedsReviewDesign,
  shouldPrependPinnedDesignToInbox,
  shouldUseLiveDesignForSelection,
} from "./aiReviewInboxSelection";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Sample Design",
    tags: ["alpha"],
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

describe("aiReviewInboxSelection", () => {
  it("pins needs_review design only during active re-run", () => {
    assert.equal(
      resolveIsPinnedNeedsReviewDesign({
        tab: "needs_review",
        selectedDesignId: "design-1",
        liveDesignId: "design-1",
        isRerunningAi: true,
      }),
      true,
    );

    assert.equal(
      resolveIsPinnedNeedsReviewDesign({
        tab: "needs_review",
        selectedDesignId: "design-1",
        liveDesignId: "design-1",
        isRerunningAi: false,
      }),
      false,
    );
  });

  it("does not pin when tab is not needs_review", () => {
    assert.equal(
      resolveIsPinnedNeedsReviewDesign({
        tab: "processing",
        selectedDesignId: "design-1",
        liveDesignId: "design-1",
        isRerunningAi: true,
      }),
      false,
    );
  });

  it("does not prepend processing design to needs_review list without active rerun", () => {
    const processingDesign = createDesign({
      id: "processing-design",
      aiReviewStatus: "pending",
      aiProcessingStage: "queued",
    });

    assert.equal(
      shouldPrependPinnedDesignToInbox({
        isPinnedNeedsReviewDesign: false,
        liveDesign: processingDesign,
        sortedDesignIds: ["needs-review-design"],
      }),
      false,
    );
  });

  it("prepends pinned design during rerun when it left the query list", () => {
    const needsReviewDesign = createDesign({
      id: "needs-review-design",
      aiReviewStatus: "needs_review",
      aiProcessingStage: "queued",
    });

    assert.equal(
      shouldPrependPinnedDesignToInbox({
        isPinnedNeedsReviewDesign: true,
        liveDesign: needsReviewDesign,
        sortedDesignIds: ["other-design"],
      }),
      true,
    );
  });

  it("does not use live processing design for needs_review selection after tab switch", () => {
    const processingDesign = createDesign({
      id: "processing-design",
      aiReviewStatus: "pending",
      aiProcessingStage: "queued",
    });

    assert.equal(
      shouldUseLiveDesignForSelection({
        liveDesign: processingDesign,
        selectedDesignId: "processing-design",
        tab: "needs_review",
        isPinnedNeedsReviewDesign: false,
      }),
      false,
    );
  });

  it("uses live design during needs_review rerun pin", () => {
    const needsReviewDesign = createDesign({
      id: "needs-review-design",
      aiReviewStatus: "needs_review",
      aiProcessingStage: "sending_to_ai",
    });

    assert.equal(
      shouldUseLiveDesignForSelection({
        liveDesign: needsReviewDesign,
        selectedDesignId: "needs-review-design",
        tab: "needs_review",
        isPinnedNeedsReviewDesign: true,
      }),
      true,
    );
  });
});
