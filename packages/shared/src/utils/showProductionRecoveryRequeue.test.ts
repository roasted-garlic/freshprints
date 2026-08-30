import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "../types/upcomingShow/upcomingShow.types";
import {
  buildNeedsStaffRequeuePatch,
  clearNeedsStaffRequeuePatch,
  hasNeedsStaffRequeueMarker,
} from "./printRequestStaffRequeue";
import {
  getPrintRequestWorkingTriageLabel,
  matchesPrintRequestWorkingTriageFilter,
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  resolvePrintRequestWorkingTriageBucket,
} from "./printRequestWorkingTriage";
import {
  buildClientShowProductionRecoveryPreview,
  resolveProductionRecoveryPreviewOutcome,
  resolveProductionResolutionKindForAction,
} from "./showProductionRecovery";
import { planProductionRecoveryMutation } from "./showProductionRecoveryPlanners";
import {
  buildRequeueLines,
  buildShowProductionRecoveryPreviewChecksum,
  buildShowProductionRequeueTargetShow,
  collectRequeueEligibleAllocations,
  computeRequeueCapacityProjection,
  countFinishableAllocationsOnShow,
  formatRequeueUnfulfilledSuccessMessage,
  hasActiveNonFinishableAllocationsOnShow,
  isPrintRequestBlockedFromRecovery,
  SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS,
  sumRequeueEligibleQuantity,
  validateRequeueTargetShow,
  verifyShowProductionRecoveryPreviewChecksum,
  type RequeueAllocationSnapshot,
} from "./showProductionRecoveryRequeue";
import { getDerivedShowStatusDisplay } from "./showCapacityDisplay";

function timestamp(iso: string) {
  const millis = new Date(iso).getTime();
  return { toMillis: () => millis, toDate: () => new Date(millis) };
}

function buildAllocation(
  overrides: Partial<RequeueAllocationSnapshot> & Pick<RequeueAllocationSnapshot, "id">,
): RequeueAllocationSnapshot {
  return {
    upcomingShowId: "source-show",
    printRequestId: "req-1",
    printRequestItemId: "item-1",
    requestNameSnapshot: "Request One",
    allocatedQuantity: 1,
    status: "queued",
    ...overrides,
  };
}

function buildShow(overrides: Partial<UpcomingShow> = {}): UpcomingShow {
  return {
    id: "source-show",
    source: "whatnot",
    whatnotShowId: "wn-100",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    accumulatedPrintMs: 0,
    scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
    createdAt: timestamp("2026-01-01") as UpcomingShow["createdAt"],
    updatedAt: timestamp("2026-01-01") as UpcomingShow["updatedAt"],
    ...overrides,
  };
}

describe("collectRequeueEligibleAllocations", () => {
  it("includes only finishable non-canceled rows on the source show", () => {
    const allocations = [
      buildAllocation({ id: "a1", status: "queued", allocatedQuantity: 3 }),
      buildAllocation({ id: "a2", status: "printed", allocatedQuantity: 2 }),
      buildAllocation({ id: "a3", status: "done", allocatedQuantity: 1 }),
      buildAllocation({ id: "a4", status: "canceled", allocatedQuantity: 5 }),
      buildAllocation({ id: "a5", status: "in_progress", allocatedQuantity: 4 }),
      buildAllocation({
        id: "a6",
        upcomingShowId: "other-show",
        status: "queued",
        allocatedQuantity: 9,
      }),
    ];

    const eligible = collectRequeueEligibleAllocations(allocations, "source-show");
    assert.deepEqual(
      eligible.map((row) => row.id),
      ["a1", "a5"],
    );
    assert.equal(sumRequeueEligibleQuantity(allocations, "source-show"), 7);
  });

  it("supports split allocation rows independently", () => {
    const allocations = [
      buildAllocation({
        id: "split-a",
        printRequestId: "req-split",
        printRequestItemId: "item-a",
        allocatedQuantity: 2,
      }),
      buildAllocation({
        id: "split-b",
        printRequestId: "req-split",
        printRequestItemId: "item-a",
        upcomingShowId: "other-show",
        allocatedQuantity: 3,
      }),
    ];

    const eligible = collectRequeueEligibleAllocations(allocations, "source-show");
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0]?.allocatedQuantity, 2);
  });
});

