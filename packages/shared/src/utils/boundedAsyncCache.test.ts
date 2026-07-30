import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBoundedAsyncCache } from "./boundedAsyncCache";

describe("createBoundedAsyncCache", () => {
  it("reuses an in-flight Promise and the successful bounded value", async () => {
    const cache = createBoundedAsyncCache<number>({ maxEntries: 2, ttlMs: 60_000 });
    let loads = 0;
    let resolveLoad: ((value: number) => void) | undefined;
    const loader = () => {
      loads += 1;
      return new Promise<number>((resolve) => {
        resolveLoad = resolve;
      });
    };

    const first = cache.get("same", loader);
    const second = cache.get("same", loader);
    assert.equal(first, second);
    assert.equal(loads, 1);
    resolveLoad?.(7);
    assert.equal(await first, 7);
    assert.equal(await cache.get("same", loader), 7);
    assert.equal(loads, 1);
  });

  it("evicts a rejected Promise so retry can recover", async () => {
    const events: string[] = [];
    const cache = createBoundedAsyncCache<number>({
      maxEntries: 2,
      onEvent: (event) => events.push(event),
      ttlMs: 60_000,
    });
    let loads = 0;
    const loader = async () => {
      loads += 1;
      if (loads === 1) {
        throw new Error("temporary");
      }
      return 9;
    };

    await assert.rejects(cache.get("retry", loader), /temporary/);
    assert.equal(await cache.get("retry", loader), 9);
    assert.equal(loads, 2);
    assert.deepEqual(events, ["miss", "retry"]);
  });

  it("supports explicit invalidation and LRU bounds", async () => {
    const cache = createBoundedAsyncCache<number>({ maxEntries: 2, ttlMs: 60_000 });
    let loads = 0;
    const load = async () => ++loads;

    await cache.get("a", load);
    await cache.get("b", load);
    await cache.get("a", load);
    await cache.get("c", load);
    assert.equal(cache.size().resolved, 2);
    await cache.get("b", load);
    assert.equal(loads, 4);
    cache.invalidate("a");
    await cache.get("a", load);
    assert.equal(loads, 5);
  });

  it("reports resolved and in-flight hits separately from loader misses", async () => {
    const events: string[] = [];
    let resolveLoad: ((value: number) => void) | undefined;
    const cache = createBoundedAsyncCache<number>({
      maxEntries: 2,
      onEvent: (event, key) => events.push(`${event}:${key}`),
      ttlMs: 60_000,
    });
    const loader = () => new Promise<number>((resolve) => {
      resolveLoad = resolve;
    });

    const first = cache.get("taxonomy", loader);
    const second = cache.get("taxonomy", loader);
    resolveLoad?.(1);
    await Promise.all([first, second]);
    await cache.get("taxonomy", loader);

    assert.deepEqual(events, [
      "miss:taxonomy",
      "hit:taxonomy",
      "hit:taxonomy",
    ]);
  });

  it("performs no work merely because an idle clock advances", async () => {
    const originalNow = Date.now;
    let now = 1_000;
    let loads = 0;
    const events: string[] = [];
    Date.now = () => now;

    try {
      const cache = createBoundedAsyncCache<number>({
        maxEntries: 2,
        onEvent: (event) => events.push(event),
        ttlMs: 5 * 60 * 1000,
      });
      await cache.get("route", async () => ++loads);
      const sizeBeforeIdle = cache.size();

      now += 30 * 60 * 1000;

      assert.equal(loads, 1);
      assert.deepEqual(events, ["miss"]);
      assert.deepEqual(cache.size(), sizeBeforeIdle);
    } finally {
      Date.now = originalNow;
    }
  });
});
