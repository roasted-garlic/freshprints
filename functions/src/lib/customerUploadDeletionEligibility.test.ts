import assert from "node:assert/strict";
import test from "node:test";

import {
  listCustomerUploadStoragePaths,
  resolveCustomerUploadDeletionBlockers,
} from "./customerUploadDeletionEligibility";

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

test("only an unattached and unpromoted upload is eligible", () => {
  assert.deepEqual(
    resolveCustomerUploadDeletionBlockers({ printRequestItemCount: 0, promotedDesignId: null }),
    [],
  );
});

test("Storage cleanup is restricted to the four approved upload asset fields", () => {
  assert.deepEqual(
    listCustomerUploadStoragePaths({
      sourceStoragePath: "source",
      productionStoragePath: "production",
      previewStoragePath: "preview",
      thumbnailStoragePath: "thumbnail",
      unrelatedPath: "must-not-delete",
      batchId: "batch-1",
    }),
    ["source", "production", "preview", "thumbnail"],
  );
});
