import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeAiTags } from "./legacyAiTagNormalization";

describe("legacyAiTagNormalization", () => {
  it("retains historical normalization behavior for compatibility reads", () => {
    assert.deepEqual(normalizeAiTags(["skeleton", "death", "dance", "skull"]), [
      "skeleton",
      "dance",
    ]);
  });
});
