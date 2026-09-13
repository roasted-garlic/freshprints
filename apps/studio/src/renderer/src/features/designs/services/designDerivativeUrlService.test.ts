import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeCatalogPath } from "../utils/designDerivativeUrlPaths";

function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, "");
}

describe("catalog production download path normalization", () => {
  it("normalizes baseline and interactive catalog originals to the same Storage ref shape", () => {
    const baseline = "/originals/ltn0gzs2YGXPADqCejr8.png";
    const interactive = "/originals/ltn0gzs2YGXPADqCejr8.interactive.png";

    assert.equal(normalizeCatalogPath(baseline), baseline);
    assert.equal(normalizeCatalogPath(interactive), interactive);
    assert.equal(toFirebaseStorageRefPath(baseline), "originals/ltn0gzs2YGXPADqCejr8.png");
    assert.equal(
      toFirebaseStorageRefPath(interactive),
      "originals/ltn0gzs2YGXPADqCejr8.interactive.png",
    );
  });

  it("normalizes customer upload interactive production paths", () => {
    const interactive = "/customer-uploads/u1/up1/production.interactive.png";
    assert.equal(toFirebaseStorageRefPath(interactive), "customer-uploads/u1/up1/production.interactive.png");
  });
});
