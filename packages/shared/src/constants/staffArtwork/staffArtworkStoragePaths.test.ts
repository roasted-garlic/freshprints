import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getStaffArtworkProductionStoragePath,
  getStaffArtworkSourceStoragePath,
  getStaffArtworkPreviewStoragePath,
  getStaffArtworkThumbnailStoragePath,
  isCanonicalStaffArtworkStoragePath,
  parseStaffArtworkStoragePath,
} from "./staffArtworkStoragePaths";

describe("Staff Artwork storage paths", () => {
  it("builds and parses only the canonical private namespace", () => {
    const id = "art-1";
    assert.equal(getStaffArtworkSourceStoragePath(id), "/staff-artwork/art-1/source");
    assert.equal(getStaffArtworkProductionStoragePath(id), "/staff-artwork/art-1/production.png");
    assert.equal(getStaffArtworkPreviewStoragePath(id), "/staff-artwork/art-1/preview.webp");
    assert.equal(getStaffArtworkThumbnailStoragePath(id), "/staff-artwork/art-1/thumbnail.webp");
    assert.deepEqual(parseStaffArtworkStoragePath("/staff-artwork/art-1/production.png"), {
      staffArtworkId: id,
      fileName: "production.png",
    });
    assert.equal(isCanonicalStaffArtworkStoragePath("/staff-artwork/art-1/production.png", id), true);
    assert.equal(isCanonicalStaffArtworkStoragePath("/originals/art-1.png", id), false);
  });
});
