import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCustomerUploadDailyQuota } from "./formatCustomerUploadDailyQuota";

describe("formatCustomerUploadDailyQuota", () => {
  it("formats donation images/day only with midnight CST reset", () => {
    const text = formatCustomerUploadDailyQuota({
      purpose: "catalog_donation",
      utcDay: "2026-07-18",
      uploadStarts: { used: 3, limit: 400, remaining: 397 },
      images: { used: 10, limit: 1000, remaining: 990 },
      zips: { used: 0, limit: 40, remaining: 40 },
      maxSingleImageBytes: 80 * 1024 * 1024,
      maxZipBytes: 2 * 1024 * 1024 * 1024,
      maxConcurrentFinalize: 8,
    });
    assert.equal(text, "990 of 1000 donated images left today (resets at midnight CST).");
    assert.equal(text.includes("upload start"), false);
    assert.equal(text.includes("ZIP"), false);
    assert.equal(text.includes("session"), false);
    assert.equal(text.includes("UTC"), false);
    assert.equal(text.includes("—"), false);
    assert.equal(text.includes("–"), false);
  });

  it("singularizes when one image remaining", () => {
    const text = formatCustomerUploadDailyQuota({
      purpose: "catalog_donation",
      utcDay: "2026-07-18",
      uploadStarts: { used: 399, limit: 400, remaining: 1 },
      images: { used: 999, limit: 1000, remaining: 1 },
      zips: { used: 39, limit: 40, remaining: 1 },
      maxSingleImageBytes: 80 * 1024 * 1024,
      maxZipBytes: 2 * 1024 * 1024 * 1024,
      maxConcurrentFinalize: 8,
    });
    assert.equal(text, "1 of 1000 donated image left today (resets at midnight CST).");
  });
});
