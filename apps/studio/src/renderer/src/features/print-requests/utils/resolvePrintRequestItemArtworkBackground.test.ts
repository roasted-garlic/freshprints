import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../../designs/types/design.types";
import { resolvePrintRequestItemArtworkBackground } from "./resolvePrintRequestItemArtworkBackground";

function buildDesign(artworkBackgroundHex?: string): Design {
  return {
    id: "design-1",
    title: "Yellowstone National Park",
    tags: [],
    status: "ready",
    originalPath: "original.png",
    thumbnailPath: "thumbnail.png",
    artworkBackgroundHex,
  } as unknown as Design;
}

describe("resolvePrintRequestItemArtworkBackground", () => {
  it("returns the design's saved artworkBackgroundHex when set", () => {
    const design = buildDesign("#2c2d2d");

    assert.equal(resolvePrintRequestItemArtworkBackground(design), "#2c2d2d");
  });

  it("returns a different design's own saved value, not a shared/cached one", () => {
    const designA = buildDesign("#2c2d2d");
    const designB = buildDesign("#ffffff");

    assert.equal(resolvePrintRequestItemArtworkBackground(designA), "#2c2d2d");
    assert.equal(resolvePrintRequestItemArtworkBackground(designB), "#ffffff");
  });

  it("returns undefined when the design has no saved artworkBackgroundHex, letting the established default apply", () => {
    // DesignThumbnailPanel/DesignPreviewLightbox already fall back to the safe default grey via
    // resolveArtworkBackgroundHex when this resolves to undefined — this function must not
    // duplicate that fallback logic itself.
    assert.equal(resolvePrintRequestItemArtworkBackground(buildDesign(undefined)), undefined);
  });

  it("returns undefined when no design is provided (customer-upload item)", () => {
    assert.equal(resolvePrintRequestItemArtworkBackground(undefined), undefined);
  });

  it("passes through a malformed value unchanged, deferring safe fallback to the established resolver", () => {
    // Malformed-value handling is intentionally NOT this function's responsibility — it lives in
    // the already-tested, already-correct `resolveArtworkBackgroundHex`
    // (packages/shared/src/constants/design/artworkBackground.constants.ts), which both
    // DesignThumbnailPanel and DesignPreviewLightbox already call. Duplicating that validation here
    // would be redundant and risks the two fallback paths silently diverging.
    assert.equal(resolvePrintRequestItemArtworkBackground(buildDesign("not-a-hex-value")), "not-a-hex-value");
  });
});
