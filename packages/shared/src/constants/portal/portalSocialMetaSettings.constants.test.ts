import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
  DEFAULT_PORTAL_SOCIAL_META_TITLE,
  parsePortalSocialMetaSettingsInput,
  resolvePortalSocialMetaSettings,
} from "./portalSocialMetaSettings.constants";

describe("resolvePortalSocialMetaSettings", () => {
  it("uses defaults for empty input", () => {
    const resolved = resolvePortalSocialMetaSettings(undefined);
    assert.equal(resolved.ogTitle, DEFAULT_PORTAL_SOCIAL_META_TITLE);
    assert.equal(resolved.ogDescription, DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION);
  });

  it("trims and clamps stored strings", () => {
    const resolved = resolvePortalSocialMetaSettings({
      ogTitle: "  Hello  ",
      ogDescription: "  World  ",
    });
    assert.equal(resolved.ogTitle, "Hello");
    assert.equal(resolved.ogDescription, "World");
  });
});

describe("parsePortalSocialMetaSettingsInput", () => {
  it("accepts valid title and description", () => {
    assert.deepEqual(
      parsePortalSocialMetaSettingsInput({
        ogTitle: " Fresh Prints ",
        ogDescription: " Share designs ",
      }),
      { ogTitle: "Fresh Prints", ogDescription: "Share designs" },
    );
  });

  it("rejects blank or oversized values", () => {
    assert.equal(parsePortalSocialMetaSettingsInput({ ogTitle: "", ogDescription: "x" }), null);
    assert.equal(
      parsePortalSocialMetaSettingsInput({
        ogTitle: "x".repeat(121),
        ogDescription: "ok",
      }),
      null,
    );
  });
});
