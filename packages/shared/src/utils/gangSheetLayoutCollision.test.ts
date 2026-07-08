import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { overlapsAnyOtherItem, rectsOverlap } from "./gangSheetLayoutCollision";

describe("rectsOverlap", () => {
  it("is true when rects intersect", () => {
    const a = { xInches: 0, yInches: 0, widthInches: 3, heightInches: 3 };
    const b = { xInches: 2, yInches: 2, widthInches: 3, heightInches: 3 };
    assert.equal(rectsOverlap(a, b), true);
  });

  it("is false when rects only touch edges", () => {
    const a = { xInches: 0, yInches: 0, widthInches: 2, heightInches: 2 };
    const b = { xInches: 2, yInches: 0, widthInches: 2, heightInches: 2 };
    assert.equal(rectsOverlap(a, b), false);
  });

  it("is false when rects are far apart", () => {
    const a = { xInches: 0, yInches: 0, widthInches: 1, heightInches: 1 };
    const b = { xInches: 10, yInches: 10, widthInches: 1, heightInches: 1 };
    assert.equal(rectsOverlap(a, b), false);
  });
});

describe("overlapsAnyOtherItem", () => {
  const others = [
    { id: "item-1", xInches: 0, yInches: 0, widthInches: 3, heightInches: 3 },
    { id: "item-2", xInches: 10, yInches: 10, widthInches: 2, heightInches: 2 },
  ];

  it("detects overlap against another placed item", () => {
    const candidate = { xInches: 1, yInches: 1, widthInches: 2, heightInches: 2 };
    assert.equal(overlapsAnyOtherItem(candidate, "self", others), true);
  });

  it("ignores the item's own previous position when excluded by id", () => {
    const candidate = { xInches: 10, yInches: 10, widthInches: 2, heightInches: 2 };
    const withSelf = [{ id: "self", xInches: 10, yInches: 10, widthInches: 2, heightInches: 2 }];
    assert.equal(overlapsAnyOtherItem(candidate, "self", withSelf), false);
  });

  it("returns false when the candidate does not overlap any other item", () => {
    const candidate = { xInches: 5, yInches: 5, widthInches: 1, heightInches: 1 };
    assert.equal(overlapsAnyOtherItem(candidate, "self", others), false);
  });
});
