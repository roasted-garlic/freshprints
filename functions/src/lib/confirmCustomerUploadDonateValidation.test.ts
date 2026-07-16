import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CUSTOMER_UPLOAD_DONATE_TERMS_VERSION } from "../../../packages/shared/src/types/customerUpload/customerUpload.types";

import { validateConfirmCustomerUploadsForDonationRequest } from "./confirmCustomerUploadDonateValidation";

describe("validateConfirmCustomerUploadsForDonationRequest", () => {
  const base = {
    batchId: "batch1",
    uploadIds: ["up1"],
    ownershipConfirmed: true,
    catalogUseAcknowledged: true,
    termsVersion: CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,
  };

  it("accepts a valid donation confirm payload", () => {
    const result = validateConfirmCustomerUploadsForDonationRequest(base);
    assert.equal(result.catalogUseAcknowledged, true);
    assert.equal(result.termsVersion, CUSTOMER_UPLOAD_DONATE_TERMS_VERSION);
  });

  it("requires catalog donation consent", () => {
    assert.throws(
      () =>
        validateConfirmCustomerUploadsForDonationRequest({
          ...base,
          catalogUseAcknowledged: false,
        }),
      /Catalog donation consent/,
    );
  });

  it("requires ownership confirmation", () => {
    assert.throws(
      () =>
        validateConfirmCustomerUploadsForDonationRequest({
          ...base,
          ownershipConfirmed: false,
        }),
      /Ownership confirmation/,
    );
  });

  it("rejects print-request terms version", () => {
    assert.throws(
      () =>
        validateConfirmCustomerUploadsForDonationRequest({
          ...base,
          termsVersion: "customer-upload-terms-v2",
        }),
      /terms version/,
    );
  });
});
