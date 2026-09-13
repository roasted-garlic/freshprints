import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS,
  CUSTOMER_UPLOAD_STAFF_EXCLUDED_RETENTION_DAYS,
  isCustomerUploadCatalogRetentionEpisodeDue,
  resolveCustomerUploadCatalogRetentionDays,
  resolveCustomerUploadCatalogRetentionQueryCutoffDays,
} from "./customerUploadCatalogRetention";

describe("customerUploadCatalogRetention", () => {
  it("uses 30 days for permission-denied personal bucket, unpromoted donations, and 14 for staff Excluded", () => {
    assert.equal(
      resolveCustomerUploadCatalogRetentionDays("customer_permission_denied"),
      CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS,
    );
    assert.equal(
      resolveCustomerUploadCatalogRetentionDays("unpromoted_donation"),
      CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS,
    );
    assert.equal(
      resolveCustomerUploadCatalogRetentionDays("staff_review"),
      CUSTOMER_UPLOAD_STAFF_EXCLUDED_RETENTION_DAYS,
    );
    assert.equal(resolveCustomerUploadCatalogRetentionDays("other"), null);
    assert.equal(
      resolveCustomerUploadCatalogRetentionQueryCutoffDays(),
      CUSTOMER_UPLOAD_STAFF_EXCLUDED_RETENTION_DAYS,
    );
  });

  it("applies per-reason due checks under B1 retention clocks", () => {
    const nowMs = Date.parse("2026-09-11T12:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    assert.equal(
      isCustomerUploadCatalogRetentionEpisodeDue({
        catalogExclusionReason: "staff_review",
        catalogRetentionStartedAtMs: nowMs - 14 * day,
        nowMs,
      }),
      true,
    );
    assert.equal(
      isCustomerUploadCatalogRetentionEpisodeDue({
        catalogExclusionReason: "customer_permission_denied",
        catalogRetentionStartedAtMs: nowMs - 14 * day,
        nowMs,
      }),
      false,
    );
    assert.equal(
      isCustomerUploadCatalogRetentionEpisodeDue({
        catalogExclusionReason: "customer_permission_denied",
        catalogRetentionStartedAtMs: nowMs - 30 * day,
        nowMs,
      }),
      true,
    );
    assert.equal(
      isCustomerUploadCatalogRetentionEpisodeDue({
        catalogExclusionReason: "unpromoted_donation",
        catalogRetentionStartedAtMs: nowMs - 30 * day,
        nowMs,
      }),
      true,
    );
  });
});
