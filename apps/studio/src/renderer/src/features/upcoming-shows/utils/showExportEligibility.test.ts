import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterShowExportAllocations,
  hasShowExportableAllocations,
} from "./showExportEligibility";

describe("hasShowExportableAllocations", () => {
  it("returns true when the show document still reports allocated quantity", () => {
    assert.equal(
      hasShowExportableAllocations({
        allocatedQuantity: 12,
        allocations: [],
      }),
      true,
    );
  });

  it("returns true when allocations remain even if the show summary quantity is zero", () => {
    assert.equal(
      hasShowExportableAllocations({
        allocatedQuantity: 0,
        allocations: [{ status: "printed", printRequestId: "req-1" }],
      }),
      true,
    );
  });

  it("returns false when every allocation is canceled and the summary quantity is zero", () => {
    assert.equal(
      hasShowExportableAllocations({
        allocatedQuantity: 0,
        allocations: [{ status: "canceled", printRequestId: "req-1" }],
      }),
      false,
    );
  });

  it("returns true for past shows with canceled allocations that still reference print requests", () => {
    const pastShow = {
      scheduledStartAt: { toDate: () => new Date("2020-01-01T12:00:00Z") },
    };

    assert.equal(
      hasShowExportableAllocations({
        allocatedQuantity: 0,
        allocations: [{ status: "canceled", printRequestId: "req-1" }],
        show: pastShow,
        now: new Date("2026-01-01T12:00:00Z"),
      }),
      true,
    );
  });
});

describe("filterShowExportAllocations", () => {
  it("includes canceled allocations for historical past export", () => {
    const allocations = [
      { status: "canceled" as const, printRequestId: "req-1" },
      { status: "queued" as const, printRequestId: "req-2" },
    ];

    assert.deepEqual(
      filterShowExportAllocations(allocations, { useHistoricalPastExport: true }),
      allocations,
    );
  });

  it("excludes canceled allocations for active export", () => {
    const allocations = [
      { status: "canceled" as const, printRequestId: "req-1" },
      { status: "queued" as const, printRequestId: "req-2" },
    ];

    assert.deepEqual(
      filterShowExportAllocations(allocations, { useHistoricalPastExport: false }),
      [{ status: "queued", printRequestId: "req-2" }],
    );
  });
});
