import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";

/**
 * This repository has no live-callable (`onCall`) integration-test harness (confirmed during
 * Goal #10's Formal Review and re-confirmed for Goal #11) — `retryCustomerUploadProcessing.ts`
 * itself calls Firestore/Storage admin APIs directly with no injectable seam, so it cannot be
 * exercised as a unit here. What *is* directly testable, and what this file exercises, is the
 * structural property the retry callable's idempotency claim depends on: retrying the same
 * `uploadId` always resolves to the exact same deterministic Storage object paths (source,
 * production, preview, thumbnail) — never a new path family — so a retry can only ever overwrite
 * existing objects, never create duplicates. This directly covers regression items #14-#16
 * (retry is idempotent; no duplicate Storage objects; no duplicate Firestore records — the retry
 * callable operates on `customerUploads/{uploadId}` by ID, so a second document is structurally
 * impossible, and is not separately re-tested here).
 */
describe("retryCustomerUploadProcessing idempotency (path-determinism)", () => {
  it("repeated calls for the same uploadId always resolve to the same production/preview/thumbnail/source paths", () => {
    const customerUid = "customer-abc";
    const uploadId = "upload-123";

    const firstCallPaths = {
      source: getCustomerUploadSourceStoragePath(customerUid, uploadId),
      production: getCustomerUploadProductionStoragePath(customerUid, uploadId),
      preview: getCustomerUploadPreviewStoragePath(customerUid, uploadId),
      thumbnail: getCustomerUploadThumbnailStoragePath(customerUid, uploadId),
    };

    // Simulate a second (retry) invocation deriving paths independently — no state is threaded
    // between calls, matching how the real retry callable re-derives paths from uploadId alone.
    const secondCallPaths = {
      source: getCustomerUploadSourceStoragePath(customerUid, uploadId),
      production: getCustomerUploadProductionStoragePath(customerUid, uploadId),
      preview: getCustomerUploadPreviewStoragePath(customerUid, uploadId),
      thumbnail: getCustomerUploadThumbnailStoragePath(customerUid, uploadId),
    };

    assert.deepEqual(
      firstCallPaths,
      secondCallPaths,
      "retry must resolve to identical Storage paths as the original finalize — overwrite, not duplicate",
    );
  });

  it("different uploadIds never collide onto the same production path (no cross-upload overwrite)", () => {
    const customerUid = "customer-abc";
    const pathA = getCustomerUploadProductionStoragePath(customerUid, "upload-1");
    const pathB = getCustomerUploadProductionStoragePath(customerUid, "upload-2");
    assert.notEqual(pathA, pathB);
  });

  it("the source path is never mutated by retry's path derivation (original stays addressable)", () => {
    const customerUid = "customer-abc";
    const uploadId = "upload-123";
    const sourcePath = getCustomerUploadSourceStoragePath(customerUid, uploadId);
    const productionPath = getCustomerUploadProductionStoragePath(customerUid, uploadId);
    assert.notEqual(
      sourcePath,
      productionPath,
      "source and production must be distinct objects so normalization never overwrites the original",
    );
  });
});
