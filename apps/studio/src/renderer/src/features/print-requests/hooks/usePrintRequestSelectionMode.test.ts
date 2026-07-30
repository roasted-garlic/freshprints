import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { buildSelectionStateFromRequestItems } from "./usePrintRequestSelectionMode";

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
});
