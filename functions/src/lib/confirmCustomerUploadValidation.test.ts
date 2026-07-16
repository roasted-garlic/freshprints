import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CUSTOMER_UPLOAD_TERMS_VERSION } from "../../../packages/shared/src/types/customerUpload/customerUpload.types";
import { validateConfirmCustomerUploadsAndAttachRequest } from "./confirmCustomerUploadValidation";

describe("confirmCustomerUploadValidation", () => {
  it("accepts a valid attach payload", () => {
    const result = validateConfirmCustomerUploadsAndAttachRequest({
      batchId: "batch1",
      uploadIds: ["u1", "u2"],
      ownershipConfirmed: true,
      catalogUseAcknowledged: true,
      termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
      defaultQuantity: 2,
    });
    assert.equal(result.batchId, "batch1");
    assert.deepEqual(result.uploadIds, ["u1", "u2"]);
    assert.equal(result.defaultQuantity, 2);
  });

  it("rejects missing confirmations", () => {
    assert.throws(() =>
      validateConfirmCustomerUploadsAndAttachRequest({
        batchId: "batch1",
        uploadIds: ["u1"],
        ownershipConfirmed: false,
        catalogUseAcknowledged: true,
        termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
      }),
    );
  });

  it("rejects wrong terms version", () => {
    assert.throws(() =>
      validateConfirmCustomerUploadsAndAttachRequest({
        batchId: "batch1",
        uploadIds: ["u1"],
        ownershipConfirmed: true,
        catalogUseAcknowledged: true,
        termsVersion: "old",
      }),
    );
  });
});
