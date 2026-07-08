import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildInitialFolderDiscoverySummary } from "./folderZipProcessor";

describe("buildInitialFolderDiscoverySummary", () => {
  it("maps folder scan counts into discovery summary", () => {
    const summary = buildInitialFolderDiscoverySummary({
      pngsDiscovered: 12,
      zipsDiscovered: 3,
      zipsSkipped: 1,
    });

    assert.equal(summary.loosePngsFound, 12);
    assert.equal(summary.zipsFound, 3);
    assert.equal(summary.zipsSkipped, 1);
    assert.equal(summary.zipsSkippedByLimit, 0);
    assert.equal(summary.zipsSkippedOther, 1);
    assert.equal(summary.zipsProcessed, 0);
    assert.equal(summary.nestedZipsNotOpened, 0);
  });
});
