import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveManagedCatalogHasMore } from "./deriveManagedCatalogHasMore";

const base = {
  algoliaTotal: 250,
  enabled: true,
  hasError: false,
  isConfigured: true,
  lastPageHitCount: 100,
  nextOffset: 100,
  pageSize: 100,
};

describe("deriveManagedCatalogHasMore", () => {
  it("hides Load more when the last Algolia page is short (one or few hits)", () => {
    assert.equal(
      deriveManagedCatalogHasMore({
        ...base,
        algoliaTotal: 1,
        lastPageHitCount: 1,
        nextOffset: 1,
      }),
      false,
    );
    assert.equal(
      deriveManagedCatalogHasMore({
        ...base,
        algoliaTotal: 0,
        lastPageHitCount: 0,
        nextOffset: 0,
      }),
      false,
    );
  });

  it("hides Load more when an exact-ID hydrate is the only hit", () => {
    assert.equal(
      deriveManagedCatalogHasMore({
        ...base,
        algoliaTotal: 0,
        lastPageHitCount: 0,
        nextOffset: 0,
      }),
      false,
    );
  });

  it("shows Load more only when a full page was returned and Algolia still has hits", () => {
    assert.equal(deriveManagedCatalogHasMore(base), true);
    assert.equal(
      deriveManagedCatalogHasMore({
        ...base,
        algoliaTotal: 100,
        lastPageHitCount: 100,
        nextOffset: 100,
      }),
      false,
    );
  });
});
