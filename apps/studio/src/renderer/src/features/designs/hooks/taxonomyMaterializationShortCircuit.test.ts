/**
 * Studio taxonomy materialization short-circuit contract (RC6).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, rel), "utf8");
}

describe("Studio taxonomy materialization short-circuit", () => {
  it("hook prefers materialization before listTags/listCategories", () => {
    const hook = read("./useGeneratedDesignLibraryTaxonomy.ts");
    const preferIdx = hook.indexOf("loadStudioTaxonomyPreferringMaterialization");
    const listTagsIdx = hook.indexOf("catalogTagService.listTags");
    const listCatsIdx = hook.indexOf("categoryService.listCategories");
    assert.ok(preferIdx >= 0);
    assert.ok(listTagsIdx > preferIdx);
    assert.ok(listCatsIdx > preferIdx);
    assert.match(hook, /source === "disk-cache" \|\| preferred\.source === "materialization"/);
  });

  it("exposes reloadFromAuthoritativeSource for Tag Management freshness", () => {
    const hook = read("./useGeneratedDesignLibraryTaxonomy.ts");
    assert.match(hook, /reloadFromAuthoritativeSource/);
    assert.match(hook, /clearStudioTaxonomyCaches/);
  });

  it("materialization service reads meta before chunks and short-circuits on revision", () => {
    const service = read("../services/taxonomyMaterializationService.ts");
    assert.match(service, /TAXONOMY_MATERIALIZATION_META_DOC_ID/);
    assert.match(service, /local\.revision === meta\.revision/);
    assert.match(service, /source: "disk-cache"/);
    assert.match(service, /taxonomyCache\.writeDiskCache/);
    assert.match(service, /taxonomyCache\.readDiskCache/);
  });

  it("cache control clears userData taxonomy disk cache", () => {
    const control = read("../services/taxonomyCacheControl.ts");
    assert.match(control, /clearStudioTaxonomyDiskCache/);
  });
});
