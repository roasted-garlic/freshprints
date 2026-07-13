import assert from "node:assert/strict";
import { test } from "node:test";

import { getCustomerUploadProgressLabel } from "./customerUploadProgressLabel";

test("getCustomerUploadProgressLabel prefers granular stages", () => {
  assert.equal(
    getCustomerUploadProgressLabel({
      technicalStatus: "validating",
      technicalProgressStage: "discovered",
    }),
    "Discovered — waiting to process…",
  );
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
      technicalProgressStage: "converting_format",
    }),
    "Converting to print format…",
  );
  assert.equal(
    getCustomerUploadProgressLabel({
      technicalStatus: "processing",
      technicalProgressStage: "trimming",
    }),
    "Trimming transparent edges…",
  );
  assert.equal(
    getCustomerUploadProgressLabel({
      technicalStatus: "processing",
      technicalProgressStage: "upscaling",
    }),
    "Upscaling for print quality…",
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
