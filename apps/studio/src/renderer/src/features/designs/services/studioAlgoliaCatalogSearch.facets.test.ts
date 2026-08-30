import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildStudioAlgoliaCombinedFacetFilters,
  buildStudioAlgoliaFacetSearchParams,
  buildStudioAlgoliaSmartFacetSearchParams,
  hasStudioAlgoliaFacetConstraints,
  mergeStudioAlgoliaTagFacetDistribution,
} from "./studioAlgoliaCatalogFacets";
import {
  buildStudioAlgoliaSmartFacetFilters,
  countStudioAlgoliaSmartFilterSelections,
  designMatchesSmartFilters,
  hasStudioAlgoliaSmartFilterSelections,
  mergeStudioAlgoliaSmartFacetDistribution,
} from "./studioAlgoliaSmartFilters";
import type { Design } from "../types/design.types";

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
    assert.equal(
      hasStudioAlgoliaFacetConstraints({ smartFilters: { subjects: ["cow"] } }),
      true,
    );
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

describe("studio Algolia Smart Filters", () => {
  it("builds AND facetFilters for the 8 smart attributes only", () => {
    const filters = buildStudioAlgoliaSmartFacetFilters({
      subjects: ["cow", "nurse"],
      occasions: ["Christmas"],
      colors: ["  "],
    });

    assert.deepEqual(filters, [
      ["subjects:cow"],
      ["subjects:nurse"],
      ["occasions:Christmas"],
    ]);
  });

  it("combines tags and smart filters for search params", () => {
    const combined = buildStudioAlgoliaCombinedFacetFilters({
      selectedTags: ["funny"],
      smartFilters: { themes: ["humor"], places: ["Seattle"] },
    });
    assert.deepEqual(combined, [
      ["tagIds:funny"],
      ["themes:humor"],
      ["places:Seattle"],
    ]);

    const smartParams = buildStudioAlgoliaSmartFacetSearchParams({
      categoryId: "cat-1",
      search: "highland",
      selectedTags: ["funny"],
      smartFilters: { subjects: ["cow"] },
    });
    assert.equal(smartParams.query, "highland");
    assert.equal(smartParams.filters, "categoryId:cat-1");
    assert.ok(!smartParams.facets.includes("objects"));
    assert.ok(!smartParams.facets.includes("searchConcepts"));
    assert.ok(!smartParams.facets.includes("visibleText"));
    assert.deepEqual(smartParams.facets, [
      "subjects",
      "styles",
      "themes",
      "interests",
      "professionsGroups",
      "occasions",
      "places",
      "colors",
    ]);
    assert.deepEqual(smartParams.facetFilters, [
      ["tagIds:funny"],
      ["subjects:cow"],
    ]);
  });

  it("counts selections and merges distributions", () => {
    assert.equal(countStudioAlgoliaSmartFilterSelections({ subjects: ["a", "b"], colors: ["red"] }), 3);
    assert.equal(hasStudioAlgoliaSmartFilterSelections({}), false);
    assert.deepEqual(mergeStudioAlgoliaSmartFacetDistribution({ cow: 3, nurse: 1, empty: 0 }), [
      { value: "cow", count: 3 },
      { value: "nurse", count: 1 },
    ]);
  });

  it("designMatchesSmartFilters requires every selected value", () => {
    const design = {
      id: "d1",
      smartProfile: {
        subjects: ["cow", "nurse"],
        occasions: ["Christmas"],
        provenance: { version: "smart-profile-v1" },
      },
    } as Design;

    assert.equal(designMatchesSmartFilters(design, { subjects: ["cow"] }), true);
    assert.equal(designMatchesSmartFilters(design, { subjects: ["cow", "nurse"] }), true);
    assert.equal(designMatchesSmartFilters(design, { subjects: ["cow", "dog"] }), false);
    assert.equal(
      designMatchesSmartFilters(design, { subjects: ["cow"], occasions: ["Christmas"] }),
      true,
    );
    assert.equal(designMatchesSmartFilters(design, undefined), true);
  });
});
