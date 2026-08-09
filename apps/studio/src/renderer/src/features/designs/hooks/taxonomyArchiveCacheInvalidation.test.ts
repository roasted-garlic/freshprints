import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { createBoundedAsyncCache } from "@fresh-prints/shared/utils/boundedAsyncCache";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the tag/category archive cache-staleness defect
 * (post-launch-catalog-and-processing-stability, Workstream A).
 *
 * archiveTagWithGuards / archiveCategoryWithGuards write through the Admin
 * SDK, bypassing the client-side tagListCache / categoryListCache entirely.
 * Before the fix, the guarded-archive call chain never invalidated those
 * caches, so a successful archive left the UI showing stale pre-archive
 * data for up to the cache's full TTL.
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

  it("wires clearStudioTaxonomyCaches() into the tag guarded-archive success path only", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts",
    );

    assert.match(source, /import \{ clearStudioTaxonomyCaches \} from "\.\.\/services\/taxonomyCacheControl";/);

    const archiveTagBlock = source.slice(
      source.indexOf("const archiveTag = useCallback("),
      source.indexOf("const restoreTag = useCallback("),
    );
    assert.match(archiveTagBlock, /taxonomyArchiveGuardsService\.archiveTag\(tagId\)/);
    assert.match(archiveTagBlock, /clearStudioTaxonomyCaches\(\);/);

    // The blocked-outcome branch throws before the invalidation call is
    // reached — confirm the invalidation is textually after the blocked
    // check, so a failed/blocked write cannot falsely evict cache state or
    // imply local state changed.
    const blockedIndex = archiveTagBlock.indexOf('if (result.outcome === "blocked")');
    const invalidateIndex = archiveTagBlock.indexOf("clearStudioTaxonomyCaches();");
    assert.ok(blockedIndex > -1 && invalidateIndex > -1 && invalidateIndex > blockedIndex);
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

  it("adds a tag restoreTag action that reuses catalogTagService.updateTag (which already self-invalidates)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts",
    );

    const restoreTagBlock = source.slice(source.indexOf("const restoreTag = useCallback("));
    assert.match(restoreTagBlock, /catalogTagService\.updateTag\(user, tagId, \{ status: "approved" \}\)/);

    const catalogTagServiceSource = read(
      "apps/studio/src/renderer/src/features/designs/services/catalogTagService.ts",
    );
    const updateTagBlock = catalogTagServiceSource.slice(
      catalogTagServiceSource.indexOf("async updateTag("),
      catalogTagServiceSource.indexOf("async archiveTag("),
    );
    assert.match(updateTagBlock, /invalidateCatalogTagListCache\(\);/);
  });

  it("does not introduce broad taxonomy polling or a reload loop", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts",
    );

    assert.doesNotMatch(source, /setInterval|setTimeout/);
  });
});
