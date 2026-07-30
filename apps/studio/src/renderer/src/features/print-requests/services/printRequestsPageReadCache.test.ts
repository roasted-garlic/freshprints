import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import {
  clearPrintRequestsPageCache,
  invalidatePrintRequestsPageCache,
  loadPrintRequestsPageCached,
  primePrintRequestsPageCache,
} from "./printRequestsPageReadCache";

describe("printRequestsPageReadCache", () => {
  it("caches a resolved value and reuses it without calling load again", async () => {
    clearPrintRequestsPageCache();
    const load = mock.fn(async () => "value-a");

    const first = await loadPrintRequestsPageCached("user-1", "key-a", load);
    const second = await loadPrintRequestsPageCached("user-1", "key-a", load);

    assert.equal(first, "value-a");
    assert.equal(second, "value-a");
    assert.equal(load.mock.callCount(), 1);
  });

  it("shares one in-flight promise for concurrent identical loads", async () => {
    clearPrintRequestsPageCache();
    let resolveLoad: (value: string) => void = () => {};
    const load = mock.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = loadPrintRequestsPageCached("user-1", "key-b", load);
    const second = loadPrintRequestsPageCached("user-1", "key-b", load);
    resolveLoad("shared-value");

    assert.equal(await first, "shared-value");
    assert.equal(await second, "shared-value");
    assert.equal(load.mock.callCount(), 1);
  });

  it("does not poison the cache when a load rejects", async () => {
    clearPrintRequestsPageCache();
    let shouldFail = true;
    const load = mock.fn(async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("boom");
      }
      return "recovered";
    });

    await assert.rejects(loadPrintRequestsPageCached("user-1", "key-c", load));
    const recovered = await loadPrintRequestsPageCached("user-1", "key-c", load);

    assert.equal(recovered, "recovered");
    assert.equal(load.mock.callCount(), 2);
  });

  it("scopes cache entries per user id, preventing cross-user reuse", async () => {
    clearPrintRequestsPageCache();
    const loadForUser1 = mock.fn(async () => "user-1-value");
    const loadForUser2 = mock.fn(async () => "user-2-value");

    await loadPrintRequestsPageCached("user-1", "shared-key", loadForUser1);
    const user2Value = await loadPrintRequestsPageCached("user-2", "shared-key", loadForUser2);

    assert.equal(user2Value, "user-2-value");
    assert.equal(loadForUser2.mock.callCount(), 1);
  });

  it("primePrintRequestsPageCache seeds a value without calling load", async () => {
    clearPrintRequestsPageCache();
    primePrintRequestsPageCache("user-1", "key-d", "primed-value");
    const load = mock.fn(async () => "should-not-be-called");

    const value = await loadPrintRequestsPageCached("user-1", "key-d", load);

    assert.equal(value, "primed-value");
    assert.equal(load.mock.callCount(), 0);
  });

  it("invalidatePrintRequestsPageCache with a prefix only clears matching keys for that user", async () => {
    clearPrintRequestsPageCache();
    primePrintRequestsPageCache("user-1", "list:page-1", "list-value");
    primePrintRequestsPageCache("user-1", "counts:working", "count-value");

    invalidatePrintRequestsPageCache("user-1", "list:");

    const listLoad = mock.fn(async () => "reloaded-list");
    const countLoad = mock.fn(async () => "count-value");
    const listValue = await loadPrintRequestsPageCached("user-1", "list:page-1", listLoad);
    const countValue = await loadPrintRequestsPageCached("user-1", "counts:working", countLoad);

    assert.equal(listValue, "reloaded-list");
    assert.equal(listLoad.mock.callCount(), 1);
    assert.equal(countValue, "count-value");
    assert.equal(countLoad.mock.callCount(), 0);
  });

  it("clearPrintRequestsPageCache (auth change) clears all users' entries", async () => {
    clearPrintRequestsPageCache();
    primePrintRequestsPageCache("user-1", "key-e", "user-1-value");
    primePrintRequestsPageCache("user-2", "key-e", "user-2-value");

    clearPrintRequestsPageCache();

    const load1 = mock.fn(async () => "fresh-1");
    const load2 = mock.fn(async () => "fresh-2");
    assert.equal(await loadPrintRequestsPageCached("user-1", "key-e", load1), "fresh-1");
    assert.equal(await loadPrintRequestsPageCached("user-2", "key-e", load2), "fresh-2");
    assert.equal(load1.mock.callCount(), 1);
    assert.equal(load2.mock.callCount(), 1);
  });

  it("a stale in-flight promise from a prior generation does not populate the cache after an auth clear", async () => {
    clearPrintRequestsPageCache();
    let resolveLoad: (value: string) => void = () => {};
    const load = mock.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const pending = loadPrintRequestsPageCached("user-1", "key-f", load);
    clearPrintRequestsPageCache();
    resolveLoad("stale-value");
    await pending;

    const freshLoad = mock.fn(async () => "fresh-value");
    const value = await loadPrintRequestsPageCached("user-1", "key-f", freshLoad);

    assert.equal(value, "fresh-value");
    assert.equal(freshLoad.mock.callCount(), 1);
  });
});
