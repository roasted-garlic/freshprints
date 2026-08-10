import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ARTWORK_PLACEMENT_SELECT_OPTIONS,
  ARTWORK_PLACEMENT_UNSPECIFIED_LABEL,
  ARTWORK_PLACEMENT_VALUES,
  artworkPlacementLabel,
  parseArtworkPlacement,
} from "./artworkPlacement";

describe("ARTWORK_PLACEMENT_SELECT_OPTIONS", () => {
  it("leads with an Unspecified option using an empty value", () => {
    assert.equal(ARTWORK_PLACEMENT_SELECT_OPTIONS[0]?.value, "");
    assert.equal(ARTWORK_PLACEMENT_SELECT_OPTIONS[0]?.label, ARTWORK_PLACEMENT_UNSPECIFIED_LABEL);
  });

  it("includes exactly one option per allowlisted value, in order", () => {
    const nonEmptyOptions = ARTWORK_PLACEMENT_SELECT_OPTIONS.slice(1);
    assert.deepEqual(nonEmptyOptions.map((option) => option.value), ARTWORK_PLACEMENT_VALUES);
    assert.deepEqual(
      nonEmptyOptions.map((option) => option.label),
      ARTWORK_PLACEMENT_VALUES.map((value) => artworkPlacementLabel(value)),
    );
  });
});

describe("parseArtworkPlacement (re-export)", () => {
  it("still allowlists unknown values to undefined", () => {
    assert.equal(parseArtworkPlacement("unknown"), undefined);
    assert.equal(parseArtworkPlacement("pocket"), "pocket");
  });
});