describe("buildRequeueLines", () => {
  it("groups by print request and counts other-show quantity", () => {
    const all = [
      buildAllocation({ id: "r1a", printRequestId: "req-a", allocatedQuantity: 2 }),
      buildAllocation({ id: "r1b", printRequestId: "req-a", allocatedQuantity: 1 }),
      buildAllocation({
        id: "r2",
        printRequestId: "req-b",
        requestNameSnapshot: "Beta Request",
        allocatedQuantity: 4,
      }),
      buildAllocation({
        id: "other",
        printRequestId: "req-a",
        upcomingShowId: "other-show",
        allocatedQuantity: 5,
        status: "queued",
      }),
    ];

    const eligible = collectRequeueEligibleAllocations(all, "source-show");
    const lines = buildRequeueLines(eligible, all, "source-show");

    assert.equal(lines.length, 2);
    const reqA = lines.find((line) => line.printRequestId === "req-a");
    assert.equal(reqA?.allocationCount, 2);
    assert.equal(reqA?.requeueQuantity, 3);
    assert.equal(reqA?.otherShowAllocationQuantity, 5);
  });
});

describe("requeue split-allocation warning (preview)", () => {
  const printRequestId = "req-cr005";

  function buildCr005Allocations(
    rows: Array<Partial<RequeueAllocationSnapshot> & Pick<RequeueAllocationSnapshot, "id">>,
  ): RequeueAllocationSnapshot[] {
    return rows.map((row) =>
      buildAllocation({
        printRequestId,
        requestNameSnapshot: "roasted_garlic-CR005",
        ...row,
      }),
    );
  }

  function previewWarningFromAllocations(all: RequeueAllocationSnapshot[]): boolean {
    const eligible = collectRequeueEligibleAllocations(all, "source-show");
    const lines = buildRequeueLines(eligible, all, "source-show");
    return lines.some((line) => line.otherShowAllocationQuantity > 0);
  }

  it("single-show request: source-only quantity does not trigger split warning", () => {
    const all = buildCr005Allocations([
      { id: "source-only", status: "queued", allocatedQuantity: 5 },
    ]);

    const eligible = collectRequeueEligibleAllocations(all, "source-show");
    const lines = buildRequeueLines(eligible, all, "source-show");

    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.requeueQuantity, 5);
    assert.equal(lines[0]?.otherShowAllocationQuantity, 0);
    assert.equal(previewWarningFromAllocations(all), false);
  });

  it("real split allocation: only source finishable quantity moves and warning is present", () => {
    const all = buildCr005Allocations([
      { id: "source-split", status: "queued", allocatedQuantity: 4 },
      {
        id: "other-split",
        upcomingShowId: "other-show",
        status: "queued",
        allocatedQuantity: 6,
      },
    ]);

    const eligible = collectRequeueEligibleAllocations(all, "source-show");
    const lines = buildRequeueLines(eligible, all, "source-show");

    assert.equal(lines[0]?.requeueQuantity, 4);
    assert.equal(lines[0]?.otherShowAllocationQuantity, 6);
    assert.equal(previewWarningFromAllocations(all), true);
    assert.equal(sumRequeueEligibleQuantity(all, "source-show"), 4);
  });

  it("canceled allocation on another show does not trigger split warning", () => {
    const all = buildCr005Allocations([
      { id: "source-row", status: "queued", allocatedQuantity: 5 },
      {
        id: "other-canceled",
        upcomingShowId: "other-show",
        status: "canceled",
        allocatedQuantity: 6,
      },
    ]);

    assert.equal(previewWarningFromAllocations(all), false);
  });

  it("printed/done on another show still counts toward split warning quantity", () => {
    const all = buildCr005Allocations([
      { id: "source-row", status: "queued", allocatedQuantity: 4 },
      {
        id: "other-printed",
        upcomingShowId: "other-show",
        status: "printed",
        allocatedQuantity: 6,
      },
    ]);

    const lines = buildRequeueLines(
      collectRequeueEligibleAllocations(all, "source-show"),
      all,
      "source-show",
    );

    assert.equal(lines[0]?.requeueQuantity, 4);
    assert.equal(lines[0]?.otherShowAllocationQuantity, 6);
    assert.equal(previewWarningFromAllocations(all), true);
  });

  it("planned destination rows must not be passed into split detection (would false-positive)", () => {
    const persistedOnly = buildCr005Allocations([
      { id: "source-row", status: "queued", allocatedQuantity: 5 },
    ]);

    const erroneouslyIncludingPlannedDestination: RequeueAllocationSnapshot[] = [
      ...persistedOnly,
      {
        id: "planned-destination",
        upcomingShowId: "target-show",
        printRequestId,
        requestNameSnapshot: "roasted_garlic-CR005",
        allocatedQuantity: 5,
        status: "pending",
      },
    ];

    assert.equal(previewWarningFromAllocations(persistedOnly), false);
    assert.equal(previewWarningFromAllocations(erroneouslyIncludingPlannedDestination), true);
  });

  it("client requeue preview keeps totalRequeueQuantity unchanged for single-show case", () => {
    const preview = buildClientShowProductionRecoveryPreview({
      upcomingShowId: "source-show",
      action: "requeue_unfulfilled",
      show: buildShow({ id: "source-show" }),
      allocations: [
        {
          id: "alloc-cr005",
          status: "queued",
          allocatedQuantity: 5,
          upcomingShowId: "source-show",
          printRequestId,
          requestNameSnapshot: "roasted_garlic-CR005",
        },
      ],
      now: new Date("2026-07-05T12:00:00Z"),
      targetUpcomingShowId: "target-show",
      targetShow: buildShow({
        id: "target-show",
        scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
        maxTotalQuantity: 200,
        allocatedQuantity: 7,
      }),
    });

    assert.equal(preview.totalRequeueQuantity, 5);
    assert.equal(preview.otherShowAllocationWarning, false);
  });
});

