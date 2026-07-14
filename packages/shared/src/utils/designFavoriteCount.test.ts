import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nextFavoriteCountAfterDelta } from "./designFavoriteCount";

describe("nextFavoriteCountAfterDelta", () => {
  it("increments from missing or zero", () => {
    assert.equal(nextFavoriteCountAfterDelta(undefined, 1), 1);
    assert.equal(nextFavoriteCountAfterDelta(0, 1), 1);
    assert.equal(nextFavoriteCountAfterDelta(3, 1), 4);
  });

  it("decrements but never goes below zero", () => {
    assert.equal(nextFavoriteCountAfterDelta(2, -1), 1);
    assert.equal(nextFavoriteCountAfterDelta(0, -1), 0);
    assert.equal(nextFavoriteCountAfterDelta(undefined, -1), 0);
  });
});
