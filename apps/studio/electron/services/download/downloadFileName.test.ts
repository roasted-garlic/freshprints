import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeDownloadFileName } from "./downloadFileName";

describe("sanitizeDownloadFileName", () => {
  it("replaces the exact U+0000 through U+001F boundary and forbidden filename characters", () => {
    assert.equal(
      sanitizeDownloadFileName(`a\u0000b\u001fc<>:"/\\|?*d`),
      "a_b_c_________d",
    );
  });

  it("retains U+0020 whitespace semantics and does not expand the boundary to U+007F", () => {
    assert.equal(sanitizeDownloadFileName("  a   b\u007fc  "), "a b\u007fc");
  });

  it("uses the existing fallback and length limit", () => {
    assert.equal(sanitizeDownloadFileName(".."), "download.bin");
    assert.equal(sanitizeDownloadFileName("a".repeat(200)).length, 180);
  });
});
