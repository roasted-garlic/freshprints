import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING,
  computeCustomerUploadMaxZipBytes,
} from "./customerUploadLimits.constants";

describe("computeCustomerUploadMaxZipBytes", () => {
  it("returns the 2 GB ceiling for print-request image defaults", () => {
    assert.equal(
      computeCustomerUploadMaxZipBytes(CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT),
      CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING,
    );
  });

  it("returns the 2 GB ceiling for donation image defaults", () => {
    assert.equal(
      computeCustomerUploadMaxZipBytes(CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION),
      CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING,
    );
  });

  it("ignores a tiny images/day override (still 2 GB)", () => {
    assert.equal(computeCustomerUploadMaxZipBytes(1), CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING);
  });

  it("honors an explicit smaller ceiling override", () => {
    const customCeiling = 500 * 1024 * 1024;
    assert.equal(computeCustomerUploadMaxZipBytes(1000, undefined, customCeiling), customCeiling);
  });
});
