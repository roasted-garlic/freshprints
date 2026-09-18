import assert from "node:assert/strict";
import test from "node:test";

import { resolveIntakeSelectionAfterRemoval } from "./customerUploadIntakeSelection.ts";

test("removing a mid-list selected card selects the card above", () => {
  assert.equal(
    resolveIntakeSelectionAfterRemoval({
      selectedId: "c",
      removedId: "c",
      rowIdsBeforeRemoval: ["a", "b", "c", "d"],
    }),
    "b",
  );
});

test("removing the top selected card selects the former next card", () => {
  assert.equal(
    resolveIntakeSelectionAfterRemoval({
      selectedId: "a",
      removedId: "a",
      rowIdsBeforeRemoval: ["a", "b", "c"],
    }),
    "b",
  );
});

test("removing the only card clears selection", () => {
  assert.equal(
    resolveIntakeSelectionAfterRemoval({
      selectedId: "a",
      removedId: "a",
      rowIdsBeforeRemoval: ["a"],
    }),
    null,
  );
});

test("removing a non-selected card leaves selection unchanged", () => {
  assert.equal(
    resolveIntakeSelectionAfterRemoval({
      selectedId: "b",
      removedId: "c",
      rowIdsBeforeRemoval: ["a", "b", "c"],
    }),
    "b",
  );
});
