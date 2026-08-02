import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./deleteEligibleCustomerUpload.ts", import.meta.url), "utf8");

test("execution rechecks eligibility and validates the asset manifest before cleanup", () => {
  assert.match(source, /const recheck = await buildPreview/);
  assert.match(source, /sourceCustomerUploadId/);
  assert.match(source, /resolveCustomerUploadAssetManifest\(data, customerUploadId\)/);
});

test("partial Storage failure retains the upload document and reports failed", () => {
  const failure = source.indexOf('if (storageCleanupFailed)');
  const documentDelete = source.indexOf("transaction.delete(uploadRef)");
  assert.ok(failure >= 0 && documentDelete > failure);
  assert.match(source.slice(failure, documentDelete), /outcome:\s*"failed"/);
  assert.match(source.slice(failure, documentDelete), /record was retained/);
});

test("complete cleanup deletes only the upload document and upload-specific batch metadata", () => {
  assert.match(source, /buildCustomerUploadBatchDeletionPatch/);
  assert.match(source, /transaction\.delete\(uploadRef\)/);
  assert.doesNotMatch(source, /transaction\.delete\(batchRef\)/);
  assert.doesNotMatch(source, /archive\.zip.*delete/);
});
