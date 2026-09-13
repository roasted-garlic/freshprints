import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStaffInboxAlertDeliveryDocId } from "../staffInbox/staffInboxAlertDelivery.types";
import { shouldIncrementDesignRequestCount } from "./printRequestItemSource";

describe("remediation r2 contracts", () => {
  it("upload duplicate identity does not increment design requestCount", () => {
    assert.equal(
      shouldIncrementDesignRequestCount({
        sourceType: "customer_upload",
        customerUploadId: "up1",
      }),
      false,
    );
  });

  it("catalog duplicate identity still increments design requestCount", () => {
    assert.equal(
      shouldIncrementDesignRequestCount({
        sourceType: "catalog_design",
        designId: "d1",
      }),
      true,
    );
  });

  it("builds stable team-wide sound delivery ids", () => {
    assert.equal(
      buildStaffInboxAlertDeliveryDocId("portal_queued:req1:show1"),
      "portal_queued_req1_show1",
    );
  });
});
