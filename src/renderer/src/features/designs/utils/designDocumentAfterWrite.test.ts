import assert from "node:assert/strict";
import { Timestamp } from "firebase/firestore";
import { describe, it } from "node:test";

import { mergeDesignDocumentDataAfterWrite } from "./designDocumentAfterWrite";

describe("mergeDesignDocumentDataAfterWrite", () => {
  it("fills unresolved timestamp fields after write", () => {
    const existingData = {
      title: "Hot Mess Cow",
      tags: ["cow"],
      status: "imported",
      originalPath: "designs/original.png",
      thumbnailPath: "designs/thumb.webp",
      uploadedBy: "user-1",
      queueCount: 0,
      aiProcessed: true,
      aiReviewed: false,
      createdAt: Timestamp.fromMillis(1_700_000_000_000),
      updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    };

    const merged = mergeDesignDocumentDataAfterWrite(
      existingData,
      {
        status: "rejected",
        aiReviewStatus: "rejected",
        aiReviewed: true,
        aiReviewedAt: Symbol("serverTimestamp"),
        aiReviewedBy: "staff-1",
      },
      "staff-1",
    );

    assert.equal(merged.title, "Hot Mess Cow");
    assert.equal(merged.status, "rejected");
    assert.ok(merged.updatedAt instanceof Timestamp);
    assert.ok(merged.aiReviewedAt instanceof Timestamp);
    assert.equal(merged.updatedBy, "staff-1");
  });

  it("does not force aiReviewedAt when field is omitted", () => {
    const existingData = {
      title: "Design",
      tags: [],
      status: "rejected",
      originalPath: "designs/original.png",
      thumbnailPath: "designs/thumb.webp",
      uploadedBy: "user-1",
      queueCount: 0,
      aiProcessed: true,
      aiReviewed: true,
      aiReviewedAt: Timestamp.fromMillis(1_700_000_100_000),
      createdAt: Timestamp.fromMillis(1_700_000_000_000),
      updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    };

    const merged = mergeDesignDocumentDataAfterWrite(
      existingData,
      {
        status: "imported",
        aiReviewStatus: "needs_review",
        aiReviewed: false,
      },
      "staff-1",
    );

    assert.equal(merged.status, "imported");
    assert.equal(merged.aiReviewStatus, "needs_review");
    assert.equal((merged.aiReviewedAt as Timestamp).toMillis(), 1_700_000_100_000);
  });
});
