import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import type { BackgroundAiQueueEvent } from "../../imports/services/importAiBackgroundQueue";
import { designMatchesInboxTab } from "./aiReviewInboxEligibility";
import { filterDesignsByAiReviewStatus } from "../../designs/utils/designLibrarySearch";
import { sortInboxDesigns } from "./aiReviewInboxSort";
import { reconcileBackgroundAiQueueEvent } from "./backgroundAiQueueReconciliation";
import {
  applyMonotonicPendingProcessingListMerge,
  clearTerminalAiProcessingLedgerEntry,
  createTerminalAiProcessingLedger,
  hasTerminalAiProcessingLedgerEntry,
  patchLeavesAiProcessingPending,
  recordTerminalAiProcessingPatch,
} from "./monotonicAiProcessingListMerge";

let fixtureClock = 0;

function fixtureTimestamp(millis: number): Design["createdAt"] {
  return {
    toDate: () => new Date(millis),
    toMillis: () => millis,
  } as Design["createdAt"];
}

function createDesign(id: string, overrides: Partial<Design> = {}): Design {
  fixtureClock += 1;
  const millis = fixtureClock;
  return {
    id,
    title: `Design ${id}`,
    tags: [],
    status: "imported",
    originalPath: `/originals/${id}.png`,
    thumbnailPath: `/thumbnails/${id}.webp`,
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: fixtureTimestamp(millis),
    updatedAt: fixtureTimestamp(millis),
    ...overrides,
  };
}

function deriveProcessingTabDesigns(rawDesigns: readonly Design[]): Design[] {
  const filtered = rawDesigns.filter((design) => designMatchesInboxTab(design, "processing"));
  const byReviewStatus = filterDesignsByAiReviewStatus(filtered, "pending");
  return sortInboxDesigns(byReviewStatus, "processing");
}

/**
 * Pre-repair useDesigns accept: post-patch reload with a newer generation replaces wholesale.
 * Demonstrates the HEAD defect the monotonic merge closes.
 */
function createPreRepairHarness(initial: Design[]) {
  let designs = initial;
  let generation = 0;

  return {
    getDesigns: () => designs,
    applyPatch(designId: string, patch: Partial<Design>) {
      const index = designs.findIndex((design) => design.id === designId);
      if (index < 0) return;
      generation += 1;
      const next = designs.slice();
      next[index] = { ...next[index]!, ...patch };
      designs = next;
    },
    startReloadAfterPatch(resultDesigns: Design[]) {
      const requestGeneration = ++generation;
      return {
        resolve: () => {
          if (generation !== requestGeneration) {
            return false;
          }
          designs = resultDesigns;
          return true;
        },
      };
    },
  };
}

/**
 * Post-repair accept: same generation rules, plus ledger-aware pending-list merge.
 */
function createRepairedHarness(initial: Design[]) {
  let designs = initial;
  let generation = 0;
  const ledger = createTerminalAiProcessingLedger();

  return {
    getDesigns: () => designs,
    getLedger: () => ledger,
    applyPatch(designId: string, patch: Partial<Design>) {
      const index = designs.findIndex((design) => design.id === designId);
      if (index < 0) return;
      generation += 1;
      recordTerminalAiProcessingPatch(ledger, designId, patch);
      const next = designs.slice();
      next[index] = { ...next[index]!, ...patch };
      designs = next;
    },
    clearLedger(designId: string) {
      clearTerminalAiProcessingLedgerEntry(ledger, designId);
    },
    startReloadAfterPatch(resultDesigns: Design[]) {
      const requestGeneration = ++generation;
      return {
        resolve: () => {
          if (generation !== requestGeneration) {
            return false;
          }
          designs = applyMonotonicPendingProcessingListMerge({
            incoming: resultDesigns,
            ledger,
            isPendingProcessingQuery: true,
          });
          return true;
        },
      };
    },
  };
}

