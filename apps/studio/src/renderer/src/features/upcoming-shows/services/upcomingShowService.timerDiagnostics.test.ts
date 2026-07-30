import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Timestamp } from "firebase/firestore";

import {
  diagnoseShowAllocationForTimer,
  diagnoseUpcomingShowForTimer,
} from "../utils/productionTimerDiagnostics";

describe("production timer sanitized parser diagnostics", () => {
  it("reports only missing/invalid required show field names and legacy extra field names", () => {
    const diagnostic = diagnoseUpcomingShowForTimer({
      source: "whatnot",
      whatnotShowId: "show-1",
      status: "scheduled",
      syncStatus: "idle",
      isArchived: false,
      productionStatus: "open",
      maxQuantityOverridden: false,
      allocatedQuantity: 3,
      createdAt: Timestamp.now(),
      legacyShowMarker: true,
    });

    assert.deepEqual(diagnostic, {
      parserStatus: "incomplete",
      missingRequiredFields: ["updatedAt"],
      legacyExtraFields: ["legacyShowMarker"],
    });
  });

  it("reports a parsed allocation with a preserved legacy field as valid for batching", () => {
    const now = Timestamp.now();
    const diagnostic = diagnoseShowAllocationForTimer({
      upcomingShowId: "show-1",
      printRequestId: "request-1",
      printRequestItemId: "item-1",
      designId: "design-1",
      requestNameSnapshot: "Test request",
      allocatedQuantity: 3,
      sourceItemQuantitySnapshot: 3,
      status: "queued",
      addedBy: "owner-1",
      updatedBy: "owner-1",
      createdAt: now,
      updatedAt: now,
      legacyProductionMarker: true,
    });

    assert.deepEqual(diagnostic, {
      parserStatus: "valid",
      missingRequiredFields: [],
      legacyExtraFields: ["legacyProductionMarker"],
    });
  });

  it("reports source-specific missing allocation field names without document values", () => {
    const now = Timestamp.now();
    const diagnostic = diagnoseShowAllocationForTimer({
      upcomingShowId: "show-1",
      printRequestId: "request-1",
      printRequestItemId: "item-1",
      requestNameSnapshot: "Test request",
      allocatedQuantity: 3,
      sourceItemQuantitySnapshot: 3,
      status: "queued",
      addedBy: "owner-1",
      updatedBy: "owner-1",
      createdAt: now,
      updatedAt: now,
    });

    assert.equal(diagnostic.parserStatus, "incomplete");
    assert.deepEqual(diagnostic.missingRequiredFields, ["designId"]);
    assert.deepEqual(diagnostic.legacyExtraFields, []);
  });
});
