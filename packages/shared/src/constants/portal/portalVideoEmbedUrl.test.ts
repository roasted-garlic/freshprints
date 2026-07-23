import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAllowedPortalHelpVideoUrl,
  resolvePortalVideoEmbedUrl,
} from "./portalVideoEmbedUrl";

describe("resolvePortalVideoEmbedUrl", () => {
  it("resolves HTTPS YouTube watch URLs to nocookie embed", () => {
    const resolved = resolvePortalVideoEmbedUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    assert.ok(resolved);
    assert.equal(resolved.provider, "youtube");
    assert.equal(resolved.mediaId, "dQw4w9WgXcQ");
    assert.equal(
      resolved.embedSrc,
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("resolves youtu.be short links", () => {
    const resolved = resolvePortalVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
    assert.ok(resolved);
    assert.equal(resolved.provider, "youtube");
  });

  it("resolves HTTPS Vimeo URLs", () => {
    const resolved = resolvePortalVideoEmbedUrl("https://vimeo.com/123456789");
    assert.ok(resolved);
    assert.equal(resolved.provider, "vimeo");
    assert.equal(resolved.mediaId, "123456789");
    assert.equal(resolved.embedSrc, "https://player.vimeo.com/video/123456789");
  });

  it("rejects http URLs", () => {
    assert.equal(
      resolvePortalVideoEmbedUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      null,
    );
  });

  it("rejects arbitrary hosts", () => {
    assert.equal(resolvePortalVideoEmbedUrl("https://evil.example/embed/x"), null);
  });

  it("rejects empty input", () => {
    assert.equal(resolvePortalVideoEmbedUrl(""), null);
    assert.equal(resolvePortalVideoEmbedUrl(null), null);
  });
});

describe("isAllowedPortalHelpVideoUrl", () => {
  it("matches resolvePortalVideoEmbedUrl non-null", () => {
    assert.equal(isAllowedPortalHelpVideoUrl("https://youtu.be/dQw4w9WgXcQ"), true);
    assert.equal(isAllowedPortalHelpVideoUrl(""), false);
  });
});
