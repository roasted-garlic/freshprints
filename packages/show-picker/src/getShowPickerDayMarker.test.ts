import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getShowPickerDayMarker } from "./getShowPickerDayMarker";

describe("getShowPickerDayMarker", () => {
  it("returns null when there are no options", () => {
    assert.equal(getShowPickerDayMarker([]), null);
  });

  it("returns open for an open show", () => {
    assert.equal(
      getShowPickerDayMarker([{ isFull: false, isOverCapacity: false, statusLabel: "OPEN" }]),
      "open",
    );
  });

  it("returns full for a full show", () => {
    assert.equal(
      getShowPickerDayMarker([{ isFull: true, isOverCapacity: false, statusLabel: "FULL" }]),
      "full",
    );
  });

  it("returns completed for fully printed / completed / closed shows", () => {
    assert.equal(
      getShowPickerDayMarker([{ isFull: false, isOverCapacity: false, statusLabel: "FULLY PRINTED" }]),
      "completed",
    );
    assert.equal(
      getShowPickerDayMarker([{ isFull: false, isOverCapacity: false, statusLabel: "COMPLETED" }]),
      "completed",
    );
    assert.equal(
      getShowPickerDayMarker([{ isFull: false, isOverCapacity: false, statusLabel: "CLOSED" }]),
      "completed",
    );
  });

  it("prefers open over full on mixed days", () => {
    assert.equal(
      getShowPickerDayMarker([
        { isFull: true, isOverCapacity: false, statusLabel: "FULL" },
        { isFull: false, isOverCapacity: false, statusLabel: "OPEN" },
      ]),
      "open",
    );
  });

  it("prefers full over completed when no open shows remain", () => {
    assert.equal(
      getShowPickerDayMarker([
        { isFull: true, isOverCapacity: false, statusLabel: "FULL" },
        { isFull: false, isOverCapacity: false, statusLabel: "COMPLETED" },
      ]),
      "full",
    );
  });
});
