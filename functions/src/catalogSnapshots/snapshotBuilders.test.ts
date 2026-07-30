import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePortalCatalogPath } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { PortalCatalogCard } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import {
  buildPortalCatalogManifest,
  buildPortalCatalogStudioReadyIndex,
  buildPortalCatalogTagFacetSummary,
  buildTaxonomySnapshots,
  contentVersion,
  portalCatalogBrowseOrder,
  portalCatalogPathTemplates,
  studioCatalogReadyOrder,
} from "./snapshotBuilders";

function catalogCard(overrides: Partial<PortalCatalogCard> = {}): PortalCatalogCard {
  return {
    id: "design-1",
    title: "Design",
    tags: [],
    thumbnailPath: "design-1.webp",
    width: 3000,
    height: 3000,
    requestCount: 0,
    favoriteCount: 0,
    ...overrides,
  };
}

describe("catalog snapshot builders", () => {
  it("builds deterministic versioned private and client-safe taxonomy projections", () => {
    const source = {
      categories: [
        { id: "b", name: "Beta", description: "AI context", sortOrder: 2 },
        { id: "a", name: "Alpha", sortOrder: 1 },
      ],
      tags: [{
        id: "tag",
        name: "Summer",
        aliases: ["sun"],
        preferredWhen: "Bright seasonal art",
        status: "approved" as const,
        createdAt: null,
        updatedAt: null,
        createdBy: "owner",
        updatedBy: "owner",
      }],
    };
    const result = buildTaxonomySnapshots(source, 7, "2026-07-23T00:00:00.000Z");
    assert.match(result.ai.contentVersion, /^7-[a-f0-9]{16}$/);
    assert.equal(result.client.contentVersion, result.ai.contentVersion);
    assert.deepEqual(result.ai.categoryNames, ["Alpha", "Beta"]);
    assert.equal(result.ai.tags[0]?.preferredWhen, "Bright seasonal art");
    assert.equal("preferredWhen" in result.client.tags[0]!, false);
    assert.equal("description" in result.client.categories[1]!, false);
    const publicJson = JSON.stringify(result.client);
    for (const forbidden of ["preferredWhen", "description", "createdBy", "updatedBy"]) {
      assert.equal(publicJson.includes(forbidden), false);
    }
  });

  it("hashes equivalent object key order identically", () => {
    assert.equal(contentVersion(2, { a: 1, b: 2 }), contentVersion(2, { b: 2, a: 1 }));
  });

  it("builds the dev-scale realistic taxonomy fixture (1,122 tags / 18 categories) shared by budget tests", () => {
    // Reproduces the field shape/lengths of the fresh-prints-dev rebuildCatalogSnapshots failure
    // (snapshot-asset-budget-exceeded:generated/catalog-reference/ai/v{N}.json): the AI snapshot
    // carries `preferredWhen` guidance text that the client snapshot omits, so only the AI
    // projection approaches/crosses a budget at this scale.
    const result = buildTaxonomySnapshots(devScaleTaxonomyFixture(), 1, "2026-07-23T00:00:00.000Z");
    const aiBytes = Buffer.byteLength(JSON.stringify(result.ai), "utf8");
    const clientBytes = Buffer.byteLength(JSON.stringify(result.client), "utf8");
    const OLD_256_KIB_BUDGET = 256 * 1024;
    const APPROVED_512_KIB_BUDGET = 512 * 1024;
    assert.ok(
      aiBytes > OLD_256_KIB_BUDGET,
      `expected the dev-scale AI snapshot (${aiBytes} bytes) to exceed the original 256 KiB budget ` +
        "(this is the exact measured cause of the fresh-prints-dev initialization failure)",
    );
    assert.ok(
      aiBytes < APPROVED_512_KIB_BUDGET,
      `expected the dev-scale AI snapshot (${aiBytes} bytes) to fit the owner-approved 512 KiB budget`,
    );
    assert.ok(
      clientBytes < OLD_256_KIB_BUDGET,
      `expected the dev-scale client snapshot (${clientBytes} bytes) to stay under its unchanged ` +
        `${OLD_256_KIB_BUDGET}-byte budget`,
    );
  });
});

