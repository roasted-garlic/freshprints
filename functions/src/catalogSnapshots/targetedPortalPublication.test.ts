import assert from "node:assert/strict";
import test from "node:test";

import {
  PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION,
  PORTAL_CATALOG_SCHEMA_VERSION,
  type PortalCatalogCard,
  type PortalCatalogCardOverrides,
  type PortalCatalogManifest,
} from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import {
  publishPortalCardOverride,
  type PortalCardOverrideStorage,
} from "./publishCatalogSnapshots";

const card = (id: string, background: string): PortalCatalogCard => ({
  id,
  title: id,
  tags: [],
  thumbnailPath: `${id}.webp`,
  artworkBackgroundHex: background,
  width: 1,
  height: 1,
  requestCount: 0,
  favoriteCount: 0,
});

const manifest = (
  _generationMatch: number,
  override?: PortalCatalogCardOverrides,
): PortalCatalogManifest => ({
  schemaVersion: PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION,
  generation: 9,
  contentVersion: "9-base",
  generatedAt: "2026-07-24T19:00:00.000Z",
  path: "generated/portal-catalog/manifest.json",
  discoverPath: "discover.json",
  search: {
    strategyVersion: 1,
    shardKeyLength: 2,
    pathTemplate: "search/{key}.json",
    existingShardKeys: [],
  },
  filters: {
    tagPathTemplate: "tags/{key}.json",
    categoryPathTemplate: "categories/{key}.json",
    tagFacetPath: "tag-facet.json",
  },
  studio: { readyIndexPath: "ready-index.json" },
  cards: { bucketCount: 128, hashVersion: 1, pathTemplate: "cards/{key}.json" },
  ...(override
    ? { cardOverrides: { path: "overrides/current.json", version: override.overrideVersion } }
    : {}),
  recent: { pageCount: 1, pathTemplate: "recent/{page}.json" },
  categories: { pageCounts: {}, pathTemplate: "category/{key}/{page}.json" },
});

function overrideAsset(cards: PortalCatalogCard[]): PortalCatalogCardOverrides {
  return {
    schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
    catalogVersion: "9-base",
    overrideVersion: "existing",
    generatedAt: "2026-07-24T19:00:00.000Z",
    cards,
  };
}

test("card-only publication uses event data with zero Firestore reads and bounded manifest I/O", async () => {
  const writes: Array<{ path: string; value: unknown; generation?: number }> = [];
  const storage: PortalCardOverrideStorage = {
    async readManifest(_path, record) {
      record("download");
      record("metadata");
      return { generationMatch: 41, value: manifest(41) };
    },
    async readOverrides() {
      throw new Error("unexpected override read");
    },
    async writeJson(path, value, _cache, _max, generation, record) {
      record("write");
      record("metadata");
      writes.push({ path, value, generation });
    },
  };

  const result = await publishPortalCardOverride(
    card("design-a", "#111111"),
    "2026-07-24T19:01:22.509Z",
    storage,
  );

  assert.equal(result.outcome, "success");
  assert.equal(result.accounting.manifestReads, 1);
  assert.equal(result.accounting.manifestWrites, 1);
  assert.equal(result.accounting.overrideAssetReads, 0);
  assert.equal(result.accounting.transactionAttempts, 0);
  assert.equal(result.accounting.generationPreconditionRetries, 0);
  assert.equal(result.accounting.storageDownloadOperations, 1);
  assert.equal(result.accounting.storageWriteOperations, 2);
  assert.equal(result.accounting.storageMetadataOperations, 3);
  assert.equal(writes.length, 2);
  assert.equal(writes[1]?.generation, 41);
});

test("duplicate trigger delivery is an idempotent no-op", async () => {
  const existing = overrideAsset([card("design-a", "#111111")]);
  let writes = 0;
  const storage: PortalCardOverrideStorage = {
    async readManifest(_path, record) {
      record("download");
      record("metadata");
      return { generationMatch: 42, value: manifest(42, existing) };
    },
    async readOverrides(_path, record) {
      record("download");
      return existing;
    },
    async writeJson() {
      writes += 1;
    },
  };

  const result = await publishPortalCardOverride(
    card("design-a", "#111111"),
    "2026-07-24T19:01:22.509Z",
    storage,
  );

  assert.equal(result.outcome, "duplicate-skipped");
  assert.equal(writes, 0);
  assert.equal(result.accounting.manifestWrites, 0);
  assert.equal(result.accounting.overrideAssetReads, 1);
});

test("a precondition conflict rereads and merges concurrent overrides without losing either card", async () => {
  const first = overrideAsset([]);
  const concurrent = overrideAsset([card("design-b", "#222222")]);
  let manifestRead = 0;
  let currentOverride = first;
  let manifestWriteAttempts = 0;
  let finalOverride: PortalCatalogCardOverrides | undefined;
  const storage: PortalCardOverrideStorage = {
    async readManifest(_path, record) {
      record("download");
      record("metadata");
      manifestRead += 1;
      currentOverride = manifestRead === 1 ? first : concurrent;
      return {
        generationMatch: manifestRead === 1 ? 50 : 51,
        value: manifest(manifestRead === 1 ? 50 : 51, currentOverride),
      };
    },
    async readOverrides(_path, record) {
      record("download");
      return currentOverride;
    },
    async writeJson(path, value, _cache, _max, _generation, record) {
      record("write");
      if (path.endsWith("manifest.json")) {
        manifestWriteAttempts += 1;
        if (manifestWriteAttempts === 1) {
          throw Object.assign(new Error("precondition"), { code: 412 });
        }
        record("metadata");
        return;
      }
      record("metadata");
      finalOverride = value as PortalCatalogCardOverrides;
    },
  };

  const result = await publishPortalCardOverride(
    card("design-a", "#111111"),
    "2026-07-24T19:01:22.509Z",
    storage,
  );

  assert.equal(result.outcome, "success");
  assert.equal(result.accounting.manifestReads, 2);
  assert.equal(result.accounting.manifestWrites, 2);
  assert.equal(result.accounting.generationPreconditionRetries, 1);
  assert.deepEqual(finalOverride?.cards.map((entry) => entry.id), ["design-a", "design-b"]);
});

test("generation-precondition retries stop after the third manifest attempt", async () => {
  const existing = overrideAsset([]);
  let attempts = 0;
  const storage: PortalCardOverrideStorage = {
    async readManifest(_path, record) {
      record("download");
      record("metadata");
      return { generationMatch: attempts + 1, value: manifest(attempts + 1, existing) };
    },
    async readOverrides(_path, record) {
      record("download");
      return existing;
    },
    async writeJson(path, _value, _cache, _max, _generation, record) {
      record("write");
      if (path.endsWith("manifest.json")) {
        attempts += 1;
        throw Object.assign(new Error("precondition"), { code: 412 });
      }
      record("metadata");
    },
  };

  await assert.rejects(
    publishPortalCardOverride(
      card("design-a", "#111111"),
      "2026-07-24T19:01:22.509Z",
      storage,
    ),
    (error: unknown) => (error as { code?: number }).code === 412,
  );
  assert.equal(attempts, 3);
});
