import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
  DEFAULT_PORTAL_SOCIAL_META_TITLE,
  parsePortalSocialMetaSettingsInput,
  pickHourlyRotatedIndex,
  pickLibraryOgRotatedIndex,
  resolvePortalSocialMetaSettings,
} from "./portalSocialMetaSettings.constants";

describe("resolvePortalSocialMetaSettings", () => {
  it("uses defaults for empty input", () => {
    const resolved = resolvePortalSocialMetaSettings(undefined);
    assert.equal(resolved.ogTitle, DEFAULT_PORTAL_SOCIAL_META_TITLE);
    assert.equal(resolved.ogDescription, DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION);
    assert.equal(resolved.letterboxOgImages, true);
    assert.equal(resolved.globalOgImageSource, "library");
    assert.equal(resolved.libraryOgRotationInterval, "hourly");
    assert.equal(resolved.libraryOgRotationSalt, 0);
  });

  it("trims and clamps stored strings and resolves toggles", () => {
    const resolved = resolvePortalSocialMetaSettings({
      ogTitle: "  Hello  ",
      ogDescription: "  World  ",
      letterboxOgImages: false,
      globalOgImageSource: "logo",
      libraryOgRotationInterval: "30s",
      libraryOgRotationSalt: 3,
    });
    assert.equal(resolved.ogTitle, "Hello");
    assert.equal(resolved.ogDescription, "World");
    assert.equal(resolved.letterboxOgImages, false);
    assert.equal(resolved.globalOgImageSource, "logo");
    assert.equal(resolved.libraryOgRotationInterval, "30s");
    assert.equal(resolved.libraryOgRotationSalt, 3);
  });

  it("ignores invalid globalOgImageSource and interval", () => {
    const resolved = resolvePortalSocialMetaSettings({
      globalOgImageSource: "random",
      libraryOgRotationInterval: "each-share",
    });
    assert.equal(resolved.globalOgImageSource, "library");
    assert.equal(resolved.libraryOgRotationInterval, "hourly");
  });
});

describe("parsePortalSocialMetaSettingsInput", () => {
  it("accepts valid title, description, toggles, and interval", () => {
    assert.deepEqual(
      parsePortalSocialMetaSettingsInput({
        ogTitle: " Fresh Prints ",
        ogDescription: " Share designs ",
        letterboxOgImages: false,
        globalOgImageSource: "logo",
        libraryOgRotationInterval: "1min",
        libraryOgRotationSalt: 2,
      }),
      {
        ogTitle: "Fresh Prints",
        ogDescription: "Share designs",
        letterboxOgImages: false,
        globalOgImageSource: "logo",
        libraryOgRotationInterval: "1min",
        libraryOgRotationSalt: 2,
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

  it("rejects blank, oversized, or invalid source/interval values", () => {
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
