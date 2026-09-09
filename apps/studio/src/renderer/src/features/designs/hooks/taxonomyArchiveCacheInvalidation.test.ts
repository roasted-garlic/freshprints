import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { createBoundedAsyncCache } from "@fresh-prints/shared/utils/boundedAsyncCache";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Category archive cache regression coverage. Legacy tag management is retired
 * and intentionally has no client cache or write path to exercise here.
 */
describe("taxonomy archive/restore cache invalidation", () => {
  it("reproduces the pre-fix defect: a cache with no invalidation call keeps serving stale data after an out-of-band write succeeds", async () => {
    // This models exactly what catalogTagService's tagListCache does: an
    // Admin-SDK write (archiveTagWithGuards) happens completely outside the
    // cache's own loader, so the cache has no way to know the underlying
    // data changed unless something explicitly invalidates it.
    const cache = createBoundedAsyncCache<string[]>({ maxEntries: 8, ttlMs: 12 * 60 * 60 * 1000 });
    let backingStore = ["tag-a (approved)", "tag-b (approved)"];
    const loader = async () => [...backingStore];

    const beforeArchive = await cache.get("all", loader);
    assert.deepEqual(beforeArchive, ["tag-a (approved)", "tag-b (approved)"]);

    // Simulate the out-of-band Admin SDK write succeeding.
    backingStore = ["tag-a (approved)", "tag-b (archived)"];

    // Without invalidation, the cache still returns the pre-archive value —
    // this is the exact defect: the write succeeded, but the read the UI
    // depends on does not reflect it.
    const staleRead = await cache.get("all", loader);
    assert.deepEqual(
      staleRead,
      ["tag-a (approved)", "tag-b (approved)"],
      "cache must reproduce staleness when nothing invalidates it after an out-of-band write",
    );
  });

  it("proves invalidate-then-reload (the fix shape) observes the write immediately", async () => {
    const cache = createBoundedAsyncCache<string[]>({ maxEntries: 8, ttlMs: 12 * 60 * 60 * 1000 });
    let backingStore = ["tag-a (approved)", "tag-b (approved)"];
    const loader = async () => [...backingStore];

    await cache.get("all", loader);
    backingStore = ["tag-a (approved)", "tag-b (archived)"];

    // This is the fix: clearStudioTaxonomyCaches() calls cache.clear() (via
    // invalidateCatalogTagListCache/invalidateCategoryListCache) immediately
    // after a confirmed-successful archive, before the next reload reads
    // the list again.
    cache.clear();

    const freshRead = await cache.get("all", loader);
    assert.deepEqual(
      freshRead,
      ["tag-a (approved)", "tag-b (archived)"],
      "invalidating before reload must observe the archive write immediately",
    );
  });

  it("keeps the retired tag hook free of taxonomy reads and writes", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts",
    );
    assert.doesNotMatch(source, /catalogTagService|taxonomyArchiveGuardsService|firestore/);
    assert.match(source, /Legacy catalog tag operations are retired/);
  });

  it("wires clearStudioTaxonomyCaches() into the category guarded-archive success path only", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useArchiveCategory.ts",
    );
    const persistSource = read(
      "apps/studio/src/renderer/src/features/designs/hooks/persistCategoryArchive.ts",
    );

    assert.match(source, /import \{ clearStudioTaxonomyCaches \} from "\.\.\/services\/taxonomyCacheControl";/);
    assert.match(source, /persistCategoryArchive/);
    assert.match(source, /clearCaches: clearStudioTaxonomyCaches/);
    assert.match(persistSource, /archiveViaGuards/);
    assert.match(persistSource, /archiveViaClient/);
    assert.match(persistSource, /Category archive did not persist/);
  });

  it("does not introduce broad taxonomy polling or a reload loop", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts",
    );

    assert.doesNotMatch(source, /setInterval|setTimeout/);
  });
});
