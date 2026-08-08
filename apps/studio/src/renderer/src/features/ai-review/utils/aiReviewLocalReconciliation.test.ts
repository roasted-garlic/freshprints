import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  applyAiReviewTabCountDeltas,
  buildAiReviewInboxLocalDesignPatch,
  computeAiReviewInboxActionCountDeltas,
  designLeavesCurrentInboxTab,
  reconcileSuccessfulInboxManualAction,
  recoverFailedInboxManualAction,
  simulateLocalNeedsReviewApprovals,
} from "./aiReviewLocalReconciliation";
import { designMatchesInboxTab } from "./aiReviewInboxEligibility";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Sample Design",
    tags: ["alpha"],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1, toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toMillis: () => 1, toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("computeAiReviewInboxActionCountDeltas", () => {
  it("decrements Needs Review on approve", () => {
    assert.deepEqual(
      computeAiReviewInboxActionCountDeltas({
        action: "approve",
        sourceTab: "needs_review",
      }),
      { needs_review: -1 },
    );
  });

  it("moves Needs Review to Rejected on reject", () => {
    assert.deepEqual(
      computeAiReviewInboxActionCountDeltas({
        action: "reject",
        sourceTab: "needs_review",
      }),
      { needs_review: -1, rejected: 1 },
    );
  });

  it("decrements Rejected on archive", () => {
    assert.deepEqual(
      computeAiReviewInboxActionCountDeltas({
        action: "archive",
        sourceTab: "rejected",
      }),
      { rejected: -1 },
    );
  });

  it("returns empty deltas for unsupported tab/action pairs", () => {
    assert.deepEqual(
      computeAiReviewInboxActionCountDeltas({
        action: "approve",
        sourceTab: "processing",
      }),
      {},
    );
  });
});

describe("applyAiReviewTabCountDeltas", () => {
  it("applies deltas and clamps at zero", () => {
    const next = applyAiReviewTabCountDeltas(
      { processing: 3, needs_review: 1, rejected: 0 },
      { needs_review: -1, rejected: 1 },
    );
    assert.deepEqual(next, { processing: 3, needs_review: 0, rejected: 1 });
  });

  it("skips null counts without inventing values", () => {
    const next = applyAiReviewTabCountDeltas(
      { processing: null, needs_review: 5, rejected: null },
      { needs_review: -1, rejected: 1 },
    );
    assert.deepEqual(next, { processing: null, needs_review: 4, rejected: null });
  });
});

describe("buildAiReviewInboxLocalDesignPatch + tab membership", () => {
  it("approved design leaves Needs Review", () => {
    const approved = createDesign({
      status: "ready",
      aiReviewStatus: "approved",
      aiReviewed: true,
    });
    const patch = buildAiReviewInboxLocalDesignPatch(approved);
    const local = { ...createDesign(), ...patch };
    assert.equal(designMatchesInboxTab(local, "needs_review"), false);
    assert.equal(designLeavesCurrentInboxTab(local, "needs_review"), true);
  });

  it("rejected design leaves Needs Review and matches Rejected", () => {
    const rejected = createDesign({
      status: "rejected",
      aiReviewStatus: "rejected",
      aiReviewed: true,
    });
    const patch = buildAiReviewInboxLocalDesignPatch(rejected);
    const local = { ...createDesign(), ...patch };
    assert.equal(designMatchesInboxTab(local, "needs_review"), false);
    assert.equal(designMatchesInboxTab(local, "rejected"), true);
  });

  it("archived design leaves Rejected", () => {
    const archived = createDesign({
      status: "archived",
      aiReviewStatus: "rejected",
    });
    const patch = buildAiReviewInboxLocalDesignPatch(archived);
    const local = { ...createDesign({ status: "rejected" }), ...patch };
    assert.equal(designMatchesInboxTab(local, "rejected"), false);
  });
});

describe("reconcileSuccessfulInboxManualAction spies", () => {
  it("never calls reloadDesigns or onQueueChanged; applies patch and count delta", () => {
    let reloadCalls = 0;
    let queueCalls = 0;
    let patchCalls = 0;
    let delta: Record<string, number> | null = null;
    let pendingIndex: number | null = null;
    let liveCleared = false;

    reconcileSuccessfulInboxManualAction({
      updated: createDesign({
        status: "ready",
        aiReviewStatus: "approved",
        aiReviewed: true,
      }),
      manualAction: "approve",
      sourceTab: "needs_review",
      selectedIndex: 2,
      deps: {
        clearLiveDesign: () => {
          liveCleared = true;
        },
        setPendingAdvanceIndex: (index) => {
          pendingIndex = index;
        },
        applyDesignPatch: () => {
          patchCalls += 1;
        },
        onInboxCountsDelta: (d) => {
          delta = d as Record<string, number>;
        },
        reloadDesigns: async () => {
          reloadCalls += 1;
        },
        onQueueChanged: () => {
          queueCalls += 1;
        },
      },
    });

    assert.equal(reloadCalls, 0);
    assert.equal(queueCalls, 0);
    assert.equal(patchCalls, 1);
    assert.equal(liveCleared, true);
    assert.equal(pendingIndex, 2);
    assert.deepEqual(delta, { needs_review: -1 });
  });
});

describe("recoverFailedInboxManualAction", () => {
  it("reloads list once and refreshes counts once", async () => {
    let reloadCalls = 0;
    let queueCalls = 0;
    let cleared = false;

    await recoverFailedInboxManualAction({
      clearPendingAdvance: () => {
        cleared = true;
      },
      reloadDesigns: async () => {
        reloadCalls += 1;
      },
      onQueueChanged: () => {
        queueCalls += 1;
      },
    });

    assert.equal(cleared, true);
    assert.equal(reloadCalls, 1);
    assert.equal(queueCalls, 1);
  });
});

describe("simulateLocalNeedsReviewApprovals (45-design P0 budget fixture)", () => {
  it("approves 45 designs with zero list/count spy calls and linear local patches", () => {
    const ids = Array.from({ length: 45 }, (_, index) => `design-${index + 1}`);
    const result = simulateLocalNeedsReviewApprovals(ids);

    assert.equal(result.remainingIds.length, 0);
    assert.equal(result.listReloadCallCount, 0, "happy path must not call reloadDesigns");
    assert.equal(result.countRefreshCallCount, 0, "happy path must not call onQueueChanged");
    assert.equal(result.applyPatchCount, 45);
    assert.equal(result.needsReviewDeltaSum, -45);
    assert.equal(result.selectionSequence.length, 45);
    assert.equal(result.selectionSequence[0], "design-2");
    assert.equal(result.selectionSequence[43], "design-45");
    assert.equal(result.selectionSequence[44], null);

    const triangular = (44 * 45) / 2;
    assert.equal(triangular, 990);
    // Zero list reloads ⇒ zero triangular document reads.
    assert.equal(result.listReloadCallCount * triangular, 0);
  });

  it("preserves A → B → C → none selection advance", () => {
    const result = simulateLocalNeedsReviewApprovals(["A", "B", "C"]);
    assert.deepEqual(result.selectionSequence, ["B", "C", null]);
    assert.deepEqual(result.remainingIds, []);
    assert.equal(result.listReloadCallCount, 0);
    assert.equal(result.countRefreshCallCount, 0);
  });
});
