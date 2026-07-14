import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluatePromotedDonationFullSizeRetention,
  PROMOTED_DONATION_FULL_SIZE_COOL_OFF_DAYS,
} from "./promotedDonationFullSizeRetention";

describe("evaluatePromotedDonationFullSizeRetention", () => {
  const nowMs = Date.UTC(2026, 6, 14, 12, 0, 0);
  const cooled = nowMs - (PROMOTED_DONATION_FULL_SIZE_COOL_OFF_DAYS + 1) * 24 * 60 * 60 * 1000;

  it("purges cooled promoted donations", () => {
    const result = evaluatePromotedDonationFullSizeRetention({
      purpose: "catalog_donation",
      catalogReviewStatus: "sent_to_ai_review",
      promotedDesignId: "design_1",
      promotedAtMillis: cooled,
      nowMs,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "eligible");
  });

  it("blocks recent promotes and non-donations", () => {
    assert.equal(
      evaluatePromotedDonationFullSizeRetention({
        purpose: "catalog_donation",
        catalogReviewStatus: "sent_to_ai_review",
        promotedDesignId: "design_1",
        promotedAtMillis: nowMs,
        nowMs,
      }).eligible,
      false,
    );
    assert.equal(
      evaluatePromotedDonationFullSizeRetention({
        purpose: "print_request",
        catalogReviewStatus: "sent_to_ai_review",
        promotedDesignId: "design_1",
        promotedAtMillis: cooled,
        nowMs,
      }).reason,
      "not_donation",
    );
  });
});
