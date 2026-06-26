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
} from "./aiReviewInboxEligibility";

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
      aiSuggestions: { title: "Suggested", provider: "openai", generatedAt: "2026-06-25T10:00:00.000Z" },
    });
    assert.equal(isDesignRerunnableFromNeedsReview(eligible), true);

    const pending = createDesign({
      aiReviewStatus: "pending",
      aiProcessingStage: "queued",
      aiSuggestions: undefined,
    });
    assert.equal(isDesignRerunnableFromNeedsReview(pending), false);
  });
});
