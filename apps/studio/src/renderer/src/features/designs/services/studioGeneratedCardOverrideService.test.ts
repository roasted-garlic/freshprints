import assert from "node:assert/strict";
import test from "node:test";

import type { PortalCatalogCard } from "@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types";

import { studioGeneratedCardOverrideService as service } from "./studioGeneratedCardOverrideService";

function card(background: string): PortalCatalogCard {
  return {
    id: "design-1",
    title: "Design",
    tags: ["tag-1"],
    thumbnailPath: "thumb.webp",
    artworkBackgroundHex: background,
    width: 1000,
    height: 1000,
    requestCount: 0,
    favoriteCount: 0,
  };
}

test("session override survives route-style repeated resolution and preserves list position", () => {
  service.setSessionScope("user-1");
  service.put(card("#abcdef"), 1234);

  const first = service.apply(new Map([["design-1", card("#112233")]]), "base-1");
  const remount = service.apply(new Map([["design-1", card("#112233")]]), "base-1");
  const entries = service.applyReadyEntries([
    { id: "design-1", title: "Old", tags: [], createdAtMs: 1234 },
  ]);

  assert.equal(first.get("design-1")?.artworkBackgroundHex, "#abcdef");
  assert.equal(remount.get("design-1")?.artworkBackgroundHex, "#abcdef");
  assert.equal(entries[0]?.createdAtMs, 1234);
  assert.equal(entries[0]?.title, "Design");
});

test("matching generated data supersedes the override", () => {
  service.setSessionScope("user-2");
  service.put(card("#abcdef"), 1234);

  service.apply(new Map([["design-1", card("#abcdef")]]), "base-2");
  const oldGenerated = service.apply(new Map([["design-1", card("#112233")]]), "base-1");

  assert.equal(oldGenerated.get("design-1")?.artworkBackgroundHex, "#112233");
});

test("an unrelated newer generated version does not clear an unmatched override", () => {
  service.setSessionScope("user-3");
  service.put(card("#abcdef"), 1234);

  const result = service.apply(new Map([["design-1", card("#112233")]]), "base-newer");

  assert.equal(result.get("design-1")?.artworkBackgroundHex, "#abcdef");
});

test("explicit removal and session changes clear overrides", () => {
  service.setSessionScope("user-4");
  service.put(card("#abcdef"), 1234);
  service.remove("design-1");
  assert.equal(
    service.apply(new Map([["design-1", card("#112233")]])).get("design-1")
      ?.artworkBackgroundHex,
    "#112233",
  );

  service.put(card("#abcdef"), 1234);
  service.setSessionScope(null);
  assert.equal(
    service.apply(new Map([["design-1", card("#112233")]])).get("design-1")
      ?.artworkBackgroundHex,
    "#112233",
  );
});
