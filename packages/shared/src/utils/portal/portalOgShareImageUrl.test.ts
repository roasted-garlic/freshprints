import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPortalOgShareImageFunctionUrl } from "./portalOgShareImageUrl.ts";

describe("buildPortalOgShareImageFunctionUrl", () => {
  it("builds a public Function URL with contain fit and bg cache-bust", () => {
    const url = buildPortalOgShareImageFunctionUrl({
      projectId: "fresh-prints-dev",
      designId: "abc123",
      backgroundHex: "#112233",
    });
    assert.match(url, /^https:\/\/us-central1-fresh-prints-dev\.cloudfunctions\.net\/getPortalOgShareImage\?/);
    assert.match(url, /designId=abc123/);
    assert.match(url, /fit=contain/);
    assert.match(url, /bg=112233/);
    assert.doesNotMatch(url, /GoogleAccessId|Signature=/);
  });
});
