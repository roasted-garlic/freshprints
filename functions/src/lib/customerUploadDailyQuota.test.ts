import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import { CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST } from "../../../packages/shared/src/constants/customerUpload/customerUploadGuest.constants";

import { quotaExhaustedMessage, resolveDailyQuotaTarget, shouldChargeDailyQuota } from "./customerUploadDailyQuota";

describe("resolveDailyQuotaTarget", () => {
  it("keeps legacy print-request field names and code-default limits", () => {
    assert.deepEqual(resolveDailyQuotaTarget("createBatch", "print_request"), {
      field: "createBatchCount",
      limit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
    });
    assert.deepEqual(resolveDailyQuotaTarget("finalizeImage", "print_request"), {
      field: "finalizeImageCount",
      limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
    });
    assert.deepEqual(resolveDailyQuotaTarget("finalizeZip", "print_request"), {
      field: "finalizeZipCount",
      limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
    });
  });

  it("uses separate donation fields and higher code-default limits", () => {
    assert.deepEqual(resolveDailyQuotaTarget("createBatch", "catalog_donation"), {
      field: "createBatchCountDonation",
      limit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
    });
    assert.deepEqual(resolveDailyQuotaTarget("finalizeImage", "catalog_donation"), {
      field: "finalizeImageCountDonation",
      limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
    });
    assert.deepEqual(resolveDailyQuotaTarget("finalizeZip", "catalog_donation"), {
      field: "finalizeZipCountDonation",
      limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
    });
  });

  it("applies Studio Settings overrides when provided", () => {
    assert.deepEqual(
      resolveDailyQuotaTarget("finalizeImage", "print_request", {
        printRequestCreateBatchLimit: 1,
        printRequestFinalizeImageLimit: 3,
        printRequestFinalizeZipLimit: 1,
        donationCreateBatchLimit: 9,
        donationFinalizeImageLimit: 11,
        donationFinalizeZipLimit: 2,
      }),
      { field: "finalizeImageCount", limit: 3 },
    );
  });

  it("uses a stricter guest donation finalize-image cap", () => {
    assert.deepEqual(resolveDailyQuotaTarget("finalizeImage", "catalog_donation", undefined, "guest"), {
      field: "finalizeImageCountDonation",
      limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST,
    });
  });

  it("gives donations a higher finalize image allowance than print requests", () => {
    assert.ok(
      CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION >
        CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
    );
  });
});

describe("shouldChargeDailyQuota", () => {
  it("does not charge any print-request daily buckets (request L is the cap)", () => {
    assert.equal(shouldChargeDailyQuota("createBatch", "print_request"), false);
    assert.equal(shouldChargeDailyQuota("finalizeImage", "print_request"), false);
    assert.equal(shouldChargeDailyQuota("finalizeZip", "print_request"), false);
  });

  it("charges donation images/day only", () => {
    assert.equal(shouldChargeDailyQuota("createBatch", "catalog_donation"), false);
    assert.equal(shouldChargeDailyQuota("finalizeImage", "catalog_donation"), true);
    assert.equal(shouldChargeDailyQuota("finalizeZip", "catalog_donation"), false);
  });
});

describe("quotaExhaustedMessage", () => {
  it("mentions donated designs for donation purpose", () => {
    const message = quotaExhaustedMessage("finalizeImage", 500, "catalog_donation");
    assert.match(message, /donated designs/);
    assert.match(message, /500/);
  });

  it("mentions uploaded designs for print-request purpose", () => {
    const message = quotaExhaustedMessage("finalizeImage", 50, "print_request");
    assert.match(message, /uploaded designs/);
    assert.match(message, /50/);
  });
});