describe("validateRequeueTargetShow", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("requires a distinct upcoming destination", () => {
    assert.equal(validateRequeueTargetShow("source-show", "", null, now).valid, false);
    assert.equal(
      validateRequeueTargetShow("source-show", "source-show", buildShow(), now).valid,
      false,
    );
  });

  it("accepts eligible upcoming Whatnot shows", () => {
    const target = buildShow({
      id: "target-show",
      scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
      productionStatus: "open",
      maxTotalQuantity: 100,
      allocatedQuantity: 10,
    });
    assert.equal(
      validateRequeueTargetShow("source-show", "target-show", target, now).valid,
      true,
    );
  });

  it("rejects past or terminal destinations", () => {
    const past = buildShow({
      id: "past-show",
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
    });
    const done = buildShow({
      id: "done-show",
      scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
      productionStatus: "completed",
    });

    assert.equal(validateRequeueTargetShow("source-show", "past-show", past, now).valid, false);
    assert.equal(validateRequeueTargetShow("source-show", "done-show", done, now).valid, false);
  });

  it("allows dev_fixture destinations on DEV", () => {
    const devTarget = buildShow({
      id: "dev-target",
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      whatnotShowId: undefined,
      scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
    });
    assert.equal(
      validateRequeueTargetShow("source-show", "dev-target", devTarget, now).valid,
      true,
    );
  });
});

