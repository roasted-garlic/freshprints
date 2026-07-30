import assert from "node:assert/strict";
import test from "node:test";

import type { PortalCatalogCard } from "./catalogSnapshot.types";
import { applyPortalCatalogCardOverrides } from "./catalogCardOverrides";

const card = (id: string, background: string): PortalCatalogCard => ({
  id,
  title: id,
  tags: [],
  thumbnailPath: `${id}.webp`,
  artworkBackgroundHex: background,
  width: 1,
  height: 1,
  requestCount: 0,
  favoriteCount: 0,
});

test("overlays only matching generated cards without mutating the base map", () => {
  const original = card("design-1", "#111111");
  const base = new Map([["design-1", original]]);
  const result = applyPortalCatalogCardOverrides(base, [
    card("design-1", "#abcdef"),
    card("not-in-base", "#222222"),
  ]);

  assert.equal(base.get("design-1"), original);
  assert.equal(result.get("design-1")?.artworkBackgroundHex, "#abcdef");
  assert.equal(result.has("not-in-base"), false);
});
