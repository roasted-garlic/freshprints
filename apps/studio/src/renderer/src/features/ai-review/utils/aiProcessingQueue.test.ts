import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AI_ENRICHMENT_STALE_STAGE_MS } from "@fresh-prints/shared/constants/aiEnrichment.constants";

import type { Design } from "../../designs/types/design.types";
import {
  isAiProcessingTerminal,
  isDesignAwaitingAiStart,
  isDesignAiProcessingFailed,
  isDesignAiProcessingInProgress,
} from "./aiProcessingQueueEligibility";
import { resolveAiProcessingOutputStatus } from "./aiProcessingOutput";
import { isAiProcessingStaleForRecovery } from "./aiProcessingStaleRecovery";
import {
  findNextAwaitingIndex,
  mergeAppendedDesignsIntoList,
  resolveAdvanceIndexAfterProcessing,
  resolveAutoQueueContinuationAfterLoadMore,
  shouldAutoQueueContinue,
} from "./aiProcessingQueueSelection";
import { buildDesignPatchFromEnqueueResult } from "./enqueueResultPatch";
import {
  readAiProcessingAutoAdvancePreference,
  writeAiProcessingAutoAdvancePreference,
} from "./aiProcessingQueuePreferences";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Sample Design",
    tags: [],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    previewPath: "/previews/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiProcessingQueueEligibility", () => {
  it("treats imported pending designs without a stage as awaiting AI start", () => {
    const design = createDesign();

    assert.equal(resolveAiProcessingOutputStatus(design), "not_generated");
    assert.equal(isDesignAwaitingAiStart(design), true);
    assert.equal(isDesignAiProcessingInProgress(design), false);
  });

  it("does not treat missing-derivative imports as awaiting AI start", () => {
    const design = createDesign({ thumbnailPath: "", previewPath: undefined });

    assert.equal(resolveAiProcessingOutputStatus(design), "derivatives_incomplete");
    assert.equal(isDesignAwaitingAiStart(design), false);
    assert.equal(isDesignAiProcessingInProgress(design), false);
  });

  it("treats queued designs as in progress", () => {
    const design = createDesign({ aiProcessingStage: "sending_to_ai" });

    assert.equal(isDesignAwaitingAiStart(design), false);
    assert.equal(isDesignAiProcessingInProgress(design), true);
  });

  it("detects terminal AI states", () => {
    assert.equal(
      isAiProcessingTerminal(createDesign({ aiProcessingStage: "ready_for_review" })),
      true,
    );
    assert.equal(
      isAiProcessingTerminal(
        createDesign({
          aiProcessingStage: "failed",
          aiSuggestions: { errorCode: "ai_failed" },
        }),
      ),
      true,
    );
    assert.equal(
      isAiProcessingTerminal(createDesign({ aiReviewStatus: "needs_review" })),
      true,
    );
    assert.equal(isAiProcessingTerminal(createDesign()), false);
  });

  it("detects failed processing output", () => {
    assert.equal(
      isDesignAiProcessingFailed(
        createDesign({
          aiProcessingStage: "failed",
          aiSuggestions: { errorCode: "ai_failed" },
        }),
      ),
      true,
    );
  });
});

describe("aiProcessingQueuePreferences", () => {
  it("defaults auto advance ON when unset; respects explicit false/true", () => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    window.localStorage.removeItem("fresh-prints.ai-processing.auto-advance");
    assert.equal(readAiProcessingAutoAdvancePreference(), true);

    writeAiProcessingAutoAdvancePreference(false);
    assert.equal(readAiProcessingAutoAdvancePreference(), false);

    writeAiProcessingAutoAdvancePreference(true);
    assert.equal(readAiProcessingAutoAdvancePreference(), true);
  });
});

type QueuePage = {
  designs: Design[];
  hasMore: boolean;
};

type QueuePageSource = QueuePage | (() => QueuePage | Promise<QueuePage>);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

/**
 * Exercises the queue's public async contract without mounting React. The harness deliberately
 * delegates eligibility, cursor advancement, stale detection, and terminal patch construction to
 * the production helpers imported above; only React ref/state plumbing is represented locally.
 */
