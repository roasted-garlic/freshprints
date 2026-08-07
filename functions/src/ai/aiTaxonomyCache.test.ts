import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { CATALOG_REFERENCE_SCHEMA_VERSION } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { AiCatalogReferenceSnapshot } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import {
  AI_TAXONOMY_CACHE_TTL_MS,
  __resetAiTaxonomyCacheForTests,
  __setAiTaxonomyCacheTestDeps,
  clearAiCatalogReferenceSnapshotCache,
  loadAiCatalogReferenceSnapshot,
} from "./loadAiCatalogReferenceSnapshot";
import {
  clearAiEnrichmentRuntimeCache,
  loadCachedActiveCategories,
  loadCachedApprovedTags,
} from "./aiEnrichmentRuntimeCache";

function makeSnapshot(label: string): AiCatalogReferenceSnapshot {
  return {
    schemaVersion: CATALOG_REFERENCE_SCHEMA_VERSION,
    contentVersion: `test-${label}`,
    generatedAt: new Date(0).toISOString(),
    categories: [{ id: `cat-${label}`, name: `Category ${label}` }],
    tags: [
      {
        id: `tag-${label}`,
        name: `tag-${label}`,
        aliases: [`alias-${label}`],
        preferredWhen: `when-${label}`,
        status: "approved",
      },
    ],
    categoryNames: [`Category ${label}`],
    categoryIdsByName: { [`category ${label}`]: `cat-${label}` },
  };
}

