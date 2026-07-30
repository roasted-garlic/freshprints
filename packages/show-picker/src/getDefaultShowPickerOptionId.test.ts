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
        { id: "a", isFull: false, canAllocate: true },
        { id: "b", isFull: false, canAllocate: true },
      ]),
      "a",
    );
  });

  it("skips a full soonest show for the next open show", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "full", isFull: true, canAllocate: true },
        { id: "open", isFull: false, canAllocate: true },
        { id: "later", isFull: false, canAllocate: true },
      ]),
      "open",
    );
  });

  it("falls back to the first option when every show is full", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "a", isFull: true, canAllocate: true },
        { id: "b", isFull: true, canAllocate: true },
      ]),
      "a",
    );
  });

  it("prefers the first option that can fit when a predicate is provided", () => {
    assert.equal(
      getDefaultShowPickerOptionId(
        [
          { id: "tight", isFull: false, canAllocate: true },
          { id: "fits", isFull: false, canAllocate: true },
          { id: "later", isFull: false, canAllocate: true },
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
          { id: "full", isFull: true, canAllocate: true },
          { id: "open", isFull: false, canAllocate: true },
        ],
        () => false,
      ),
      "open",
    );
  });

  it("skips non-selectable past shows", () => {
    assert.equal(
      getDefaultShowPickerOptionId([
        { id: "past", isFull: false, canAllocate: false },
        { id: "open", isFull: false, canAllocate: true },
      ]),
      "open",
    );
  });

  it("returns null when every option is non-selectable", () => {
    assert.equal(
      getDefaultShowPickerOptionId([{ id: "past", isFull: false, canAllocate: false }]),
      null,
    );
  });

  it("falls back to the first inspect-only option when allowed", () => {
    assert.equal(
      getDefaultShowPickerOptionId(
        [{ id: "past", isFull: false, canAllocate: false }],
        undefined,
        true,
      ),
      "past",
    );
  });
});
