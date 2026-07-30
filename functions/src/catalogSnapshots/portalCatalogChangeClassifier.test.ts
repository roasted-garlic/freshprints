import assert from "node:assert/strict";
import test from "node:test";

import type { PortalCatalogCard } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import {
  classifyPortalCatalogDesignChange,
  hasMatchingPortalCardOverride,
  mergePortalCardOverrides,
} from "./portalCatalogChangeClassifier";

const base = {
  status: "ready",
  title: "Design",
  description: "Description",
  categoryId: "cat-1",
  tags: ["tag-1"],
  createdAt: 100,
  thumbnailPath: "thumb.webp",
  previewPath: "preview.webp",
  artworkBackgroundHex: "#112233",
  width: 1000,
  height: 1000,
};

test("classifies background and derivative metadata as card-only", () => {
  assert.equal(
    classifyPortalCatalogDesignChange(base, { ...base, artworkBackgroundHex: "#abcdef" }),
    "card-only",
  );
  assert.equal(
    classifyPortalCatalogDesignChange(base, { ...base, thumbnailPath: "new.webp" }),
    "card-only",
  );
});

test("classifies search/filter/membership fields for full publication", () => {
  for (const update of [
    { title: "Changed" },
    { description: "Changed" },
    { categoryId: "cat-2" },
    { tags: ["tag-2"] },
    { status: "archived" },
    { createdAt: 200 },
  ]) {
    assert.equal(
      classifyPortalCatalogDesignChange(base, { ...base, ...update }),
      "index-filter",
    );
  }
});

test("classifies request/show/favorite/updated metadata as operational", () => {
  assert.equal(
    classifyPortalCatalogDesignChange(base, {
      ...base,
      requestCount: 10,
      favoriteCount: 5,
      lastRequestedAt: 300,
      lastAddedToShowAt: 400,
      updatedAt: 500,
    }),
    "operational",
  );
});

test("merges concurrent targeted cards without duplication or lost unrelated overrides", () => {
  const portalCard = (id: string, background: string): PortalCatalogCard => ({
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
  const first = mergePortalCardOverrides([], portalCard("design-a", "#111111"));
  const second = mergePortalCardOverrides(first, portalCard("design-b", "#222222"));
  const updated = mergePortalCardOverrides(second, portalCard("design-a", "#333333"));

  assert.deepEqual(updated.map((card) => card.id), ["design-a", "design-b"]);
  assert.equal(updated[0]?.artworkBackgroundHex, "#333333");
});

test("recognizes duplicate trigger delivery only when the existing public card is identical", () => {
  const card: PortalCatalogCard = {
    id: "design-a",
    title: "Design A",
    tags: ["tag-a"],
    thumbnailPath: "design-a.webp",
    artworkBackgroundHex: "#111111",
    width: 1,
    height: 1,
    requestCount: 0,
    favoriteCount: 0,
  };

  assert.equal(hasMatchingPortalCardOverride([card], { ...card }), true);
  assert.equal(
    hasMatchingPortalCardOverride(
      [card],
      { ...card, artworkBackgroundHex: "#222222" },
    ),
    false,
  );
});
