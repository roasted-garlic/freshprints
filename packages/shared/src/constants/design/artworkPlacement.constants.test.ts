import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ARTWORK_PLACEMENT_UNSPECIFIED_LABEL,
  ARTWORK_PLACEMENT_VALUES,
  artworkPlacementLabel,
  parseArtworkPlacement,
} from "./artworkPlacement.constants";

describe("parseArtworkPlacement", () => {
  it("allowlists every documented value", () => {
    for (const value of ARTWORK_PLACEMENT_VALUES) {
      assert.equal(parseArtworkPlacement(value), value);
    }
  });

  it("maps missing/undefined to undefined (Unspecified)", () => {
    assert.equal(parseArtworkPlacement(undefined), undefined);
    assert.equal(parseArtworkPlacement(null), undefined);
  });

  it("maps unknown/legacy string values to undefined rather than throwing", () => {
    assert.equal(parseArtworkPlacement("sideways"), undefined);
    assert.equal(parseArtworkPlacement(""), undefined);
  });

  it("maps non-string values to undefined", () => {
    assert.equal(parseArtworkPlacement(42), undefined);
    assert.equal(parseArtworkPlacement({ front: true }), undefined);
  });
});

describe("artworkPlacementLabel", () => {
  it("returns the display label for each allowlisted value", () => {
    assert.equal(artworkPlacementLabel("front"), "Front");
    assert.equal(artworkPlacementLabel("back"), "Back");
    assert.equal(artworkPlacementLabel("front_back"), "Front / Back");
    assert.equal(artworkPlacementLabel("pocket"), "Pocket");
    assert.equal(artworkPlacementLabel("sleeve"), "Sleeve");
  });

  it("falls back to Unspecified for missing or unknown values", () => {
    assert.equal(artworkPlacementLabel(undefined), ARTWORK_PLACEMENT_UNSPECIFIED_LABEL);
    assert.equal(artworkPlacementLabel(null), ARTWORK_PLACEMENT_UNSPECIFIED_LABEL);
    assert.equal(artworkPlacementLabel("unknown"), ARTWORK_PLACEMENT_UNSPECIFIED_LABEL);
  });
});
