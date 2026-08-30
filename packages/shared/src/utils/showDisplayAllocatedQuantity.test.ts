import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveShowDisplayAllocatedQuantity } from "./showDisplayAllocatedQuantity";

const pastShow = {
  scheduledStartAt: { toDate: () => new Date("2020-01-01T12:00:00Z") },
  allocatedQuantity: 0,
};

const upcomingShow = {
  scheduledStartAt: { toDate: () => new Date("2099-01-01T12:00:00Z") },
  allocatedQuantity: 0,
};

describe("resolveShowDisplayAllocatedQuantity", () => {
  it("prefers the show summary quantity when it is already populated", () => {
    assert.equal(
      resolveShowDisplayAllocatedQuantity({
        show: { ...pastShow, allocatedQuantity: 12 },
        allocations: [{ status: "canceled", allocatedQuantity: 5 }],
      }),
      12,
    );
  });

  it("uses active allocation rows when the summary is zero on an upcoming show", () => {
    assert.equal(
      resolveShowDisplayAllocatedQuantity({
        show: upcomingShow,
        allocations: [{ status: "queued", allocatedQuantity: 7 }],
        now: new Date("2026-01-01T12:00:00Z"),
      }),
      7,
    );
  });

  it("includes canceled allocation rows for past shows after release", () => {
    assert.equal(
      resolveShowDisplayAllocatedQuantity({
        show: pastShow,
        allocations: [
          { status: "canceled", allocatedQuantity: 4 },
          { status: "canceled", allocatedQuantity: 6 },
        ],
        now: new Date("2026-01-01T12:00:00Z"),
      }),
      10,
    );
  });

  it("returns zero for upcoming shows with only canceled allocations", () => {
    assert.equal(
      resolveShowDisplayAllocatedQuantity({
        show: upcomingShow,
        allocations: [{ status: "canceled", allocatedQuantity: 9 }],
        now: new Date("2026-01-01T12:00:00Z"),
      }),
      0,
    );
  });
});
