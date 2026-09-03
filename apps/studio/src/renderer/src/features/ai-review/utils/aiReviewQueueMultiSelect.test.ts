import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyAiReviewMultiSelectRange,
  collectSuccessfulHardDeleteIds,
  emptyAiReviewMultiSelectState,
  isAiReviewQueueCardHighlighted,
  orderHardDeleteReconcileIds,
  resolveAiReviewHardDeleteTargets,
  resolveAiReviewQueueCardClick,
  seedAiReviewMultiSelectIds,
  toggleAiReviewMultiSelectId,
} from "./aiReviewQueueMultiSelect";

describe("aiReviewQueueMultiSelect", () => {
  it("toggles ids on and off without mutating the source list", () => {
    const original = ["a"];
    const added = toggleAiReviewMultiSelectId(original, "b");
    assert.deepEqual(added, ["a", "b"]);
    assert.deepEqual(original, ["a"]);
    assert.deepEqual(toggleAiReviewMultiSelectId(added, "a"), ["b"]);
  });

  it("seeds from the focused card and starts empty when none is focused", () => {
    assert.deepEqual(seedAiReviewMultiSelectIds("design-1"), ["design-1"]);
    assert.deepEqual(seedAiReviewMultiSelectIds(null), []);
  });

  it("highlights the focused card in single-select and the set in multi-select", () => {
    assert.equal(
      isAiReviewQueueCardHighlighted({
        designId: "a",
        isMultiSelectMode: false,
        multiSelectedIds: ["b"],
        selectedDesignId: "a",
      }),
      true,
    );
    assert.equal(
      isAiReviewQueueCardHighlighted({
        designId: "b",
        isMultiSelectMode: true,
        multiSelectedIds: ["b", "c"],
        selectedDesignId: "a",
      }),
      true,
    );
    assert.equal(
      isAiReviewQueueCardHighlighted({
        designId: "a",
        isMultiSelectMode: true,
        multiSelectedIds: ["b"],
        selectedDesignId: "a",
      }),
      false,
    );
  });

  it("routes clicks to toggle only while multi-select is on", () => {
    assert.equal(resolveAiReviewQueueCardClick({ isMultiSelectMode: true }), "toggle-multi");
    assert.equal(
      resolveAiReviewQueueCardClick({ isMultiSelectMode: true, shiftKey: true }),
      "range-multi",
    );
    assert.equal(resolveAiReviewQueueCardClick({ isMultiSelectMode: false }), "focus-single");
    assert.equal(
      resolveAiReviewQueueCardClick({ isMultiSelectMode: false, shiftKey: true }),
      "focus-single",
    );
  });

  it("fills an inclusive range from the anchor to the Shift-clicked card", () => {
    assert.deepEqual(
      applyAiReviewMultiSelectRange({
        anchorId: "a",
        listIds: ["a", "b", "c", "d", "e"],
        selectedIds: ["a"],
        targetId: "d",
      }),
      { selectedIds: ["a", "b", "c", "d"], anchorId: "a" },
    );
    assert.deepEqual(
      applyAiReviewMultiSelectRange({
        anchorId: "d",
        listIds: ["a", "b", "c", "d", "e"],
        selectedIds: ["d"],
        targetId: "b",
      }),
      { selectedIds: ["b", "c", "d"], anchorId: "d" },
    );
    assert.deepEqual(
      applyAiReviewMultiSelectRange({
        anchorId: "a",
        listIds: ["a", "b", "c", "d"],
        selectedIds: ["a", "d"],
        targetId: "b",
      }),
      { selectedIds: ["a", "b"], anchorId: "a" },
    );
  });

  it("clears mode and ids on cancel", () => {
    assert.deepEqual(emptyAiReviewMultiSelectState(), {
      isMultiSelectMode: false,
      multiSelectedIds: [],
    });
  });

  it("resolves hard-delete targets from the multi-select set or the focused card", () => {
    const designs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(
      resolveAiReviewHardDeleteTargets({
        designs,
        isMultiSelectMode: true,
        multiSelectedIds: ["c", "a"],
        selectedDesign: designs[1],
      }),
      [{ id: "a" }, { id: "c" }],
    );
    assert.deepEqual(
      resolveAiReviewHardDeleteTargets({
        designs,
        isMultiSelectMode: false,
        multiSelectedIds: ["a", "c"],
        selectedDesign: designs[1],
      }),
      [{ id: "b" }],
    );
  });

  it("reconciles successful deletes from the bottom of the list first", () => {
    assert.deepEqual(
      collectSuccessfulHardDeleteIds([
        { designId: "a", status: "deleted" },
        { designId: "b", status: "failed" },
        { designId: "c", status: "skipped_already_deleted" },
      ]),
      ["a", "c"],
    );
    assert.deepEqual(
      orderHardDeleteReconcileIds({
        deletedIds: ["a", "c"],
        listIds: ["a", "b", "c", "d"],
      }),
      ["c", "a"],
    );
  });
});
