/**
 * Lifecycle unit tests for awaited taxonomy trigger coalesce (Option A).
 *
 * Run: npx tsx --test functions/src/taxonomy/taxonomyTriggerCoalesce.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTaxonomyTriggerCoalesce } from "./taxonomyTriggerCoalesce";

function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("taxonomyTriggerCoalesce (Option A)", () => {
  it("A: single write awaits one rebuild after coalesce", async () => {
    const rebuildCalls: string[] = [];
    const events: string[] = [];
    let sleepCount = 0;

    const coalesce = createTaxonomyTriggerCoalesce({
      coalesceMs: 5,
      sleep: async () => {
        sleepCount += 1;
      },
      log: (event) => {
        events.push(event);
      },
      rebuild: async ({ reason }) => {
        rebuildCalls.push(reason);
      },
    });

    await coalesce.awaitCoalescedTaxonomyRebuild("tag-written");

    assert.equal(rebuildCalls.length, 1);
    assert.equal(rebuildCalls[0], "tag-written");
    assert.equal(sleepCount, 1);
    assert.ok(events.includes("taxonomy-trigger-fields-changed"));
    assert.ok(events.includes("taxonomy-trigger-rebuild-start"));
    assert.equal(coalesce.getInFlightForTest(), null);
    assert.equal(coalesce.isDirtyForTest(), false);
  });

  it("B: rapid writes during coalesce produce one rebuild", async () => {
    const rebuildCalls: string[] = [];
    const events: string[] = [];
    const sleepGate = createDeferred<void>();

    const coalesce = createTaxonomyTriggerCoalesce({
      coalesceMs: 5,
      sleep: async () => {
        await sleepGate.promise;
      },
      log: (event) => {
        events.push(event);
      },
      rebuild: async ({ reason }) => {
        rebuildCalls.push(reason);
      },
    });

    const first = coalesce.awaitCoalescedTaxonomyRebuild("tag-written");
    for (let i = 0; i < 50 && !coalesce.getInFlightForTest(); i++) {
      await new Promise((r) => setImmediate(r));
    }
    assert.ok(coalesce.getInFlightForTest());

    const joined = Promise.all([
      coalesce.awaitCoalescedTaxonomyRebuild("tag-written"),
      coalesce.awaitCoalescedTaxonomyRebuild("category-written"),
    ]);
    sleepGate.resolve();
    await Promise.all([first, joined]);

    assert.equal(rebuildCalls.length, 1);
    assert.equal(rebuildCalls[0], "category-written");
    assert.ok(events.includes("taxonomy-trigger-coalesce-join"));
  });

  it("C: write during rebuild forces trailing rebuild before waiters resolve", async () => {
    const rebuildCalls: string[] = [];
    const firstRebuild = createDeferred<void>();
    let rebuildCount = 0;

    const coalesce = createTaxonomyTriggerCoalesce({
      coalesceMs: 1,
      sleep: async () => {},
      log: () => {},
      rebuild: async ({ reason }) => {
        rebuildCount += 1;
        rebuildCalls.push(reason);
        if (rebuildCount === 1) {
          await firstRebuild.promise;
        }
      },
    });

    const first = coalesce.awaitCoalescedTaxonomyRebuild("tag-written");

    // Wait until first rebuild is blocked inside rebuild().
    for (let i = 0; i < 50 && rebuildCount < 1; i++) {
      await new Promise((r) => setImmediate(r));
    }
    assert.equal(rebuildCount, 1);

    const second = coalesce.awaitCoalescedTaxonomyRebuild("tag-written-mid");
    firstRebuild.resolve();

    await Promise.all([first, second]);

    assert.equal(rebuildCalls.length, 2);
    assert.equal(rebuildCalls[0], "tag-written");
    assert.equal(rebuildCalls[1], "tag-written-mid");
    assert.equal(coalesce.getInFlightForTest(), null);
    assert.equal(coalesce.isDirtyForTest(), false);
  });

  it("D: write after settle starts a new cycle", async () => {
    const rebuildCalls: string[] = [];
    const coalesce = createTaxonomyTriggerCoalesce({
      coalesceMs: 1,
      sleep: async () => {},
      log: () => {},
      rebuild: async ({ reason }) => {
        rebuildCalls.push(reason);
      },
    });

    await coalesce.awaitCoalescedTaxonomyRebuild("tag-written");
    await coalesce.awaitCoalescedTaxonomyRebuild("tag-written-again");

    assert.deepEqual(rebuildCalls, ["tag-written", "tag-written-again"]);
  });

  it("E: rebuild failure rejects, clears state, later retry succeeds", async () => {
    let shouldFail = true;
    const events: string[] = [];
    const coalesce = createTaxonomyTriggerCoalesce({
      coalesceMs: 1,
      sleep: async () => {},
      log: (event) => {
        events.push(event);
      },
      rebuild: async () => {
        if (shouldFail) {
          throw new Error("rebuild boom");
        }
      },
    });

    await assert.rejects(
      () => coalesce.awaitCoalescedTaxonomyRebuild("tag-written"),
      /rebuild boom/,
    );
    assert.ok(events.includes("taxonomy-materialization-rebuild-failure"));
    assert.equal(coalesce.getInFlightForTest(), null);
    assert.equal(coalesce.isDirtyForTest(), false);

    shouldFail = false;
    await coalesce.awaitCoalescedTaxonomyRebuild("tag-written-retry");
    assert.equal(coalesce.getInFlightForTest(), null);
  });

  it("F: category reason uses the same coalesce entrypoint", async () => {
    const rebuildCalls: string[] = [];
    const coalesce = createTaxonomyTriggerCoalesce({
      coalesceMs: 1,
      sleep: async () => {},
      log: () => {},
      rebuild: async ({ reason }) => {
        rebuildCalls.push(reason);
      },
    });

    await coalesce.awaitCoalescedTaxonomyRebuild("category-written");
    assert.deepEqual(rebuildCalls, ["category-written"]);
  });

  it("G: two independent controllers each rebuild (fleet bound)", async () => {
    const aCalls: string[] = [];
    const bCalls: string[] = [];

    const a = createTaxonomyTriggerCoalesce({
      coalesceMs: 1,
      sleep: async () => {},
      log: () => {},
      rebuild: async ({ reason }) => {
        aCalls.push(reason);
      },
    });
    const b = createTaxonomyTriggerCoalesce({
      coalesceMs: 1,
      sleep: async () => {},
      log: () => {},
      rebuild: async ({ reason }) => {
        bCalls.push(reason);
      },
    });

    await Promise.all([
      a.awaitCoalescedTaxonomyRebuild("tag-written"),
      b.awaitCoalescedTaxonomyRebuild("tag-written"),
    ]);

    assert.deepEqual(aCalls, ["tag-written"]);
    assert.deepEqual(bCalls, ["tag-written"]);
  });
});
