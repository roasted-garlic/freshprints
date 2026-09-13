import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStaffInboxAckDocId } from "./staffInboxAck.types";

describe("buildStaffInboxAckDocId", () => {
  it("encodes colons in item ids for a stable shared document id", () => {
    assert.equal(buildStaffInboxAckDocId("portal_queued:req-1:show-1"), "portal_queued_req-1_show-1");
    assert.equal(buildStaffInboxAckDocId("show_queue_full:show-1"), "show_queue_full_show-1");
  });
});
