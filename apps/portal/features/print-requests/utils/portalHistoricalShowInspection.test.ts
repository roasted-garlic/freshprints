import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canSubmitPortalShowDestination,
  resolvePortalShowInspectionActivation,
} from "./portalHistoricalShowInspection";

const historical = {
  id: "finished",
  scheduledStartAt: "2026-07-20T20:00:00.000Z",
  productionStatus: "completed" as const,
  allocatedQuantity: 25,
  customerAllocatedQuantity: 7,
  isAllocatable: false,
};

describe("Portal historical show inspection boundary", () => {
  it("inspects a finished show while clearing allocation destination and submission state", () => {
    assert.deepEqual(resolvePortalShowInspectionActivation(historical), {
      inspectedShowId: "finished",
      destinationShowId: null,
      clearSubmissionState: true,
    });
    assert.equal(canSubmitPortalShowDestination(historical, true), false);
  });

  it("keeps an open allocatable show inspectable and submit-capable when fit passes", () => {
    const open = { ...historical, id: "open", productionStatus: "open" as const, isAllocatable: true };
    assert.deepEqual(resolvePortalShowInspectionActivation(open), {
      inspectedShowId: "open",
      destinationShowId: "open",
      clearSubmissionState: false,
    });
    assert.equal(canSubmitPortalShowDestination(open, true), true);
    assert.equal(canSubmitPortalShowDestination(open, false), false);
  });
});
