import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCatalogDiscoveryModeLabel,
  parseCatalogDiscoveryMode,
  rankCatalogDiscoveryDesigns,
  rankMostLiked,
  rankNewestStudioFirst,
  rankNewThisWeek,
  rankPopular,
  rankRecentlyRequested,
  selectTopPopularCategoryRails,
  takeCatalogDiscoveryRail,
  type CatalogDiscoveryDesign,
} from "./catalogDiscoveryRanking";

const NOW = Date.parse("2026-07-11T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function design(partial: Partial<CatalogDiscoveryDesign> & { id: string }): CatalogDiscoveryDesign {
  return {
    requestCount: 0,
    ...partial,
  };
}

describe("parseCatalogDiscoveryMode", () => {
  it("parses known modes", () => {
    assert.equal(parseCatalogDiscoveryMode("new"), "new");
    assert.equal(parseCatalogDiscoveryMode("popular"), "popular");
    assert.equal(parseCatalogDiscoveryMode("mostLiked"), "mostLiked");
    assert.equal(parseCatalogDiscoveryMode("recent"), "recent");
  });

  it("rejects unknown values", () => {
    assert.equal(parseCatalogDiscoveryMode("trending"), null);
    assert.equal(parseCatalogDiscoveryMode(null), null);
  });
});

describe("getCatalogDiscoveryModeLabel", () => {
  it("uses customer-facing labels", () => {
    assert.equal(getCatalogDiscoveryModeLabel("new"), "New This Week");
    assert.equal(getCatalogDiscoveryModeLabel("popular"), "Popular");
    assert.equal(getCatalogDiscoveryModeLabel("mostLiked"), "Most Liked");
    assert.equal(getCatalogDiscoveryModeLabel("recent"), "Recently Requested");
  });
});

describe("rankNewThisWeek", () => {
  it("keeps only designs created in the last 7 days, newest first", () => {
    const ranked = rankNewThisWeek(
      [
        design({ id: "old", createdAtMs: NOW - 10 * DAY }),
        design({ id: "mid", createdAtMs: NOW - 2 * DAY }),
        design({ id: "new", createdAtMs: NOW - 1 * DAY }),
        design({ id: "no-date" }),
      ],
      NOW,
    );

    assert.deepEqual(
      ranked.map((entry) => entry.id),
      ["new", "mid"],
    );
  });
});

describe("rankNewestStudioFirst", () => {
  it("sorts by createdAt descending", () => {
    const ranked = rankNewestStudioFirst([
      design({ id: "old", createdAtMs: NOW - 5 * DAY, requestCount: 99 }),
      design({ id: "new", createdAtMs: NOW - 1 * DAY, requestCount: 0 }),
      design({ id: "mid", createdAtMs: NOW - 2 * DAY, requestCount: 50 }),
    ]);

    assert.deepEqual(
      ranked.map((entry) => entry.id),
      ["new", "mid", "old"],
    );
  });
});

describe("rankPopular", () => {
  it("sorts by requestCount descending", () => {
    const ranked = rankPopular([
      design({ id: "a", requestCount: 2 }),
      design({ id: "b", requestCount: 10 }),
      design({ id: "c", requestCount: 2 }),
    ]);

    assert.deepEqual(
      ranked.map((entry) => entry.id),
      ["b", "a", "c"],
    );
  });
});

describe("rankMostLiked", () => {
  it("keeps only designs with favorites and sorts by favoriteCount", () => {
    const ranked = rankMostLiked([
      design({ id: "none", favoriteCount: 0 }),
      design({ id: "a", favoriteCount: 2 }),
      design({ id: "b", favoriteCount: 10 }),
      design({ id: "c", favoriteCount: 2 }),
      design({ id: "missing" }),
    ]);

    assert.deepEqual(
      ranked.map((entry) => entry.id),
      ["b", "a", "c"],
    );
  });
});

