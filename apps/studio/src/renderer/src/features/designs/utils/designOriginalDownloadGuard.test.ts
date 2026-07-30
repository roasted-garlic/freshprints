import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canStartDesignOriginalDownload } from "./designOriginalDownloadGuard";

describe("design original download guard", () => {
  it("fails closed when the design is missing", () => {
    let downloadCalls = 0;
    if (canStartDesignOriginalDownload(null, true, false)) {
      downloadCalls += 1;
    }
    assert.equal(downloadCalls, 0);
  });

  it("allows only an available, permitted, idle design", () => {
    assert.equal(canStartDesignOriginalDownload({}, true, false), true);
    assert.equal(canStartDesignOriginalDownload({}, false, false), false);
    assert.equal(canStartDesignOriginalDownload({}, true, true), false);
  });
});
