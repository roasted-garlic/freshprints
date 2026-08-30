import assert from "node:assert/strict";
import { test } from "node:test";

import { assessShowCapacity } from "./showCapacity";
import {
  formatCapacityUsedLabel,
  formatShowCapacitySlotLabel,
  formatShowCapacitySlotLabelCompact,
  formatSpotsRemainingLabel,
  getCapacityFillLevel,
  getDerivedShowStatusDisplay,
  getShowCapacityPercent,
} from "./showCapacityDisplay";

test("getCapacityFillLevel: low under 70 percent", () => {
  assert.equal(getCapacityFillLevel(0), "low");
  assert.equal(getCapacityFillLevel(69.9), "low");
});

test("getCapacityFillLevel: medium from 70 to 89 percent", () => {
  assert.equal(getCapacityFillLevel(70), "medium");
  assert.equal(getCapacityFillLevel(89.9), "medium");
});

test("getCapacityFillLevel: high from 90 to 99 percent", () => {
  assert.equal(getCapacityFillLevel(90), "high");
  assert.equal(getCapacityFillLevel(99.9), "high");
});

test("getCapacityFillLevel: critical at 100 percent or more", () => {
  assert.equal(getCapacityFillLevel(100), "critical");
  assert.equal(getCapacityFillLevel(150), "critical");
});

test("getCapacityFillLevel: undefined when percent is undefined (no cap)", () => {
  assert.equal(getCapacityFillLevel(undefined), undefined);
});

test("getShowCapacityPercent: computes percent used", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 150 });
  assert.equal(getShowCapacityPercent(capacity), 75);
});

test("getShowCapacityPercent: undefined when there is no cap", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 150 });
  assert.equal(getShowCapacityPercent(capacity), undefined);
});

test("getShowCapacityPercent: can exceed 100 for over-capacity shows", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 214 });
  assert.equal(getShowCapacityPercent(capacity), 107);
});

test("formatCapacityUsedLabel: N of M used", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 175 });
  assert.equal(formatCapacityUsedLabel(capacity), "175 of 200 used");
});

test("formatCapacityUsedLabel: no max set when uncapped", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 40 });
  assert.equal(formatCapacityUsedLabel(capacity), "No max set");
});

test("formatSpotsRemainingLabel: spots left when under capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 175 });
  assert.equal(formatSpotsRemainingLabel(capacity), "25 spots left");
});

test("formatSpotsRemainingLabel: singular spot left", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 199 });
  assert.equal(formatSpotsRemainingLabel(capacity), "1 spot left");
});

test("formatSpotsRemainingLabel: Full at exact capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  assert.equal(formatSpotsRemainingLabel(capacity), "Full");
});

test("formatSpotsRemainingLabel: N over max when over capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 214 });
  assert.equal(formatSpotsRemainingLabel(capacity), "14 over max");
});

test("formatSpotsRemainingLabel: No limit when uncapped", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 40 });
  assert.equal(formatSpotsRemainingLabel(capacity), "No limit");
});

test("formatShowCapacitySlotLabel: empty show leads with spots left then taken of total", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 0 });
  assert.equal(formatShowCapacitySlotLabel(capacity), "200 spots left · 0 of 200 taken");
});

test("formatShowCapacitySlotLabel: partial fill", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 175 });
  assert.equal(formatShowCapacitySlotLabel(capacity), "25 spots left · 175 of 200 taken");
});

test("formatShowCapacitySlotLabel: singular spot left", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 199 });
  assert.equal(formatShowCapacitySlotLabel(capacity), "1 spot left · 199 of 200 taken");
});

test("formatShowCapacitySlotLabel: full show", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  assert.equal(formatShowCapacitySlotLabel(capacity), "Full · 200 of 200 taken");
});

test("formatShowCapacitySlotLabel: over max", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 214 });
  assert.equal(formatShowCapacitySlotLabel(capacity), "14 over max · 214 of 200 taken");
});

test("formatShowCapacitySlotLabel: uncapped with allocation", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 40 });
  assert.equal(formatShowCapacitySlotLabel(capacity), "40 taken · No limit");
});

test("formatShowCapacitySlotLabelCompact: empty show", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 0 });
  assert.equal(formatShowCapacitySlotLabelCompact(capacity), "200 left · 0/200");
});

test("formatShowCapacitySlotLabelCompact: partial fill", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 175 });
  assert.equal(formatShowCapacitySlotLabelCompact(capacity), "25 left · 175/200");
});

test("formatShowCapacitySlotLabelCompact: full and over", () => {
  assert.equal(
    formatShowCapacitySlotLabelCompact(
      assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 }),
    ),
    "Full · 200/200",
  );
  assert.equal(
    formatShowCapacitySlotLabelCompact(
      assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 214 }),
    ),
    "14 over · 214/200",
  );
});

