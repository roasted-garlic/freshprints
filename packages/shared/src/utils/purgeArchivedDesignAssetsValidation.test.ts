import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE } from "../types/admin/purgeArchivedDesignAssets.types";
import {
  isDesignAssetsPurged,
  validatePurgeArchivedDesignAssetsRequest,
} from "./purgeArchivedDesignAssetsValidation";

describe("validatePurgeArchivedDesignAssetsRequest", () => {
  it("accepts a single design id without confirmation phrase", () => {
    const result = validatePurgeArchivedDesignAssetsRequest({ designIds: ["design_1"] });
    assert.equal(result.ok, true);
    assert.deepEqual(result.designIds, ["design_1"]);
  });

  it("requires confirmation phrase for bulk", () => {
    const missing = validatePurgeArchivedDesignAssetsRequest({
      designIds: ["a", "b"],
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "bulk_confirmation_required");

    const wrong = validatePurgeArchivedDesignAssetsRequest({
      designIds: ["a", "b"],
      confirmationPhrase: "nope",
    });
    assert.equal(wrong.ok, false);
    assert.equal(wrong.error, "bulk_confirmation_mismatch");

    const ok = validatePurgeArchivedDesignAssetsRequest({
      designIds: ["a", "b"],
      confirmationPhrase: PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE,
    });
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.designIds, ["a", "b"]);
  });

  it("rejects more than 25 ids", () => {
    const ids = Array.from({ length: 26 }, (_, index) => `d${index}`);
    const result = validatePurgeArchivedDesignAssetsRequest({ designIds: ids });
    assert.equal(result.ok, false);
    assert.equal(result.error, "design_ids_too_many");
  });

  it("dedupes ids", () => {
    const result = validatePurgeArchivedDesignAssetsRequest({
      designIds: ["same", "same"],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.designIds, ["same"]);
  });
});

describe("isDesignAssetsPurged", () => {
  it("detects purged designs", () => {
    assert.equal(isDesignAssetsPurged({ assetsPurgedAt: { seconds: 1 } }), true);
    assert.equal(isDesignAssetsPurged({}), false);
    assert.equal(isDesignAssetsPurged(null), false);
  });
});
