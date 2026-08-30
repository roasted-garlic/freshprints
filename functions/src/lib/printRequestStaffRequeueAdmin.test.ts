import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearNeedsStaffRequeueAdminPatch } from "./printRequestStaffRequeueAdmin";

describe("clearNeedsStaffRequeueAdminPatch", () => {
  it("deletes every Needs Re-queue marker field without undefined values", () => {
    const patch = clearNeedsStaffRequeueAdminPatch();

    assert.deepEqual(Object.keys(patch).sort(), [
      "needsStaffRequeueAt",
      "needsStaffRequeueReleasedQuantity",
      "needsStaffRequeueSourceShowId",
      "needsStaffRequeueSourceShowTitleSnapshot",
    ]);

    for (const value of Object.values(patch)) {
      assert.notEqual(value, undefined);
    }
  });
});
