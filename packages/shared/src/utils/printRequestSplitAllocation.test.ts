import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applySplitSelectionToLineItems,
  buildFillUpSplitQuantities,
  calculateSplitSelectionTotal,
  clampSplitItemQuantity,
  formatSplitNeededWarning,
  getTotalRemainingQuantity,
  isSplitAllocationComplete,
  shouldShowRemainingWording,
  toPositiveSplitSelections,
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

test("Cap B 25+25: fill-up queues 25 of design A only; B remains for another show", () => {
  const entries = [
    { itemId: "design-a", remainingQuantity: 25 },
    { itemId: "design-b", remainingQuantity: 25 },
  ];
  const filled = buildFillUpSplitQuantities(entries, 25);
  assert.deepEqual(filled, { "design-a": 25, "design-b": 0 });

  const selections = toPositiveSplitSelections(filled);
  assert.deepEqual(selections, [{ printRequestItemId: "design-a", quantity: 25 }]);
  assert.equal(calculateSplitSelectionTotal(filled), 25);

  const afterQueue = applySplitSelectionToLineItems(
    [
      { printRequestItemId: "design-a", designTitle: "Design A", remainingQuantity: 25 },
      { printRequestItemId: "design-b", designTitle: "Design B", remainingQuantity: 25 },
    ],
    selections,
  );
  assert.equal(getTotalRemainingQuantity(afterQueue), 25);
  assert.equal(afterQueue.find((row) => row.printRequestItemId === "design-a")?.remainingQuantity, 0);
  assert.equal(afterQueue.find((row) => row.printRequestItemId === "design-b")?.remainingQuantity, 25);
  assert.equal(isSplitAllocationComplete(afterQueue), false);
});

test("toPositiveSplitSelections: drops zero quantities", () => {
  assert.deepEqual(toPositiveSplitSelections({ a: 10, b: 0, c: 5 }), [
    { printRequestItemId: "a", quantity: 10 },
    { printRequestItemId: "c", quantity: 5 },
  ]);
});