describe("Portal catalog root manifest (compact, v2 — R-013 follow-up)", () => {
  const MANIFEST_BUDGET_BYTES = 32 * 1024;
  const root = "generated/portal-catalog/v4-realistic";

  // Dev-scale-equivalent counts matching the real fresh-prints-dev
  // `snapshot-asset-budget-exceeded:generated/portal-catalog/manifest.json` failure: ~1,122 tags
  // (assume all referenced by at least one ready design), 18 categories, 202 two-character search
  // shards (26 letters + 10 digits + "_" = 37 possible leading chars, capped realistically), 128
  // card buckets (the existing PORTAL_CATALOG_CARD_BUCKET_COUNT), and a couple of browse pages.
  function devScalePortalManifestInput() {
    const existingShardKeys: string[] = [];
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789_";
    outer: for (const a of chars) {
      for (const b of chars) {
        if (existingShardKeys.length >= 202) break outer;
        existingShardKeys.push(`${a}${b}`);
      }
    }
    const categoryPageCounts: Record<string, number> = {};
    for (let index = 0; index < 18; index += 1) categoryPageCounts[`cat-${index}`] = 2;
    return {
      generation: 4,
      contentVersion: "4-abcdef0123456789",
      previousContentVersion: "3-1111111111111111",
      generatedAt: "2026-07-23T00:00:00.000Z",
      manifestPath: "generated/portal-catalog/manifest.json",
      discoverPath: `${root}/discover.json`,
      root,
      existingShardKeys,
      recentPageCount: 2,
      categoryPageCounts,
    };
  }

  it("replaces the old fully enumerated shape (1,122 tagPaths + 202 shards + 128 buckets) — 130.9 KB — with a compact manifest under 32 KiB", () => {
    // Reproduces the exact confirmed fresh-prints-dev failure:
    // { code: "snapshot/payload-budget-exceeded", kind: "portal-catalog", path: "generated/portal-catalog/manifest.json" }.
    // The OLD manifest shape enumerated a full Storage path per tag/category/shard/bucket/page.
    const oldStyleManifest = (() => {
      const tagPaths: Record<string, string> = {};
      for (let index = 0; index < 1122; index += 1) {
        const tagId = `tag-id-${String(index).padStart(6, "0")}`;
        tagPaths[tagId] = `${root}/filters/tags/${tagId}.json`;
      }
      const { existingShardKeys, categoryPageCounts } = devScalePortalManifestInput();
      const searchShardPaths = existingShardKeys.map((shard) => `${root}/search/shard-${shard}.json`);
      const cardBucketPaths = Array.from({ length: 128 }, (_, bucket) => `${root}/cards/bucket-${bucket}.json`);
      const categoryFilterPaths: Record<string, string> = {};
      const categoryPagePaths: Record<string, string[]> = {};
      for (const categoryId of Object.keys(categoryPageCounts)) {
        categoryFilterPaths[categoryId] = `${root}/filters/categories/${categoryId}.json`;
        categoryPagePaths[categoryId] = Array.from(
          { length: categoryPageCounts[categoryId]! },
          (_, page) => `${root}/categories/${categoryId}/page-${page}.json`,
        );
      }
      return {
        schemaVersion: 1,
        generation: 4,
        contentVersion: "4-abcdef0123456789",
        previousContentVersion: "3-1111111111111111",
        generatedAt: "2026-07-23T00:00:00.000Z",
        path: "generated/portal-catalog/manifest.json",
        discoverPath: `${root}/discover.json`,
        searchShardPaths,
        tagPaths,
        categoryFilterPaths,
        cardBucketPaths,
        recentPagePaths: ["page-0.json", "page-1.json"].map((p) => `${root}/recent/${p}`),
        categoryPagePaths,
      };
    })();
    const oldBytes = Buffer.byteLength(JSON.stringify(oldStyleManifest), "utf8");
    assert.ok(
      oldBytes > MANIFEST_BUDGET_BYTES,
      `expected the old fully enumerated manifest (${oldBytes} bytes) to exceed the ` +
        `${MANIFEST_BUDGET_BYTES}-byte budget (this reproduces the confirmed dev failure)`,
    );

    const manifest = buildPortalCatalogManifest(devScalePortalManifestInput());
    const newBytes = Buffer.byteLength(JSON.stringify(manifest), "utf8");
    assert.ok(
      newBytes < MANIFEST_BUDGET_BYTES,
      `expected the corrected compact manifest (${newBytes} bytes) to fit the ` +
        `${MANIFEST_BUDGET_BYTES}-byte budget`,
    );
  });

  it("remains under 32 KiB even with projected catalog growth (5,000 tags, 500 categories)", () => {
    const existingShardKeys = devScalePortalManifestInput().existingShardKeys;
    const categoryPageCounts: Record<string, number> = {};
    for (let index = 0; index < 500; index += 1) categoryPageCounts[`cat-${index}`] = 5;
    const manifest = buildPortalCatalogManifest({
      ...devScalePortalManifestInput(),
      existingShardKeys,
      categoryPageCounts,
      recentPageCount: 250,
    });
    const bytes = Buffer.byteLength(JSON.stringify(manifest), "utf8");
    assert.ok(
      bytes < MANIFEST_BUDGET_BYTES,
      `expected the manifest at projected growth (${bytes} bytes, 500 categories) to stay under ` +
        `${MANIFEST_BUDGET_BYTES} bytes`,
    );
  });

  it("resolves deterministic paths that match what the publisher actually writes", () => {
    const manifest = buildPortalCatalogManifest(devScalePortalManifestInput());
    const templates = portalCatalogPathTemplates(root);
    assert.equal(manifest.filters.tagPathTemplate, templates.tagPathTemplate);
    assert.equal(manifest.filters.categoryPathTemplate, templates.categoryPathTemplate);
    assert.equal(manifest.search.pathTemplate, templates.searchShardPathTemplate);
    assert.equal(manifest.cards.pathTemplate, templates.cardBucketPathTemplate);
    assert.equal(manifest.recent.pathTemplate, templates.recentPagePathTemplate);
    assert.equal(manifest.categories.pathTemplate, templates.categoryPagePathTemplate);

    assert.equal(
      resolvePortalCatalogPath(manifest.filters.tagPathTemplate, { tagId: "tag-id-000042" }),
      `${root}/filters/tags/tag-id-000042.json`,
    );
    assert.equal(
      resolvePortalCatalogPath(manifest.filters.categoryPathTemplate, { categoryId: "cat-3" }),
      `${root}/filters/categories/cat-3.json`,
    );
    assert.equal(
      resolvePortalCatalogPath(manifest.search.pathTemplate, { shard: "ab" }),
      `${root}/search/shard-ab.json`,
    );
    assert.equal(
      resolvePortalCatalogPath(manifest.cards.pathTemplate, { bucket: 42 }),
      `${root}/cards/bucket-42.json`,
    );
    assert.equal(
      resolvePortalCatalogPath(manifest.recent.pathTemplate, { page: 0 }),
      `${root}/recent/page-0.json`,
    );
    assert.equal(
      resolvePortalCatalogPath(manifest.categories.pathTemplate, { categoryId: "cat-3", page: 1 }),
      `${root}/categories/cat-3/page-1.json`,
    );
  });

  it("every search shard, tag filter, category filter, card bucket, recent page, and category page remains discoverable", () => {
    const input = devScalePortalManifestInput();
    const manifest = buildPortalCatalogManifest(input);

    // Search: every existing shard key resolves to a distinct, addressable path.
    const shardPaths = new Set(
      manifest.search.existingShardKeys.map((shard) =>
        resolvePortalCatalogPath(manifest.search.pathTemplate, { shard }),
      ),
    );
    assert.equal(shardPaths.size, input.existingShardKeys.length);

    // Card buckets: every bucket number 0..bucketCount-1 is addressable (no enumeration needed).
    const bucketPaths = new Set(
      Array.from({ length: manifest.cards.bucketCount }, (_, bucket) =>
        resolvePortalCatalogPath(manifest.cards.pathTemplate, { bucket }),
      ),
    );
    assert.equal(bucketPaths.size, manifest.cards.bucketCount);

    // Recent pages: every page index 0..pageCount-1 is addressable.
    const recentPaths = new Set(
      Array.from({ length: manifest.recent.pageCount }, (_, page) =>
        resolvePortalCatalogPath(manifest.recent.pathTemplate, { page }),
      ),
    );
    assert.equal(recentPaths.size, manifest.recent.pageCount);

    // Category pages: every (categoryId, page) pair implied by pageCounts is addressable.
    let totalCategoryPages = 0;
    const categoryPagePaths = new Set<string>();
    for (const [categoryId, pageCount] of Object.entries(manifest.categories.pageCounts)) {
      for (let page = 0; page < pageCount; page += 1) {
        categoryPagePaths.add(
          resolvePortalCatalogPath(manifest.categories.pathTemplate, { categoryId, page }),
        );
        totalCategoryPages += 1;
      }
    }
    assert.equal(categoryPagePaths.size, totalCategoryPages);

    // Tag and category filters: any known ID resolves to a distinct, addressable path
    // (existence itself is a Storage 404 on read, not manifest-enumerated — by design).
    assert.equal(
      resolvePortalCatalogPath(manifest.filters.tagPathTemplate, { tagId: "tag-id-000001" }),
      resolvePortalCatalogPath(manifest.filters.tagPathTemplate, { tagId: "tag-id-000001" }),
    );
    assert.notEqual(
      resolvePortalCatalogPath(manifest.filters.tagPathTemplate, { tagId: "tag-id-000001" }),
      resolvePortalCatalogPath(manifest.filters.tagPathTemplate, { tagId: "tag-id-000002" }),
    );
  });

  it("rejects a manifest built with an unsupported hash or search strategy version", () => {
    const manifest = buildPortalCatalogManifest(devScalePortalManifestInput());
    assert.equal(manifest.cards.hashVersion, 1);
    assert.equal(manifest.search.strategyVersion, 1);
  });

  it("includes a fixed tagFacetPath (one summary per catalog version, no per-tag enumeration)", () => {
    const manifest = buildPortalCatalogManifest(devScalePortalManifestInput());
    assert.equal(manifest.filters.tagFacetPath, `${root}/filters/tags-facet.json`);
  });
});

