import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("Algolia legacy-tag retirement source contract", () => {
  it("removes legacy tag fields from the shared record and settings contract", () => {
    const shared = read("packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts");
    assert.doesNotMatch(shared, /tagIds|tagFacetKeys/);
    assert.doesNotMatch(shared, /encodePortalCatalogTagFacetKey|parsePortalCatalogTagFacetKey/);
    assert.doesNotMatch(shared, /filterOnly\(tagIds\)/);
  });

  it("builds and publishes records without tag taxonomy hydration", () => {
    const builder = read("functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts");
    const sync = read("functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts");
    const reconcile = read("functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts");

    for (const source of [builder, sync, reconcile]) {
      assert.doesNotMatch(source, /tagIds|tagFacetKeys|tagsById|indexPortalCatalogTaxonomyTag/);
      assert.doesNotMatch(source, /collection\(["']tags["']\)/);
    }
    assert.doesNotMatch(sync, /data\.tags|tagCount/);
  });

  it("does not classify structural tag compatibility churn as an Algolia index change", () => {
    const classifier = read("functions/src/algolia/portalCatalogChangeClassifier.ts");
    assert.doesNotMatch(classifier, /["']tags["']/);
  });
});