function terminalEvent(designId: string, pending: number): BackgroundAiQueueEvent {
  return {
    designId,
    pending,
    outcome: "completed",
    patchSource: {
      queued: true,
      completed: true,
      aiReviewStatus: "needs_review",
      aiProcessingStage: "ready_for_review",
    },
  };
}

describe("monotonicAiProcessingListMerge", () => {
  it("patchLeavesAiProcessingPending is true only when status leaves pending", () => {
    assert.equal(patchLeavesAiProcessingPending({ aiReviewStatus: "needs_review" }), true);
    assert.equal(patchLeavesAiProcessingPending({ aiReviewStatus: "pending" }), false);
    assert.equal(patchLeavesAiProcessingPending({}), false);
  });

  it("ledger record/clear/has round-trip", () => {
    const ledger = createTerminalAiProcessingLedger();
    assert.equal(recordTerminalAiProcessingPatch(ledger, "a", { aiReviewStatus: "needs_review" }), true);
    assert.equal(hasTerminalAiProcessingLedgerEntry(ledger, "a"), true);
    clearTerminalAiProcessingLedgerEntry(ledger, "a");
    assert.equal(hasTerminalAiProcessingLedgerEntry(ledger, "a"), false);
  });

  it("merge is a no-op when not a pending Processing query or ledger empty", () => {
    const ledger = createTerminalAiProcessingLedger();
    recordTerminalAiProcessingPatch(ledger, "a", { aiReviewStatus: "needs_review" });
    const incoming = [createDesign("a"), createDesign("b")];

    assert.deepEqual(
      applyMonotonicPendingProcessingListMerge({
        incoming,
        ledger,
        isPendingProcessingQuery: false,
      }).map((d) => d.id),
      ["a", "b"],
    );

    const empty = createTerminalAiProcessingLedger();
    assert.deepEqual(
      applyMonotonicPendingProcessingListMerge({
        incoming,
        ledger: empty,
        isPendingProcessingQuery: true,
      }).map((d) => d.id),
      ["a", "b"],
    );
  });

  it("PRE-REPAIR DEFECT: post-patch stale pending reload reinserts A (fails monotonic contract)", () => {
    const a = createDesign("a");
    const b = createDesign("b");
    const c = createDesign("c");
    const harness = createPreRepairHarness([a, b, c]);

    const eventA = terminalEvent("a", 2);
    const reconciliation = reconcileBackgroundAiQueueEvent(eventA, harness.getDesigns(), "a");
    assert.ok(reconciliation.patch);
    harness.applyPatch("a", reconciliation.patch!);

    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 2);
    assert.deepEqual(
      deriveProcessingTabDesigns(harness.getDesigns()).map((d) => d.id),
      ["b", "c"],
    );

    // Stale/cached pending page still contains A.
    const stalePage = [a, b, c];
    const reload = harness.startReloadAfterPatch(stalePage);
    assert.equal(reload.resolve(), true);

    const visible = deriveProcessingTabDesigns(harness.getDesigns());
    // This is the HEAD defect: A reappears.
    assert.equal(visible.length, 3);
    assert.ok(visible.some((d) => d.id === "a"));
  });

  it("1-5: terminal patch removes A; stale reload cannot reinsert; count 3→2→1→0; B/C cannot revive A", () => {
    const a = createDesign("a");
    const b = createDesign("b");
    const c = createDesign("c");
    const harness = createRepairedHarness([a, b, c]);
    let selected: string | null = "a";

    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 3);

    const recA = reconcileBackgroundAiQueueEvent(terminalEvent("a", 2), harness.getDesigns(), selected);
    assert.ok(recA.patch);
    harness.applyPatch("a", recA.patch!);
    selected = "b";
    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 2);

    const staleAfterA = harness.startReloadAfterPatch([a, b, c]);
    assert.equal(staleAfterA.resolve(), true);
    assert.deepEqual(
      deriveProcessingTabDesigns(harness.getDesigns()).map((d) => d.id),
      ["b", "c"],
    );

    const recB = reconcileBackgroundAiQueueEvent(terminalEvent("b", 1), harness.getDesigns(), selected);
    harness.applyPatch("b", recB.patch!);
    selected = "c";
    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 1);

    // Cached stale page that still has A and B as pending must not revive them.
    const staleCached = harness.startReloadAfterPatch([a, b, c]);
    assert.equal(staleCached.resolve(), true);
    assert.deepEqual(
      deriveProcessingTabDesigns(harness.getDesigns()).map((d) => d.id),
      ["c"],
    );

    const recC = reconcileBackgroundAiQueueEvent(terminalEvent("c", 0), harness.getDesigns(), selected);
    harness.applyPatch("c", recC.patch!);
    selected = null;
    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 0);
    assert.equal(selected, null);
  });

  it("6: selection advance indices A→B→C→none via reconcile pendingAdvanceIndex", () => {
    const designs = [createDesign("a"), createDesign("b"), createDesign("c")];
    const r1 = reconcileBackgroundAiQueueEvent(terminalEvent("a", 2), designs, "a");
    assert.equal(r1.pendingAdvanceIndex, 0);

    const afterA = designs.map((d) =>
      d.id === "a" ? { ...d, aiReviewStatus: "needs_review" as const } : d,
    );
    const visibleAfterA = deriveProcessingTabDesigns(afterA);
    assert.deepEqual(visibleAfterA.map((d) => d.id), ["b", "c"]);

    const r2 = reconcileBackgroundAiQueueEvent(terminalEvent("b", 1), visibleAfterA, "b");
    assert.equal(r2.pendingAdvanceIndex, 0);

    const afterB = visibleAfterA.map((d) =>
      d.id === "b" ? { ...d, aiReviewStatus: "needs_review" as const } : d,
    );
    const visibleAfterB = deriveProcessingTabDesigns(afterB);
    assert.deepEqual(visibleAfterB.map((d) => d.id), ["c"]);

    const r3 = reconcileBackgroundAiQueueEvent(terminalEvent("c", 0), visibleAfterB, "c");
    assert.equal(r3.pendingAdvanceIndex, 0);
  });

  it("7: reverse-order overlapping reload does not regress after patches (generation + merge)", () => {
    const a = createDesign("a");
    const b = createDesign("b");
    const c = createDesign("c");
    const harness = createRepairedHarness([a, b, c]);

    const older = harness.startReloadAfterPatch([a, b, c]);
    harness.applyPatch("a", { aiReviewStatus: "needs_review" });
    // Older reload discarded by generation
    assert.equal(older.resolve(), false);

    const newerStale = harness.startReloadAfterPatch([a, b, c]);
    assert.equal(newerStale.resolve(), true);
    assert.ok(!deriveProcessingTabDesigns(harness.getDesigns()).some((d) => d.id === "a"));
  });

  it("8: genuine later reprocessing allowed after ledger clear", () => {
    const a = createDesign("a");
    const harness = createRepairedHarness([a]);
    harness.applyPatch("a", { aiReviewStatus: "needs_review" });
    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 0);

    harness.clearLedger("a");
    // Simulate retry returning A to pending locally then reload confirming pending.
    harness.applyPatch("a", { aiReviewStatus: "pending" });
    // applyPatch with pending does not re-record terminal; clear already done.
    const reload = harness.startReloadAfterPatch([createDesign("a", { aiReviewStatus: "pending" })]);
    assert.equal(reload.resolve(), true);
    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 1);
  });

  it("14: no-patch recovery reload still replaces (ledger empty for that design)", () => {
    const a = createDesign("a");
    const b = createDesign("b");
    const harness = createRepairedHarness([a, b]);
    // Failure event — no terminal ledger entry
    const reload = harness.startReloadAfterPatch([b]);
    assert.equal(reload.resolve(), true);
    assert.deepEqual(
      deriveProcessingTabDesigns(harness.getDesigns()).map((d) => d.id),
      ["b"],
    );
  });
});
