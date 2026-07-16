import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  sanitizeDisplayFilename,
  validateCreateCustomerUploadBatchRequest,
  validateFinalizeCustomerUploadRequest,
  validateFinalizeCustomerUploadZipRequest,
} from "./customerUploadValidation";

describe("customerUploadValidation", () => {
  it("accepts a valid direct_images create request", () => {
    const result = validateCreateCustomerUploadBatchRequest({
      mode: "direct_images",
      clientRequestId: "req-abcd-1234",
      files: [{ originalFilename: "art.png", declaredSizeBytes: 1024 }],
    });
    assert.equal(result.mode, "direct_images");
    assert.equal(result.files?.length, 1);
  });

  it("rejects invalid clientRequestId", () => {
    assert.throws(() =>
      validateCreateCustomerUploadBatchRequest({
        mode: "zip",
        clientRequestId: "bad id!",
        declaredZipSizeBytes: 1000,
      }),
    );
  });

  it("rejects oversized declared zip", () => {
    assert.throws(() =>
      validateCreateCustomerUploadBatchRequest({
        mode: "zip",
        clientRequestId: "req-abcd-1234",
        declaredZipSizeBytes: 51 * 1024 * 1024,
      }),
    );
  });

  it("validates finalize payloads", () => {
    assert.deepEqual(validateFinalizeCustomerUploadRequest({ uploadId: "u1", batchId: "b1" }), {
      uploadId: "u1",
      batchId: "b1",
    });
    assert.deepEqual(validateFinalizeCustomerUploadZipRequest({ batchId: "b1" }), {
      batchId: "b1",
    });
  });

  it("sanitizes display filenames", () => {
    assert.equal(sanitizeDisplayFilename("../../evil.png"), "evil.png");
    assert.equal(sanitizeDisplayFilename("folder\\ok.webp"), "ok.webp");
  });
});
