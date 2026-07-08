import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  createNeedsReviewRerunSession,
  isStaleReadyDuringNeedsReviewRerun,
  shouldCompleteNeedsReviewRerun,
} from "./aiReviewRerunSession";

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
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    aiProcessingStage: "ready_for_review",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1, toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toMillis: () => 1, toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiReviewRerunSession", () => {
  it("does not complete rerun on stale ready with same generatedAt", () => {
    const design = createDesign({
      aiSuggestions: {
        title: "Old Title",
        provider: "google",
        generatedAt: "2026-06-25T10:00:00.000Z",
      },
    });
    const session = createNeedsReviewRerunSession(design);

    assert.equal(isStaleReadyDuringNeedsReviewRerun(design, session), true);
    assert.equal(shouldCompleteNeedsReviewRerun(design, session), false);
  });

  it("completes rerun when generatedAt changes and needs_review is restored", () => {
    const prior = createDesign({
      aiSuggestions: {
        title: "Old Title",
        provider: "google",
        generatedAt: "2026-06-25T10:00:00.000Z",
      },
    });
    const session = createNeedsReviewRerunSession(prior);
    const updated = createDesign({
      aiSuggestions: {
        title: "New Title",
        provider: "google",
        generatedAt: "2026-06-25T10:05:00.000Z",
      },
    });

    assert.equal(shouldCompleteNeedsReviewRerun(updated, session), true);
  });

  it("completes rerun on failed terminal state", () => {
    const prior = createDesign({
      aiSuggestions: {
        title: "Old Title",
        provider: "google",
        generatedAt: "2026-06-25T10:00:00.000Z",
      },
    });
    const session = createNeedsReviewRerunSession(prior);
    const failed = createDesign({
      aiReviewStatus: "pending",
      aiProcessingStage: "failed",
      aiSuggestions: {
        errorCode: "ai_processing_failed",
        errorMessage: "Provider timeout",
      },
    });

    assert.equal(shouldCompleteNeedsReviewRerun(failed, session), true);
  });

  it("does not complete while waiting for pipeline after enqueue", () => {
    const prior = createDesign({
      aiSuggestions: {
        title: "Old Title",
        provider: "google",
        generatedAt: "2026-06-25T10:00:00.000Z",
      },
    });
    const session = createNeedsReviewRerunSession(prior);
    const pending = createDesign({
      aiReviewStatus: "pending",
      aiProcessingStage: "queued",
      aiSuggestions: undefined,
    });

    assert.equal(shouldCompleteNeedsReviewRerun(pending, session), false);
  });
});