describe("rankRecentlyRequested", () => {
  it("only includes designs allocated to a show (lastAddedToShowAt)", () => {
    const ranked = rankRecentlyRequested([
      design({ id: "cart-only", lastRequestedAtMs: NOW, requestCount: 99 }),
      design({ id: "never" }),
      design({ id: "older", lastAddedToShowAtMs: NOW - 5 * DAY, requestCount: 99 }),
      design({ id: "newer-low", lastAddedToShowAtMs: NOW - 1 * DAY, requestCount: 1 }),
      design({ id: "newer-high", lastAddedToShowAtMs: NOW - 1 * DAY, requestCount: 5 }),
    ]);

    assert.deepEqual(
      ranked.map((entry) => entry.id),
      ["newer-high", "newer-low", "older"],
    );
  });

  it("ignores lastRequestedAt when lastAddedToShowAt is missing", () => {
    const ranked = rankRecentlyRequested([
      design({ id: "working-cart", lastRequestedAtMs: NOW, requestCount: 10 }),
    ]);
    assert.deepEqual(ranked, []);
  });
});

describe("rankCatalogDiscoveryDesigns", () => {
  it("routes modes", () => {
    const designs = [
      design({
        id: "x",
        createdAtMs: NOW,
        requestCount: 3,
        favoriteCount: 2,
        lastRequestedAtMs: NOW,
        lastAddedToShowAtMs: NOW,
      }),
    ];
    assert.equal(rankCatalogDiscoveryDesigns(designs, "new", NOW).length, 1);
    assert.equal(rankCatalogDiscoveryDesigns(designs, "popular").length, 1);
    assert.equal(rankCatalogDiscoveryDesigns(designs, "mostLiked").length, 1);
    assert.equal(rankCatalogDiscoveryDesigns(designs, "recent").length, 1);
  });
});

describe("takeCatalogDiscoveryRail", () => {
  it("limits rail length", () => {
    assert.equal(takeCatalogDiscoveryRail([1, 2, 3, 4], 2).length, 2);
  });
});

describe("selectTopPopularCategoryRails", () => {
  it("picks popular categories but orders cards Studio-newest first", () => {
    const categories = [
      { id: "animals", name: "Animals" },
      { id: "holiday", name: "Holiday" },
      { id: "sports", name: "Sports" },
      { id: "thin", name: "Thin" },
    ];

    const rails = selectTopPopularCategoryRails(
      [
        design({ id: "a1", categoryId: "animals", requestCount: 5, createdAtMs: NOW - 3 * DAY }),
        design({ id: "a2", categoryId: "animals", requestCount: 1, createdAtMs: NOW - 2 * DAY }),
        design({ id: "a3", categoryId: "animals", requestCount: 0, createdAtMs: NOW - 1 * DAY }),
        design({ id: "h1", categoryId: "holiday", requestCount: 20, createdAtMs: NOW - 5 * DAY }),
        design({ id: "h2", categoryId: "holiday", requestCount: 2, createdAtMs: NOW - 1 * DAY }),
        design({ id: "h3", categoryId: "holiday", requestCount: 1, createdAtMs: NOW - 2 * DAY }),
        design({ id: "s1", categoryId: "sports", requestCount: 4, createdAtMs: NOW }),
        design({ id: "s2", categoryId: "sports", requestCount: 4, createdAtMs: NOW - 1 * DAY }),
        design({ id: "s3", categoryId: "sports", requestCount: 0, createdAtMs: NOW - 2 * DAY }),
        design({ id: "t1", categoryId: "thin", requestCount: 100 }),
        design({ id: "t2", categoryId: "thin", requestCount: 100 }),
        design({ id: "none", requestCount: 50 }),
      ],
      categories,
      { maxRails: 2, minDesigns: 3 },
    );

    assert.deepEqual(
      rails.map((rail) => rail.categoryId),
      ["holiday", "sports"],
    );
    // Cards: createdAt desc (not requestCount) — h2 newest, then h3, then h1.
    assert.deepEqual(
      rails[0]!.designs.map((entry) => entry.id),
      ["h2", "h3", "h1"],
    );
  });
});