function createQueueBehaviorHarness(options: {
  clientFilter: (design: Design) => boolean;
  enqueue: (design: Design, attemptId: string) => Promise<Partial<Design>>;
  initialDesigns?: Design[];
  initialHasMore: boolean;
  pages: QueuePageSource[];
}) {
  let designs = [...(options.initialDesigns ?? [])];
  let hasMore = options.initialHasMore;
  let pageIndex = 0;
  let runState: "idle" | "running" | "pausing" = "idle";
  let stopRequested = false;
  const activeTab = "processing";
  let queryKey = "processing";
  let runQueryKey: string | null = null;
  let activeRun: Promise<void> | null = null;
  let loadMorePromise: Promise<{ appendedDesigns: Design[]; hasMore: boolean } | null> | null = null;
  let activeLoads = 0;
  let activeEnqueues = 0;
  let nextAttemptNumber = 0;
  const currentAttemptByDesign = new Map<string, string>();
  const attemptsByDesign = new Map<string, string[]>();
  const events: string[] = [];
  const loadPageNumbers: number[] = [];
  let loadCallCount = 0;
  let enqueueCallCount = 0;
  let maxConcurrentLoads = 0;
  let maxConcurrentEnqueues = 0;

  const loadMoreDesigns = (): Promise<{ appendedDesigns: Design[]; hasMore: boolean } | null> => {
    if (loadMorePromise) {
      return loadMorePromise;
    }

    if (!hasMore) {
      return Promise.resolve(null);
    }

    const pageSource = options.pages[pageIndex++];
    const pageNumber = pageIndex;
    loadCallCount += 1;
    loadPageNumbers.push(pageNumber);

    if (!pageSource) {
      hasMore = false;
      return Promise.resolve(null);
    }

    const request = (async () => {
      activeLoads += 1;
      maxConcurrentLoads = Math.max(maxConcurrentLoads, activeLoads);
      events.push(`load:${pageNumber}:start`);

      try {
        const page =
          typeof pageSource === "function" ? await pageSource() : pageSource;
        const appendedDesigns = page.designs.filter(options.clientFilter);
        designs = [...designs, ...appendedDesigns];
        hasMore = page.hasMore;
        events.push(`load:${pageNumber}:done:${appendedDesigns.length}`);
        return { appendedDesigns, hasMore: page.hasMore };
      } finally {
        activeLoads -= 1;
      }
    })();

    loadMorePromise = request;
    void request.then(
      () => {
        if (loadMorePromise === request) {
          loadMorePromise = null;
        }
      },
      () => {
        if (loadMorePromise === request) {
          loadMorePromise = null;
        }
      },
    );
    return request;
  };

  const applyAttemptResult = (
    designId: string,
    attemptId: string,
    patch: Partial<Design>,
  ): boolean => {
    if (currentAttemptByDesign.get(designId) !== attemptId) {
      return false;
    }

    const index = designs.findIndex((design) => design.id === designId);
    if (index < 0) {
      return false;
    }

    designs = designs.slice();
    designs[index] = { ...designs[index]!, ...patch, aiProcessingAttemptId: attemptId };
    return true;
  };

  const run = async () => {
    let index = 0;
    runQueryKey = queryKey;
    runState = "running";
    stopRequested = false;
    events.push("run:start");

    try {
      while (shouldAutoQueueContinue(runState)) {
        if (stopRequested) {
          return;
        }

        if (activeTab !== "processing" || queryKey !== runQueryKey) {
          return;
        }

        const nextAwaitingIndex =
          index >= designs.length ? -1 : findNextAwaitingIndex(designs, index);
        if (nextAwaitingIndex < 0) {
          const page = await loadMoreDesigns();

          // These checks intentionally happen after the cursor await. A page can resolve after a
          // stop, pause, tab change, or filter/query change and must not start another enqueue.
          if (
            stopRequested ||
            runState !== "running" ||
            activeTab !== "processing" ||
            queryKey !== runQueryKey
          ) {
            return;
          }

          if (page?.appendedDesigns.length) {
            designs = mergeAppendedDesignsIntoList(designs, page.appendedDesigns);
          }

          const continuation = resolveAutoQueueContinuationAfterLoadMore({
            designs,
            searchFromIndex: index,
            page,
          });
          if (continuation.action === "stop") {
            return;
          }

          index = continuation.nextIndex;
          continue;
        }

        index = nextAwaitingIndex;
        const design = designs[index];
        if (!design) {
          return;
        }

        const attemptId = `attempt-${++nextAttemptNumber}`;
        currentAttemptByDesign.set(design.id, attemptId);
        attemptsByDesign.set(design.id, [
          ...(attemptsByDesign.get(design.id) ?? []),
          attemptId,
        ]);
        enqueueCallCount += 1;
        activeEnqueues += 1;
        maxConcurrentEnqueues = Math.max(maxConcurrentEnqueues, activeEnqueues);
        events.push(`enqueue:${design.id}:start:${attemptId}`);

        try {
          const patch = await options.enqueue(design, attemptId);
          applyAttemptResult(design.id, attemptId, patch);
          events.push(`enqueue:${design.id}:done:${attemptId}`);
        } finally {
          activeEnqueues -= 1;
        }

        if (stopRequested || runState !== "running") {
          return;
        }

        const refreshedDesign = designs.find((item) => item.id === design.id);
        const failed = refreshedDesign ? isDesignAiProcessingFailed(refreshedDesign) : false;
        const nextIndex = resolveAdvanceIndexAfterProcessing(designs, index, failed);
        index = nextIndex >= 0 ? nextIndex : designs.length;
      }
    } finally {
      runState = "idle";
      stopRequested = false;
      runQueryKey = null;
      events.push("run:idle");
    }
  };

  const start = (): Promise<void> => {
    if (activeRun) {
      return activeRun;
    }

    if (
      activeTab !== "processing" ||
      runState !== "idle" ||
      (findNextAwaitingIndex(designs, 0) < 0 && !hasMore)
    ) {
      return Promise.resolve();
    }

    activeRun = run().finally(() => {
      activeRun = null;
    });
    return activeRun;
  };

  return {
    applyAttemptResult,
    changeQuery(nextQueryKey: string) {
      queryKey = nextQueryKey;
    },
    get attemptsByDesign() {
      return attemptsByDesign;
    },
    get designs() {
      return designs;
    },
    get enqueueCallCount() {
      return enqueueCallCount;
    },
    get events() {
      return events;
    },
    get loadCallCount() {
      return loadCallCount;
    },
    get loadPageNumbers() {
      return loadPageNumbers;
    },
    get maxConcurrentEnqueues() {
      return maxConcurrentEnqueues;
    },
    get maxConcurrentLoads() {
      return maxConcurrentLoads;
    },
    retryFailed(designId: string) {
      const index = designs.findIndex((design) => design.id === designId);
      const design = designs[index];
      assert.ok(design && isDesignAiProcessingFailed(design), `expected ${designId} to be failed`);
      designs = designs.slice();
      designs[index] = {
        ...design,
        status: "imported",
        aiProcessed: false,
        aiProcessingStage: undefined,
        aiProcessingError: undefined,
        aiReviewStatus: "pending",
      };
    },
    start,
    stop() {
      if (runState === "running") {
        stopRequested = true;
        runState = "pausing";
      }
    },
  };
}

