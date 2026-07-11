import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStaffInboxAckDocId } from "./staffInboxAck.types";

describe("buildStaffInboxAckDocId", () => {
  it("encodes colons in item ids for a stable document id", () => {
    assert.equal(
      buildStaffInboxAckDocId("uid-1", "portal_queued:req-1:show-1"),
      "uid-1__portal_queued_req-1_show-1",
    );
    assert.equal(
      buildStaffInboxAckDocId("uid-1", "show_queue_full:show-1"),
      "uid-1__show_queue_full_show-1",
    );
  });
});
