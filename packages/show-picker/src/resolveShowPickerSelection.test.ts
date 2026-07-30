import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canActivateShowPickerOption, resolveShowPickerSelection } from "./resolveShowPickerSelection";
import type { ShowPickerOption } from "./types";

function option(id: string, canAllocate: boolean, canInspect = true): ShowPickerOption {
  return {
    id,
    scheduledAt: new Date("2026-07-30T20:00:00"),
    timeLabel: "8:00 PM",
    capacityPercent: 25,
    capacityLabel: "25 of 100 taken",
    fillLevel: "low",
    statusLabel: canAllocate ? "OPEN" : "COMPLETED",
    statusVariant: canAllocate ? "success" : "default",
    isFull: false,
    isOverCapacity: false,
    canInspect,
    canAllocate,
  };
}

describe("ShowPicker production selection boundary", () => {
  it("clears destination for a historical-only inspected date and auto-inspects the single show (Plan Section 29.6)", () => {
    assert.deepEqual(resolveShowPickerSelection([option("historical", false)]), {
      destinationId: null,
      shouldClearDestination: true,
      autoInspectId: "historical",
    });
  });

  it("defaults a mixed date to the eligible destination, never the historical row, and does not auto-inspect", () => {
    assert.deepEqual(resolveShowPickerSelection([
      option("historical", false),
      option("eligible", true),
    ]), {
      destinationId: "eligible",
      shouldClearDestination: false,
      autoInspectId: null,
    });
  });

  it("does not guess among multiple non-allocatable shows on the same date", () => {
    const result = resolveShowPickerSelection([
      option("historical-a", false),
      option("historical-b", false),
    ]);
    assert.equal(result.destinationId, null);
    assert.equal(result.autoInspectId, null, "must never auto-inspect when more than one show exists");
  });

  it("does not auto-inspect when the single non-allocatable show is also not inspectable", () => {
    const result = resolveShowPickerSelection([option("invalid", false, false)]);
    assert.equal(result.autoInspectId, null);
  });

  it("allows inspection activation while allocation remains separate", () => {
    assert.equal(canActivateShowPickerOption(option("historical", false)), true);
    assert.equal(option("historical", false).canAllocate, false);
    assert.equal(canActivateShowPickerOption(option("eligible", true)), true);
  });
});
