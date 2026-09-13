import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  getDefaultAiReviewInboxSortOrder,
  resolveAiReviewInboxSortDirection,
  sortInboxDesigns,
} from "./aiReviewInboxSort";

function createDesign(
  id: string,
  createdAtMillis: number,
  updatedAtMillis: number = createdAtMillis,
): Design {
  return {
    id,
    title: `Design ${id}`,
    tags: [],
    status: "imported",
    originalPath: `/originals/${id}.png`,
    thumbnailPath: `/thumbnails/${id}.webp`,
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: {
      toMillis: () => createdAtMillis,
      toDate: () => new Date(createdAtMillis),
    } as Design["createdAt"],
    updatedAt: {
      toMillis: () => updatedAtMillis,
      toDate: () => new Date(updatedAtMillis),
    } as Design["updatedAt"],
  };
}

describe("aiReviewInboxSort", () => {
  it("defaults processing to oldest and review tabs to newest", () => {
    assert.equal(getDefaultAiReviewInboxSortOrder("processing"), "oldest");
    assert.equal(getDefaultAiReviewInboxSortOrder("needs_review"), "newest");
    assert.equal(getDefaultAiReviewInboxSortOrder("rejected"), "newest");
  });

  it("sorts needs_review newest first by updatedAt", () => {
    const designs = [
      createDesign("b", 1000, 2000),
      createDesign("a", 3000, 5000),
      createDesign("c", 4000, 3000),
    ];

    const sorted = sortInboxDesigns(designs, "needs_review");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["a", "c", "b"],
    );
  });

  it("sorts needs_review oldest first when requested", () => {
    const designs = [
      createDesign("b", 1000, 2000),
      createDesign("a", 3000, 5000),
    ];

    const sorted = sortInboxDesigns(designs, "needs_review", "oldest");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["b", "a"],
    );
  });

  it("sorts rejected newest first by updatedAt", () => {
    const designs = [createDesign("old", 1000, 1000), createDesign("new", 1000, 9000)];

    const sorted = sortInboxDesigns(designs, "rejected");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["new", "old"],
    );
  });

  it("sorts processing oldest first by createdAt", () => {
    const designs = [
      createDesign("newer", 5000, 5000),
      createDesign("older", 1000, 9000),
    ];

    const sorted = sortInboxDesigns(designs, "processing");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["older", "newer"],
    );
  });

  it("sorts processing newest first by createdAt when requested", () => {
    const designs = [
      createDesign("older", 1000, 9000),
      createDesign("newer", 5000, 5000),
    ];

    const sorted = sortInboxDesigns(designs, "processing", "newest");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["newer", "older"],
    );
  });

  it("uses id as tie-breaker when timestamps match", () => {
    const designs = [createDesign("z-design", 1000), createDesign("a-design", 1000)];

    const sorted = sortInboxDesigns(designs, "needs_review");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["a-design", "z-design"],
    );
  });

  it("maps sort order to Firestore direction", () => {
    assert.equal(resolveAiReviewInboxSortDirection("processing"), "asc");
    assert.equal(resolveAiReviewInboxSortDirection("processing", "newest"), "desc");
    assert.equal(resolveAiReviewInboxSortDirection("needs_review"), "desc");
    assert.equal(resolveAiReviewInboxSortDirection("needs_review", "oldest"), "asc");
  });
});
