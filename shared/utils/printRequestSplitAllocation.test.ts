import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applySplitSelectionToLineItems,
  calculateSplitSelectionTotal,
  clampSplitItemQuantity,
  formatSplitNeededWarning,
  getTotalRemainingQuantity,
  isSplitAllocationComplete,
  shouldShowRemainingWording,
  type SplitAllocationLineItem,
} from "./printRequestSplitAllocation";

function buildLineItems(): SplitAllocationLineItem[] {
  return [
    { printRequestItemId: "item-1", designTitle: "Design A", remainingQuantity: 150 },
    { printRequestItemId: "item-2", designTitle: "Design B", remainingQuantity: 54 },
  ];
}

test("applySplitSelectionToLineItems: reduces remaining quantity by the assigned amount", () => {
  const result = applySplitSelectionToLineItems(buildLineItems(), [{ printRequestItemId: "item-1", quantity: 150 }]);

  assert.equal(result.find((item) => item.printRequestItemId === "item-1")?.remainingQuantity, 0);
  assert.equal(result.find((item) => item.printRequestItemId === "item-2")?.remainingQuantity, 54);
});

test("applySplitSelectionToLineItems: 204 total splits 200/4 across two legs", () => {
  const lineItems = buildLineItems();
  assert.equal(getTotalRemainingQuantity(lineItems), 204);

  const afterFirstShow = applySplitSelectionToLineItems(lineItems, [
    { printRequestItemId: "item-1", quantity: 150 },
    { printRequestItemId: "item-2", quantity: 50 },
  ]);

  assert.equal(getTotalRemainingQuantity(afterFirstShow), 4);
  assert.equal(isSplitAllocationComplete(afterFirstShow), false);

  const afterSecondShow = applySplitSelectionToLineItems(afterFirstShow, [
    { printRequestItemId: "item-2", quantity: 4 },
  ]);

  assert.equal(getTotalRemainingQuantity(afterSecondShow), 0);
  assert.equal(isSplitAllocationComplete(afterSecondShow), true);
});

test("applySplitSelectionToLineItems: ignores non-positive or unknown selections", () => {
  const result = applySplitSelectionToLineItems(buildLineItems(), [
    { printRequestItemId: "item-1", quantity: 0 },
    { printRequestItemId: "unknown-item", quantity: 10 },
  ]);

  assert.deepEqual(result, buildLineItems());
});

test("applySplitSelectionToLineItems: never goes negative", () => {
  const result = applySplitSelectionToLineItems(buildLineItems(), [{ printRequestItemId: "item-1", quantity: 999 }]);

  assert.equal(result.find((item) => item.printRequestItemId === "item-1")?.remainingQuantity, 0);
});

test("shouldShowRemainingWording: false before any leg has been committed (full-fit case)", () => {
  assert.equal(shouldShowRemainingWording(0), false);
});

test("shouldShowRemainingWording: true once at least one leg has been committed (split in progress)", () => {
  assert.equal(shouldShowRemainingWording(1), true);
  assert.equal(shouldShowRemainingWording(2), true);
});

test("calculateSplitSelectionTotal: sums all quantities", () => {
  assert.equal(calculateSplitSelectionTotal({ "item-1": 20, "item-2": 5 }), 25);
});

test("calculateSplitSelectionTotal: ignores negative entries defensively", () => {
  assert.equal(calculateSplitSelectionTotal({ "item-1": 20, "item-2": -5 }), 20);
});

test("calculateSplitSelectionTotal: zero for an empty selection", () => {
  assert.equal(calculateSplitSelectionTotal({}), 0);
});

test("clampSplitItemQuantity: clamps to the item's remaining quantity", () => {
  assert.equal(clampSplitItemQuantity(999, 30), 30);
});

test("clampSplitItemQuantity: clamps negative input to zero", () => {
  assert.equal(clampSplitItemQuantity(-5, 30), 0);
});

test("clampSplitItemQuantity: floors fractional input", () => {
  assert.equal(clampSplitItemQuantity(12.7, 30), 12);
});

test("clampSplitItemQuantity: treats non-finite input as zero", () => {
  assert.equal(clampSplitItemQuantity(Number.NaN, 30), 0);
});

test("formatSplitNeededWarning: mentions both the split path and the pick-a-different-show path, without mentioning override", () => {
  const message = formatSplitNeededWarning({ fittingQuantity: 25, totalQuantity: 50 });

  assert.equal(
    message,
    "Only 25 of 50 prints can be added to this show. You can choose which prints to add here and place the rest on another show, or select a different show for the full request.",
  );
  assert.ok(!/override/i.test(message));
});

test("formatSplitNeededWarning: singular print wording", () => {
  const message = formatSplitNeededWarning({ fittingQuantity: 0, totalQuantity: 1 });
  assert.ok(message.startsWith("Only 0 of 1 print can be added"));
});
