import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildStudioAlgoliaFacetSearchParams,
  hasStudioAlgoliaFacetConstraints,
  mergeStudioAlgoliaTagFacetDistribution,
} from "./studioAlgoliaCatalogFacets";

describe("studio Algolia tag facets", () => {
  it("buildStudioAlgoliaFacetSearchParams supports empty query + tag/category filters", () => {
    const params = buildStudioAlgoliaFacetSearchParams({
      categoryId: "cat-1",
      search: "",
      selectedTags: ["cow", "summer"],
    });

    assert.equal(params.query, "");
    assert.equal(params.hitsPerPage, 0);
    assert.deepEqual(params.facets, ["tagFacetKeys"]);
    assert.equal(params.maxValuesPerFacet, 2000);
    assert.equal(params.filters, "categoryId:cat-1");
    assert.deepEqual(params.facetFilters, [["tagIds:cow"], ["tagIds:summer"]]);
  });

  it("hasStudioAlgoliaFacetConstraints detects managed constraints", () => {
    assert.equal(hasStudioAlgoliaFacetConstraints({}), false);
    assert.equal(hasStudioAlgoliaFacetConstraints({ search: "  " }), false);
    assert.equal(hasStudioAlgoliaFacetConstraints({ search: "cow" }), true);
    assert.equal(hasStudioAlgoliaFacetConstraints({ selectedTags: ["cow"] }), true);
    assert.equal(hasStudioAlgoliaFacetConstraints({ categoryId: "c1" }), true);
  });

  it("mergeStudioAlgoliaTagFacetDistribution merges by display name", () => {
    const merged = mergeStudioAlgoliaTagFacetDistribution({
      "cow-id::cow": 2,
      "cow-alt::cow": 3,
      "summer-id::summer": 1,
    });

    assert.deepEqual(merged, [
      { id: "cow-id", name: "cow", count: 5 },
      { id: "summer-id", name: "summer", count: 1 },
    ]);
  });
});
