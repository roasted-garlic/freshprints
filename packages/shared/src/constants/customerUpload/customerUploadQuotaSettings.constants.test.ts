import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
} from "./customerUploadLimits.constants";
import {
  DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS,
  parseCustomerUploadQuotaSettingsInput,
  resolveCustomerUploadQuotaSettings,
} from "./customerUploadQuotaSettings.constants";

describe("customerUploadQuotaSettings", () => {
  it("defaults match owner print-request / donation constants", () => {
    assert.equal(
      DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.printRequestCreateBatchLimit,
      CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
    );
    assert.equal(
      DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.printRequestFinalizeImageLimit,
      CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
    );
    assert.equal(
      DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.printRequestFinalizeZipLimit,
      CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
    );
    assert.equal(
      DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.donationCreateBatchLimit,
      CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
    );
    assert.equal(
      DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.donationFinalizeImageLimit,
      CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
    );
    assert.equal(
      DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.donationFinalizeZipLimit,
      CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
    );
    assert.equal(CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT, 10);
    assert.equal(CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT, 20);
    assert.equal(CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT, 2);
    assert.equal(CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION, 400);
    assert.equal(CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION, 1000);
    assert.equal(CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION, 40);
  });

  it("resolve falls back to defaults for missing or invalid fields", () => {
    const resolved = resolveCustomerUploadQuotaSettings({
      printRequestFinalizeImageLimit: 12,
      donationFinalizeImageLimit: "nope",
    });
    assert.equal(resolved.printRequestFinalizeImageLimit, 12);
    assert.equal(
      resolved.donationFinalizeImageLimit,
      CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
    );
  });

  it("parse accepts valid integers and rejects out-of-bounds", () => {
    const ok = parseCustomerUploadQuotaSettingsInput({
      printRequestCreateBatchLimit: 10,
      printRequestFinalizeImageLimit: 20,
      printRequestFinalizeZipLimit: 1,
      donationCreateBatchLimit: 100,
      donationFinalizeImageLimit: 200,
      donationFinalizeZipLimit: 5,
    });
    assert.ok(ok);
    assert.equal(ok?.printRequestCreateBatchLimit, 10);

    assert.equal(
      parseCustomerUploadQuotaSettingsInput({
        printRequestCreateBatchLimit: 10,
        printRequestFinalizeImageLimit: 20,
        printRequestFinalizeZipLimit: 0,
        donationCreateBatchLimit: 100,
        donationFinalizeImageLimit: 200,
        donationFinalizeZipLimit: 5,
      }),
      null,
    );
  });
});