describe("Portal tag-facet summary (fixes tag modal showing the full taxonomy with no counts)", () => {
  it("excludes tags with zero ready designs", () => {
    const cards = [catalogCard({ id: "d1", tags: ["ocean"] })];
    const summary = buildPortalCatalogTagFacetSummary(cards, new Map([
      ["ocean", "Ocean"],
      ["unused-tag", "Unused Tag"],
    ]));
    assert.deepEqual(summary.map((entry) => entry.id), ["ocean"]);
  });

  it("includes every tag with at least one ready design and its exact count", () => {
    const cards = [
      catalogCard({ id: "d1", tags: ["ocean", "sunset"] }),
      catalogCard({ id: "d2", tags: ["ocean"] }),
      catalogCard({ id: "d3", tags: ["sunset"] }),
    ];
    const names = new Map([["ocean", "Ocean"], ["sunset", "Sunset"]]);
    const summary = buildPortalCatalogTagFacetSummary(cards, names);
    const byId = new Map(summary.map((entry) => [entry.id, entry.count]));
    assert.equal(byId.get("ocean"), 2);
    assert.equal(byId.get("sunset"), 2);
  });

  it("does not inflate a tag's count when a design lists the same tag ID twice", () => {
    const cards = [catalogCard({ id: "d1", tags: ["ocean", "ocean"] })];
    const summary = buildPortalCatalogTagFacetSummary(cards, new Map([["ocean", "Ocean"]]));
    assert.equal(summary.find((entry) => entry.id === "ocean")?.count, 1);
  });

  it("only counts customer-visible ready designs (mapPortalCatalogCard already excludes non-ready)", () => {
    // buildPortalCatalogTagFacetSummary receives only the already-filtered ready-card list from
    // publishPortal (mapPortalCatalogCard returns null for non-"ready" status designs), so an
    // archived/processing/rejected design's tags never reach this function at all.
    const readyCards = [catalogCard({ id: "ready-1", tags: ["ocean"] })];
    const summary = buildPortalCatalogTagFacetSummary(readyCards, new Map([["ocean", "Ocean"]]));
    assert.equal(summary.length, 1);
  });

  it("uses the canonical taxonomy name, falling back to the tag ID only if the name is unknown", () => {
    const cards = [catalogCard({ id: "d1", tags: ["ocean", "orphan-tag-id"] })];
    const summary = buildPortalCatalogTagFacetSummary(cards, new Map([["ocean", "Ocean"]]));
    assert.equal(summary.find((entry) => entry.id === "ocean")?.name, "Ocean");
    assert.equal(summary.find((entry) => entry.id === "orphan-tag-id")?.name, "orphan-tag-id");
  });

  it("contains no private/AI-only fields — only id, name, and count", () => {
    const cards = [catalogCard({ id: "d1", tags: ["ocean"] })];
    const summary = buildPortalCatalogTagFacetSummary(cards, new Map([["ocean", "Ocean"]]));
    for (const entry of summary) {
      assert.deepEqual(Object.keys(entry).sort(), ["count", "id", "name"]);
    }
  });

  it("stays comfortably within a 256 KiB budget even at the dev-scale (~1,122-tag) corpus", () => {
    const cards: PortalCatalogCard[] = [];
    const names = new Map<string, string>();
    for (let index = 0; index < 1122; index += 1) {
      const tagId = `tag-id-${String(index).padStart(6, "0")}`;
      names.set(tagId, `Example Tag Name ${index}`);
      // Simulate ~80 ready designs each carrying a handful of tags, so most tags accumulate a
      // small nonzero count while some tags (e.g. every 20th) have zero ready designs.
      if (index % 20 !== 0) {
        cards.push(catalogCard({ id: `design-${index}`, tags: [tagId] }));
      }
    }
    const summary = buildPortalCatalogTagFacetSummary(cards, names);
    // Zero-count tags (every 20th) must be excluded entirely.
    assert.ok(summary.length < 1122);
    const bytes = Buffer.byteLength(JSON.stringify(summary), "utf8");
    assert.ok(bytes < 256 * 1024, `expected tag facet summary (${bytes} bytes) to fit 256 KiB`);
  });
});

