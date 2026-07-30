import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BoundedConcurrencyQueue, mapWithConcurrency } from "./boundedConcurrencyQueue";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("BoundedConcurrencyQueue", () => {
  it("never exceeds the configured concurrency ceiling", async () => {
    const queue = new BoundedConcurrencyQueue(2);
    let active = 0;
    let maxActive = 0;
    const gates = Array.from({ length: 5 }, () => deferred<void>());

    const runs = gates.map((gate, index) =>
      queue.run(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await gate.promise;
        active -= 1;
        return index;
      }),
    );

    // Release gates one at a time; concurrency must never exceed 2 regardless of release order.
    for (const gate of gates) {
      gate.resolve();
      await Promise.resolve();
    }

    const results = await Promise.all(runs);
    assert.deepEqual(results, [0, 1, 2, 3, 4]);
    assert.ok(maxActive <= 2, `expected max concurrency <= 2, got ${maxActive}`);
  });

  it("releases the permit and lets a waiter proceed when a task rejects", async () => {
    const queue = new BoundedConcurrencyQueue(1);

    const first = queue.run(async () => {
      throw new Error("boom");
    });

    let secondRan = false;
    const second = queue.run(async () => {
      secondRan = true;
    });

    await assert.rejects(first, /boom/);
    await second;
    assert.equal(secondRan, true, "a rejected task must release its permit so the next waiter runs");
  });

  it("rejects a non-positive or non-finite concurrency value", () => {
    assert.throws(() => new BoundedConcurrencyQueue(0));
    assert.throws(() => new BoundedConcurrencyQueue(-1));
    assert.throws(() => new BoundedConcurrencyQueue(Number.NaN));
  });

  it("does not deadlock when every task rejects", async () => {
    const queue = new BoundedConcurrencyQueue(2);
    const tasks = Array.from({ length: 6 }, (_, index) =>
      queue.run(async () => {
        throw new Error(`fail-${index}`);
      }).catch((error: unknown) => error),
    );

    const results = await Promise.all(tasks);
    assert.equal(results.length, 6);
    for (const result of results) {
      assert.ok(result instanceof Error);
    }
  });
});

describe("mapWithConcurrency", () => {
  it("returns one settled result per item, in item order, regardless of completion order", async () => {
    const items = [30, 10, 20];
    const results = await mapWithConcurrency(items, 3, async (delayMs) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return delayMs;
    });

    assert.equal(results.length, 3);
    assert.deepEqual(
      results.map((r) => r.index),
      [0, 1, 2],
    );
    assert.deepEqual(
      results.map((r) => (r.status === "fulfilled" ? r.value : null)),
      [30, 10, 20],
    );
  });

  it("keeps a rejected item's failure isolated — sibling items still settle as fulfilled", async () => {
    const items = ["a", "b", "c", "d"];
    const results = await mapWithConcurrency(items, 2, async (item) => {
      if (item === "b") {
        throw new Error("bad item");
      }
      return item.toUpperCase();
    });

    assert.equal(results[0].status, "fulfilled");
    assert.equal(results[1].status, "rejected");
    assert.equal(results[2].status, "fulfilled");
    assert.equal(results[3].status, "fulfilled");

    const fulfilledValues = results
      .filter((r): r is Extract<typeof r, { status: "fulfilled" }> => r.status === "fulfilled")
      .map((r) => r.value);
    assert.deepEqual(fulfilledValues, ["A", "C", "D"]);
  });

  it("aggregating counts from the returned array after settlement is deterministic across many runs", async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const results = await mapWithConcurrency(items, 4, async (i) => {
        await new Promise((resolve) => setTimeout(resolve, (i % 3) * 2));
        if (i % 7 === 0) {
          throw new Error(`fail-${i}`);
        }
        return i;
      });

      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.filter((r) => r.status === "rejected").length;
      // i % 7 === 0 for i in [0..19]: 0, 7, 14 -> 3 rejections
      assert.equal(rejected, 3, `attempt ${attempt}: expected 3 rejected`);
      assert.equal(fulfilled, 17, `attempt ${attempt}: expected 17 fulfilled`);
      assert.equal(fulfilled + rejected, items.length);
    }
  });

  it("never runs more than maxConcurrency tasks simultaneously across a 100-item batch", async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency(items, 6, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
    });

    assert.ok(maxActive <= 6, `expected max concurrency <= 6 across 100 items, got ${maxActive}`);
  });

  it("resolves with an empty array for an empty item list", async () => {
    const results = await mapWithConcurrency<number, number>([], 4, async (i) => i);
    assert.deepEqual(results, []);
  });

  it("resolves for a single-item list without hanging", async () => {
    const results = await mapWithConcurrency([42], 4, async (i) => i * 2);
    assert.equal(results.length, 1);
    assert.deepEqual(results[0], { status: "fulfilled", index: 0, value: 84 });
  });
});
