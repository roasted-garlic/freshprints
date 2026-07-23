import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCustomerUploadPromoted,
  isWorkingPrintRequestStatus,
  itemStatusBlocksHardDelete,
  showProductionStatusBlocksHardDelete,
  upcomingShowStatusBlocksHardDelete,
} from "./deletionEligibility";

describe("deletionEligibility", () => {
  it("allows hard delete only for working print request statuses", () => {
    assert.equal(isWorkingPrintRequestStatus("draft"), true);
    assert.equal(isWorkingPrintRequestStatus("active"), true);
    assert.equal(isWorkingPrintRequestStatus("editing"), true);
    assert.equal(isWorkingPrintRequestStatus("completed"), false);
    assert.equal(isWorkingPrintRequestStatus("archived"), false);
  });

  it("blocks hard delete when items have production history statuses", () => {
    assert.equal(itemStatusBlocksHardDelete("pending"), false);
    assert.equal(itemStatusBlocksHardDelete("canceled"), false);
    assert.equal(itemStatusBlocksHardDelete("queued"), true);
    assert.equal(itemStatusBlocksHardDelete("printed"), true);
    assert.equal(itemStatusBlocksHardDelete("done"), true);
  });

  it("blocks show hard delete for production and historical statuses", () => {
    assert.equal(showProductionStatusBlocksHardDelete("open"), false);
    assert.equal(showProductionStatusBlocksHardDelete("printing"), true);
    assert.equal(showProductionStatusBlocksHardDelete("archived"), true);
    assert.equal(upcomingShowStatusBlocksHardDelete("scheduled"), false);
    assert.equal(upcomingShowStatusBlocksHardDelete("completed"), true);
    assert.equal(upcomingShowStatusBlocksHardDelete("archived"), true);
  });

  it("treats non-empty promotedDesignId as promoted", () => {
    assert.equal(isCustomerUploadPromoted(null), false);
    assert.equal(isCustomerUploadPromoted(""), false);
    assert.equal(isCustomerUploadPromoted("design-1"), true);
  });
});
