import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePrintRequestItemSourcePill } from "./printRequestItemSource";
import { resolveShowExportProductionAsset } from "./resolveShowExportProductionAsset";

describe("Staff Artwork source contracts", () => {
  it("resolves private source to the canonical production path", () => {
    const artwork = {
      staffArtworkId: "art-1",
      productionStoragePath: "/staff-artwork/art-1/production.png",
      previewStoragePath: "/staff-artwork/art-1/preview.webp",
      thumbnailStoragePath: "/staff-artwork/art-1/thumbnail.webp",
      widthPx: 3000,
      heightPx: 2000,
      title: "Private mark",
    };
    const resolved = resolveShowExportProductionAsset({
      item: { sourceType: "staff_artwork", staffArtworkId: "art-1" },
      staffArtwork: artwork,
    });
    assert.equal(resolved.productionStoragePath, artwork.productionStoragePath);
    assert.deepEqual(resolvePrintRequestItemSourcePill({
      item: { sourceType: "staff_artwork", staffArtworkId: "art-1" },
    }), { label: "Staff-added", variant: "custom" });
  });
});
