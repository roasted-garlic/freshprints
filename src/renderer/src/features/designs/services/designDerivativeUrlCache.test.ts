import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesignDerivativeUrlCache } from "./designDerivativeUrlCache";

describe("DesignDerivativeUrlCache", () => {
  it("reuses cached URLs without calling the resolver again", async () => {
    const cache = new DesignDerivativeUrlCache();
    let resolveCount = 0;

    const resolver = async () => {
      resolveCount += 1;
      return "https://example.com/thumb.webp";
    };

    const first = await cache.resolve("/thumbnails/design-1.webp", resolver);
    const second = await cache.resolve("/thumbnails/design-1.webp", resolver);

    assert.equal(first, "https://example.com/thumb.webp");
    assert.equal(second, "https://example.com/thumb.webp");
    assert.equal(resolveCount, 1);
  });

  it("deduplicates concurrent requests for the same path", async () => {
    const cache = new DesignDerivativeUrlCache();
    let resolveCount = 0;

    const resolver = async () => {
      resolveCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "https://example.com/preview.webp";
    };

    const [first, second] = await Promise.all([
      cache.resolve("/previews/design-1.webp", resolver),
      cache.resolve("/previews/design-1.webp", resolver),
    ]);

    assert.equal(first, "https://example.com/preview.webp");
    assert.equal(second, "https://example.com/preview.webp");
    assert.equal(resolveCount, 1);
  });

  it("does not cache null resolver results", async () => {
    const cache = new DesignDerivativeUrlCache();
    let resolveCount = 0;

    const resolver = async () => {
      resolveCount += 1;
      return null;
    };

    await cache.resolve("/thumbnails/missing.webp", resolver);
    await cache.resolve("/thumbnails/missing.webp", resolver);

    assert.equal(resolveCount, 2);
    assert.equal(cache.hasResolvedUrl("/thumbnails/missing.webp"), false);
  });

  it("clears cached URLs for one path or the entire cache", async () => {
    const cache = new DesignDerivativeUrlCache();
    const resolver = async () => "https://example.com/thumb.webp";

    await cache.resolve("/thumbnails/design-1.webp", resolver);
    assert.equal(cache.hasResolvedUrl("/thumbnails/design-1.webp"), true);

    cache.clear("/thumbnails/design-1.webp");
    assert.equal(cache.hasResolvedUrl("/thumbnails/design-1.webp"), false);

    await cache.resolve("/thumbnails/design-2.webp", resolver);
    cache.clear();
    assert.equal(cache.getResolvedUrl("/thumbnails/design-2.webp"), undefined);
  });
});
