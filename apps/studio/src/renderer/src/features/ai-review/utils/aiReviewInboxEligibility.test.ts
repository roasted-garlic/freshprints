import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  canEditCatalogInInbox,
  designMatchesInboxTab,
  isDesignApprovableInInbox,
  isDesignRejectableInInbox,
  isDesignReopenableInInbox,
  isDesignRerunnableFromNeedsReview,
  isDesignRerunnableInInbox,
  isDesignRetryableInProcessing,
  isDesignStaleProcessingRetryable,
} from "./aiReviewInboxEligibility";
import { AI_ENRICHMENT_STALE_STAGE_MS } from "@fresh-prints/shared/constants/aiEnrichment.constants";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Test Design",
    tags: [],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiReviewInboxEligibility", () => {
  it("matches needs review tab", () => {
    const design = createDesign({
      aiSuggestions: { title: "Suggested title", provider: "development" },
    });
    assert.equal(designMatchesInboxTab(design, "needs_review"), true);
    assert.equal(isDesignApprovableInInbox(design, "needs_review"), true);
    assert.equal(isDesignRejectableInInbox(design, "needs_review"), true);
  });

  it("excludes rejected designs from needs review tab", () => {
    const design = createDesign({ status: "rejected", aiReviewStatus: "rejected" });
    assert.equal(designMatchesInboxTab(design, "needs_review"), false);
    assert.equal(isDesignApprovableInInbox(design, "needs_review"), false);
  });

  it("matches rejected tab", () => {
    const design = createDesign({ status: "rejected", aiReviewStatus: "rejected" });
    assert.equal(designMatchesInboxTab(design, "rejected"), true);
    assert.equal(isDesignApprovableInInbox(design, "rejected"), false);
    assert.equal(isDesignRejectableInInbox(design, "rejected"), false);
    assert.equal(isDesignReopenableInInbox(design, "rejected"), true);
  });

  it("restricts catalog editing to needs review tab", () => {
    assert.equal(canEditCatalogInInbox("needs_review"), true);
    assert.equal(canEditCatalogInInbox("processing"), false);
    assert.equal(canEditCatalogInInbox("rejected"), false);
  });

  it("allows rerun only on rejected tab", () => {
    const design = createDesign({ status: "rejected", aiReviewStatus: "rejected" });
    assert.equal(isDesignRerunnableInInbox(design, "rejected"), true);
    assert.equal(isDesignRerunnableInInbox(design, "needs_review"), false);
  });

  it("allows needs review rerun only when server eligibility matches", () => {
    const eligible = createDesign({
      aiSuggestions: { title: "Suggested", provider: "google", generatedAt: "2026-06-25T10:00:00.000Z" },
    });
    assert.equal(isDesignRerunnableFromNeedsReview(eligible), true);

    const pending = createDesign({
      aiReviewStatus: "pending",
      aiProcessingStage: "queued",
      aiSuggestions: undefined,
    });
    assert.equal(isDesignRerunnableFromNeedsReview(pending), false);
  });

  it("distinguishes failed retry from stale processing retry on processing tab", () => {
    const staleWaiting = createDesign({
      status: "processing",
      aiReviewStatus: "pending",
      aiProcessingStage: "sending_to_ai",
      previewPath: "/previews/design-1.webp",
      updatedAt: {
        toMillis: () => Date.now() - AI_ENRICHMENT_STALE_STAGE_MS - 1,
      } as Design["updatedAt"],
    });
    const failed = createDesign({
      status: "processing",
      aiReviewStatus: "pending",
      aiProcessingStage: "failed",
      aiSuggestions: { errorCode: "timeout", provider: "google" },
    });

    assert.equal(isDesignStaleProcessingRetryable(staleWaiting, "processing"), true);
    assert.equal(isDesignRetryableInProcessing(staleWaiting, "processing"), false);
    assert.equal(isDesignRetryableInProcessing(failed, "processing"), true);
    assert.equal(isDesignStaleProcessingRetryable(failed, "processing"), false);
    assert.equal(isDesignStaleProcessingRetryable(staleWaiting, "needs_review"), false);
  });
});
