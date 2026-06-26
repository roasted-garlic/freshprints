import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEffectiveDpiQualityLabel,
  resolveEffectiveDpiQualityLevel,
} from "./effectiveDpiQuality";

describe("resolveEffectiveDpiQualityLevel", () => {
  it("maps tier boundaries per product legend", () => {
    assert.equal(resolveEffectiveDpiQualityLevel(300), "optimal");
    assert.equal(resolveEffectiveDpiQualityLevel(299), "good");
    assert.equal(resolveEffectiveDpiQualityLevel(250), "good");
    assert.equal(resolveEffectiveDpiQualityLevel(249), "bad");
    assert.equal(resolveEffectiveDpiQualityLevel(200), "bad");
    assert.equal(resolveEffectiveDpiQualityLevel(199), "terrible");
    assert.equal(resolveEffectiveDpiQualityLevel(72), "terrible");
    assert.equal(resolveEffectiveDpiQualityLevel(71), "terrible");
  });

  it("returns concise labels for catalog pills", () => {
    assert.equal(getEffectiveDpiQualityLabel("optimal"), "Optimal");
    assert.equal(getEffectiveDpiQualityLabel("good"), "Good");
    assert.equal(getEffectiveDpiQualityLabel("bad"), "Bad");
    assert.equal(getEffectiveDpiQualityLabel("terrible"), "Terrible");
  });
});
