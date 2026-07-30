import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../types/design.types";
import {
  sortDesignsForListQuery,
  sortListItemsByExplicitMillis,
} from "./sortDesignsForListQuery";

function createDesign(id: string, createdAtMs: number, updatedAtMs: number): Design {
  return {
    id,
    title: id,
    description: "",
    tags: [],
    status: "ready",
    originalPath: `/originals/${id}.png`,
    thumbnailPath: `/thumbnails/${id}.webp`,
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => createdAtMs } as Design["createdAt"],
    updatedAt: { toMillis: () => updatedAtMs } as Design["updatedAt"],
  };
}

describe("sortDesignsForListQuery", () => {
  it("orders by createdAt desc (newest upload first) even if updatedAt differs", () => {
    const olderUpload = createDesign("older", 100, 500);
    const newerUpload = createDesign("newer", 200, 300);

    const sorted = sortDesignsForListQuery([olderUpload, newerUpload], "createdAt", "desc");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["newer", "older"],
    );
  });

  it("orders by updatedAt desc when sortField is updatedAt", () => {
    const recentlyEdited = createDesign("edited", 100, 500);
    const recentlyUploaded = createDesign("uploaded", 200, 300);

    const sorted = sortDesignsForListQuery([recentlyUploaded, recentlyEdited], "updatedAt", "desc");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["edited", "uploaded"],
    );
  });

  it("orders by createdAt asc when direction is asc", () => {
    const olderUpload = createDesign("older", 100, 500);
    const newerUpload = createDesign("newer", 200, 300);

    const sorted = sortDesignsForListQuery([newerUpload, olderUpload], "createdAt", "asc");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["older", "newer"],
    );
  });

  it("orders generated list entries by explicit createdAtMs desc", () => {
    const entries = [
      { id: "older", createdAtMs: 100 },
      { id: "newer", createdAtMs: 200 },
    ];

    const sorted = sortListItemsByExplicitMillis(entries, (entry) => entry.createdAtMs, "desc");

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ["newer", "older"],
    );
  });

  it("uses ID desc when explicit creation times are equal", () => {
    const entries = [
      { id: "design-a", createdAtMs: 100 },
      { id: "design-z", createdAtMs: 100 },
    ];

    const sorted = sortListItemsByExplicitMillis(entries, (entry) => entry.createdAtMs, "desc");

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ["design-z", "design-a"],
    );
  });

  it("places missing explicit sort data last without throwing", () => {
    const entries = [
      { id: "missing", createdAtMs: undefined },
      { id: "present", createdAtMs: 100 },
    ];

    const sorted = sortListItemsByExplicitMillis(entries, (entry) => entry.createdAtMs, "desc");

    assert.deepEqual(
      sorted.map((entry) => entry.id),
      ["present", "missing"],
    );
  });

  it("does not throw when a Firestore-backed value is unexpectedly missing", () => {
    const missing = createDesign("missing", 100, 100);
    missing.createdAt = undefined as unknown as Design["createdAt"];
    const present = createDesign("present", 200, 200);

    const sorted = sortDesignsForListQuery([missing, present], "createdAt", "desc");

    assert.deepEqual(
      sorted.map((design) => design.id),
      ["present", "missing"],
    );
  });
});
