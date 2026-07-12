import assert from "node:assert/strict";
import { test } from "node:test";

import { getCustomerUploadProgressLabel } from "./customerUploadProgressLabel";

test("getCustomerUploadProgressLabel prefers granular stages", () => {
  assert.equal(
    getCustomerUploadProgressLabel({
      technicalStatus: "processing",
      technicalProgressStage: "checking_transparency",
    }),
    "Checking transparency…",
  );
  assert.equal(
    getCustomerUploadProgressLabel({
      technicalStatus: "processing",
      technicalProgressStage: "checking_print_size",
    }),
    "Checking DPI…",
  );
});

test("getCustomerUploadProgressLabel falls back to technicalStatus", () => {
  assert.equal(
    getCustomerUploadProgressLabel({ technicalStatus: "validating" }),
    "Validating…",
  );
  assert.equal(getCustomerUploadProgressLabel({ technicalStatus: "ready" }), "Ready");
  assert.equal(getCustomerUploadProgressLabel({ technicalStatus: "failed" }), "Failed");
});
