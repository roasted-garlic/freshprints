import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeArtworkBackgroundHex } from "./artworkBackground.constants";
import {
  findPortalArtworkPreviewShirtColorByHex,
  PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS,
} from "./portalArtworkPreviewShirtColors.constants";

describe("PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS", () => {
  it("has 8–16 entries with unique ids and valid hexes", () => {
    const count = PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS.length;
    assert.ok(count >= 8 && count <= 16, `expected 8–16 colors, got ${count}`);

    const ids = new Set<string>();
    const hexes = new Set<string>();
    for (const entry of PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS) {
      assert.ok(entry.id.trim().length > 0);
      assert.ok(entry.label.trim().length > 0);
      const normalized = normalizeArtworkBackgroundHex(entry.hex);
      assert.equal(normalized, entry.hex);
      assert.ok(!ids.has(entry.id), `duplicate id ${entry.id}`);
      assert.ok(!hexes.has(entry.hex), `duplicate hex ${entry.hex}`);
      ids.add(entry.id);
      hexes.add(entry.hex);
    }
  });

  it("includes staff grey and light black presets", () => {
    assert.ok(PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS.some((c) => c.hex === "#e5e7eb"));
    assert.ok(PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS.some((c) => c.hex === "#2c2d2d"));
  });
});

describe("findPortalArtworkPreviewShirtColorByHex", () => {
  it("matches palette hex case-insensitively", () => {
    const found = findPortalArtworkPreviewShirtColorByHex("#2C2D2D");
    assert.equal(found?.id, "light-black");
  });

  it("returns undefined for non-palette colors", () => {
    assert.equal(findPortalArtworkPreviewShirtColorByHex("#abcdef"), undefined);
  });
});
