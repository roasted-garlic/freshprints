import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "../types/upcomingShow/upcomingShow.types";
import {
  isWhatnotQueueSurfaceShow,
  isWhatnotUpcomingShow,
} from "../types/upcomingShow/upcomingShow.types";
import {
  buildClientShowProductionRecoveryPreview,
  computeShowAllocatedQuantityFromAllocations,
  deriveShowNeedsAttentionReason,
  getWhatnotShowQueueTab,
  isShowQueuePastReadOnlyShow,
  isShowQueueProductionRecoveryEligible,
  isUnresolvedPastWhatnotShow,
  partitionWhatnotShowsByQueueTab,
  resolveProductionRecoveryPreviewOutcome,
  resolveProductionResolutionKindForAction,
  resolveWhatnotQueueTabForStillExistingSelection,
  shouldTransitionActiveRequestToEditing,
  isEmptyPastShowNeedingAutoClose,
  validateProductionOverrideReason,
} from "./showProductionRecovery";
import { getDerivedShowStatusDisplay } from "./showCapacityDisplay";
import { planProductionRecoveryMutation } from "./showProductionRecoveryPlanners";

function buildShow(overrides: Partial<UpcomingShow> = {}): UpcomingShow {
  return {
    id: "show-1",
    source: "whatnot",
    whatnotShowId: "wn-100",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    accumulatedPrintMs: 0,
    createdAt: { toDate: () => new Date("2026-01-01") } as UpcomingShow["createdAt"],
    updatedAt: { toDate: () => new Date("2026-01-01") } as UpcomingShow["updatedAt"],
    ...overrides,
  };
}

function timestamp(iso: string) {
  const millis = new Date(iso).getTime();
  return { toMillis: () => millis, toDate: () => new Date(millis) } as UpcomingShow["scheduledStartAt"];
}