describe("Portal catalog browse order (fixes search-result ordering regression)", () => {
  it("orders newest-first by createdAtMs, matching the existing Firestore browse convention", () => {
    const cards = [
      catalogCard({ id: "oldest", createdAtMs: 1000 }),
      catalogCard({ id: "newest", createdAtMs: 3000 }),
      catalogCard({ id: "middle", createdAtMs: 2000 }),
    ];
    const ordered = portalCatalogBrowseOrder(cards).map((card) => card.id);
    assert.deepEqual(ordered, ["newest", "middle", "oldest"]);
  });

  it("uses design ID descending as the stable tiebreaker for equal createdAtMs", () => {
    const cards = [
      catalogCard({ id: "design-a", createdAtMs: 1000 }),
      catalogCard({ id: "design-c", createdAtMs: 1000 }),
      catalogCard({ id: "design-b", createdAtMs: 1000 }),
    ];
    const ordered = portalCatalogBrowseOrder(cards).map((card) => card.id);
    assert.deepEqual(ordered, ["design-c", "design-b", "design-a"]);
  });

  it("treats a missing createdAtMs as the oldest (matches sort fallback used elsewhere)", () => {
    const cards = [
      catalogCard({ id: "has-date", createdAtMs: 1000 }),
      catalogCard({ id: "no-date" }),
    ];
    const ordered = portalCatalogBrowseOrder(cards).map((card) => card.id);
    assert.deepEqual(ordered, ["has-date", "no-date"]);
  });

  it("does not mutate the input array", () => {
    const cards = [catalogCard({ id: "a", createdAtMs: 1 }), catalogCard({ id: "b", createdAtMs: 2 })];
    const original = [...cards];
    portalCatalogBrowseOrder(cards);
    assert.deepEqual(cards, original);
  });
});

