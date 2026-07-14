import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAcceptNewShowAllocations,
  getShowAllocationBlockReason,
} from "./showAllocationEligibility";

function timestamp(iso: string) {
  const date = new Date(iso);
  return { toDate: () => date };
}

describe("canAcceptNewShowAllocations", () => {
  const now = new Date("2026-07-14T12:00:00Z");

  it("allows open upcoming shows with capacity", () => {
    assert.equal(
      canAcceptNewShowAllocations(
        {
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
          productionStatus: "open",
          maxTotalQuantity: 100,
          allocatedQuantity: 40,
        },
        now,
      ),
      true,
    );
  });

  it("blocks past shows", () => {
    assert.equal(
      getShowAllocationBlockReason(
        {
          scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
          productionStatus: "open",
        },
        now,
      ),
      "past",
    );
  });

  it("blocks completed and fully_printed", () => {
    assert.equal(
      getShowAllocationBlockReason(
        {
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
          productionStatus: "completed",
        },
        now,
      ),
      "done",
    );
    assert.equal(
      getShowAllocationBlockReason(
        {
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
          productionStatus: "fully_printed",
        },
        now,
      ),
      "done",
    );
  });

  it("blocks capacity full and productionStatus full", () => {
    assert.equal(
      getShowAllocationBlockReason(
        {
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
          productionStatus: "open",
          maxTotalQuantity: 50,
          allocatedQuantity: 50,
        },
        now,
      ),
      "full",
    );
    assert.equal(
      getShowAllocationBlockReason(
        {
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
          productionStatus: "full",
          maxTotalQuantity: 200,
          allocatedQuantity: 10,
        },
        now,
      ),
      "full",
    );
  });
});
