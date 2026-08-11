import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPortalSocialMetaSettingsPayload } from "./portalSocialMetaSettingsPayload";

describe("Portal social metadata payload", () => {
  it("carries the configured library rotation interval", () => {
    const payload = buildPortalSocialMetaSettingsPayload({
      ogTitle: "Title",
      ogDescription: "Description",
      letterboxOgImages: true,
      globalOgImageSource: "library",
      libraryOgRotationInterval: "daily",
      libraryOgRotationSalt: 3,
    });
    assert.equal(payload.libraryOgRotationInterval, "daily");
  });

  it("includes static retain/upload/design inputs when provided", () => {
    assert.deepEqual(
      buildPortalSocialMetaSettingsPayload({
        ogTitle: "Title",
        ogDescription: "Description",
        letterboxOgImages: true,
        globalOgImageSource: "static",
        libraryOgRotationInterval: "hourly",
        libraryOgRotationSalt: 0,
        staticOgImage: { kind: "retain" },
      }).staticOgImage,
      { kind: "retain" },
    );
    assert.deepEqual(
      buildPortalSocialMetaSettingsPayload({
        ogTitle: "Title",
        ogDescription: "Description",
        letterboxOgImages: true,
        globalOgImageSource: "static",
        libraryOgRotationInterval: "hourly",
        libraryOgRotationSalt: 0,
        staticOgImage: { kind: "design", sourceDesignId: "abc" },
      }).staticOgImage,
      { kind: "design", sourceDesignId: "abc" },
    );
  });
});
