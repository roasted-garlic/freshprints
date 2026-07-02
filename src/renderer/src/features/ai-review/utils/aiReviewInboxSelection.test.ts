import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  resolveIsPinnedNeedsReviewDesign,
  resolvePendingCrossTabDesign,
  resolveRejectedReopenTargetTab,
  resolveRejectedRerunTargetTab,
  resolveFreshestInboxDesign,
  shouldPrependPinnedDesignToInbox,
  shouldRetainCrossTabSelection,
  shouldSuppressDefaultInboxSelection,
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

  it("prefers the freshest snapshot when live data lags behind the list query", () => {
    const staleLiveDesign = createDesign({
      id: "needs-review-design",
      title: "Old Title",
      updatedAt: { toMillis: () => 10, toDate: () => new Date() } as Design["updatedAt"],
      aiSuggestions: {
        title: "Old Title",
        provider: "google",
        generatedAt: "2026-06-25T10:00:00.000Z",
      },
    });
    const fresherListDesign = createDesign({
      id: "needs-review-design",
      title: "New Title",
      updatedAt: { toMillis: () => 25, toDate: () => new Date() } as Design["updatedAt"],
      aiSuggestions: {
        title: "New Title",
        provider: "google",
        generatedAt: "2026-06-25T10:05:00.000Z",
      },
    });

    assert.equal(
      resolveFreshestInboxDesign({
        liveDesign: staleLiveDesign,
        listDesign: fresherListDesign,
      })?.title,
      "New Title",
    );
  });

  it("maps rejected reopen and rerun to target tabs", () => {
    assert.equal(resolveRejectedReopenTargetTab(), "needs_review");
    assert.equal(resolveRejectedRerunTargetTab(), "processing");
  });

  it("suppresses default inbox selection during cross-tab handoff", () => {
    assert.equal(
      shouldSuppressDefaultInboxSelection({
        pendingCrossTabSelection: { tab: "needs_review", designId: "design-1" },
        selectedDesignId: "design-1",
        tab: "needs_review",
      }),
      true,
    );

    assert.equal(
      shouldSuppressDefaultInboxSelection({
        pendingCrossTabSelection: { tab: "needs_review", designId: "design-1" },
        selectedDesignId: "design-1",
        tab: "processing",
      }),
      false,
    );
  });

  it("resolves pending cross-tab design when present in list", () => {
    const targetDesign = createDesign({ id: "design-2", aiReviewStatus: "needs_review" });

    assert.equal(
      resolvePendingCrossTabDesign(
        [createDesign({ id: "design-1" }), targetDesign],
        { tab: "needs_review", designId: "design-2" },
        "needs_review",
      )?.id,
      "design-2",
    );
  });

  it("retains cross-tab selection while design is not yet in queue page", () => {
    assert.equal(
      shouldRetainCrossTabSelection({
        designs: [createDesign({ id: "other-design" })],
        pendingCrossTabSelection: { tab: "processing", designId: "design-1" },
        selectedDesignId: "design-1",
        tab: "processing",
      }),
      true,
    );

    assert.equal(
      shouldRetainCrossTabSelection({
        designs: [createDesign({ id: "design-1", aiReviewStatus: "pending" })],
        pendingCrossTabSelection: { tab: "processing", designId: "design-1" },
        selectedDesignId: "design-1",
        tab: "processing",
      }),
      false,
    );
  });
});
