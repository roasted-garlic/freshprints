import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCustomerUploadBatchZipStoragePath,
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
  isCanonicalCustomerUploadObjectPath,
  isCanonicalCustomerUploadSourcePath,
  parseCustomerUploadObjectPath,
} from "./customerUploadStoragePaths";

describe("customerUploadStoragePaths", () => {
  it("builds canonical upload object paths", () => {
    assert.equal(
      getCustomerUploadSourceStoragePath("uid1", "up1"),
      "/customer-uploads/uid1/up1/source",
    );
    assert.equal(
      getCustomerUploadProductionStoragePath("uid1", "up1"),
      "/customer-uploads/uid1/up1/production.png",
    );
    assert.equal(
      getCustomerUploadPreviewStoragePath("uid1", "up1"),
      "/customer-uploads/uid1/up1/preview.webp",
    );
    assert.equal(
      getCustomerUploadThumbnailStoragePath("uid1", "up1"),
      "/customer-uploads/uid1/up1/thumbnail.webp",
    );
    assert.equal(
      getCustomerUploadBatchZipStoragePath("uid1", "batch1"),
      "/customer-uploads/uid1/batches/batch1/archive.zip",
    );
  });

  it("validates source path ownership binding", () => {
    const path = getCustomerUploadSourceStoragePath("uid1", "up1");
    assert.equal(isCanonicalCustomerUploadSourcePath(path, "uid1", "up1"), true);
    assert.equal(isCanonicalCustomerUploadSourcePath(path, "uid2", "up1"), false);
    assert.equal(isCanonicalCustomerUploadObjectPath(path), true);
  });

  it("parses upload and batch zip paths", () => {
    const parsed = parseCustomerUploadObjectPath(
      "/customer-uploads/uid1/up1/production.png",
    );
    assert.deepEqual(parsed, {
      kind: "upload_object",
      customerUid: "uid1",
      uploadId: "up1",
      fileName: "production.png",
    });

    const zip = parseCustomerUploadObjectPath(
      "/customer-uploads/uid1/batches/b1/archive.zip",
    );
    assert.deepEqual(zip, {
      kind: "batch_zip",
      customerUid: "uid1",
      batchId: "b1",
      fileName: "archive.zip",
    });

    assert.equal(parseCustomerUploadObjectPath("/originals/x.png"), null);
  });
});
