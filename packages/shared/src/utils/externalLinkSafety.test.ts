import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSafeExternalLinkUrl } from "./externalLinkSafety";

describe("isSafeExternalLinkUrl", () => {
  it("allows http URLs", () => {
    assert.equal(isSafeExternalLinkUrl("http://example.com"), true);
  });

  it("allows https URLs", () => {
    assert.equal(isSafeExternalLinkUrl("https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b"), true);
  });

  it("rejects javascript: URLs", () => {
    assert.equal(isSafeExternalLinkUrl("javascript:alert(1)"), false);
  });

  it("rejects file: URLs", () => {
    assert.equal(isSafeExternalLinkUrl("file:///etc/passwd"), false);
  });

  it("rejects custom app schemes", () => {
    assert.equal(isSafeExternalLinkUrl("fresh-prints://open"), false);
  });

  it("rejects malformed input", () => {
    assert.equal(isSafeExternalLinkUrl("not a url"), false);
    assert.equal(isSafeExternalLinkUrl(""), false);
  });
});