test("formatShowCapacitySlotLabelCompact: uncapped", () => {
  assert.equal(
    formatShowCapacitySlotLabelCompact(
      assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 0 }),
    ),
    "No limit",
  );
  assert.equal(
    formatShowCapacitySlotLabelCompact(
      assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 40 }),
    ),
    "40 taken",
  );
});

test("getDerivedShowStatusDisplay: printing beats full capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  const display = getDerivedShowStatusDisplay("printing", capacity);
  assert.deepEqual(display, { label: "PRINTING", variant: "info" });
});

test("getDerivedShowStatusDisplay: completed with empty_closure shows EMPTY", () => {
  const capacity = { allocatedQuantity: 0, isFull: false, isOverCapacity: false, remainingQuantity: 200, maxTotalQuantity: 200 };
  const display = getDerivedShowStatusDisplay("completed", capacity, {
    productionResolutionKind: "empty_closure",
  });
  assert.equal(display.label, "EMPTY");
});

test("getDerivedShowStatusDisplay: completed with zero allocations and no resolution shows EMPTY", () => {
  const capacity = { allocatedQuantity: 0, isFull: false, isOverCapacity: false, remainingQuantity: 200, maxTotalQuantity: 200 };
  const display = getDerivedShowStatusDisplay("completed", capacity);
  assert.equal(display.label, "EMPTY");
});

test("getDerivedShowStatusDisplay: past scheduled with zero allocations shows EMPTY", () => {
  const capacity = { allocatedQuantity: 0, isFull: false, isOverCapacity: false, remainingQuantity: 200, maxTotalQuantity: 200 };
  const display = getDerivedShowStatusDisplay("open", capacity, { isPastScheduled: true });
  assert.equal(display.label, "EMPTY");
});

test("getDerivedShowStatusDisplay: completed with unfulfilled_release shows DID NOT PRINT", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 0 });
  const display = getDerivedShowStatusDisplay("completed", capacity, {
    productionResolutionKind: "unfulfilled_release",
  });
  assert.deepEqual(display, { label: "DID NOT PRINT", variant: "warning" });
});

test("getDerivedShowStatusDisplay: completed beats full capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  const display = getDerivedShowStatusDisplay("completed", capacity);
  assert.deepEqual(display, { label: "COMPLETED", variant: "success" });
});

test("getDerivedShowStatusDisplay: fully_printed beats full capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  const display = getDerivedShowStatusDisplay("fully_printed", capacity);
  assert.deepEqual(display, { label: "FULLY PRINTED", variant: "success" });
});

test("getDerivedShowStatusDisplay: archived and canceled beat open/full capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 50 });
  assert.deepEqual(getDerivedShowStatusDisplay("archived", capacity), { label: "ARCHIVED", variant: "default" });
  assert.deepEqual(getDerivedShowStatusDisplay("canceled", capacity), { label: "CANCELED", variant: "danger" });
});

test("getDerivedShowStatusDisplay: derives FULL from capacity when productionStatus is open", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  const display = getDerivedShowStatusDisplay("open", capacity);
  assert.deepEqual(display, { label: "FULL", variant: "warning" });
});

test("getDerivedShowStatusDisplay: derives OVER MAX from capacity when productionStatus is open", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 214 });
  const display = getDerivedShowStatusDisplay("open", capacity);
  assert.deepEqual(display, { label: "OVER MAX", variant: "danger" });
});

test("getDerivedShowStatusDisplay: OPEN when capacity has room", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 50 });
  const display = getDerivedShowStatusDisplay("open", capacity);
  assert.deepEqual(display, { label: "OPEN", variant: "default" });
});

test("getDerivedShowStatusDisplay: OPEN when uncapped regardless of allocation", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: undefined, allocatedQuantity: 5000 });
  const display = getDerivedShowStatusDisplay("open", capacity);
  assert.deepEqual(display, { label: "OPEN", variant: "default" });
});

test("getDerivedShowStatusDisplay: PAST when past scheduled and production is open", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 50 });
  const display = getDerivedShowStatusDisplay("open", capacity, { isPastScheduled: true });
  assert.deepEqual(display, { label: "PAST", variant: "default" });
});

test("getDerivedShowStatusDisplay: PAST when past scheduled even when full", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  const display = getDerivedShowStatusDisplay("open", capacity, { isPastScheduled: true });
  assert.deepEqual(display, { label: "PAST", variant: "default" });
});

test("getDerivedShowStatusDisplay: PAST when past scheduled even when over max", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 214 });
  const display = getDerivedShowStatusDisplay("open", capacity, { isPastScheduled: true });
  assert.deepEqual(display, { label: "PAST", variant: "default" });
});

test("getDerivedShowStatusDisplay: printing still shown when past scheduled", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 50 });
  const display = getDerivedShowStatusDisplay("printing", capacity, { isPastScheduled: true });
  assert.deepEqual(display, { label: "PRINTING", variant: "info" });
});
