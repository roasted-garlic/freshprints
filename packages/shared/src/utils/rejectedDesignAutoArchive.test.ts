import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isRejectedDesignEligibleForAutoArchive,
  REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS,
  resolveRejectedDesignClockMillis,
} from "./rejectedDesignAutoArchive";

describe("rejectedDesignAutoArchive", () => {
  const nowMs = Date.UTC(2026, 6, 14, 12, 0, 0);
  const eightDaysAgo = nowMs - (REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000;
  const oneDayAgo = nowMs - 1 * 24 * 60 * 60 * 1000;

  it("prefers aiReviewedAt over updatedAt", () => {
    assert.equal(
      resolveRejectedDesignClockMillis({
        aiReviewedAtMillis: 100,
        updatedAtMillis: 200,
      }),
      100,
    );
  });

  it("archives rejected designs older than 7 days", () => {
    assert.equal(
      isRejectedDesignEligibleForAutoArchive({
        status: "rejected",
        aiReviewedAtMillis: eightDaysAgo,
        nowMs,
      }),
      true,
    );
  });

  it("does not archive recent rejects or non-rejected", () => {
    assert.equal(
      isRejectedDesignEligibleForAutoArchive({
        status: "rejected",
        aiReviewedAtMillis: oneDayAgo,
        nowMs,
      }),
      false,
    );
    assert.equal(
      isRejectedDesignEligibleForAutoArchive({
        status: "ready",
        aiReviewedAtMillis: eightDaysAgo,
        nowMs,
      }),
      false,
    );
  });

  it("falls back to updatedAt when aiReviewedAt missing", () => {
    assert.equal(
      isRejectedDesignEligibleForAutoArchive({
        status: "rejected",
        updatedAtMillis: eightDaysAgo,
        nowMs,
      }),
      true,
    );
  });
});
