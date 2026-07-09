import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStaffInboxAlertToastCopy } from "./staffInboxAlertToastCopy";

describe("buildStaffInboxAlertToastCopy", () => {
  it("formats queued alerts with a short title and request name", () => {
    assert.deepEqual(buildStaffInboxAlertToastCopy("portal_queued", "roasted_garlic-CR001"), {
      title: "Print request queued",
      message: "roasted_garlic-CR001",
    });
  });

  it("formats full alerts with a short title and show name", () => {
    assert.deepEqual(buildStaffInboxAlertToastCopy("show_queue_full", "Friday Night Live"), {
      title: "Show queue full",
      message: "Friday Night Live",
    });
  });
});
