import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PORTAL_OG_LETTERBOX_BG_HEX,
} from "../../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
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
      `https://us-central1-fresh-prints-dev.cloudfunctions.net/getPortalOgShareImage?designId=abc123&fit=contain&bg=${PORTAL_OG_LETTERBOX_BG_HEX}`,
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
});
