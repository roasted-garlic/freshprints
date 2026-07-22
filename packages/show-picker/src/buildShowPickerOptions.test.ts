import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildShowPickerOptions } from "./buildShowPickerOptions";

describe("buildShowPickerOptions", () => {
  it("labels past shows CLOSED and keeps them non-queueable", () => {
    const [option] = buildShowPickerOptions({
      shows: [
        {
          id: "past-show",
          scheduledAt: new Date("2026-07-20T20:00:00"),
          productionStatus: "open",
          maxTotalQuantity: 200,
          allocatedQuantity: 175,
        },
      ],
      isPastScheduled: () => true,
      isPastQueueCutoff: () => false,
    });

    assert.equal(option?.statusLabel, "CLOSED");
    assert.equal(option?.isSelectable, false);
    assert.match(option?.capacityLabel ?? "", /spots left|of 200 taken|Full/i);
  });

  it("labels cutoff-locked upcoming shows CLOSED", () => {
    const [option] = buildShowPickerOptions({
      shows: [
        {
          id: "cutoff-show",
          scheduledAt: new Date("2026-07-22T20:00:00"),
          productionStatus: "open",
          maxTotalQuantity: 200,
          allocatedQuantity: 0,
        },
      ],
      isPastScheduled: () => false,
      isPastQueueCutoff: () => true,
    });

    assert.equal(option?.statusLabel, "CLOSED");
    assert.equal(option?.isSelectable, false);
  });

  it("keeps open upcoming shows OPEN and selectable", () => {
    const [option] = buildShowPickerOptions({
      shows: [
        {
          id: "open-show",
          scheduledAt: new Date("2026-07-23T20:00:00"),
          productionStatus: "open",
          maxTotalQuantity: 200,
          allocatedQuantity: 0,
        },
      ],
      isPastScheduled: () => false,
      isPastQueueCutoff: () => false,
    });

    assert.equal(option?.statusLabel, "OPEN");
    assert.equal(option?.isSelectable, true);
  });
});
