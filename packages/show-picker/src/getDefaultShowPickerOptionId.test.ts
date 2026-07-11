import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDefaultShowPickerOptionId } from "./getDefaultShowPickerOptionId";

describe("getDefaultShowPickerOptionId", () => {
  it("returns null for an empty list", () => {
    assert.equal(getDefaultShowPickerOptionId([]), null);
  });

  it("returns the first option when none are full", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "a", isFull: false },
        { id: "b", isFull: false },
      ]),
      "a",
    );
  });

  it("skips a full soonest show for the next open show", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "full", isFull: true },
        { id: "open", isFull: false },
        { id: "later", isFull: false },
      ]),
      "open",
    );
  });

  it("falls back to the first option when every show is full", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "a", isFull: true },
        { id: "b", isFull: true },
      ]),
      "a",
    );
  });

  it("prefers the first option that can fit when a predicate is provided", () => {
    assert.equal(
      getDefaultShowPickerOptionId(
        [
          { id: "tight", isFull: false },
          { id: "fits", isFull: false },
          { id: "later", isFull: false },
        ],
        (id) => id === "fits",
      ),
      "fits",
    );
  });

  it("falls back to first non-full when nothing can fit", () => {
    assert.equal(
      getDefaultShowPickerOptionId(
        [
          { id: "full", isFull: true },
          { id: "open", isFull: false },
        ],
        () => false,
      ),
      "open",
    );
  });
});
