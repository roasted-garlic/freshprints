import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEffectiveDpiQualityLabel,
  resolveEffectiveDpiQualityLevel,
} from "./effectiveDpiQuality";

describe("resolveEffectiveDpiQualityLevel", () => {
  it("maps staff edit tiers from effective DPI", () => {
    assert.equal(resolveEffectiveDpiQualityLevel(300), "optimal");
    assert.equal(resolveEffectiveDpiQualityLevel(275), "good");
    assert.equal(resolveEffectiveDpiQualityLevel(225), "bad");
    assert.equal(resolveEffectiveDpiQualityLevel(150), "terrible");
    assert.equal(getEffectiveDpiQualityLabel("optimal"), "Optimal");
  });
});
