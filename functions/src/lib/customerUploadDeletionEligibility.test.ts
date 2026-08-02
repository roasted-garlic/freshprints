import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerUploadBatchDeletionPatch,
  resolveCustomerUploadAssetManifest,
  resolveCustomerUploadDeletionBlockers,
} from "./customerUploadDeletionEligibility";
import { CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS } from "../../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";
import { readFileSync } from "node:fs";

test("an upload referenced by any print request item is blocked regardless of catalog state", () => {
  const blockers = resolveCustomerUploadDeletionBlockers({
    printRequestItemCount: 2,
    promotedDesignId: null,
  });
  assert.equal(blockers[0]?.code, "attached_to_print_request");
  assert.match(blockers[0]?.message ?? "", /still used by 2 print request item/);
});

test("a promoted upload is blocked when no request item exists", () => {
  const blockers = resolveCustomerUploadDeletionBlockers({
    printRequestItemCount: 0,
    promotedDesignId: "design-1",
  });
  assert.equal(blockers[0]?.code, "promoted_to_design");
});

test("a direct Design Library reference blocks deletion even when the upload backlink is absent", () => {
  const blockers = resolveCustomerUploadDeletionBlockers({
    printRequestItemCount: 0,
    promotedDesignId: null,
    promotedDesignReferenceCount: 1,
  });
  assert.equal(blockers[0]?.code, "promoted_to_design");
});

test("only an unattached and unpromoted upload is eligible", () => {
  assert.deepEqual(
    resolveCustomerUploadDeletionBlockers({ printRequestItemCount: 0, promotedDesignId: null }),
    [],
  );
});

const upload = {
  customerUid: "customer-1",
  sourceStoragePath: "/customer-uploads/customer-1/upload-1/source",
  productionStoragePath: "/customer-uploads/customer-1/upload-1/production.png",
  previewStoragePath: "/customer-uploads/customer-1/upload-1/preview.webp",
  thumbnailStoragePath: "/customer-uploads/customer-1/upload-1/thumbnail.webp",
};

test("asset manifest includes every approved upload-owned schema path", () => {
  const manifest = resolveCustomerUploadAssetManifest(upload, "upload-1");
  assert.equal(manifest.blocker, null);
  assert.deepEqual(manifest.paths, Object.values(upload).slice(1));
});

test("authoritative manifest stays aligned with every CustomerUpload Storage-path field", () => {
  const source = readFileSync(
    new URL(
      "../../../packages/shared/src/types/customerUpload/customerUpload.types.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const schemaFields = [...source.matchAll(/^\s*(\w+StoragePath):/gm)].map((match) => match[1]);
  assert.deepEqual(schemaFields, [...CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS]);
});

test("asset manifest rejects unexpected, malformed, batch, shared, and unrelated paths", () => {
  assert.equal(
    resolveCustomerUploadAssetManifest({ ...upload, derivativeStoragePath: "/other" }, "upload-1")
      .blocker?.code,
    "invalid_asset_manifest",
  );
  assert.equal(
    resolveCustomerUploadAssetManifest(
      { ...upload, sourceStoragePath: "/customer-uploads/customer-2/upload-1/source" },
      "upload-1",
    ).blocker?.code,
    "invalid_asset_manifest",
  );
  assert.equal(
    resolveCustomerUploadAssetManifest(
      { ...upload, sourceStoragePath: "/customer-uploads/customer-1/batches/batch-1/archive.zip" },
      "upload-1",
    ).blocker?.code,
    "invalid_asset_manifest",
  );
});

test("asset manifest deduplicates paths and ignores absent current-schema assets", () => {
  const manifest = resolveCustomerUploadAssetManifest(
    { ...upload, previewStoragePath: null, thumbnailStoragePath: upload.productionStoragePath },
    "upload-1",
  );
  assert.equal(manifest.blocker, null);
  assert.equal(manifest.paths.length, 2);
});

test("batch cleanup removes only the upload manifest entry and adjusts its status counter", () => {
  assert.deepEqual(
    buildCustomerUploadBatchDeletionPatch(
      {
        fileCount: 2,
        readyCount: 2,
        failedCount: 0,
        zipManifest: [
          { uploadId: "upload-1", entryName: "one.png" },
          { uploadId: "upload-2", entryName: "two.png" },
        ],
        zipStoragePath: "/shared/archive.zip",
      },
      "upload-1",
      "ready",
    ),
    {
      fileCount: 1,
      readyCount: 1,
      zipManifest: [{ uploadId: "upload-2", entryName: "two.png" }],
    },
  );
});
