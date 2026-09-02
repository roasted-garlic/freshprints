import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../types/design.types";
import {
  filterDesignsForLibraryScope,
  isDesignVisibleInLibraryScope,
} from "./designLibraryMembership";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "AbCdEfGhIjKlMnOpQrSt",
    title: "Summer Logo",
    tags: ["summer"],
    status: "ready",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1 } as Design["createdAt"],
    updatedAt: { toMillis: () => 2 } as Design["updatedAt"],
    ...overrides,
  };
}

describe("isDesignVisibleInLibraryScope", () => {
  it("ready scope keeps only status ready", () => {
    assert.equal(isDesignVisibleInLibraryScope(createDesign({ status: "ready" }), "ready"), true);
    assert.equal(
      isDesignVisibleInLibraryScope(createDesign({ status: "archived" }), "ready"),
      false,
    );
    assert.equal(
      isDesignVisibleInLibraryScope(createDesign({ status: "imported" }), "ready"),
      false,
    );
    assert.equal(
      isDesignVisibleInLibraryScope(createDesign({ status: "processing" }), "ready"),
      false,
    );
    assert.equal(
      isDesignVisibleInLibraryScope(createDesign({ status: "rejected" }), "ready"),
      false,
    );
  });

  it("ready scope rejects purged archived even if somehow hydrated", () => {
    const purged = createDesign({
      assetsPurgedAt: { toMillis: () => 3 } as Design["assetsPurgedAt"],
      status: "archived",
    });
    assert.equal(isDesignVisibleInLibraryScope(purged, "ready"), false);
  });

  it("archived scope keeps non-purged archived only (ADR-FP-084)", () => {
    assert.equal(
      isDesignVisibleInLibraryScope(createDesign({ status: "archived" }), "archived"),
      true,
    );
    assert.equal(
      isDesignVisibleInLibraryScope(createDesign({ status: "ready" }), "archived"),
      false,
    );
    const purged = createDesign({
      assetsPurgedAt: { toMillis: () => 3 } as Design["assetsPurgedAt"],
      status: "archived",
    });
    assert.equal(isDesignVisibleInLibraryScope(purged, "archived"), false);
  });
});

describe("filterDesignsForLibraryScope", () => {
  it("drops non-ready from a mixed Algolia-style hydrate set and preserves order", () => {
    const readyA = createDesign({ id: "readyDesignAAAAAAAAAA", status: "ready" });
    const archived = createDesign({ id: "archivedDesignBBBBBB", status: "archived" });
    const readyB = createDesign({ id: "readyDesignCCCCCCCCCC", status: "ready" });
    const purged = createDesign({
      id: "purgedDesignDDDDDDDD",
      assetsPurgedAt: { toMillis: () => 3 } as Design["assetsPurgedAt"],
      status: "archived",
    });
    const rejected = createDesign({ id: "rejectedDesignEEEEEE", status: "rejected" });

    const filtered = filterDesignsForLibraryScope(
      [readyA, archived, readyB, purged, rejected],
      "ready",
    );
    assert.deepEqual(
      filtered.map((design) => design.id),
      [readyA.id, readyB.id],
    );
  });

  it("archived scope excludes purged rows", () => {
    const archived = createDesign({ id: "archivedDesignBBBBBB", status: "archived" });
    const purged = createDesign({
      id: "purgedDesignDDDDDDDD",
      assetsPurgedAt: { toMillis: () => 3 } as Design["assetsPurgedAt"],
      status: "archived",
    });
    const filtered = filterDesignsForLibraryScope([archived, purged], "archived");
    assert.deepEqual(
      filtered.map((design) => design.id),
      [archived.id],
    );
  });
});
