import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluatePortalPrintRequestUnqueue } from "./portalPrintRequestUnqueue";

const portalRequest = {
  id: "pr-1",
  status: "active",
  requestOrigin: "portal_customer" as const,
  isInternal: false,
};

function allocation(
  overrides: Partial<{
    id: string;
    status: string;
    allocatedQuantity: number;
  }> = {},
) {
  return {
    id: overrides.id ?? "alloc-1",
    upcomingShowId: "show-1",
    status: (overrides.status ?? "pending") as "pending",
    allocatedQuantity: overrides.allocatedQuantity ?? 5,
  };
}

describe("evaluatePortalPrintRequestUnqueue", () => {
  it("allows pending allocations on a removable show", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open",
      allocationsOnShow: [allocation({ status: "pending" })],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.releasedQuantity, 5);
    assert.deepEqual(result.cancelableAllocationIds, ["alloc-1"]);
  });

  it("allows queued allocations", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open",
      allocationsOnShow: [allocation({ status: "queued" })],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, true);
  });

  it("blocks in_progress allocations", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open",
      allocationsOnShow: [allocation({ status: "in_progress" })],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "production_started");
  });

  it("blocks printing shows", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "printing",
      allocationsOnShow: [allocation()],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "show_not_removable");
  });

  it("blocks internal requests", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: { ...portalRequest, isInternal: true },
      showProductionStatus: "open",
      allocationsOnShow: [allocation()],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "not_portal_customer");
  });

  it("blocks ADR-FP-071 active editing continuable conflict", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open",
      allocationsOnShow: [allocation()],
      hasOtherPortalEditableContinuableRequest: true,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "continuable_request_conflict");
  });

  it("allows unqueue when other request is parkable draft (not active editing)", () => {
    // This test documents that the semantics have changed:
    // hasOtherPortalEditableContinuableRequest should now only be true
    // when there's another ACTIVE editing request, not a parkable draft
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open", 
      allocationsOnShow: [allocation()],
      hasOtherPortalEditableContinuableRequest: false, // parkable draft doesn't count
    });
    assert.equal(result.eligible, true);
  });

  it("blocks printed allocations", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open",
      allocationsOnShow: [allocation({ status: "printed" })],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "production_started");
  });

  it("blocks done allocations", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "open",
      allocationsOnShow: [allocation({ status: "done" })],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "production_started");
  });

  it("blocks completed shows", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: portalRequest,
      showProductionStatus: "completed",
      allocationsOnShow: [allocation()],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "show_not_removable");
  });

  it("blocks studio_customer origin", () => {
    const result = evaluatePortalPrintRequestUnqueue({
      request: { ...portalRequest, requestOrigin: "studio_customer" },
      showProductionStatus: "open",
      allocationsOnShow: [allocation()],
      hasOtherPortalEditableContinuableRequest: false,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "not_portal_customer");
  });
});
