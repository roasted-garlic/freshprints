import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ANALYSIS_CANVAS_DEFAULT_HEX,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  ARTWORK_BACKGROUND_PRESET_WHITE,
  resolveAiAnalysisBackground,
} from "../../../packages/shared/src/constants/design/artworkBackground.constants";

describe("resolveAiAnalysisBackground", () => {
  it("uses mid-grey when artworkBackgroundHex is unset", () => {
    assert.deepEqual(resolveAiAnalysisBackground(undefined), {
      r: 128,
      g: 128,
      b: 128,
      alpha: 1,
    });
    assert.deepEqual(resolveAiAnalysisBackground(""), {
      r: 128,
      g: 128,
      b: 128,
      alpha: 1,
    });
    assert.equal(AI_ANALYSIS_CANVAS_DEFAULT_HEX, "#808080");
  });

  it("uses the stored design hex when valid", () => {
    assert.deepEqual(resolveAiAnalysisBackground(ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK), {
      r: 0x2c,
      g: 0x2d,
      b: 0x2d,
      alpha: 1,
    });
    assert.deepEqual(resolveAiAnalysisBackground(ARTWORK_BACKGROUND_PRESET_WHITE), {
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    });
  });

  it("ignores invalid values and falls back to mid-grey", () => {
    assert.deepEqual(resolveAiAnalysisBackground("not-a-color"), {
      r: 128,
      g: 128,
      b: 128,
      alpha: 1,
    });
  });
});
