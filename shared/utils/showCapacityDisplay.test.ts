import assert from "node:assert/strict";
import { test } from "node:test";

import { assessShowCapacity } from "./showCapacity";
import {
  formatCapacityUsedLabel,
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

test("getDerivedShowStatusDisplay: printing beats full capacity", () => {
  const capacity = assessShowCapacity({ maxTotalQuantity: 200, allocatedQuantity: 200 });
  const display = getDerivedShowStatusDisplay("printing", capacity);
  assert.deepEqual(display, { label: "PRINTING", variant: "info" });
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
