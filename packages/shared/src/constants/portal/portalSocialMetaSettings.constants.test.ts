import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
  DEFAULT_PORTAL_SOCIAL_META_TITLE,
  buildPortalStaticOgImageStoragePath,
  parsePortalSocialMetaSettingsInput,
  parsePortalStaticOgImageStoragePath,
  pickHourlyRotatedIndex,
  pickLibraryOgRotatedIndex,
  resolvePortalSocialMetaSettings,
  resolvePortalStaticOgImageSnapshot,
} from "./portalSocialMetaSettings.constants";

describe("resolvePortalSocialMetaSettings", () => {
  it("uses owner-approved Whatnot defaults for empty input", () => {
    const resolved = resolvePortalSocialMetaSettings(undefined);
    assert.equal(resolved.ogTitle, "Fresh Prints Whatnot Request Portal");
    assert.equal(
      resolved.ogDescription,
      "Browse the design library and submit print requests for Fresh Prints Whatnot shows.",
    );
    assert.equal(resolved.ogTitle, DEFAULT_PORTAL_SOCIAL_META_TITLE);
    assert.equal(resolved.ogDescription, DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION);
    assert.equal(resolved.letterboxOgImages, true);
    assert.equal(resolved.globalOgImageSource, "library");
    assert.equal(resolved.libraryOgRotationInterval, "hourly");
    assert.equal(resolved.libraryOgRotationSalt, 0);
    assert.equal(resolved.staticOgImage, null);
  });

  it("trims and clamps stored strings and resolves toggles including static", () => {
    const resolved = resolvePortalSocialMetaSettings({
      ogTitle: "  Hello  ",
      ogDescription: "  World  ",
      letterboxOgImages: false,
      globalOgImageSource: "static",
      libraryOgRotationInterval: "30s",
      libraryOgRotationSalt: 3,
      staticOgImage: {
        kind: "upload",
        storagePath: "portal-social-meta/static-og/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png",
        downloadUrl: "https://example.com/og.png",
        sourceDesignId: null,
      },
    });
    assert.equal(resolved.ogTitle, "Hello");
    assert.equal(resolved.ogDescription, "World");
    assert.equal(resolved.letterboxOgImages, false);
    assert.equal(resolved.globalOgImageSource, "static");
    assert.equal(resolved.libraryOgRotationInterval, "30s");
    assert.equal(resolved.libraryOgRotationSalt, 3);
    assert.deepEqual(resolved.staticOgImage, {
      kind: "upload",
      storagePath: "portal-social-meta/static-og/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png",
      downloadUrl: "https://example.com/og.png",
      sourceDesignId: null,
    });
  });

  it("ignores invalid globalOgImageSource and interval", () => {
    const resolved = resolvePortalSocialMetaSettings({
      globalOgImageSource: "random",
      libraryOgRotationInterval: "each-share",
    });
    assert.equal(resolved.globalOgImageSource, "library");
    assert.equal(resolved.libraryOgRotationInterval, "hourly");
  });

  it("drops static snapshots that lack both path and https url", () => {
    assert.equal(
      resolvePortalStaticOgImageSnapshot({
        kind: "design",
        storagePath: "",
        downloadUrl: "http://insecure.example/x.png",
        sourceDesignId: "abc",
      }),
      null,
    );
  });
});

