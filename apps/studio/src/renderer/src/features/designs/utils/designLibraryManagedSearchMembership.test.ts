import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { countManagedSearchDroppedHits } from "./countManagedSearchDroppedHits";
import { filterDesignsForLibraryScope } from "./designLibraryMembership";
import type { Design } from "../types/design.types";

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

describe("managed Algolia ready membership + count adjustment", () => {
  it("counts dropped Algolia hits when hydrate keeps fewer ready designs", () => {
    assert.equal(countManagedSearchDroppedHits(10, 9), 1);
    assert.equal(countManagedSearchDroppedHits(10, 10), 0);
    assert.equal(countManagedSearchDroppedHits(0, 0), 0);
    assert.equal(countManagedSearchDroppedHits(3, 5), 0);
  });

  it("filters a mixed hydrate page the way Studio ready search must", () => {
    const ready = createDesign({ id: "readyDesignAAAAAAAAAA", status: "ready" });
    const archived = createDesign({ id: "archivedDesignBBBBBB", status: "archived" });
    const purged = createDesign({
      id: "purgedDesignCCCCCCC",
      assetsPurgedAt: { toMillis: () => 3 } as Design["assetsPurgedAt"],
      status: "archived",
    });
    const imported = createDesign({ id: "importedDesignDDDDDD", status: "imported" });
    const rejected = createDesign({ id: "rejectedDesignEEEEEE", status: "rejected" });

    const hydrated = [ready, archived, purged, imported, rejected];
    const kept = filterDesignsForLibraryScope(hydrated, "ready");
    assert.deepEqual(
      kept.map((design) => design.id),
      [ready.id],
    );
    assert.equal(countManagedSearchDroppedHits(hydrated.length, kept.length), 4);
  });
});
