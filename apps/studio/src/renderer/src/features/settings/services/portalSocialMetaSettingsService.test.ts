import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPortalSocialMetaSettingsPayload } from "./portalSocialMetaSettingsService";

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
});
