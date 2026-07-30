import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseCatalogReferenceManifest,
  parsePortalCatalogCardOverrides,
  parsePortalCatalogManifest,
  parsePortalCatalogStudioReadyIndex,
  parsePortalCatalogTagFacetSummary,
} from "./catalogSnapshot.parsers";

function validPortalCatalogManifest(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    generation: 4,
    contentVersion: "4-abc",
    generatedAt: "2026-07-24T00:00:00.000Z",
    path: "generated/portal-catalog/manifest.json",
    discoverPath: "generated/portal-catalog/v4-abc/discover.json",
    search: {
      strategyVersion: 1,
      shardKeyLength: 2,
      pathTemplate: "generated/portal-catalog/v4-abc/search/shard-{shard}.json",
      existingShardKeys: ["ab", "be"],
    },
    filters: {
      tagPathTemplate: "generated/portal-catalog/v4-abc/filters/tags/{tagId}.json",
      categoryPathTemplate: "generated/portal-catalog/v4-abc/filters/categories/{categoryId}.json",
      tagFacetPath: "generated/portal-catalog/v4-abc/filters/tags-facet.json",
    },
    studio: {
      readyIndexPath: "generated/portal-catalog/v4-abc/studio/ready-index.json",
    },
    cards: {
      bucketCount: 128,
      hashVersion: 1,
      pathTemplate: "generated/portal-catalog/v4-abc/cards/bucket-{bucket}.json",
    },
    recent: {
      pageCount: 2,
      pathTemplate: "generated/portal-catalog/v4-abc/recent/page-{page}.json",
    },
    categories: {
      pageCounts: { "cat-1": 2 },
      pathTemplate: "generated/portal-catalog/v4-abc/categories/{categoryId}/page-{page}.json",
    },
  };
}

describe("catalog snapshot parsers", () => {
  it("accepts the current reference manifest schema", () => {
    assert.equal(parseCatalogReferenceManifest({
      schemaVersion: 1,
      generation: 1,
      contentVersion: "1-abc",
      generatedAt: "2026-07-23T00:00:00.000Z",
      path: "generated/catalog-reference/manifest.json",
      aiPath: "generated/catalog-reference/ai/v1-abc.json",
      clientPath: "generated/catalog-reference/client/v1-abc.json",
    }).contentVersion, "1-abc");
  });

  it("rejects unknown schemas", () => {
    assert.throws(() => parsePortalCatalogManifest({ schemaVersion: 999 }), /schemaVersion/);
  });

  it("accepts a valid v2 Portal catalog manifest including the new tagFacetPath field", () => {
    const manifest = parsePortalCatalogManifest(validPortalCatalogManifest());
    assert.equal(manifest.filters.tagFacetPath, "generated/portal-catalog/v4-abc/filters/tags-facet.json");
  });

  it("accepts an optional immutable card override reference and asset", () => {
    const value = validPortalCatalogManifest();
    value.cardOverrides = {
      path: "generated/portal-catalog/card-overrides/v4-def.json",
      version: "4-def",
    };
    assert.equal(parsePortalCatalogManifest(value).cardOverrides?.version, "4-def");
    assert.equal(parsePortalCatalogCardOverrides({
      schemaVersion: 1,
      catalogVersion: "4-abc",
      overrideVersion: "4-def",
      generatedAt: "2026-07-24T00:00:00.000Z",
      cards: [],
    }).overrideVersion, "4-def");
  });

  it("rejects a v2 Portal catalog manifest missing filters.tagFacetPath", () => {
    const broken = validPortalCatalogManifest();
    const filters = broken.filters as Record<string, unknown>;
    delete filters.tagFacetPath;
    assert.throws(() => parsePortalCatalogManifest(broken), /tagFacetPath/);
  });

  it("rejects a v2 Portal catalog manifest missing studio.readyIndexPath", () => {
    const broken = validPortalCatalogManifest();
    delete broken.studio;
    assert.throws(() => parsePortalCatalogManifest(broken), /studio/);
  });

  it("accepts a valid Studio ready-design index", () => {
    const index = parsePortalCatalogStudioReadyIndex({
      schemaVersion: 1,
      catalogVersion: "4-abc",
      generatedAt: "2026-07-24T00:00:00.000Z",
      designs: [
        { id: "design-a", title: "Design A", tags: ["christmas", "disney"], createdAtMs: 2000 },
        { id: "design-b", title: "Design B", tags: [], createdAtMs: 1000 },
      ],
    });
    assert.equal(index.designs.length, 2);
    assert.deepEqual(index.designs[0]!.tags, ["christmas", "disney"]);
  });

  it("rejects a Studio ready-design index with a non-string tag", () => {
    assert.throws(
      () => parsePortalCatalogStudioReadyIndex({
        schemaVersion: 1,
        catalogVersion: "4-abc",
        generatedAt: "2026-07-24T00:00:00.000Z",
        designs: [{ id: "design-a", title: "Design A", tags: [42], createdAtMs: 2000 }],
      }),
      /tags\[0\]/,
    );
  });

  it("rejects a Studio ready-design index missing createdAtMs", () => {
    assert.throws(
      () => parsePortalCatalogStudioReadyIndex({
        schemaVersion: 1,
        catalogVersion: "4-abc",
        generatedAt: "2026-07-24T00:00:00.000Z",
        designs: [{ id: "design-a", title: "Design A", tags: [] }],
      }),
      /createdAtMs/,
    );
  });

  it("accepts a valid tag facet summary", () => {
    const summary = parsePortalCatalogTagFacetSummary({
      schemaVersion: 1,
      catalogVersion: "4-abc",
      generatedAt: "2026-07-24T00:00:00.000Z",
      tags: [
        { id: "ocean", name: "Ocean", count: 3 },
        { id: "sunset", name: "Sunset", count: 1 },
      ],
    });
    assert.equal(summary.tags.length, 2);
  });

  it("rejects a tag facet summary containing a zero-count tag", () => {
    assert.throws(
      () => parsePortalCatalogTagFacetSummary({
        schemaVersion: 1,
        catalogVersion: "4-abc",
        generatedAt: "2026-07-24T00:00:00.000Z",
        tags: [{ id: "unused", name: "Unused", count: 0 }],
      }),
      /count must be at least 1/,
    );
  });

  it("rejects a malformed tag facet summary safely", () => {
    assert.throws(() => parsePortalCatalogTagFacetSummary({ schemaVersion: 1 }), /catalogVersion/);
    assert.throws(
      () => parsePortalCatalogTagFacetSummary({
        schemaVersion: 1,
        catalogVersion: "4-abc",
        generatedAt: "2026-07-24T00:00:00.000Z",
        tags: "not-an-array",
      }),
      /tags must be an array/,
    );
  });
});
