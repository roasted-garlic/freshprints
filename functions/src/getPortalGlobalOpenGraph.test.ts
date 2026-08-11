import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPortalGlobalOpenGraphAccounting,
  createPortalGlobalOpenGraphCache,
  filterPortalOgLibraryCandidatesExcludingExplicit,
  invalidatePortalGlobalOpenGraphCache,
  mergeAndRankPortalOgLibraryCandidates,
  type PortalOgLibraryDesignCandidate,
} from "./getPortalGlobalOpenGraph";

test("invalidatePortalGlobalOpenGraphCache clears the module cache helper API", () => {
  // Containment: Save path imports this export to drop sticky in-process meta after write.
  assert.equal(typeof invalidatePortalGlobalOpenGraphCache, "function");
  invalidatePortalGlobalOpenGraphCache();
});

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

test("global metadata cache clear drops hits so Save invalidation reloads", async () => {
  const cache = createPortalGlobalOpenGraphCache<number>(60_000);
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return loads;
  };
  assert.deepEqual(await cache.get(loader), { status: "miss", value: 1 });
  assert.deepEqual(await cache.get(loader), { status: "hit", value: 1 });
  cache.clear();
  assert.deepEqual(await cache.get(loader), { status: "miss", value: 2 });
});

test("accounting reports exact Firestore reads including design docs on miss only", () => {
  const library = buildPortalGlobalOpenGraphAccounting("miss", "library", {
    settingsDocumentsRead: 1,
    designDocumentsReturned: 73,
    totalFirestoreDocumentReads: 74,
  });
  const logo = buildPortalGlobalOpenGraphAccounting("miss", "logo", {
    settingsDocumentsRead: 2,
    designDocumentsReturned: 0,
    totalFirestoreDocumentReads: 2,
  });
  const hit = buildPortalGlobalOpenGraphAccounting("hit", "library", {
    settingsDocumentsRead: 1,
    designDocumentsReturned: 73,
    totalFirestoreDocumentReads: 74,
  });
  const inFlight = buildPortalGlobalOpenGraphAccounting("in-flight-reuse", "library", {
    settingsDocumentsRead: 1,
    designDocumentsReturned: 40,
    totalFirestoreDocumentReads: 41,
  });
  assert.equal(library.totalFirestoreDocumentReads, 74);
  assert.equal(library.designDocumentsReturned, 73);
  assert.equal(logo.totalFirestoreDocumentReads, 2);
  assert.equal(logo.designDocumentsReturned, 0);
  assert.equal(hit.totalFirestoreDocumentReads, 0);
  assert.equal(hit.designDocumentsReturned, 0);
  assert.equal(inFlight.totalFirestoreDocumentReads, 0);
  assert.equal(inFlight.designDocumentsReturned, 0);
  assert.deepEqual(Object.keys(library).sort(), [
    "cacheStatus",
    "designDocumentsReturned",
    "settingsDocumentsRead",
    "sourceMode",
    "totalFirestoreDocumentReads",
  ]);
});

test("mergeAndRank dedups by id and ranks by readyAt??createdAt desc then id desc", () => {
  const readyAtPage: PortalOgLibraryDesignCandidate[] = [
    { id: "a", readyAtMs: 100, createdAtMs: 10 },
    { id: "b", readyAtMs: 90, createdAtMs: 50 },
    { id: "legacy-missing", readyAtMs: null, createdAtMs: 5 },
  ];
  const createdAtPage: PortalOgLibraryDesignCandidate[] = [
    { id: "c", readyAtMs: null, createdAtMs: 200 },
    { id: "b", readyAtMs: 90, createdAtMs: 50 },
    { id: "legacy-only-created", readyAtMs: null, createdAtMs: 80 },
  ];

  const ranked = mergeAndRankPortalOgLibraryCandidates([readyAtPage, createdAtPage], 40);
  assert.deepEqual(
    ranked.map((candidate) => candidate.id),
    ["c", "a", "b", "legacy-only-created", "legacy-missing"],
  );
  assert.equal(ranked.length, 5);
});

test("mergeAndRank caps at sample size and uses id desc for equal rank timestamps", () => {
  const page: PortalOgLibraryDesignCandidate[] = [
    { id: "z", readyAtMs: 50, createdAtMs: 1 },
    { id: "m", readyAtMs: 50, createdAtMs: 2 },
    { id: "a", readyAtMs: 50, createdAtMs: 3 },
    { id: "older", readyAtMs: 10, createdAtMs: 100 },
  ];
  const ranked = mergeAndRankPortalOgLibraryCandidates([page], 3);
  assert.deepEqual(
    ranked.map((candidate) => candidate.id),
    ["z", "m", "a"],
  );
});

test("mergeAndRank keeps legacy ready designs that only appear on createdAt page", () => {
  const readyAtPage: PortalOgLibraryDesignCandidate[] = [
    { id: "with-ready-at", readyAtMs: 300, createdAtMs: 1 },
  ];
  const createdAtPage: PortalOgLibraryDesignCandidate[] = [
    { id: "legacy-no-ready-at", readyAtMs: null, createdAtMs: 250 },
    { id: "with-ready-at", readyAtMs: 300, createdAtMs: 1 },
  ];
  const ranked = mergeAndRankPortalOgLibraryCandidates([readyAtPage, createdAtPage]);
  assert.equal(ranked[0]?.id, "with-ready-at");
  assert.equal(ranked[1]?.id, "legacy-no-ready-at");
  assert.equal(ranked.length, 2);
});

test("filterPortalOgLibraryCandidatesExcludingExplicit drops explicit designs only", () => {
  const filtered = filterPortalOgLibraryCandidatesExcludingExplicit([
    { id: "safe", readyAtMs: 10, createdAtMs: 1 },
    { id: "explicit", readyAtMs: 20, createdAtMs: 2, isExplicitContent: true },
    { id: "legacy-missing-flag", readyAtMs: 30, createdAtMs: 3 },
    { id: "explicit-false", readyAtMs: 40, createdAtMs: 4, isExplicitContent: false },
  ]);
  assert.deepEqual(
    filtered.map((candidate) => candidate.id),
    ["safe", "legacy-missing-flag", "explicit-false"],
  );
});
