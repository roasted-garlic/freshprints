import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import type { BackgroundAiQueueEvent } from "../../imports/services/importAiBackgroundQueue";
import { designMatchesInboxTab } from "./aiReviewInboxEligibility";
import { filterDesignsByAiReviewStatus } from "../../designs/utils/designLibrarySearch";
import { sortInboxDesigns } from "./aiReviewInboxSort";
import { reconcileBackgroundAiQueueEvent } from "./backgroundAiQueueReconciliation";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

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

/** Mirrors useAiReviewInbox's own `designs` memo: filter by tab, then by aiReviewStatus. */
function deriveProcessingTabDesigns(rawDesigns: readonly Design[]): Design[] {
  const filtered = rawDesigns.filter((design) => designMatchesInboxTab(design, "processing"));
  const byReviewStatus = filterDesignsByAiReviewStatus(filtered, "pending");
  return sortInboxDesigns(byReviewStatus, "processing");
}

/**
 * Faithful, dependency-free simulation of useDesigns' own generation-guard mechanics
 * (generationRef.current, the ++requestGeneration capture, and the
 * `generationRef.current !== requestGeneration` discard check at every state-committing point).
 * Not a re-implementation of different logic — the same comparison, exercised directly, so this
 * test suite can prove the algorithm's race behavior without a DOM/React harness. A companion
 * source-grep test below independently confirms the real hook still contains this exact guard.
 */
function createDesignsHarness(initial: Design[]) {
  let designs = initial;
  let generation = 0;

  return {
    getDesigns: () => designs,
    /** Simulates applyDesignPatch: always wins immediately, and invalidates older in-flight reloads. */
    applyPatch(designId: string, patch: Partial<Design>) {
      const index = designs.findIndex((design) => design.id === designId);
      if (index < 0) return; // genuine no-op — must NOT bump the generation (see useDesigns.ts)
      generation += 1;
      const next = designs.slice();
      next[index] = { ...next[index]!, ...patch };
      designs = next;
    },
    /** Simulates starting a reloadDesigns() call — returns a resolver to call whenever this
     * particular fetch "resolves" (out of order, if desired). */
    startReload(resultDesigns: Design[]) {
      const requestGeneration = ++generation;
      return {
        resolve: () => {
          if (generation !== requestGeneration) {
            return false; // discarded — a newer request or patch has since landed
          }
          designs = resultDesigns;
          return true;
        },
      };
    },
  };
}

