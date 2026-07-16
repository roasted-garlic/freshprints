import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildEtsyActiveListingsSearchQuery, buildEtsyBatchListingsQuery } from "./liveEtsyClient";

describe("buildEtsyBatchListingsQuery", () => {
  it("uses a single comma-separated listing_ids value", () => {
    const query = buildEtsyBatchListingsQuery([11, 22, 33]);
    const params = new URLSearchParams(query);
    assert.equal(params.get("listing_ids"), "11,22,33");
    assert.equal(params.getAll("listing_ids").length, 1);
    assert.equal(params.get("includes"), "Images,Shop");
    assert.equal(query.includes("listing_ids=11&"), false);
  });
});

describe("buildEtsyActiveListingsSearchQuery", () => {
  it("applies default price, shop location, and currency filters", () => {
    const query = buildEtsyActiveListingsSearchQuery({
      keywords: "highland cow png",
      limit: 25,
      sortOn: "score",
    });
    const params = new URLSearchParams(query);
    assert.equal(params.get("keywords"), "highland cow png");
    assert.equal(params.get("limit"), "25");
    assert.equal(params.get("sort_on"), "score");
    assert.equal(params.get("min_price"), "0");
    assert.equal(params.get("max_price"), "3");
    assert.equal(params.get("currency"), "USD");
    assert.equal(params.has("shop_location"), false);
  });
});
