import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mergeHydratedListings,
  normalizeEtsyListings,
  normalizeEtsyPrice,
} from "./normalizeEtsyListings";
import type { EtsyClient, EtsyRawListing } from "./etsyClient.types";

describe("normalizeEtsyPrice", () => {
  it("normalizes amount/divisor/currency_code", () => {
    assert.deepEqual(
      normalizeEtsyPrice({ amount: 1250, divisor: 100, currency_code: "usd" }),
      { priceAmount: "12.50", currencyCode: "USD" },
    );
  });

  it("handles missing price", () => {
    assert.deepEqual(normalizeEtsyPrice(null), { priceAmount: null, currencyCode: null });
  });
});

describe("normalizeEtsyListings", () => {
  it("keeps valid listings and drops invalid ids/urls", () => {
    const listings = normalizeEtsyListings([
      {
        listing_id: 1,
        title: "Cool Tee",
        url: "https://www.etsy.com/listing/1/cool-tee",
        price: { amount: 1000, divisor: 100, currency_code: "USD" },
        images: [{ url_570xN: "https://i.etsystatic.com/a.jpg" }],
        shop: { shop_name: "Shop A" },
      },
      {
        listing_id: "bad",
        title: "Nope",
        url: "https://www.etsy.com/listing/2/nope",
      },
      {
        listing_id: 3,
        title: "Missing url",
        url: "https://evil.example/listing/3",
      },
    ]);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].listingId, 1);
    assert.equal(listings[0].shopName, "Shop A");
    assert.equal(listings[0].imageUrl, "https://i.etsystatic.com/a.jpg");
    assert.equal(listings[0].priceAmount, "10");
  });

  it("allows missing image/shop/price", () => {
    const listings = normalizeEtsyListings([
      {
        listing_id: 9,
        title: "Bare listing",
        url: "https://www.etsy.com/listing/9/bare",
      },
    ]);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].imageUrl, null);
    assert.equal(listings[0].shopName, null);
    assert.equal(listings[0].priceAmount, null);
  });

  it("caps at twelve listings", () => {
    const rows: EtsyRawListing[] = Array.from({ length: 20 }, (_, i) => ({
      listing_id: i + 1,
      title: `Title ${i + 1}`,
      url: `https://www.etsy.com/listing/${i + 1}/t`,
    }));
    assert.equal(normalizeEtsyListings(rows).length, 12);
  });
});

describe("mergeHydratedListings", () => {
  it("merges images and shop onto search rows", () => {
    const merged = mergeHydratedListings(
      [{ listing_id: 1, title: "A", url: "https://www.etsy.com/listing/1/a" }],
      [
        {
          listing_id: 1,
          title: "A",
          url: "https://www.etsy.com/listing/1/a",
          images: [{ url_570xN: "https://i.etsystatic.com/x.jpg" }],
          shop: { shop_name: "Hydrated Shop" },
        },
      ],
    );
    const listings = normalizeEtsyListings(merged);
    assert.equal(listings[0].shopName, "Hydrated Shop");
    assert.equal(listings[0].imageUrl, "https://i.etsystatic.com/x.jpg");
  });
});

describe("mocked Etsy client budget", () => {
  it("performs at most one search and one hydration", async () => {
    let searchCalls = 0;
    let hydrateCalls = 0;
    const client: EtsyClient = {
      async searchActiveListings() {
        searchCalls += 1;
        return {
          results: [
            {
              listing_id: 42,
              title: "Design",
              url: "https://www.etsy.com/listing/42/design",
            },
          ],
          requestPath: "/application/listings/active",
          etsyReportedCount: 1,
        };
      },
      async hydrateListings(ids) {
        hydrateCalls += 1;
        assert.deepEqual(ids, [42]);
        return [
          {
            listing_id: 42,
            title: "Design",
            url: "https://www.etsy.com/listing/42/design",
            images: [{ url_570xN: "https://i.etsystatic.com/y.jpg" }],
            shop: { shop_name: "Budget Shop" },
          },
        ];
      },
    };

    const search = await client.searchActiveListings({
      keywords: "mama bear",
      limit: 25,
      sortOn: "score",
    });
    const ids = search.results.map((r) => Number(r.listing_id));
    const hydrated = await client.hydrateListings(ids);
    const listings = normalizeEtsyListings(mergeHydratedListings(search.results, hydrated));

    assert.equal(searchCalls, 1);
    assert.equal(hydrateCalls, 1);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].shopName, "Budget Shop");
  });

  it("keeps search rows when hydration fails", async () => {
    const client: EtsyClient = {
      async searchActiveListings() {
        return {
          results: [
            {
              listing_id: 7,
              title: "Still usable",
              url: "https://www.etsy.com/listing/7/still",
            },
          ],
          requestPath: "/application/listings/active",
          etsyReportedCount: 1,
        };
      },
      async hydrateListings() {
        throw new Error("timeout");
      },
    };

    const search = await client.searchActiveListings({
      keywords: "x",
      limit: 25,
      sortOn: "score",
    });
    let merged = search.results;
    try {
      const hydrated = await client.hydrateListings([7]);
      merged = mergeHydratedListings(search.results, hydrated);
    } catch {
      merged = search.results;
    }
    const listings = normalizeEtsyListings(merged);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].listingId, 7);
  });
});
