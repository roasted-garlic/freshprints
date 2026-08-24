import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import {
  NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
  NEEDS_REVIEW_SEARCH_MORE_BATCH,
  filterNeedsReviewDesignsBySearch,
  isNeedsReviewSearchActive,
  normalizeNeedsReviewSearchQuery,
  resolveNeedsReviewHydrationTarget,
  resolveNeedsReviewSearchHydrationState,
  shouldAutoLoadNeedsReviewSearch,
  shouldShowNeedsReviewSearchNoResults,
} from "./aiReviewNeedsReviewSearch";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Summer Logo",
    description: "Bright seasonal artwork",
    tags: ["summer", "logo"],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1 } as Design["createdAt"],
    updatedAt: { toMillis: () => 2 } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiReviewNeedsReviewSearch", () => {
  it("normalizes search query with trim and lowercase", () => {
    assert.equal(normalizeNeedsReviewSearchQuery("  TMNT  "), "tmnt");
    assert.equal(isNeedsReviewSearchActive("   "), false);
    assert.equal(isNeedsReviewSearchActive("needs"), true);
  });

  it("filters needs review designs via shared catalog search normalization", () => {
    const designs = [
      createDesign({ id: "a", title: "Teenage Mutant Turtles", tags: [] }),
      createDesign({ id: "b", title: "Winter Scene", tags: [] }),
      createDesign({ id: "c", title: "I Freaking Love Summerween", tags: [] }),
      createDesign({ id: "d", title: "The Boys Of Summer", tags: [] }),
    ];

    const filtered = filterNeedsReviewDesignsBySearch(designs, "turtles");
    assert.deepEqual(
      filtered.map((design) => design.id),
      ["a"],
    );

    const summerFiltered = filterNeedsReviewDesignsBySearch(designs, "summer");
    assert.deepEqual(
      summerFiltered.map((design) => design.id).sort(),
      ["c", "d"],
    );
  });

  it("caps initial hydration at 500 and extends in 500-design batches on search more", () => {
    assert.equal(
      resolveNeedsReviewHydrationTarget({ currentTarget: NEEDS_REVIEW_SEARCH_HYDRATION_CAP }),
      NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
    );
    assert.equal(
      resolveNeedsReviewHydrationTarget({
        currentTarget: 100,
        requestedBatchSize: NEEDS_REVIEW_SEARCH_MORE_BATCH,
      }),
      NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
    );
    assert.equal(
      resolveNeedsReviewHydrationTarget({
        currentTarget: NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
        allowBeyondInitialCap: true,
      }),
      NEEDS_REVIEW_SEARCH_HYDRATION_CAP + NEEDS_REVIEW_SEARCH_MORE_BATCH,
    );
  });

  it("auto-loads only while search is active and below the hydration target", () => {
    assert.equal(
      shouldAutoLoadNeedsReviewSearch({
        searchQuery: "logo",
        loadedCount: 120,
        hydrationTarget: NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
        hasMore: true,
        isLoading: false,
        isLoadingMore: false,
      }),
      true,
    );
    assert.equal(
      shouldAutoLoadNeedsReviewSearch({
        searchQuery: "logo",
        loadedCount: NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
        hydrationTarget: NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
        hasMore: true,
        isLoading: false,
        isLoadingMore: false,
      }),
      false,
    );
  });

  it("never shows definitive no-results while unsearched designs remain", () => {
    const hydration = resolveNeedsReviewSearchHydrationState({
      searchQuery: "logo",
      hydratedCount: 100,
      filteredCount: 2,
      totalCount: 250,
      hasMore: true,
      hydrationTarget: NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
      isLoadingMore: false,
    });

    assert.equal(hydration.foundCount, 2);
    assert.equal(hydration.canSearchMore, true);
    assert.equal(
      shouldShowNeedsReviewSearchNoResults({
        searchQuery: "logo",
        filteredCount: 0,
        canSearchMore: hydration.canSearchMore,
      }),
      false,
    );

    assert.equal(
      shouldShowNeedsReviewSearchNoResults({
        searchQuery: "logo",
        filteredCount: 0,
        canSearchMore: false,
      }),
      true,
    );
  });
});
