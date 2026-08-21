import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planPrintRequestDesignSelectionWrites } from "./planPrintRequestDesignSelectionWrites";

describe("planPrintRequestDesignSelectionWrites", () => {
  it("does not recreate a resized existing item when adding an unrelated design", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1, existingItemId: "item-a" },
        { designId: "design-b", quantity: 1 },
      ],
      [{ id: "item-a", quantity: 1 }],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);
  });

  it("keeps two resized existing designs and creates only the newly selected designs", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1, existingItemId: "item-a" },
        { designId: "design-b", quantity: 1, existingItemId: "item-b" },
        { designId: "design-c", quantity: 1 },
        { designId: "design-d", quantity: 1 },
      ],
      [
        { id: "item-a", quantity: 1 },
        { id: "item-b", quantity: 1 },
      ],
    );

    assert.deepEqual(writes, [
      { kind: "create", designId: "design-c", quantity: 1 },
      { kind: "create", designId: "design-d", quantity: 1 },
    ]);
  });

  it("does not recreate an existing default-size item when adding another design", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1, existingItemId: "item-a" },
        { designId: "design-b", quantity: 1 },
      ],
      [{ id: "item-a", quantity: 1 }],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);
  });

  it("writes nothing when every existing selection is unchanged", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 2, existingItemId: "item-a" },
        { designId: "design-b", quantity: 1, existingItemId: "item-b" },
      ],
      [
        { id: "item-a", quantity: 2 },
        { id: "item-b", quantity: 1 },
      ],
    );

    assert.deepEqual(writes, []);
  });

  it("does not accumulate another copy of an existing custom-size item on a later add", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1, existingItemId: "item-a" },
        { designId: "design-c", quantity: 1 },
      ],
      [{ id: "item-a", quantity: 1 }],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-c", quantity: 1 }]);
  });

  it("does not create a third copy when two intentional same-design items already exist", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1, existingItemId: "item-a-duplicate" },
        { designId: "design-b", quantity: 1 },
      ],
      [
        { id: "item-a", quantity: 1 },
        { id: "item-a-duplicate", quantity: 1 },
      ],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);
  });

  it("updates existing quantity by item id and creates the new design at its requested quantity", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 3, existingItemId: "item-a" },
        { designId: "design-b", quantity: 1 },
      ],
      [{ id: "item-a", quantity: 3 }],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);

    const quantityChanged = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 4, existingItemId: "item-a" },
        { designId: "design-b", quantity: 1 },
      ],
      [{ id: "item-a", quantity: 3 }],
    );

    assert.deepEqual(quantityChanged, [
      { kind: "update_quantity", itemId: "item-a", quantity: 4 },
      { kind: "create", designId: "design-b", quantity: 1 },
    ]);
  });

  it("does not resurrect a removed item when saving a newly selected design", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [{ designId: "design-b", quantity: 1 }],
      [{ id: "item-remaining", quantity: 1 }],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);
    assert.equal(
      writes.some((write) => write.kind === "create" && write.designId === "design-a"),
      false,
    );
  });

  it("skips a stale existingItemId instead of recreating at default size", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1, existingItemId: "removed-item" },
        { designId: "design-b", quantity: 1 },
      ],
      [{ id: "item-remaining", quantity: 1 }],
    );

    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);
  });

  it("does not treat matching designId as uniqueness and can plan two new items of the same design", () => {
    const writes = planPrintRequestDesignSelectionWrites(
      [
        { designId: "design-a", quantity: 1 },
        { designId: "design-a", quantity: 2 },
      ],
      [],
    );

    assert.deepEqual(writes, [
      { kind: "create", designId: "design-a", quantity: 1 },
      { kind: "create", designId: "design-a", quantity: 2 },
    ]);
  });
});