describe("Studio catalog ready order (owner-corrected: createdAt DESC, never updatedAt)", () => {
  it("orders newest-first by createdAtMs, not updatedAtMs", () => {
    const cards = [
      catalogCard({ id: "old-create-new-update", createdAtMs: 1000, updatedAtMs: 9000 }),
      catalogCard({ id: "new-create-old-update", createdAtMs: 9000, updatedAtMs: 1000 }),
    ];
    const ordered = studioCatalogReadyOrder(cards).map((card) => card.id);
    assert.deepEqual(ordered, ["new-create-old-update", "old-create-new-update"]);
  });

  it("uses design ID descending as the stable tiebreaker for equal createdAtMs", () => {
    const cards = [
      catalogCard({ id: "design-a", createdAtMs: 1000 }),
      catalogCard({ id: "design-c", createdAtMs: 1000 }),
      catalogCard({ id: "design-b", createdAtMs: 1000 }),
    ];
    const ordered = studioCatalogReadyOrder(cards).map((card) => card.id);
    assert.deepEqual(ordered, ["design-c", "design-b", "design-a"]);
  });

  it("treats a missing createdAtMs as the oldest", () => {
    const cards = [
      catalogCard({ id: "has-date", createdAtMs: 1000 }),
      catalogCard({ id: "no-date" }),
    ];
    const ordered = studioCatalogReadyOrder(cards).map((card) => card.id);
    assert.deepEqual(ordered, ["has-date", "no-date"]);
  });

  it("does not mutate the input array", () => {
    const cards = [catalogCard({ id: "a", createdAtMs: 1 }), catalogCard({ id: "b", createdAtMs: 2 })];
    const original = [...cards];
    studioCatalogReadyOrder(cards);
    assert.deepEqual(cards, original);
  });

  // Required ordering regressions (owner-reported): request/show activity and edits must never
  // move a design's position, because none of them change createdAt.
  it("request activity (requestCount/lastRequestedAt/updatedAt bump) does not move an older design above a newer one", () => {
    const olderDesignA = catalogCard({ id: "design-a", createdAtMs: 1000, updatedAtMs: 1000, requestCount: 0 });
    const newerDesignB = catalogCard({ id: "design-b", createdAtMs: 2000, updatedAtMs: 2000 });
    const beforeOrder = studioCatalogReadyOrder([olderDesignA, newerDesignB]).map((c) => c.id);

    // Design A is added to a print request: requestCount/lastRequestedAt/updatedAt all change,
    // createdAt does not.
    const olderDesignAAfterRequestActivity = catalogCard({
      id: "design-a",
      createdAtMs: 1000,
      updatedAtMs: 5000,
      requestCount: 1,
      lastRequestedAtMs: 5000,
    });
    const afterOrder = studioCatalogReadyOrder([olderDesignAAfterRequestActivity, newerDesignB]).map((c) => c.id);

    assert.deepEqual(beforeOrder, ["design-b", "design-a"]);
    assert.deepEqual(afterOrder, ["design-b", "design-a"]);
  });

  it("show-allocation activity (lastAddedToShowAt/updatedAt bump) does not move an older design above a newer one", () => {
    const newerDesignB = catalogCard({ id: "design-b", createdAtMs: 2000, updatedAtMs: 2000 });

    const olderDesignAAfterShowActivity = catalogCard({
      id: "design-a",
      createdAtMs: 1000,
      updatedAtMs: 6000,
      lastAddedToShowAtMs: 6000,
    });
    const afterOrder = studioCatalogReadyOrder([olderDesignAAfterShowActivity, newerDesignB]).map((c) => c.id);

    assert.deepEqual(afterOrder, ["design-b", "design-a"]);
  });

  it("editing title/description/tags/category (updatedAt bump) does not move an older design above a newer one", () => {
    const newerDesignB = catalogCard({ id: "design-b", createdAtMs: 2000, updatedAtMs: 2000 });

    const olderDesignAAfterEdit = catalogCard({
      id: "design-a",
      createdAtMs: 1000,
      updatedAtMs: 9999,
      title: "Edited Title",
      description: "New description",
      categoryId: "new-category",
      tags: ["new-tag"],
    });
    const afterOrder = studioCatalogReadyOrder([olderDesignAAfterEdit, newerDesignB]).map((c) => c.id);

    assert.deepEqual(afterOrder, ["design-b", "design-a"]);
  });

  it("a newly created design appears before older designs (createdAt DESC primary rule)", () => {
    const designA = catalogCard({ id: "design-a", createdAtMs: 1000 });
    const designB = catalogCard({ id: "design-b", createdAtMs: 2000 });
    const newDesignC = catalogCard({ id: "design-c", createdAtMs: 3000 });

    const ordered = studioCatalogReadyOrder([designA, designB, newDesignC]).map((c) => c.id);
    assert.deepEqual(ordered, ["design-c", "design-b", "design-a"]);
  });
});