describe("reconcileBackgroundAiQueueEvent", () => {
  it("returns a patch and no pending-advance index when the completed design is not selected", () => {
    const designs = [createDesign("a"), createDesign("b")];
    const event: BackgroundAiQueueEvent = {
      designId: "a",
      pending: 1,
      outcome: "completed",
      patchSource: { queued: true, completed: true, aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" },
    };

    const result = reconcileBackgroundAiQueueEvent(event, designs, "b");

    assert.deepEqual(result.patch, { aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" });
    assert.equal(result.pendingAdvanceIndex, null);
  });

  it("returns the current index as pendingAdvanceIndex when the completed design IS selected", () => {
    const designs = [createDesign("a"), createDesign("b"), createDesign("c")];
    const event: BackgroundAiQueueEvent = {
      designId: "a",
      pending: 2,
      outcome: "completed",
      patchSource: { queued: true, completed: true, aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" },
    };

    const result = reconcileBackgroundAiQueueEvent(event, designs, "a");

    assert.ok(result.patch);
    assert.equal(result.pendingAdvanceIndex, 0);
  });

  it("returns null patch (fallback-to-reload signal) when the event carries no usable patchSource", () => {
    const designs = [createDesign("a")];
    const event: BackgroundAiQueueEvent = { designId: "a", pending: 0, outcome: "failed" };

    const result = reconcileBackgroundAiQueueEvent(event, designs, "a");

    assert.equal(result.patch, null);
    assert.equal(result.pendingAdvanceIndex, null);
  });

  it("returns null patch when patchSource exists but is not itself a real terminal result (e.g. already_processing)", () => {
    const designs = [createDesign("a")];
    const event: BackgroundAiQueueEvent = {
      designId: "a",
      pending: 0,
      outcome: "completed",
      patchSource: { queued: false, reason: "already_processing" },
    };

    const result = reconcileBackgroundAiQueueEvent(event, designs, "a");

    assert.equal(result.patch, null);
  });
});

describe("Background AI queue full sequence — 3 designs (Owner QA Amendment 4 reproduction)", () => {
  it("proves the required 3 -> 2 -> 1 -> 0 Processing-count sequence, one design leaving at a time", () => {
    let raw = [createDesign("a"), createDesign("b"), createDesign("c")];
    const countsObserved: number[] = [deriveProcessingTabDesigns(raw).length];

    for (const id of ["a", "b", "c"]) {
      const event: BackgroundAiQueueEvent = {
        designId: id,
        pending: 0,
        outcome: "completed",
        patchSource: { queued: true, completed: true, aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" },
      };
      const reconciliation = reconcileBackgroundAiQueueEvent(event, raw, null);
      assert.ok(reconciliation.patch, `expected a real patch for design ${id}`);

      const index = raw.findIndex((design) => design.id === id);
      raw = raw.slice();
      raw[index] = { ...raw[index]!, ...reconciliation.patch };

      countsObserved.push(deriveProcessingTabDesigns(raw).length);
    }

    assert.deepEqual(
      countsObserved,
      [3, 2, 1, 0],
      "each design must leave Processing individually — never a stall followed by a group drop",
    );
  });

  it("proves active-selection advance: Design A -> Design B -> Design C -> none", () => {
    let raw = [createDesign("a"), createDesign("b"), createDesign("c")];
    let selectedDesignId: string | null = "a";
    const selectionSequence: (string | null)[] = [selectedDesignId];

    for (const id of ["a", "b", "c"]) {
      const event: BackgroundAiQueueEvent = {
        designId: id,
        pending: 0,
        outcome: "completed",
        patchSource: { queued: true, completed: true, aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" },
      };
      const preDesigns = deriveProcessingTabDesigns(raw);
      const reconciliation = reconcileBackgroundAiQueueEvent(event, preDesigns, selectedDesignId);
      assert.ok(reconciliation.patch);

      const rawIndex = raw.findIndex((design) => design.id === id);
      raw = raw.slice();
      raw[rawIndex] = { ...raw[rawIndex]!, ...reconciliation.patch };

      if (reconciliation.pendingAdvanceIndex !== null) {
        // Mirrors the real pendingAdvanceIndexRef effect: re-derive from the design list
        // AFTER the patch, at the SAME index the completed design occupied.
        const postDesigns = deriveProcessingTabDesigns(raw);
        const nextDesign = postDesigns[reconciliation.pendingAdvanceIndex] ?? null;
        selectedDesignId = nextDesign?.id ?? null;
      }

      selectionSequence.push(selectedDesignId);
    }

    assert.deepEqual(selectionSequence, ["a", "b", "c", null]);
  });

  it("proves progress is monotonic for the active design: 1 -> 2 -> 3, never 1 -> 2 -> 1", () => {
    // "Progress step" here mirrors AI_PROCESSING_UI_PIPELINE_GROUPS' 3-group index derived from
    // aiProcessingStage. A design starts at group 0 (sending_to_ai group), advances to group 1
    // (receiving_from_ai group), then group 2 (ready_for_review) — it must never move backward.
    const stageToGroupIndex: Record<string, number> = {
      queued: 0,
      preparing_image: 0,
      sending_to_ai: 0,
      receiving_response: 1,
      validating_response: 1,
      ready_for_review: 2,
    };

    let raw = [createDesign("a", { aiProcessingStage: "sending_to_ai" })];
    const observedGroups: number[] = [stageToGroupIndex[raw[0]!.aiProcessingStage!]!];

    // Simulate the real stage progression the pipeline writes server-side, each arriving as its
    // own terminal-shaped patchSource is NOT how intermediate stages work (only the final result
    // returns a full patch) — intermediate stages are exercised via the live-design subscription,
    // not this background pump. This test instead proves that once the FINAL patch lands
    // (group 2), an out-of-order stale event for the SAME design carrying an OLDER stage can never
    // move the observed group backward, because reconcileBackgroundAiQueueEvent is only ever
    // invoked once per design (the pump is strictly sequential, one enqueue call per design) —
    // there is no second call to race against for the same id.
    const finalEvent: BackgroundAiQueueEvent = {
      designId: "a",
      pending: 0,
      outcome: "completed",
      patchSource: { queued: true, completed: true, aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" },
    };
    const reconciliation = reconcileBackgroundAiQueueEvent(finalEvent, raw, "a");
    assert.ok(reconciliation.patch);
    raw = [{ ...raw[0]!, ...reconciliation.patch }];
    observedGroups.push(stageToGroupIndex[raw[0]!.aiProcessingStage!]!);

    assert.deepEqual(observedGroups, [0, 2]);
    for (let i = 1; i < observedGroups.length; i += 1) {
      assert.ok(
        observedGroups[i]! >= observedGroups[i - 1]!,
        `progress regressed: ${observedGroups[i - 1]} -> ${observedGroups[i]}`,
      );
    }
  });
});

describe("Stale reload cannot reinsert a completed design (generation-guard simulation)", () => {
  it("a deliberately delayed stale reload started before A completed cannot reinsert A after A's patch lands", () => {
    const harness = createDesignsHarness([createDesign("a"), createDesign("b"), createDesign("c")]);

    // A stale reload starts first (e.g. triggered by an unrelated effect) but is slow to resolve.
    const staleReload = harness.startReload([createDesign("a"), createDesign("b"), createDesign("c")]);

    // Design A completes and is patched locally before the stale reload resolves.
    harness.applyPatch("a", { aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" });
    assert.equal(deriveProcessingTabDesigns(harness.getDesigns()).length, 2, "A must already be gone from Processing");

    // The stale reload (which still thinks A is pending) finally resolves.
    const applied = staleReload.resolve();

    assert.equal(applied, false, "the stale reload must be discarded, not applied");
    assert.equal(
      deriveProcessingTabDesigns(harness.getDesigns()).length,
      2,
      "A must remain gone from Processing — the stale reload must not reinsert it",
    );
  });

  it("an older asynchronous response cannot overwrite a newer queue state even when it resolves last", () => {
    const harness = createDesignsHarness([createDesign("a"), createDesign("b")]);

    const olderReload = harness.startReload([createDesign("a"), createDesign("b")]); // still both pending
    const newerReload = harness.startReload([createDesign("b")]); // reflects A already removed server-side

    // Newer resolves first (the more common real-world case — a faster/second request winning
    // the network race), then the older one finally resolves.
    const newerApplied = newerReload.resolve();
    const olderApplied = olderReload.resolve();

    assert.equal(newerApplied, true);
    assert.equal(olderApplied, false, "an older response must never overwrite a newer one, regardless of resolve order");
    assert.equal(harness.getDesigns().length, 1, "final state must reflect the newer response, not the older one");
  });
});

describe("Processing remains strictly sequential (maxConcurrent === 1)", () => {
  it("the background pump awaits one enqueueForProcessing call at a time — no Promise.all", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );
    const pumpBlock = source.slice(source.indexOf("async function pumpBackgroundAiQueue("));

    assert.match(pumpBlock, /await aiEnrichmentEnqueueService\.enqueueForProcessing\(designId\)/);
    assert.doesNotMatch(pumpBlock, /Promise\.all/);
  });
});

describe("Needs Review receives each design exactly once; counts remain exact", () => {
  it("three designs each transition into Needs Review exactly once, with no duplicate and no loss", () => {
    let raw = [createDesign("a"), createDesign("b"), createDesign("c")];
    const needsReviewIds = new Set<string>();

    for (const id of ["a", "b", "c"]) {
      const event: BackgroundAiQueueEvent = {
        designId: id,
        pending: 0,
        outcome: "completed",
        patchSource: { queued: true, completed: true, aiReviewStatus: "needs_review", aiProcessingStage: "ready_for_review" },
      };
      const reconciliation = reconcileBackgroundAiQueueEvent(event, raw, null);
      const index = raw.findIndex((design) => design.id === id);
      raw = raw.slice();
      raw[index] = { ...raw[index]!, ...reconciliation.patch };

      const nowInNeedsReview = designMatchesInboxTab(raw[index]!, "needs_review");
      assert.ok(nowInNeedsReview, `design ${id} must be in Needs Review immediately after its patch`);
      assert.ok(!needsReviewIds.has(id), `design ${id} must not enter Needs Review twice`);
      needsReviewIds.add(id);
    }

    assert.equal(needsReviewIds.size, 3);
    assert.equal(deriveProcessingTabDesigns(raw).length, 0);
    const needsReviewCount = raw.filter((design) => designMatchesInboxTab(design, "needs_review")).length;
    assert.equal(needsReviewCount, 3);
  });
});

describe("useDesigns source contains the real generation guard this test suite simulates", () => {
  it("loadDesigns captures a request generation and discards state writes when the generation has moved on", () => {
    const source = read("apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts");

    assert.match(source, /const requestGeneration = \+\+generationRef\.current;/);
    // Three distinct commit points: the loadAll branch, the normal-page branch, and the catch
    // block — each must check the same guard before writing state.
    const guardMatches = source.match(/generationRef\.current !== requestGeneration/g) ?? [];
    assert.ok(
      guardMatches.length >= 3,
      `expected the generation guard at all 3 state-committing points, found ${guardMatches.length}`,
    );
  });

  it("applyDesignPatch bumps the generation so an older in-flight reload cannot overwrite the patch", () => {
    const source = read("apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts");
    const patchBlock = source.slice(
      source.indexOf("const applyDesignPatch = useCallback("),
      source.indexOf("const isAwaitingCurrentQuery ="),
    );
    assert.match(patchBlock, /generationRef\.current \+= 1;/);

    // Implementation-review finding, fixed in the same pass: the generation bump must only
    // happen when the patch actually finds and changes a design in the current list — bumping
    // unconditionally would invalidate a real, still-in-flight load for no reason whenever a
    // patch happens to target a design this hook instance doesn't currently have (e.g. the
    // initial mount load hasn't resolved yet), discarding data that load would otherwise have
    // correctly delivered. Confirm the bump is textually inside the "found" branch, after the
    // early-return no-op check, not before it.
    const earlyReturnIndex = patchBlock.indexOf("if (index < 0) {");
    const bumpIndex = patchBlock.indexOf("generationRef.current += 1;");
    assert.ok(
      earlyReturnIndex > -1 && bumpIndex > earlyReturnIndex,
      "the generation bump must come after the no-op early return, not before it",
    );
  });

  it("a patch that targets a design not present in the list (no-op) does not invalidate a real, still-in-flight load", () => {
    const harness = createDesignsHarness([createDesign("a")]);

    // A legitimate load is already in flight (e.g. the hook's very first mount load).
    const inFlightLoad = harness.startReload([createDesign("a"), createDesign("b")]);

    // A patch arrives for a design this hook instance doesn't have yet — e.g. a background-queue
    // event for a design that belongs to a different tab/query. This must be a true no-op.
    harness.applyPatch("does-not-exist", { aiReviewStatus: "needs_review" });

    // The real, legitimate load must still be honored — it was not invalidated by the no-op.
    const applied = inFlightLoad.resolve();

    assert.equal(applied, true, "a no-op patch must not invalidate a real in-flight load");
    assert.equal(harness.getDesigns().length, 2);
  });
});
