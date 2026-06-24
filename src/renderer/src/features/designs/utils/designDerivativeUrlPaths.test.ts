import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeCatalogPath } from "../utils/designDerivativeUrlPaths";

describe("normalizeCatalogPath", () => {
  it("returns null when path is missing", () => {
    assert.equal(normalizeCatalogPath(undefined), null);
    assert.equal(normalizeCatalogPath(""), null);
    assert.equal(normalizeCatalogPath("   "), null);
  });

  it("returns trimmed catalog paths", () => {
    assert.equal(normalizeCatalogPath(" /thumbnails/design-1.webp "), "/thumbnails/design-1.webp");
  });
});