describe("computeRequeueCapacityProjection", () => {
  it("projects destination capacity before apply", () => {
    const projection = computeRequeueCapacityProjection({
      targetShow: { maxTotalQuantity: 100, allocatedQuantity: 80 },
      totalRequeueQuantity: 15,
    });
    assert.equal(projection.projectedAllocatedQuantity, 95);
    assert.equal(projection.capacityBlocker, null);
  });

  it("blocks when projection exceeds max", () => {
    const projection = computeRequeueCapacityProjection({
      targetShow: { maxTotalQuantity: 50, allocatedQuantity: 45 },
      totalRequeueQuantity: 10,
    });
    assert.equal(projection.isOverCapacity, true);
    assert.equal(projection.capacityBlocker?.code, "capacity_exceeded");
  });

  it("allows exactly filling the destination show", () => {
    const projection = computeRequeueCapacityProjection({
      targetShow: { maxTotalQuantity: 20, allocatedQuantity: 10 },
      totalRequeueQuantity: 10,
    });
    assert.equal(projection.isFull, true);
    assert.equal(projection.isOverCapacity, false);
    assert.equal(projection.capacityBlocker, null);
  });
});

describe("preview checksum", () => {
  it("is stable for identical canonical payloads", () => {
    const allocations = [
      buildAllocation({ id: "b", allocatedQuantity: 2 }),
      buildAllocation({ id: "a", allocatedQuantity: 1 }),
    ];
    const input = {
      upcomingShowId: "source-show",
      action: "requeue_unfulfilled",
      targetUpcomingShowId: "target-show",
      sourceProductionStatus: "open",
      predictedResolutionKind: "unfulfilled_requeue" as const,
      sourceAllocations: allocations,
      targetShow: { id: "target-show", maxTotalQuantity: 100, allocatedQuantity: 5 },
    };

    const checksumA = buildShowProductionRecoveryPreviewChecksum(input);
    const checksumB = buildShowProductionRecoveryPreviewChecksum({
      ...input,
      sourceAllocations: [...allocations].reverse(),
    });

    assert.equal(checksumA, checksumB);
    assert.equal(verifyShowProductionRecoveryPreviewChecksum(checksumA, input), true);
    assert.equal(verifyShowProductionRecoveryPreviewChecksum("stale", input), false);
  });

  it("changes when allocation quantities change", () => {
    const base = {
      upcomingShowId: "source-show",
      action: "requeue_unfulfilled",
      targetUpcomingShowId: "target-show",
      sourceProductionStatus: "open",
      predictedResolutionKind: "unfulfilled_requeue" as const,
      targetShow: { id: "target-show", maxTotalQuantity: 100, allocatedQuantity: 5 },
    };

    const first = buildShowProductionRecoveryPreviewChecksum({
      ...base,
      sourceAllocations: [buildAllocation({ id: "a1", allocatedQuantity: 2 })],
    });
    const second = buildShowProductionRecoveryPreviewChecksum({
      ...base,
      sourceAllocations: [buildAllocation({ id: "a1", allocatedQuantity: 3 })],
    });

    assert.notEqual(first, second);
  });
});

describe("isPrintRequestBlockedFromRecovery", () => {
  it("blocks converted customer requests", () => {
    assert.equal(
      isPrintRequestBlockedFromRecovery({
        closureKind: "converted_to_internal",
        convertedToInternalRequestId: "ir-1",
      }),
      true,
    );
    assert.equal(
      isPrintRequestBlockedFromRecovery({
        convertedToInternalRequestId: "ir-2",
      }),
      true,
    );
    assert.equal(
      isPrintRequestBlockedFromRecovery({
        convertedToInternalRequestId: "",
      }),
      false,
    );
  });
});

