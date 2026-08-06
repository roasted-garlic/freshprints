import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("DesignDetailsModal artwork background mat", () => {
  const source = readFileSync(
    "apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx",
    "utf8",
  );

  it("passes design.artworkBackgroundHex to the Details thumbnail panel", () => {
    assert.match(source, /artworkBackgroundHex=\{design\.artworkBackgroundHex\}/);
    const thumbStart = source.indexOf("<DesignThumbnailPanel");
    const thumbEnd = source.indexOf("/>", thumbStart);
    const thumb = source.slice(thumbStart, thumbEnd);
    assert.match(thumb, /artworkBackgroundHex=\{design\.artworkBackgroundHex\}/);
  });

  it("passes the same hex to DesignPreviewLightbox", () => {
    const lightStart = source.indexOf("<DesignPreviewLightbox");
    const lightEnd = source.indexOf("/>", lightStart);
    const light = source.slice(lightStart, lightEnd);
    assert.match(light, /artworkBackgroundHex=\{design\.artworkBackgroundHex\}/);
  });

  it("does not invent a second background source or customer override", () => {
    assert.doesNotMatch(source, /temporaryBackground|customerPreviewBackground|previewMatOverride/);
  });

  it("download path remains original-PNG download (unchanged)", () => {
    assert.match(source, /downloadDesignOriginal/);
    assert.doesNotMatch(source, /flatten|composite.*png|rewriteOriginal/i);
  });
});

describe("DesignThumbnailPanel / DesignPreviewLightbox resolve via shared helper", () => {
  it("both resolve through resolveArtworkBackgroundHex", () => {
    const thumb = readFileSync(
      "apps/studio/src/renderer/src/features/designs/components/DesignThumbnailPanel.tsx",
      "utf8",
    );
    const light = readFileSync(
      "apps/studio/src/renderer/src/features/designs/components/DesignPreviewLightbox.tsx",
      "utf8",
    );
    assert.match(thumb, /resolveArtworkBackgroundHex\(artworkBackgroundHex\)/);
    assert.match(light, /resolveArtworkBackgroundHex\(artworkBackgroundHex\)/);
  });
});
