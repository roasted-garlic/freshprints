import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPortalGlobalOpenGraphAccounting,
  createPortalGlobalOpenGraphCache,
} from "./getPortalGlobalOpenGraph";

test("global metadata cache reuses resolved and concurrent loads", async () => {
  const cache = createPortalGlobalOpenGraphCache<number>(60_000);
  let loads = 0;
  let resolveLoad: ((value: number) => void) | undefined;
  const loader = () => {
    loads += 1;
    return new Promise<number>((resolve) => {
      resolveLoad = resolve;
    });
  };
  const first = cache.get(loader);
  const concurrent = cache.get(loader);
  resolveLoad?.(7);
  assert.deepEqual(await first, { status: "miss", value: 7 });
  assert.deepEqual(await concurrent, { status: "in-flight-reuse", value: 7 });
  assert.deepEqual(await cache.get(loader), { status: "hit", value: 7 });
  assert.equal(loads, 1);
});

test("global metadata cache expires once and rejected loads never poison it", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const cache = createPortalGlobalOpenGraphCache<number>(100);
    let loads = 0;
    const loader = async () => {
      loads += 1;
      if (loads === 1) throw new Error("temporary");
      return loads;
    };
    await assert.rejects(cache.get(loader), /temporary/);
    assert.deepEqual(await cache.get(loader), { status: "miss", value: 2 });
    now += 101;
    assert.deepEqual(await cache.get(loader), { status: "miss", value: 3 });
  } finally {
    Date.now = originalNow;
  }
});

test("accounting reports exact Firestore reads and contains safe aggregate keys only", () => {
  const library = buildPortalGlobalOpenGraphAccounting("miss", "library", {
    settingsDocumentsRead: 1,
    totalFirestoreDocumentReads: 1,
  });
  const logo = buildPortalGlobalOpenGraphAccounting("miss", "logo", {
    settingsDocumentsRead: 2,
    totalFirestoreDocumentReads: 2,
  });
  const hit = buildPortalGlobalOpenGraphAccounting("hit", "library", {
    settingsDocumentsRead: 1,
    totalFirestoreDocumentReads: 1,
  });
  assert.equal(library.totalFirestoreDocumentReads, 1);
  assert.equal(library.designDocumentsReturned, 0);
  assert.equal(logo.totalFirestoreDocumentReads, 2);
  assert.equal(hit.totalFirestoreDocumentReads, 0);
  assert.deepEqual(Object.keys(library).sort(), [
    "cacheStatus",
    "designDocumentsReturned",
    "settingsDocumentsRead",
    "sourceMode",
    "totalFirestoreDocumentReads",
  ]);
});
