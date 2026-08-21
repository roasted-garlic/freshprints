import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { buildDesignSelectionSavePayload, buildSelectionStateFromRequestItems, planPrintRequestDesignSelectionWrites } from "../utils/planPrintRequestDesignSelectionWrites";

function item(overrides: Partial<PrintRequestItem>): PrintRequestItem {
  return {
    id: "item",
    printRequestId: "request",
    quantity: 1,
    status: "pending",
    addedBy: "owner",
    createdAt: Timestamp.fromMillis(1),
    updatedAt: Timestamp.fromMillis(1),
    ...overrides,
  };
}

describe("print request catalog selection state", () => {
  it("includes valid catalog items and leaves upload-backed items out of the catalog selection map", () => {
    const state = buildSelectionStateFromRequestItems([
      item({ id: "catalog", designId: "design-1" }),
      item({
        id: "upload",
        sourceType: "customer_upload",
        customerUploadId: "upload-1",
        designId: undefined,
      }),
    ]);

    assert.deepEqual(state, {
      "design-1": {
        quantity: 1,
        existingItemId: "catalog",
        isExisting: true,
      },
    });
  });

  it("keeps the last request item id when two catalog items share a designId", () => {
    const state = buildSelectionStateFromRequestItems([
      item({ id: "first", designId: "design-a", quantity: 1 }),
      item({ id: "second", designId: "design-a", quantity: 2 }),
    ]);

    assert.deepEqual(state, {
      "design-a": {
        quantity: 2,
        existingItemId: "second",
        isExisting: true,
      },
    });
  });

  it("passes existing item ids through to the save payload", () => {
    const payload = buildDesignSelectionSavePayload({
      "design-a": {
        quantity: 1,
        existingItemId: "item-a",
        isExisting: true,
      },
      "design-b": {
        quantity: 1,
        isExisting: false,
      },
    });

    assert.deepEqual(payload, [
      { designId: "design-a", quantity: 1, existingItemId: "item-a" },
      { designId: "design-b", quantity: 1, existingItemId: undefined },
    ]);
  });

  it("does not reconstruct a customer-upload item when adding a catalog design", () => {
    const state = buildSelectionStateFromRequestItems([
      item({
        id: "upload",
        sourceType: "customer_upload",
        customerUploadId: "upload-1",
        designId: undefined,
      }),
      item({ id: "catalog-a", designId: "design-a", quantity: 1 }),
    ]);
    const payload = buildDesignSelectionSavePayload({
      ...state,
      "design-b": {
        quantity: 1,
      },
    });
    const writes = planPrintRequestDesignSelectionWrites(payload, [
      { id: "upload", quantity: 1 },
      { id: "catalog-a", quantity: 1 },
    ]);

    assert.equal(Object.keys(state).includes("upload-1"), false);
    assert.deepEqual(writes, [{ kind: "create", designId: "design-b", quantity: 1 }]);
  });
});