describe("mixed fulfillment edge cases", () => {
  it("detects printed/done rows left on source while finishable rows move", () => {
    const allocations = [
      buildAllocation({ id: "finish", status: "queued", allocatedQuantity: 2 }),
      buildAllocation({ id: "printed", status: "printed", allocatedQuantity: 1 }),
    ];

    assert.equal(countFinishableAllocationsOnShow(allocations, "source-show"), 1);
    assert.equal(hasActiveNonFinishableAllocationsOnShow(allocations, "source-show"), true);
  });

  it("blocks requeue preview when only printed/done remain active", () => {
    const outcome = resolveProductionRecoveryPreviewOutcome("requeue_unfulfilled", {
      productionStatus: "open",
      isPast: true,
      isWhatnot: true,
      activeAllocationCount: 2,
      finishableAllocationCount: 0,
      targetUpcomingShowId: "target-show",
      requeueTargetValid: true,
      requeueCapacityValid: true,
    });
    assert.equal(outcome, "blocked");
  });
});

describe("transaction threshold", () => {
  it("blocks when finishable allocation count exceeds limit", () => {
    const outcome = resolveProductionRecoveryPreviewOutcome("requeue_unfulfilled", {
      productionStatus: "open",
      isPast: true,
      isWhatnot: true,
      activeAllocationCount: SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS + 1,
      finishableAllocationCount: SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS + 1,
      targetUpcomingShowId: "target-show",
      requeueTargetValid: true,
      requeueCapacityValid: true,
    });
    assert.equal(outcome, "blocked");
  });
});

describe("needs staff requeue helpers", () => {
  it("builds and clears persisted marker fields", () => {
    const markedAt = timestamp("2026-07-01") as never;
    const patch = buildNeedsStaffRequeuePatch({
      sourceShowId: "missed-show",
      sourceShowTitleSnapshot: "  Missed Live  ",
      releasedQuantity: 12,
      markedAt,
    });

    assert.equal(patch.needsStaffRequeueSourceShowId, "missed-show");
    assert.equal(patch.needsStaffRequeueSourceShowTitleSnapshot, "Missed Live");
    assert.equal(patch.needsStaffRequeueReleasedQuantity, 12);
    assert.equal(hasNeedsStaffRequeueMarker({ needsStaffRequeueAt: markedAt }), true);
    assert.deepEqual(clearNeedsStaffRequeuePatch(), {
      needsStaffRequeueAt: undefined,
      needsStaffRequeueSourceShowId: undefined,
      needsStaffRequeueSourceShowTitleSnapshot: undefined,
      needsStaffRequeueReleasedQuantity: undefined,
    });
  });

  it("formats requeue success overview for staff UI", () => {
    const message = formatRequeueUnfulfilledSuccessMessage({
      sourceShowTitle: "Monday Evening DTF show",
      targetShowTitle: "Aug 31 Evening show",
      totalQuantity: 5,
      affectedPrintRequestIds: ["req-cr005"],
      requeueLines: [
        {
          printRequestId: "req-cr005",
          requestNameSnapshot: "roasted_garlic-CR005",
          requeueQuantity: 5,
        },
      ],
    });

    assert.match(message, /Monday Evening DTF show/);
    assert.match(message, /Aug 31 Evening show/);
    assert.match(message, /5 prints/);
    assert.match(message, /roasted_garlic-CR005 \(5\)/);
  });
});

describe("working triage precedence", () => {
  const nowMs = Date.UTC(2026, 6, 13, 12, 0, 0);
  const staleMs = nowMs - 20 * 24 * 60 * 60 * 1000;

  it("lists needs_requeue last in filter order", () => {
    assert.equal(
      PRINT_REQUEST_WORKING_TRIAGE_FILTERS[PRINT_REQUEST_WORKING_TRIAGE_FILTERS.length - 1],
      "needs_requeue",
    );
    assert.equal(getPrintRequestWorkingTriageLabel("needs_requeue"), "Needs Re-queue");
  });

  it("prefers needs_requeue bucket over stale", () => {
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({
        itemCount: 3,
        updatedAtMillis: staleMs,
        needsStaffRequeueAt: timestamp("2026-07-01"),
        nowMs,
      }),
      "needs_requeue",
    );
    assert.equal(matchesPrintRequestWorkingTriageFilter("needs_requeue", "needs_requeue"), true);
    assert.equal(matchesPrintRequestWorkingTriageFilter("active", "needs_requeue"), false);
  });
});

