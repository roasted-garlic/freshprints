import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertNoCustomEtsySearchParams,
  executeEtsyRecommendationApiSearch,
} from "./etsyRecommendationApiSearchCore";
import type { EtsyClient, EtsyRawListing } from "./etsyClient.types";

describe("assertNoCustomEtsySearchParams", () => {
  it("allows requestId-only payloads", () => {
    assert.doesNotThrow(() => assertNoCustomEtsySearchParams({ requestId: "abc" }));
  });

  it("rejects custom keywords/query/limit", () => {
    assert.throws(
      () => assertNoCustomEtsySearchParams({ requestId: "abc", keywords: "x" }),
      /Custom search parameters/,
    );
    assert.throws(
      () => assertNoCustomEtsySearchParams({ requestId: "abc", query: "x" }),
      /Custom search parameters/,
    );
    assert.throws(
      () => assertNoCustomEtsySearchParams({ requestId: "abc", limit: 5 }),
      /Custom search parameters/,
    );
  });
});

describe("executeEtsyRecommendationApiSearch", () => {
  it("returns unavailable when client is null", async () => {
    const result = await executeEtsyRecommendationApiSearch({
      client: null,
      answers: { subjectText: "axolotl" },
      requestId: "req-1",
      logPrefix: "etsy.test",
    });
    assert.equal(result.status, "unavailable");
    assert.deepEqual(result.listings, []);
  });

  it("runs focused search and returns ok listings", async () => {
    const raw: EtsyRawListing = {
      listing_id: 42,
      title: "Axolotl chef boat",
      url: "https://www.etsy.com/listing/42/axolotl-chef-boat",
      price: { amount: 500, divisor: 100, currency_code: "USD" },
      images: [{ url_570xN: "https://i.etsystatic.com/a.jpg" }],
      shop: { shop_name: "Shop" },
    };
    const client: EtsyClient = {
      searchActiveListings: async () => ({ count: 1, results: [raw] }),
      hydrateListings: async () => [raw],
    };

    const result = await executeEtsyRecommendationApiSearch({
      client,
      answers: { subjectText: "axolotl boat chef" },
      requestId: "req-2",
      logPrefix: "etsy.test",
    });

    assert.equal(result.status, "ok");
    assert.equal(result.keywordStrategy, "focused");
    assert.ok(result.apiKeywordsUsed);
    assert.equal(result.listings.length, 1);
    assert.equal(result.listings[0]?.listingId, 42);
  });
});
