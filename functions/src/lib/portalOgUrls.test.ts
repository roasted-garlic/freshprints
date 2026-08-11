import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_OG_LETTERBOX_BG_HEX } from "../../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { buildPortalOgShareImageFunctionUrl } from "./portalOgUrls";

describe("buildPortalOgShareImageFunctionUrl", () => {
  it("includes fit and default letterbox bg cache-bust query", () => {
    const url = buildPortalOgShareImageFunctionUrl({
      projectId: "fresh-prints-dev",
      designId: "abc123",
      fit: "contain",
    });
    assert.equal(
      url,
      `https://us-central1-fresh-prints-dev.cloudfunctions.net/getPortalOgShareImage?fit=contain&bg=${PORTAL_OG_LETTERBOX_BG_HEX}&designId=abc123`,
    );
    assert.equal(PORTAL_OG_LETTERBOX_BG_HEX, "e5e7eb");
  });

  it("includes design artwork background hex in bg query", () => {
    const url = buildPortalOgShareImageFunctionUrl({
      projectId: "fresh-prints-dev",
      designId: "abc123",
      fit: "contain",
      backgroundHex: "#2C2D2D",
    });
    assert.match(url, /bg=2c2d2d/);
  });

  it("builds staticPath letterbox URL for approved static-og uploads", () => {
    const path = "portal-social-meta/static-og/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png";
    const url = buildPortalOgShareImageFunctionUrl({
      projectId: "fresh-prints-dev",
      staticStoragePath: path,
      fit: "contain",
    });
    assert.match(url, /staticPath=portal-social-meta%2Fstatic-og%2Faaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\.png/);
    assert.doesNotMatch(url, /designId=/);
  });

  it("rejects invalid static Storage paths", () => {
    assert.throws(
      () =>
        buildPortalOgShareImageFunctionUrl({
          projectId: "fresh-prints-dev",
          staticStoragePath: "designs/x/preview.png",
          fit: "contain",
        }),
      /missing_source|ambiguous/,
    );
  });

  it("rejects ambiguous designId + staticStoragePath", () => {
    assert.throws(
      () =>
        buildPortalOgShareImageFunctionUrl({
          projectId: "fresh-prints-dev",
          designId: "abc",
          staticStoragePath: "portal-social-meta/static-og/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png",
          fit: "contain",
        }),
      /ambiguous/,
    );
  });
});