describe("aiProcessingQueue behavioral cursor coordination", () => {
  it("processes awaiting designs on the final cursor page (hasMore false after append)", async () => {
    const pageOne = [createDesign({ id: "first" }), createDesign({ id: "second" })];
    const pageTwo = [createDesign({ id: "third" }), createDesign({ id: "fourth" })];
    const harness = createQueueBehaviorHarness({
      clientFilter: () => true,
      enqueue: async () =>
        buildDesignPatchFromEnqueueResult({
          queued: true,
          completed: true,
          aiProcessingStage: "ready_for_review",
          aiReviewStatus: "needs_review",
        }) ?? {},
      initialDesigns: pageOne,
      initialHasMore: true,
      pages: [{ designs: pageTwo, hasMore: false }],
    });

    await harness.start();

    assert.equal(harness.enqueueCallCount, 4);
    assert.deepEqual(harness.loadPageNumbers, [1]);
    assert.equal(
      harness.designs.every((entry) => isAiProcessingTerminal(entry)),
      true,
    );
  });

  it("crosses an empty client-filter page with hasMore, reaches terminal state, and serializes duplicate starts", async () => {
    const target = createDesign({ id: "target" });
    const harness = createQueueBehaviorHarness({
      clientFilter: (design) => design.id === "target",
      enqueue: async () =>
        buildDesignPatchFromEnqueueResult({
          queued: true,
          completed: true,
          aiProcessingStage: "ready_for_review",
          aiReviewStatus: "needs_review",
        }) ?? {},
      initialHasMore: true,
      pages: [
        { designs: [createDesign({ id: "filtered-out" })], hasMore: true },
        { designs: [target], hasMore: true },
        { designs: [createDesign({ id: "filtered-out-final" })], hasMore: false },
      ],
    });

    const firstRun = harness.start();
    const duplicateRun = harness.start();
    assert.strictEqual(duplicateRun, firstRun, "duplicate starts must share the active run");
    await Promise.all([firstRun, duplicateRun]);

    assert.deepEqual(harness.loadPageNumbers, [1, 2, 3]);
    assert.equal(harness.loadCallCount, 3);
    assert.equal(harness.enqueueCallCount, 1);
    assert.equal(harness.maxConcurrentLoads, 1);
    assert.equal(harness.maxConcurrentEnqueues, 1);
    assert.deepEqual(
      harness.events.filter((event) => event.startsWith("load:") || event.startsWith("enqueue:")),
      [
        "load:1:start",
        "load:1:done:0",
        "load:2:start",
        "load:2:done:1",
        "enqueue:target:start:attempt-1",
        "enqueue:target:done:attempt-1",
        "load:3:start",
        "load:3:done:0",
      ],
    );
    assert.equal(isAiProcessingTerminal(harness.designs[0]!), true);
    assert.equal(isDesignAwaitingAiStart(harness.designs[0]!), false);

    await harness.start();
    assert.equal(harness.enqueueCallCount, 1, "terminal designs must not be enqueued again");
  });

  it("rechecks pause/stop and query state after a cursor page resolves", async () => {
    const page = createDeferred<QueuePage>();
    const pausedHarness = createQueueBehaviorHarness({
      clientFilter: () => true,
      enqueue: async () => ({}),
      initialHasMore: true,
      pages: [() => page.promise],
    });

    const pausedRun = pausedHarness.start();
    await Promise.resolve();
    pausedHarness.stop();
    page.resolve({ designs: [createDesign({ id: "after-stop" })], hasMore: false });
    await pausedRun;

    assert.equal(pausedHarness.enqueueCallCount, 0);
    assert.equal(pausedHarness.events.at(-1), "run:idle");

    const filteredPage = createDeferred<QueuePage>();
    const queryChangedHarness = createQueueBehaviorHarness({
      clientFilter: () => true,
      enqueue: async () => ({}),
      initialHasMore: true,
      pages: [() => filteredPage.promise],
    });

    const queryChangedRun = queryChangedHarness.start();
    await Promise.resolve();
    queryChangedHarness.changeQuery("new-filter");
    filteredPage.resolve({ designs: [createDesign({ id: "stale-filter-result" })], hasMore: false });
    await queryChangedRun;

    assert.equal(queryChangedHarness.enqueueCallCount, 0);
  });

  it("preserves retry, stale-attempt, and terminal safeguards across sequential runs", async () => {
    const design = createDesign({ id: "retryable" });
    let enqueueCount = 0;
    const harness = createQueueBehaviorHarness({
      clientFilter: () => true,
      enqueue: async () => {
        enqueueCount += 1;
        if (enqueueCount === 1) {
          return {
            aiProcessingStage: "failed",
            aiProcessingError: {
              attemptId: "attempt-1",
              errorCode: "timeout",
              errorMessage: "timed out",
              occurredAt: "2026-09-20T00:00:00.000Z",
            },
          };
        }

        return (
          buildDesignPatchFromEnqueueResult({
            queued: true,
            completed: true,
            aiProcessingStage: "ready_for_review",
            aiReviewStatus: "needs_review",
          }) ?? {}
        );
      },
      initialDesigns: [design],
      initialHasMore: false,
      pages: [],
    });

    await harness.start();
    assert.equal(isDesignAiProcessingFailed(harness.designs[0]!), true);
    assert.deepEqual(harness.attemptsByDesign.get("retryable"), ["attempt-1"]);

    harness.retryFailed("retryable");
    await harness.start();
    assert.deepEqual(harness.attemptsByDesign.get("retryable"), ["attempt-1", "attempt-2"]);
    assert.equal(isAiProcessingTerminal(harness.designs[0]!), true);

    const staleAccepted = harness.applyAttemptResult("retryable", "attempt-1", {
      aiProcessingStage: "failed",
      aiProcessingError: {
        attemptId: "attempt-1",
        errorCode: "late_failure",
        errorMessage: "late failure",
        occurredAt: "2026-09-20T00:00:01.000Z",
      },
    });
    assert.equal(staleAccepted, false);
    assert.equal(harness.designs[0]!.aiProcessingAttemptId, "attempt-2");
    assert.equal(isAiProcessingTerminal(harness.designs[0]!), true);
    assert.equal(harness.enqueueCallCount, 2);

    const staleDesign = createDesign({
      aiProcessingStage: "sending_to_ai",
      updatedAt: {
        toMillis: () => 1_000,
      } as Design["updatedAt"],
    });
    assert.equal(
      isAiProcessingStaleForRecovery(
        staleDesign,
        1_000 + AI_ENRICHMENT_STALE_STAGE_MS + 1,
      ),
      true,
    );
  });
});