describe("parsePortalSocialMetaSettingsInput", () => {
  it("accepts valid title, description, toggles, interval, and static", () => {
    assert.deepEqual(
      parsePortalSocialMetaSettingsInput({
        ogTitle: " Fresh Prints ",
        ogDescription: " Share designs ",
        letterboxOgImages: false,
        globalOgImageSource: "static",
        libraryOgRotationInterval: "1min",
        libraryOgRotationSalt: 2,
        staticOgImage: {
          kind: "design",
          sourceDesignId: "design_123",
        },
      }),
      {
        ogTitle: "Fresh Prints",
        ogDescription: "Share designs",
        letterboxOgImages: false,
        globalOgImageSource: "static",
        libraryOgRotationInterval: "1min",
        libraryOgRotationSalt: 2,
        staticOgImage: {
          kind: "design",
          sourceDesignId: "design_123",
        },
      },
    );
  });

  it("defaults missing toggles when title and description are valid", () => {
    assert.deepEqual(
      parsePortalSocialMetaSettingsInput({
        ogTitle: " Fresh Prints ",
        ogDescription: " Share designs ",
      }),
      {
        ogTitle: "Fresh Prints",
        ogDescription: "Share designs",
        letterboxOgImages: true,
        globalOgImageSource: "library",
        libraryOgRotationInterval: "hourly",
        libraryOgRotationSalt: 0,
      },
    );
  });

  it("accepts retain static input and upload storage paths", () => {
    const objectId = "11111111-2222-3333-4444-555555555555";
    assert.deepEqual(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "ok",
        ogDescription: "ok",
        globalOgImageSource: "static",
        staticOgImage: { kind: "retain" },
      })?.staticOgImage,
      { kind: "retain" },
    );
    assert.deepEqual(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "ok",
        ogDescription: "ok",
        globalOgImageSource: "static",
        staticOgImage: {
          kind: "upload",
          storagePath: buildPortalStaticOgImageStoragePath(objectId, "image/png"),
        },
      })?.staticOgImage,
      {
        kind: "upload",
        storagePath: `portal-social-meta/static-og/${objectId}.png`,
      },
    );
  });

  it("rejects blank, oversized, or invalid source/interval/static values", () => {
    assert.equal(parsePortalSocialMetaSettingsInput({ ogTitle: "", ogDescription: "x" }), null);
    assert.equal(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "x".repeat(121),
        ogDescription: "ok",
      }),
      null,
    );
    assert.equal(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "ok",
        ogDescription: "ok",
        globalOgImageSource: "nope",
      }),
      null,
    );
    assert.equal(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "ok",
        ogDescription: "ok",
        libraryOgRotationInterval: "each-share",
      }),
      null,
    );
    assert.equal(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "ok",
        ogDescription: "ok",
        libraryOgRotationSalt: -1,
      }),
      null,
    );
    assert.equal(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "ok",
        ogDescription: "ok",
        staticOgImage: { kind: "upload", storagePath: "brand/portal/full/x.png" },
      }),
      null,
    );
  });
});

describe("portal static og storage paths", () => {
  it("builds and parses canonical static-og paths", () => {
    const objectId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const path = buildPortalStaticOgImageStoragePath(objectId, "image/jpeg");
    assert.equal(path, `portal-social-meta/static-og/${objectId}.jpg`);
    assert.equal(parsePortalStaticOgImageStoragePath(`/${path.toUpperCase()}`), path);
    assert.equal(parsePortalStaticOgImageStoragePath("designs/x/preview.png"), null);
  });
});

describe("pickLibraryOgRotatedIndex", () => {
  it("returns 0 for empty sample", () => {
    assert.equal(pickLibraryOgRotatedIndex(0), 0);
  });

  it("is stable within the same interval bucket", () => {
    const hourMs = 60 * 60 * 1000;
    const a = pickLibraryOgRotatedIndex(40, hourMs * 100, 0, "hourly");
    const b = pickLibraryOgRotatedIndex(40, hourMs * 100 + 1000, 0, "hourly");
    assert.equal(a, b);
  });

  it("rotates across 30s buckets", () => {
    const t0 = Date.UTC(2026, 6, 21, 12, 0, 0);
    const t1 = t0 + 30_000;
    const a = pickLibraryOgRotatedIndex(40, t0, 0, "30s");
    const b = pickLibraryOgRotatedIndex(40, t1, 0, "30s");
    assert.equal((a + 1) % 40, b);
  });

  it("rotates across 1min buckets", () => {
    const t0 = Date.UTC(2026, 6, 21, 12, 0, 0);
    const t1 = t0 + 60_000;
    const a = pickLibraryOgRotatedIndex(40, t0, 0, "1min");
    const b = pickLibraryOgRotatedIndex(40, t1, 0, "1min");
    assert.equal((a + 1) % 40, b);
  });

  it("daily buckets stay stable within the UTC day", () => {
    const dayStart = Date.UTC(2026, 6, 21, 0, 0, 0);
    const later = Date.UTC(2026, 6, 21, 23, 59, 0);
    assert.equal(
      pickLibraryOgRotatedIndex(40, dayStart, 0, "daily"),
      pickLibraryOgRotatedIndex(40, later, 0, "daily"),
    );
  });

  it("shifts when rotation salt changes", () => {
    const now = 60 * 60 * 1000 * 100;
    const a = pickLibraryOgRotatedIndex(40, now, 0, "hourly");
    const b = pickLibraryOgRotatedIndex(40, now, 1, "hourly");
    assert.equal(b, (a + 1) % 40);
  });
});

describe("pickHourlyRotatedIndex", () => {
  it("delegates to hourly library picker", () => {
    const now = Date.UTC(2026, 6, 21, 12, 0, 0);
    assert.equal(pickHourlyRotatedIndex(40, now, 2), pickLibraryOgRotatedIndex(40, now, 2, "hourly"));
  });
});