describe("Whatnot show queue tabs", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("places unresolved past open show in needs_attention", () => {
    const show = buildShow({
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
      allocatedQuantity: 12,
    });
    assert.equal(isUnresolvedPastWhatnotShow(show, now), true);
    assert.equal(getWhatnotShowQueueTab(show, now), "needs_attention");
  });

  it("places empty past open show in past tab (skips Needs Attention)", () => {
    const show = buildShow({
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
      allocatedQuantity: 0,
    });
    assert.equal(isUnresolvedPastWhatnotShow(show, now), false);
    assert.equal(getWhatnotShowQueueTab(show, now), "past");
    assert.equal(isEmptyPastShowNeedingAutoClose(show, now), true);
  });

  it("places completed past show in past tab only", () => {
    const show = buildShow({
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "completed",
    });
    assert.equal(getWhatnotShowQueueTab(show, now), "past");
  });

  it("partitions shows mutually exclusively", () => {
    const upcoming = buildShow({ id: "u", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const needs = buildShow({
      id: "n",
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
      allocatedQuantity: 8,
    });
    const past = buildShow({
      id: "p",
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "completed",
    });
    const partitioned = partitionWhatnotShowsByQueueTab([upcoming, needs, past], now);
    assert.deepEqual(partitioned.upcoming.map((s) => s.id), ["u"]);
    assert.deepEqual(partitioned.needs_attention.map((s) => s.id), ["n"]);
    assert.deepEqual(partitioned.past.map((s) => s.id), ["p"]);
  });

  it("includes DEV fixture shows in upcoming/past tabs", () => {
    const devFixture = buildShow({
      id: "dev-1",
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      whatnotShowId: undefined,
      scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
    });
    const staffSheet = buildShow({
      id: "sgs-1",
      source: "staff_gang_sheet",
      whatnotShowId: undefined,
      staffGangSheetCycleNumber: 1,
      scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
    });

    const partitioned = partitionWhatnotShowsByQueueTab([devFixture, staffSheet], now);
    assert.deepEqual(partitioned.upcoming.map((s) => s.id), ["dev-1"]);
    assert.deepEqual(partitioned.needs_attention.map((s) => s.id), []);
    assert.deepEqual(partitioned.past.map((s) => s.id), []);
    assert.equal(getWhatnotShowQueueTab(devFixture, now), "upcoming");
  });

  it("places unresolved past dev_fixture in needs_attention", () => {
    const devFixture = buildShow({
      id: "dev-past-open",
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      whatnotShowId: undefined,
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
      allocatedQuantity: 5,
    });

    assert.equal(isUnresolvedPastWhatnotShow(devFixture, now), true);
    assert.equal(getWhatnotShowQueueTab(devFixture, now), "needs_attention");
    assert.equal(isShowQueuePastReadOnlyShow(devFixture, now), false);
  });

  it("places completed past dev_fixture in past tab only", () => {
    const devFixture = buildShow({
      id: "dev-past-done",
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "completed",
    });

    assert.equal(getWhatnotShowQueueTab(devFixture, now), "past");
    assert.equal(isShowQueuePastReadOnlyShow(devFixture, now), true);
  });

  it("shows DID NOT PRINT for dev_fixture after unfulfilled release resolution", () => {
    const devFixture = buildShow({
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "completed",
      productionResolutionKind: "unfulfilled_release",
    });
    const display = getDerivedShowStatusDisplay("completed", null, {
      productionResolutionKind: devFixture.productionResolutionKind,
    });
    assert.equal(display.label, "DID NOT PRINT");
    assert.equal(getWhatnotShowQueueTab(devFixture, now), "past");
  });

  it("shows DID NOT PRINT for unfulfilled_requeue resolution", () => {
    const display = getDerivedShowStatusDisplay(
      "completed",
      { allocatedQuantity: 0, isFull: false, isOverCapacity: false },
      { productionResolutionKind: "unfulfilled_requeue" },
    );
    assert.equal(display.label, "DID NOT PRINT");
  });

  it("keeps unresolved imported Whatnot shows in needs_attention", () => {
    const show = buildShow({
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
      whatnotShowId: "wn-import-1",
      allocatedQuantity: 4,
    });
    assert.equal(getWhatnotShowQueueTab(show, now), "needs_attention");
  });

  it("uses current scheduledStartAt after metadata edit (not a stale original time)", () => {
    const editedShow = buildShow({
      id: "edited-schedule",
      scheduledStartAt: timestamp("2026-08-01T12:09:00Z"),
      productionStatus: "open",
      allocatedQuantity: 6,
    });
    const beforeEditedStart = new Date("2026-08-01T12:08:59Z");
    const atEditedStart = new Date("2026-08-01T12:09:00Z");
    const laterOriginalSlot = new Date("2026-08-01T12:11:00Z");

    assert.equal(getWhatnotShowQueueTab(editedShow, beforeEditedStart), "upcoming");
    assert.equal(getWhatnotShowQueueTab(editedShow, atEditedStart), "needs_attention");
    assert.equal(getWhatnotShowQueueTab(editedShow, laterOriginalSlot), "needs_attention");

    const reclassifiedTab = resolveWhatnotQueueTabForStillExistingSelection(
      [editedShow],
      editedShow.id,
      "upcoming",
      atEditedStart,
    );
    assert.equal(reclassifiedTab, "needs_attention");
  });

  it("dev_fixture is queue surface but excluded from Whatnot import identity", () => {
    const devFixture = buildShow({
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
    });
    assert.equal(isWhatnotQueueSurfaceShow(devFixture), true);
    assert.equal(isWhatnotUpcomingShow(devFixture), false);
    assert.equal(isShowQueueProductionRecoveryEligible(devFixture), true);
  });
});

describe("production recovery preview outcomes", () => {
  it("allows close empty when no allocations", () => {
    const outcome = resolveProductionRecoveryPreviewOutcome("close_empty", {
      productionStatus: "open",
      isPast: true,
      isWhatnot: true,
      activeAllocationCount: 0,
      finishableAllocationCount: 0,
    });
    assert.equal(outcome, "applied");
  });

  it("allows dev_fixture recovery when queue-surface eligible", () => {
    const devFixture = buildShow({
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
    });
    const preview = buildClientShowProductionRecoveryPreview({
      upcomingShowId: devFixture.id,
      action: "release_unfulfilled",
      show: devFixture,
      allocations: [{ status: "queued", allocatedQuantity: 2, upcomingShowId: devFixture.id }],
      now: new Date("2026-07-05T12:00:00Z"),
    });
    assert.equal(preview.outcome, "applied");
  });

  it("blocks close empty when allocations exist", () => {
    const outcome = resolveProductionRecoveryPreviewOutcome("close_empty", {
      productionStatus: "open",
      isPast: true,
      isWhatnot: true,
      activeAllocationCount: 2,
      finishableAllocationCount: 2,
    });
    assert.equal(outcome, "blocked");
  });

  it("allows requeue when finishable rows and valid target exist", () => {
    const outcome = resolveProductionRecoveryPreviewOutcome("requeue_unfulfilled", {
      productionStatus: "open",
      isPast: true,
      isWhatnot: true,
      activeAllocationCount: 2,
      finishableAllocationCount: 2,
      targetUpcomingShowId: "target-show",
      requeueTargetValid: true,
      requeueCapacityValid: true,
    });
    assert.equal(outcome, "applied");
    assert.equal(resolveProductionResolutionKindForAction("requeue_unfulfilled"), "unfulfilled_requeue");
  });
});

describe("ADR-FP-071 guard", () => {
  it("does not transition active to editing when another active editing exists", () => {
    assert.equal(
      shouldTransitionActiveRequestToEditing({
        requestStatus: "active",
        hasActiveAllocationsGlobally: false,
        hasOtherContinuableRequest: true,
        isInternal: false,
      }),
      false,
    );
  });

  it("allows editing recovery when sole continuable slot", () => {
    assert.equal(
      shouldTransitionActiveRequestToEditing({
        requestStatus: "active",
        hasActiveAllocationsGlobally: false,
        hasOtherContinuableRequest: false,
        isInternal: false,
      }),
      true,
    );
  });

  it("allows transition when other is parkable draft (not active editing)", () => {
    // Updated semantics: hasOtherContinuableRequest now means
    // "has other ACTIVE editable Continuable that isn't a parkable single draft"
    assert.equal(
      shouldTransitionActiveRequestToEditing({
        requestStatus: "active",
        hasActiveAllocationsGlobally: false,
        hasOtherContinuableRequest: false, // parkable draft doesn't count as blocking
        isInternal: false,
      }),
      true,
    );
  });
});

describe("override reason validation", () => {
  it("rejects empty reason", () => {
    assert.match(validateProductionOverrideReason("   ") ?? "", /required/i);
  });

  it("rejects overlong reason", () => {
    assert.match(validateProductionOverrideReason("x".repeat(501)) ?? "", /500/);
  });
});

describe("recovery mutation planner", () => {
  it("plans release as cancel + complete", () => {
    const plan = planProductionRecoveryMutation("release_unfulfilled", {
      productionStatus: "open",
      upcomingShowId: "show-a",
      allocationsOnShow: [
        { status: "queued", allocatedQuantity: 3, upcomingShowId: "show-a" },
      ],
    });
    assert.equal(plan.canApply, true);
    assert.equal(plan.cancelAllocations, true);
    assert.equal(plan.requeueAllocations, false);
    assert.equal(plan.completeShow, true);
  });

  it("plans requeue as cancel finishable + create on target + complete", () => {
    const plan = planProductionRecoveryMutation("requeue_unfulfilled", {
      productionStatus: "open",
      upcomingShowId: "show-a",
      allocationsOnShow: [
        { status: "queued", allocatedQuantity: 3, upcomingShowId: "show-a" },
      ],
    });
    assert.equal(plan.canApply, true);
    assert.equal(plan.cancelAllocations, true);
    assert.equal(plan.requeueAllocations, true);
    assert.equal(plan.completeShow, true);
  });

  it("plans fulfilled as finish allocations + complete", () => {
    const plan = planProductionRecoveryMutation("mark_fulfilled", {
      productionStatus: "open",
      upcomingShowId: "show-a",
      allocationsOnShow: [
        { status: "queued", allocatedQuantity: 2, upcomingShowId: "show-a" },
      ],
    });
    assert.equal(plan.finishAllocations, true);
    assert.equal(plan.completeShow, true);
  });
});

describe("allocated quantity recompute", () => {
  it("sums only non-canceled allocations on show", () => {
    const total = computeShowAllocatedQuantityFromAllocations(
      [
        { status: "queued", allocatedQuantity: 2, upcomingShowId: "s1" },
        { status: "canceled", allocatedQuantity: 5, upcomingShowId: "s1" },
        { status: "done", allocatedQuantity: 1, upcomingShowId: "s1" },
      ],
      "s1",
    );
    assert.equal(total, 3);
  });
});

describe("needs attention reasons", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("labels empty past show", () => {
    const show = buildShow({
      scheduledStartAt: timestamp("2026-06-01T00:00:00Z"),
      productionStatus: "open",
      allocatedQuantity: 0,
    });
    assert.equal(getWhatnotShowQueueTab(show, now), "past");
    assert.equal(isUnresolvedPastWhatnotShow(show, now), false);
    assert.equal(isEmptyPastShowNeedingAutoClose(show, now), true);

    const reason = deriveShowNeedsAttentionReason({
      show,
      now,
      activeAllocationCount: 0,
      finishableAllocationCount: 0,
      printStartedAtPresent: false,
    });
    assert.equal(reason, "inconsistent_state");
  });
});
