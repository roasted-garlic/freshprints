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
        { id: "a", isFull: false, isSelectable: true },
        { id: "b", isFull: false, isSelectable: true },
      ]),
      "a",
    );
  });

  it("skips a full soonest show for the next open show", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "full", isFull: true, isSelectable: true },
        { id: "open", isFull: false, isSelectable: true },
        { id: "later", isFull: false, isSelectable: true },
      ]),
      "open",
    );
  });

  it("falls back to the first option when every show is full", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "a", isFull: true, isSelectable: true },
        { id: "b", isFull: true, isSelectable: true },
      ]),
      "a",
    );
  });

  it("prefers the first option that can fit when a predicate is provided", () => {
    assert.equal(
      getDefaultShowPickerOptionId(
        [
          { id: "tight", isFull: false, isSelectable: true },
          { id: "fits", isFull: false, isSelectable: true },
          { id: "later", isFull: false, isSelectable: true },
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
          { id: "full", isFull: true, isSelectable: true },
          { id: "open", isFull: false, isSelectable: true },
        ],
        () => false,
      ),
      "open",
    );
  });

  it("skips non-selectable past shows", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "past", isFull: false, isSelectable: false },
        { id: "open", isFull: false, isSelectable: true },
      ]),
      "open",
    );
  });

  it("returns null when every option is non-selectable", () => {
    assert.equal(
      getDefaultShowPickerOptionId([{ id: "past", isFull: false, isSelectable: false }]),
      null,
    );
  });
});
