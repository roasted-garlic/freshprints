import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SHOW_QUEUE_MOVE_MAX_ALLOCATIONS,
  assembleShowQueueMovePreview,
  buildShowQueueMovePreviewChecksum,
  collectMovableShowQueueMoveAllocations,
  collectNonMovableActiveShowQueueMoveAllocations,
  computeShowQueueMoveCapacityProjection,
  isMovableShowQueueMoveAllocationStatus,
  isShowQueueMoveDestination,
  isShowQueueMoveSourceEligible,
  recomputeShowAllocatedQuantityAfterMove,
  verifyShowQueueMovePreviewChecksum,
  type ShowQueueMoveAllocationSnapshot,
  type ShowQueueMoveShowInput,
} from "./showQueueMove";

const now = new Date("2026-09-02T18:00:00.000Z");

function show(overrides: Partial<ShowQueueMoveShowInput> & { id: string }): ShowQueueMoveShowInput {
  return {
    title: "Show",
    source: "whatnot",
    scheduledStartAt: { toDate: () => new Date("2026-09-05T18:00:00.000Z") },
    productionStatus: "open",
    allocatedQuantity: 0,
    maxTotalQuantity: 100,
    ...overrides,
  };
}

function alloc(
  overrides: Partial<ShowQueueMoveAllocationSnapshot> & { id: string },
): ShowQueueMoveAllocationSnapshot {
  return {
    upcomingShowId: "show-a",
    printRequestId: "pr-1",
    printRequestItemId: "item-1",
    requestNameSnapshot: "CR001",
    allocatedQuantity: 5,
    status: "pending",
    ...overrides,
  };
}

describe("showQueueMove statuses", () => {
  it("allows only pending and queued", () => {
    assert.equal(isMovableShowQueueMoveAllocationStatus("pending"), true);
    assert.equal(isMovableShowQueueMoveAllocationStatus("queued"), true);
    assert.equal(isMovableShowQueueMoveAllocationStatus("in_progress"), false);
    assert.equal(isMovableShowQueueMoveAllocationStatus("printed"), false);
    assert.equal(isMovableShowQueueMoveAllocationStatus("done"), false);
    assert.equal(isMovableShowQueueMoveAllocationStatus("canceled"), false);
  });
});

describe("showQueueMove eligibility", () => {
  it("allows Whatnot pre-production source and destination", () => {
    const open = show({ id: "a" });
    assert.equal(isShowQueueMoveSourceEligible(open, now), true);
    assert.equal(isShowQueueMoveDestination(open, now), true);
  });

  it("excludes Internal Gang Sheets and printing destinations", () => {
    assert.equal(
      isShowQueueMoveDestination(show({ id: "igs", source: "staff_gang_sheet" }), now),
      false,
    );
    assert.equal(
      isShowQueueMoveSourceEligible(show({ id: "igs", source: "staff_gang_sheet" }), now),
      false,
    );
    assert.equal(
      isShowQueueMoveDestination(show({ id: "b", productionStatus: "printing" }), now),
      false,
    );
    assert.equal(
      isShowQueueMoveDestination(show({ id: "b", productionStatus: "completed" }), now),
      false,
    );
  });

  it("blocks printing source for move", () => {
    assert.equal(
      isShowQueueMoveSourceEligible(show({ id: "a", productionStatus: "printing" }), now),
      false,
    );
  });
});

describe("showQueueMove collect + combine totals", () => {
  it("moves only pending/queued and leaves other shows untouched in collection", () => {
    const rows = [
      alloc({ id: "m1", status: "pending", allocatedQuantity: 5 }),
      alloc({ id: "m2", status: "queued", allocatedQuantity: 2, printRequestItemId: "item-2" }),
      alloc({ id: "blocked", status: "in_progress", allocatedQuantity: 1 }),
      alloc({ id: "other", upcomingShowId: "show-c", allocatedQuantity: 9 }),
    ];
    const movable = collectMovableShowQueueMoveAllocations(rows, "show-a", "pr-1");
    assert.equal(movable.length, 2);
    assert.equal(
      collectNonMovableActiveShowQueueMoveAllocations(rows, "show-a", "pr-1").map((r) => r.id).join(),
      "blocked",
    );
  });

  it("recomputes 5+3 → 8 without inventing a derived third quantity", () => {
    const sourceAllocations = [
      alloc({ id: "src", allocatedQuantity: 5, status: "pending" }),
      alloc({ id: "stay", printRequestId: "pr-other", allocatedQuantity: 1, status: "pending" }),
    ];
    const destinationAllocations = [
      alloc({
        id: "dest-existing",
        upcomingShowId: "show-b",
        allocatedQuantity: 3,
        status: "pending",
      }),
    ];
    const result = recomputeShowAllocatedQuantityAfterMove({
      sourceShowId: "show-a",
      destinationShowId: "show-b",
      sourceAllocations,
      destinationAllocations,
      movedSourceIds: new Set(["src"]),
      movedQuantities: [{ printRequestId: "pr-1", allocatedQuantity: 5 }],
    });
    assert.equal(result.sourceAllocatedQuantity, 1);
    assert.equal(result.destinationAllocatedQuantity, 8);
  });
});

