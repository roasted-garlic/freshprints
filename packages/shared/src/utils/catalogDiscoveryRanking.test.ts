import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCatalogDiscoveryModeLabel,
  parseCatalogDiscoveryMode,
  rankCatalogDiscoveryDesigns,
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

describe("rankRecentlyRequested", () => {
  it("sorts by lastRequestedAt then requestCount", () => {
    const ranked = rankRecentlyRequested([
      design({ id: "never" }),
      design({ id: "older", lastRequestedAtMs: NOW - 5 * DAY, requestCount: 99 }),
      design({ id: "newer-low", lastRequestedAtMs: NOW - 1 * DAY, requestCount: 1 }),
      design({ id: "newer-high", lastRequestedAtMs: NOW - 1 * DAY, requestCount: 5 }),
    ]);

    assert.deepEqual(
      ranked.map((entry) => entry.id),
      ["newer-high", "newer-low", "older"],
    );
  });
});

describe("rankCatalogDiscoveryDesigns", () => {
  it("routes modes", () => {
    const designs = [design({ id: "x", createdAtMs: NOW, requestCount: 3, lastRequestedAtMs: NOW })];
    assert.equal(rankCatalogDiscoveryDesigns(designs, "new", NOW).length, 1);
    assert.equal(rankCatalogDiscoveryDesigns(designs, "popular").length, 1);
    assert.equal(rankCatalogDiscoveryDesigns(designs, "recent").length, 1);
  });
});

describe("takeCatalogDiscoveryRail", () => {
  it("limits rail length", () => {
    assert.equal(takeCatalogDiscoveryRail([1, 2, 3, 4], 2).length, 2);
  });
});

describe("selectTopPopularCategoryRails", () => {
  it("keeps only the most popular categories with enough designs", () => {
    const categories = [
      { id: "animals", name: "Animals" },
      { id: "holiday", name: "Holiday" },
      { id: "sports", name: "Sports" },
      { id: "thin", name: "Thin" },
    ];

    const rails = selectTopPopularCategoryRails(
      [
        design({ id: "a1", categoryId: "animals", requestCount: 5 }),
        design({ id: "a2", categoryId: "animals", requestCount: 1 }),
        design({ id: "a3", categoryId: "animals", requestCount: 0 }),
        design({ id: "h1", categoryId: "holiday", requestCount: 20 }),
        design({ id: "h2", categoryId: "holiday", requestCount: 2 }),
        design({ id: "h3", categoryId: "holiday", requestCount: 1 }),
        design({ id: "s1", categoryId: "sports", requestCount: 4 }),
        design({ id: "s2", categoryId: "sports", requestCount: 4 }),
        design({ id: "s3", categoryId: "sports", requestCount: 0 }),
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
    assert.deepEqual(
      rails[0]!.designs.map((entry) => entry.id),
      ["h1", "h2", "h3"],
    );
  });
});
