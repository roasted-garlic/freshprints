import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LEGACY_RESTORE_FALLBACK_STATUS,
  resolveRestoreStatus,
} from "./designArchiveRestore";

describe("resolveRestoreStatus", () => {
  it("restores to previousStatus when present", () => {
    assert.equal(
      resolveRestoreStatus({ aiReviewed: false, previousStatus: "imported" }),
      "imported",
    );
    assert.equal(
      resolveRestoreStatus({ aiReviewed: false, previousStatus: "processing" }),
      "processing",
    );
    assert.equal(resolveRestoreStatus({ aiReviewed: false, previousStatus: "ready" }), "ready");
    assert.equal(
      resolveRestoreStatus({ aiReviewed: false, previousStatus: "queued" }),
      "queued",
    );
    assert.equal(
      resolveRestoreStatus({ aiReviewed: false, previousStatus: "rejected" }),
      "rejected",
    );
  });

  it("falls back to imported when previousStatus is missing", () => {
    assert.equal(resolveRestoreStatus({ aiReviewed: false }), LEGACY_RESTORE_FALLBACK_STATUS);
    assert.equal(resolveRestoreStatus({ aiReviewed: false, previousStatus: undefined }), "imported");
    assert.equal(resolveRestoreStatus({ aiReviewed: true }), LEGACY_RESTORE_FALLBACK_STATUS);
    assert.equal(
      resolveRestoreStatus({ aiReviewed: false, aiReviewStatus: "approved" }),
      LEGACY_RESTORE_FALLBACK_STATUS,
    );
  });

  it("ignores invalid archived previousStatus values", () => {
    assert.equal(
      resolveRestoreStatus({ aiReviewed: false, previousStatus: "archived" as "imported" }),
      LEGACY_RESTORE_FALLBACK_STATUS,
    );
  });
});