describe("AI taxonomy process-local cache (P3)", () => {
  afterEach(() => {
    __resetAiTaxonomyCacheForTests();
  });

  it("exports a finite 15-minute process-local TTL", () => {
    assert.equal(AI_TAXONOMY_CACHE_TTL_MS, 15 * 60_000);
  });

  it("first request is a cache miss and calls the Firestore loader once", async () => {
    let loadCount = 0;
    const events: string[] = [];
    const nowMs = 1_000_000;
    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: (event) => {
        events.push(event);
      },
      loadFromFirestore: async () => {
        loadCount += 1;
        return makeSnapshot("v1");
      },
    });

    const value = await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 1);
    assert.equal(value.contentVersion, "test-v1");
    assert.ok(events.includes("taxonomy-cache-miss"));
    assert.ok(events.includes("taxonomy-load-success"));
    assert.ok(!events.includes("taxonomy-cache-hit"));
  });

  it("second request within TTL is a cache hit and does not call the loader", async () => {
    let loadCount = 0;
    const events: string[] = [];
    const nowMs = 1_000_000;
    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: (event) => {
        events.push(event);
      },
      loadFromFirestore: async () => {
        loadCount += 1;
        return makeSnapshot("v1");
      },
    });

    await loadAiCatalogReferenceSnapshot();
    events.length = 0;
    const value = await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 1);
    assert.equal(value.contentVersion, "test-v1");
    assert.deepEqual(events, ["taxonomy-cache-hit"]);
  });

  it("many sequential requests within TTL still call the loader once", async () => {
    let loadCount = 0;
    let nowMs = 1_000_000;
    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => {
        loadCount += 1;
        return makeSnapshot("v1");
      },
    });

    for (let i = 0; i < 45; i += 1) {
      nowMs += 10_000; // 45 * 10s = 7.5min < 15min TTL
      await loadAiCatalogReferenceSnapshot();
    }
    assert.equal(loadCount, 1);
  });

  it("parallel cold requests share one loader call via in-flight joins", async () => {
    let loadCount = 0;
    let resolveLoad!: (value: AiCatalogReferenceSnapshot) => void;
    const events: string[] = [];
    const loadGate = new Promise<AiCatalogReferenceSnapshot>((resolve) => {
      resolveLoad = resolve;
    });

    __setAiTaxonomyCacheTestDeps({
      now: () => 1_000_000,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: (event) => {
        events.push(event);
      },
      loadFromFirestore: async () => {
        loadCount += 1;
        return loadGate;
      },
    });

    const p1 = loadAiCatalogReferenceSnapshot();
    const p2 = loadAiCatalogReferenceSnapshot();
    const p3 = loadAiCatalogReferenceSnapshot();

    // Allow microtasks to register joins before releasing the loader.
    await Promise.resolve();
    assert.equal(loadCount, 1);
    assert.ok(events.includes("taxonomy-cache-miss"));
    assert.equal(
      events.filter((event) => event === "taxonomy-cache-join-inflight").length,
      2,
    );

    resolveLoad(makeSnapshot("shared"));
    const [a, b, c] = await Promise.all([p1, p2, p3]);
    assert.equal(a.contentVersion, "test-shared");
    assert.equal(b.contentVersion, "test-shared");
    assert.equal(c.contentVersion, "test-shared");
    assert.equal(loadCount, 1);
  });

  it("TTL expiry triggers exactly one fresh loader call", async () => {
    let loadCount = 0;
    const events: string[] = [];
    let nowMs = 1_000_000;
    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: (event) => {
        events.push(event);
      },
      loadFromFirestore: async () => {
        loadCount += 1;
        return makeSnapshot(`v${loadCount}`);
      },
    });

    await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 1);

    nowMs += AI_TAXONOMY_CACHE_TTL_MS + 1;
    events.length = 0;
    const value = await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 2);
    assert.equal(value.contentVersion, "test-v2");
    assert.ok(events.includes("taxonomy-cache-expired"));
    assert.ok(events.includes("taxonomy-cache-miss"));
    assert.ok(events.includes("taxonomy-load-success"));
  });

  it("parallel requests immediately after expiry share one refresh", async () => {
    let loadCount = 0;
    let nowMs = 1_000_000;
    let resolveLoad!: (value: AiCatalogReferenceSnapshot) => void;
    let loadGate = Promise.resolve(makeSnapshot("v1"));

    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => {
        loadCount += 1;
        return loadGate;
      },
    });

    await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 1);

    nowMs += AI_TAXONOMY_CACHE_TTL_MS + 1;
    loadGate = new Promise<AiCatalogReferenceSnapshot>((resolve) => {
      resolveLoad = resolve;
    });

    const p1 = loadAiCatalogReferenceSnapshot();
    const p2 = loadAiCatalogReferenceSnapshot();
    await Promise.resolve();
    assert.equal(loadCount, 2);
    resolveLoad(makeSnapshot("refreshed"));
    const [a, b] = await Promise.all([p1, p2]);
    assert.equal(a.contentVersion, "test-refreshed");
    assert.equal(b.contentVersion, "test-refreshed");
    assert.equal(loadCount, 2);
  });

  it("loader failure does not persist broken data and retry can reload", async () => {
    let loadCount = 0;
    let shouldFail = true;
    __setAiTaxonomyCacheTestDeps({
      now: () => 1_000_000,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => {
        loadCount += 1;
        if (shouldFail) {
          throw new Error("firestore_unavailable");
        }
        return makeSnapshot("recovered");
      },
    });

    await assert.rejects(() => loadAiCatalogReferenceSnapshot(), /firestore_unavailable/);
    assert.equal(loadCount, 1);

    shouldFail = false;
    const value = await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 2);
    assert.equal(value.contentVersion, "test-recovered");

    // Hit after recovery — no third load.
    const again = await loadAiCatalogReferenceSnapshot();
    assert.equal(loadCount, 2);
    assert.equal(again.contentVersion, "test-recovered");
  });

  it("never returns a partially-built taxonomy (only complete snapshots)", async () => {
    __setAiTaxonomyCacheTestDeps({
      now: () => 1_000_000,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => makeSnapshot("complete"),
    });
    const value = await loadAiCatalogReferenceSnapshot();
    assert.ok(Array.isArray(value.categories));
    assert.ok(Array.isArray(value.tags));
    assert.ok(Array.isArray(value.categoryNames));
    assert.equal(typeof value.categoryIdsByName, "object");
    assert.equal(value.schemaVersion, CATALOG_REFERENCE_SCHEMA_VERSION);
  });

  it("clear during in-flight load does not republish into the live cache", async () => {
    let loadCount = 0;
    const resolvers: Array<(value: AiCatalogReferenceSnapshot) => void> = [];
    const nowMs = 1_000_000;

    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => {
        loadCount += 1;
        return new Promise<AiCatalogReferenceSnapshot>((resolve) => {
          resolvers.push(resolve);
        });
      },
    });

    const stalePromise = loadAiCatalogReferenceSnapshot();
    await Promise.resolve();
    assert.equal(loadCount, 1);

    clearAiCatalogReferenceSnapshotCache();

    const freshPromise = loadAiCatalogReferenceSnapshot();
    await Promise.resolve();
    assert.equal(loadCount, 2);

    // Resolve stale first — must not become the cached value.
    resolvers[0]!(makeSnapshot("stale-inflight"));
    const staleValue = await stalePromise;
    assert.equal(staleValue.contentVersion, "test-stale-inflight");

    resolvers[1]!(makeSnapshot("fresh"));
    const freshValue = await freshPromise;
    assert.equal(freshValue.contentVersion, "test-fresh");

    const hit = await loadAiCatalogReferenceSnapshot();
    assert.equal(hit.contentVersion, "test-fresh");
    assert.equal(loadCount, 2);
  });

  it("clearAiEnrichmentRuntimeCache also invalidates taxonomy so next load misses", async () => {
    let loadCount = 0;
    const nowMs = 1_000_000;
    __setAiTaxonomyCacheTestDeps({
      now: () => nowMs,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => {
        loadCount += 1;
        return makeSnapshot(`v${loadCount}`);
      },
    });

    await loadCachedActiveCategories();
    await loadCachedApprovedTags();
    assert.equal(loadCount, 1);

    clearAiEnrichmentRuntimeCache();
    await loadCachedActiveCategories();
    assert.equal(loadCount, 2);
  });

  it("category and tag adapters share one taxonomy load (no dual TTL)", async () => {
    let loadCount = 0;
    __setAiTaxonomyCacheTestDeps({
      now: () => 1_000_000,
      ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
      log: () => undefined,
      loadFromFirestore: async () => {
        loadCount += 1;
        return makeSnapshot("shared-adapters");
      },
    });

    const categories = await loadCachedActiveCategories();
    const tags = await loadCachedApprovedTags();
    assert.equal(loadCount, 1);
    assert.equal(categories.categories[0]?.id, "cat-shared-adapters");
    assert.equal(tags[0]?.name, "tag-shared-adapters");
  });
});
