import assert from "node:assert/strict";
import test from "node:test";

import { validateAttachExistingCustomerUploadsToPrintRequest } from "./lib/attachExistingCustomerUploadValidation";

test("attachExisting validation accepts upload ids and optional printRequestId", () => {
  const result = validateAttachExistingCustomerUploadsToPrintRequest({
    uploadIds: ["up_1", "up_2"],
    printRequestId: "pr_1",
    defaultQuantity: 2,
  });
  assert.deepEqual(result, {
    uploadIds: ["up_1", "up_2"],
    printRequestId: "pr_1",
    defaultQuantity: 2,
  });
});

test("attachExisting validation rejects empty uploadIds", () => {
  assert.throws(
    () => validateAttachExistingCustomerUploadsToPrintRequest({ uploadIds: [] }),
    /uploadIds must be a non-empty array/,
  );
});

test("attachExisting validation rejects duplicate uploadIds", () => {
  assert.throws(
    () =>
      validateAttachExistingCustomerUploadsToPrintRequest({
        uploadIds: ["up_1", "up_1"],
      }),
    /uploadIds must be unique/,
  );
});