describe("resolution kind and planner", () => {
  it("maps requeue action to unfulfilled_requeue resolution", () => {
    assert.equal(resolveProductionResolutionKindForAction("requeue_unfulfilled"), "unfulfilled_requeue");
  });

  it("plans requeue as cancel finishable, create on target, complete show", () => {
    const plan = planProductionRecoveryMutation("requeue_unfulfilled", {
      productionStatus: "open",
      upcomingShowId: "source-show",
      allocationsOnShow: [
        { status: "queued", allocatedQuantity: 2, upcomingShowId: "source-show" },
        { status: "printed", allocatedQuantity: 1, upcomingShowId: "source-show" },
      ],
    });
    assert.equal(plan.canApply, true);
    assert.equal(plan.cancelAllocations, true);
    assert.equal(plan.requeueAllocations, true);
    assert.equal(plan.completeShow, true);
    assert.equal(plan.finishAllocations, false);
  });
});

describe("client requeue preview", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("returns requeue lines, checksum, and target summary when valid", () => {
    const sourceShow = buildShow({ id: "source-show" });
    const targetShow = buildShow({
      id: "target-show",
      title: "Next Live",
      scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
      maxTotalQuantity: 50,
      allocatedQuantity: 5,
    });

    const preview = buildClientShowProductionRecoveryPreview({
      upcomingShowId: "source-show",
      action: "requeue_unfulfilled",
      show: sourceShow,
      allocations: [
        {
          id: "alloc-1",
          status: "queued",
          allocatedQuantity: 4,
          upcomingShowId: "source-show",
          printRequestId: "req-1",
          requestNameSnapshot: "Alpha",
        },
      ],
      now,
      targetUpcomingShowId: "target-show",
      targetShow,
    });

    assert.equal(preview.outcome, "applied");
    assert.equal(preview.totalRequeueQuantity, 4);
    assert.equal(preview.requeueLines?.length, 1);
    assert.equal(preview.targetShow?.title, "Next Live");
    assert.equal(preview.targetShow?.projectedAllocatedQuantity, 9);
    assert.match(preview.previewChecksum ?? "", /^[a-f0-9]{64}$/);
  });

  it("blocks when destination capacity would be exceeded", () => {
    const preview = buildClientShowProductionRecoveryPreview({
      upcomingShowId: "source-show",
      action: "requeue_unfulfilled",
      show: buildShow({ id: "source-show" }),
      allocations: [
        {
          id: "alloc-1",
          status: "queued",
          allocatedQuantity: 20,
          upcomingShowId: "source-show",
          printRequestId: "req-1",
        },
      ],
      now,
      targetUpcomingShowId: "target-show",
      targetShow: buildShow({
        id: "target-show",
        scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
        maxTotalQuantity: 25,
        allocatedQuantity: 20,
      }),
    });

    assert.equal(preview.outcome, "blocked");
    assert.equal(preview.capacityBlocker?.code, "capacity_exceeded");
  });
});

describe("DID NOT PRINT display for unfulfilled_requeue", () => {
  it("shows DID NOT PRINT pill for requeue-completed shows", () => {
    const display = getDerivedShowStatusDisplay(
      "completed",
      { allocatedQuantity: 0, isFull: false, isOverCapacity: false },
      { productionResolutionKind: "unfulfilled_requeue" },
    );
    assert.equal(display.label, "DID NOT PRINT");
  });
});

describe("buildShowProductionRequeueTargetShow", () => {
  it("includes projected capacity on target summary", () => {
    const summary = buildShowProductionRequeueTargetShow(
      buildShow({
        id: "target-show",
        title: "Target",
        scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
        maxTotalQuantity: 30,
        allocatedQuantity: 10,
      }),
      6,
    );
    assert.equal(summary.projectedAllocatedQuantity, 16);
    assert.equal(summary.allocatedQuantity, 10);
  });
});