describe("buildPortalCatalogStudioReadyIndex", () => {
  it("produces id/title/description/categoryId/tags/createdAtMs, in Studio's createdAt-desc order", () => {
    const cards = [
      catalogCard({ id: "a", title: "Design A", tags: ["christmas"], createdAtMs: 1000 }),
      catalogCard({
        id: "b",
        title: "Design B",
        description: "A description",
        categoryId: "cat-1",
        tags: ["disney", "disney"],
        createdAtMs: 2000,
      }),
    ];
    const index = buildPortalCatalogStudioReadyIndex(cards);
    assert.deepEqual(index, [
      {
        id: "b",
        title: "Design B",
        description: "A description",
        categoryId: "cat-1",
        tags: ["disney", "disney"],
        createdAtMs: 2000,
      },
      { id: "a", title: "Design A", tags: ["christmas"], createdAtMs: 1000 },
    ]);
  });

  it("does not include updatedAtMs as a field at all", () => {
    const index = buildPortalCatalogStudioReadyIndex([
      catalogCard({ id: "a", title: "Design A", tags: [], createdAtMs: 1000, updatedAtMs: 9999 }),
    ]);
    assert.equal("updatedAtMs" in index[0]!, false);
  });

  it("omits description/categoryId when absent, rather than writing them as undefined", () => {
    const index = buildPortalCatalogStudioReadyIndex([
      catalogCard({ id: "a", title: "Design A", tags: [] }),
    ]);
    assert.equal("description" in index[0]!, false);
    assert.equal("categoryId" in index[0]!, false);
  });

  it("never includes originalPath or any staff-only/AI field in its serialized output", () => {
    const cards = [
      catalogCard({
        id: "a",
        title: "Design A",
        description: "A description",
        categoryId: "cat-1",
        tags: ["christmas"],
        createdAtMs: 1000,
      }),
    ];
    const index = buildPortalCatalogStudioReadyIndex(cards);
    const serialized = JSON.stringify(index);
    for (const forbidden of [
      "originalPath",
      "uploadedBy",
      "aiSuggestions",
      "aiAnalysis",
      "aiReviewNotes",
      "internalNotes",
      "createdBy",
      "updatedBy",
    ]) {
      assert.equal(serialized.includes(forbidden), false, `must not contain "${forbidden}"`);
    }
  });

  it("defaults a missing createdAtMs to 0", () => {
    const index = buildPortalCatalogStudioReadyIndex([
      catalogCard({ id: "a", title: "Design A", tags: [] }),
    ]);
    assert.equal(index[0]!.createdAtMs, 0);
  });
});

export function devScaleTaxonomyFixture(): {
  categories: Array<{ id: string; name: string; description?: string; sortOrder: number }>;
  tags: Array<{
    id: string;
    name: string;
    aliases: string[];
    preferredWhen: string;
    status: "approved";
    createdAt: null;
    updatedAt: null;
    createdBy: string;
    updatedBy: string;
  }>;
} {
  const categories = Array.from({ length: 18 }, (_, index) => ({
    id: `cat-${index}`,
    name: `Category ${index}`,
    description: `A category description for ${index}`,
    sortOrder: index,
  }));
  const tags = Array.from({ length: 1122 }, (_, index) => ({
    id: `tag-id-${String(index).padStart(6, "0")}`,
    name: `Example Tag Name ${index}`,
    aliases: [`alias one ${index}`, `alias two ${index}`],
    preferredWhen:
      `Use this tag when the design clearly depicts the following scenario or context, ` +
      `which is fairly descriptive guidance text ${index}`,
    status: "approved" as const,
    createdAt: null,
    updatedAt: null,
    createdBy: "owner",
    updatedBy: "owner",
  }));
  return { categories, tags };
}