describe("showQueueMove capacity + checksum", () => {
  it("allows exact fill and blocks over capacity", () => {
    const exact = computeShowQueueMoveCapacityProjection({
      destinationAllocatedQuantity: 90,
      maxTotalQuantity: 100,
      totalMoveQuantity: 10,
    });
    assert.equal(exact.capacityBlocker, null);
    assert.equal(exact.destinationProjectedAllocatedQuantity, 100);

    const over = computeShowQueueMoveCapacityProjection({
      destinationAllocatedQuantity: 90,
      maxTotalQuantity: 100,
      totalMoveQuantity: 11,
    });
    assert.ok(over.capacityBlocker);
  });

  it("checksum changes when source quantity changes", () => {
    const base = {
      scope: "print_request" as const,
      sourceShowId: "show-a",
      destinationShowId: "show-b",
      printRequestId: "pr-1",
      sourceProductionStatus: "open",
      destinationProductionStatus: "open",
      sourceAllocations: [{ id: "a1", status: "pending", allocatedQuantity: 5 }],
      destinationAllocatedQuantity: 3,
      maxTotalQuantity: 100,
    };
    const first = buildShowQueueMovePreviewChecksum(base);
    const second = buildShowQueueMovePreviewChecksum({
      ...base,
      sourceAllocations: [{ id: "a1", status: "pending", allocatedQuantity: 6 }],
    });
    assert.notEqual(first, second);
    assert.equal(verifyShowQueueMovePreviewChecksum(first, base), true);
    assert.equal(verifyShowQueueMovePreviewChecksum(first, {
      ...base,
      destinationAllocatedQuantity: 4,
    }), false);
  });
});

describe("showQueueMove preview assemble", () => {
  it("blocks whole-show when any non-movable allocation exists", () => {
    const preview = assembleShowQueueMovePreview({
      scope: "whole_show",
      sourceShow: show({ id: "show-a", allocatedQuantity: 6 }),
      destinationShow: show({ id: "show-b", allocatedQuantity: 3 }),
      movableAllocations: [alloc({ id: "ok", allocatedQuantity: 5 })],
      nonMovableAllocations: [alloc({ id: "bad", status: "printed", allocatedQuantity: 1 })],
      allAllocationsForRequests: [],
      now,
    });
    assert.equal(preview.canApply, false);
    assert.ok(preview.blockers.some((blocker) => blocker.code === "non_movable_allocations"));
  });

  it("marks same PR already on destination and sets checksum when clear", () => {
    const movable = [alloc({ id: "src", allocatedQuantity: 5 })];
    const preview = assembleShowQueueMovePreview({
      scope: "print_request",
      sourceShow: show({ id: "show-a", allocatedQuantity: 5 }),
      destinationShow: show({ id: "show-b", allocatedQuantity: 3 }),
      movableAllocations: movable,
      nonMovableAllocations: [],
      allAllocationsForRequests: [
        ...movable,
        alloc({
          id: "dest",
          upcomingShowId: "show-b",
          allocatedQuantity: 3,
          status: "pending",
        }),
      ],
      printRequestId: "pr-1",
      now,
    });
    assert.equal(preview.canApply, true);
    assert.equal(preview.lines[0]?.alreadyOnDestination, true);
    assert.equal(preview.destinationProjectedAllocatedQuantity, 8);
    assert.ok(preview.previewChecksum);
  });

  it("blocks when movable count exceeds transaction budget", () => {
    const movable = Array.from({ length: SHOW_QUEUE_MOVE_MAX_ALLOCATIONS + 1 }, (_, index) =>
      alloc({
        id: `a-${index}`,
        printRequestId: `pr-${index}`,
        allocatedQuantity: 1,
      }),
    );
    const preview = assembleShowQueueMovePreview({
      scope: "whole_show",
      sourceShow: show({ id: "show-a", allocatedQuantity: movable.length }),
      destinationShow: show({ id: "show-b", allocatedQuantity: 0, maxTotalQuantity: 10000 }),
      movableAllocations: movable,
      nonMovableAllocations: [],
      allAllocationsForRequests: movable,
      now,
    });
    assert.equal(preview.canApply, false);
    assert.ok(preview.blockers.some((blocker) => blocker.code === "too_many_allocations"));
  });
});
