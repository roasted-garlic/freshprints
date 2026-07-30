import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import {
  getSplitPickerDesign,
  getSplitPickerItemTitle,
} from "./splitDesignPickerItemPresentation";

function item(overrides: Partial<PrintRequestItem> = {}): PrintRequestItem {
  return {
    id: "item-1",
    printRequestId: "request-1",
    quantity: 1,
    status: "pending",
    addedBy: "owner",
    createdAt: Timestamp.fromMillis(1),
    updatedAt: Timestamp.fromMillis(1),
    ...overrides,
  };
}

describe("split picker item presentation", () => {
  it("does not look up or fabricate a design id for upload-backed items", () => {
    const lookups = new Map();
    const upload = item({
      sourceType: "customer_upload",
      customerUploadId: "upload-1",
      titleSnapshot: "Customer artwork",
    });

    assert.equal(getSplitPickerDesign(upload, lookups), undefined);
    assert.equal(getSplitPickerItemTitle(upload, lookups), "Customer artwork");
    assert.equal(lookups.size, 0);
  });
});
