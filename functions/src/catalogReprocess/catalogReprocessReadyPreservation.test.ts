import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isReadyCatalogEligibleDesign } from "../../../packages/shared/src/constants/catalogReprocess.constants";
import {
  assertAiClearDoesNotTouchPreservedFields,
  assertReadyStageDoesNotTouchLifecycleFields,
  buildCatalogReprocessAiClearUpdate,
  buildReadyCatalogReprocessAiStageUpdate,
  CATALOG_REPROCESS_PRESERVED_FIELD_KEYS,
} from "./catalogReprocessAiClear";

describe("isReadyCatalogEligibleDesign", () => {
  it("requires status=ready and aiReviewStatus=approved", () => {
    assert.equal(
      isReadyCatalogEligibleDesign({ status: "ready", aiReviewStatus: "approved" }),
      true,
    );
    assert.equal(
      isReadyCatalogEligibleDesign({ status: "ready", aiReviewStatus: "needs_review" }),
      false,
    );
    assert.equal(
      isReadyCatalogEligibleDesign({ status: "imported", aiReviewStatus: "approved" }),
      false,
    );
  });
});

describe("buildReadyCatalogReprocessAiStageUpdate", () => {
  it("stages queued without demoting lifecycle or deleting smartProfile", () => {
    const update = buildReadyCatalogReprocessAiStageUpdate("attempt-ready");
    assert.equal(update.aiProcessingStage, "queued");
    assert.equal(update.aiProcessed, false);
    assert.equal(update.aiProcessingAttemptId, "attempt-ready");
    assert.equal(Object.prototype.hasOwnProperty.call(update, "aiSuggestions"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "aiAnalysis"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "smartProfile"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "status"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "aiReviewStatus"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "aiReviewNotes"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "aiReviewedBy"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(update, "readyAt"), false);
  });

  it("does not touch preserved B/D catalog fields", () => {
    const update = buildReadyCatalogReprocessAiStageUpdate("attempt-ready");
    const touched = assertAiClearDoesNotTouchPreservedFields(update);
    assert.deepEqual(touched, []);
    for (const key of CATALOG_REPROCESS_PRESERVED_FIELD_KEYS) {
      assert.equal(Object.prototype.hasOwnProperty.call(update, key), false, key);
    }
  });

  it("does not touch Ready lifecycle fields", () => {
    const update = buildReadyCatalogReprocessAiStageUpdate("attempt-ready");
    assert.deepEqual(assertReadyStageDoesNotTouchLifecycleFields(update), []);
  });
});

describe("buildCatalogReprocessAiClearUpdate (queue path unchanged)", () => {
  it("still demotes to imported+pending for AI Review Queue", () => {
    const update = buildCatalogReprocessAiClearUpdate("attempt-queue");
    assert.equal(update.status, "imported");
    assert.equal(update.aiReviewStatus, "pending");
    assert.equal(Object.prototype.hasOwnProperty.call(update, "smartProfile"), false);
  });
});
