/**
 * Writer registry + containment for taxonomy materialization rebuild (RC2).
 *
 * Run: npx tsx --test functions/src/taxonomy/taxonomyMaterializationContainment.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

/** Exhaustive registry of taxonomy mutation entrypoints (RC2). */
export const TAXONOMY_WRITER_REGISTRY = [
  {
    id: "studio-catalogTagService",
    path: "apps/studio/src/renderer/src/features/designs/services/catalogTagService.ts",
    coveredBy: "onTagTaxonomySourceWritten",
  },
  {
    id: "studio-categoryService",
    path: "apps/studio/src/renderer/src/features/designs/services/categoryService.ts",
    coveredBy: "onCategoryTaxonomySourceWritten",
  },
  {
    id: "archiveTagWithGuards",
    path: "functions/src/archiveTaxonomyWithGuards.ts",
    coveredBy: "onTagTaxonomySourceWritten (Admin write still fires trigger)",
  },
  {
    id: "archiveCategoryWithGuards",
    path: "functions/src/archiveTaxonomyWithGuards.ts",
    coveredBy: "onCategoryTaxonomySourceWritten",
  },
] as const;

describe("taxonomy materialization containment", () => {
  it("exports shared rebuild entrypoint and taxonomy source triggers from index", () => {
    const index = read("functions/src/index.ts");
    assert.match(index, /rebuildTaxonomyMaterialization/);
    assert.match(index, /onTagTaxonomySourceWritten/);
    assert.match(index, /onCategoryTaxonomySourceWritten/);
    assert.match(index, /rebuildTaxonomyMaterializationCallable/);
  });

  it("triggers call rebuildTaxonomyMaterialization", () => {
    const source = read("functions/src/taxonomy/onTaxonomySourceWritten.ts");
    assert.match(source, /rebuildTaxonomyMaterialization/);
    assert.match(source, /onDocumentWritten\("tags\/\{tagId\}"/);
    assert.match(source, /onDocumentWritten\(\s*"categories\/\{categoryId\}"/);
  });

  it("RC-R1: tag and category handlers await coalesce entrypoint", () => {
    const source = read("functions/src/taxonomy/onTaxonomySourceWritten.ts");
    assert.match(source, /await awaitTaxonomySourceRebuild\("tag-written"\)/);
    assert.match(source, /await awaitTaxonomySourceRebuild\("category-written"\)/);
    assert.match(source, /export async function awaitTaxonomySourceRebuild/);
  });

  it("RC-R1/H: forbids detached setTimeout → rebuildTaxonomyMaterialization", () => {
    const trigger = read("functions/src/taxonomy/onTaxonomySourceWritten.ts");
    const coalesce = read("functions/src/taxonomy/taxonomyTriggerCoalesce.ts");
    assert.doesNotMatch(trigger, /setTimeout/);
    assert.doesNotMatch(trigger, /scheduleCoalescedRebuild/);
    // Only allowed setTimeout is awaited sleep resolve — not a rebuild scheduler.
    const timeoutCalls = [...coalesce.matchAll(/setTimeout\s*\(\s*([^)]*)\)/g)];
    assert.equal(timeoutCalls.length, 1);
    assert.match(timeoutCalls[0]![1]!, /^\s*resolve\s*,\s*ms\s*$/);
    assert.match(coalesce, /await deps\.rebuild/);
    assert.match(coalesce, /await inFlight/);
  });

  it("writer registry paths exist", () => {
    for (const writer of TAXONOMY_WRITER_REGISTRY) {
      assert.ok(read(writer.path).length > 0, writer.id);
    }
  });

  it("design Algolia sync and enqueue do not import rebuildTaxonomyMaterialization", () => {
    const sync = read("functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts");
    const enqueue = read("functions/src/enqueueAiEnrichment.ts");
    assert.doesNotMatch(sync, /rebuildTaxonomyMaterialization/);
    assert.doesNotMatch(enqueue, /rebuildTaxonomyMaterialization/);
  });

  it("does not revive Stage 5 generated catalog paths in Rules", () => {
    const storage = read("storage.rules");
    const firestore = read("firestore.rules");
    assert.doesNotMatch(storage, /match \/generated\/portal-catalog/);
    assert.doesNotMatch(storage, /match \/generated\/catalog-reference/);
    assert.match(firestore, /taxonomyMaterialization/);
    assert.match(firestore, /allow create, update, delete: if false/);
  });

  it("AI loader prefers materialization module", () => {
    const loader = read("functions/src/ai/loadAiCatalogReferenceSnapshot.ts");
    assert.match(loader, /readTaxonomyMaterializationCorpus/);
    assert.match(loader, /taxonomy-fallback-fs/);
  });
});
