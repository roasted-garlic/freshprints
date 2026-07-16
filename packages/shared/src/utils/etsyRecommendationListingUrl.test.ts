import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeEtsyListingUrl } from "./etsyRecommendationListingUrl";

describe("sanitizeEtsyListingUrl", () => {
  it("accepts official listing URLs", () => {
    const url = sanitizeEtsyListingUrl("https://www.etsy.com/listing/1234567890/cool-design");
    assert.ok(url);
    assert.match(url!, /etsy\.com\/listing\/1234567890/);
  });

  it("rejects non-Etsy hosts and non-listing paths", () => {
    assert.equal(sanitizeEtsyListingUrl("https://evil.example/listing/1"), null);
    assert.equal(sanitizeEtsyListingUrl("https://www.etsy.com/search?q=x"), null);
    assert.equal(sanitizeEtsyListingUrl("http://www.etsy.com/listing/1"), null);
  });
});
