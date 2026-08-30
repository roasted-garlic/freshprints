import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPrintRequestRequeueBadgeLabel,
  getPrintRequestRequeueBadgeTitle,
  shouldShowPrintRequestRequeueBadge,
} from "./printRequestRequeueBadge";

describe("printRequestRequeueBadge", () => {
  it("shows badge when needsStaffRequeueAt is present", () => {
    assert.equal(
      shouldShowPrintRequestRequeueBadge({ needsStaffRequeueAt: { toMillis: () => 1 } as never }),
      true,
    );
    assert.equal(shouldShowPrintRequestRequeueBadge({ needsStaffRequeueAt: undefined }), false);
  });

  it("uses NEEDS RE-QUEUE label with source show context", () => {
    assert.equal(getPrintRequestRequeueBadgeLabel(), "NEEDS RE-QUEUE");
    assert.equal(
      getPrintRequestRequeueBadgeTitle({
        needsStaffRequeueAt: { toMillis: () => 1 } as never,
        needsStaffRequeueSourceShowTitleSnapshot: "Friday Live",
        needsStaffRequeueReleasedQuantity: 3,
      }),
      "Released from Friday Live — 3 prints need staff re-queue",
    );
  });
});
