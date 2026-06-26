import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  isAiProcessingTerminal,
  isDesignAwaitingAiStart,
  isDesignAiProcessingFailed,
  isDesignAiProcessingInProgress,
} from "./aiProcessingQueueEligibility";
import { resolveAiProcessingOutputStatus } from "./aiProcessingOutput";
import {
  readAiProcessingAutoAdvancePreference,
  writeAiProcessingAutoAdvancePreference,
} from "./aiProcessingQueuePreferences";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Sample Design",
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
    createdAt: { toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiProcessingQueueEligibility", () => {
  it("treats imported pending designs without a stage as awaiting AI start", () => {
    const design = createDesign();

    assert.equal(resolveAiProcessingOutputStatus(design), "not_generated");
    assert.equal(isDesignAwaitingAiStart(design), true);
    assert.equal(isDesignAiProcessingInProgress(design), false);
  });

  it("treats queued designs as in progress", () => {
    const design = createDesign({ aiProcessingStage: "sending_to_ai" });

    assert.equal(isDesignAwaitingAiStart(design), false);
    assert.equal(isDesignAiProcessingInProgress(design), true);
  });

  it("detects terminal AI states", () => {
    assert.equal(
      isAiProcessingTerminal(createDesign({ aiProcessingStage: "ready_for_review" })),
      true,
    );
    assert.equal(
      isAiProcessingTerminal(
        createDesign({
          aiProcessingStage: "failed",
          aiSuggestions: { errorCode: "ai_failed" },
        }),
      ),
      true,
    );
    assert.equal(
      isAiProcessingTerminal(createDesign({ aiReviewStatus: "needs_review" })),
      true,
    );
    assert.equal(isAiProcessingTerminal(createDesign()), false);
  });

  it("detects failed processing output", () => {
    assert.equal(
      isDesignAiProcessingFailed(
        createDesign({
          aiProcessingStage: "failed",
          aiSuggestions: { errorCode: "ai_failed" },
        }),
      ),
      true,
    );
  });
});

describe("aiProcessingQueuePreferences", () => {
  it("reads and writes auto advance preference when sessionStorage is available", () => {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }

    writeAiProcessingAutoAdvancePreference(true);
    assert.equal(readAiProcessingAutoAdvancePreference(), true);
    writeAiProcessingAutoAdvancePreference(false);
    assert.equal(readAiProcessingAutoAdvancePreference(), false);
  });
});
