import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ANALYSIS_CANVAS_DEFAULT_HEX,
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  ARTWORK_BACKGROUND_PRESET_WHITE,
  artworkBackgroundHexForOgQuery,
  artworkBackgroundHexToRgb,
  isDefaultArtworkBackgroundHex,
  normalizeArtworkBackgroundHex,
  resolveAiAnalysisBackground,
  resolveArtworkBackgroundHex,
} from "./artworkBackground.constants";

describe("normalizeArtworkBackgroundHex", () => {
  it("accepts #RRGGBB and bare hex", () => {
    assert.equal(normalizeArtworkBackgroundHex("#2C2D2D"), ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(normalizeArtworkBackgroundHex("e5e7eb"), ARTWORK_BACKGROUND_PRESET_GREY);
  });

  it("rejects invalid values", () => {
    assert.equal(normalizeArtworkBackgroundHex(""), null);
    assert.equal(normalizeArtworkBackgroundHex("#fff"), null);
    assert.equal(normalizeArtworkBackgroundHex("#gg0000"), null);
    assert.equal(normalizeArtworkBackgroundHex(12), null);
  });
});

describe("resolveArtworkBackgroundHex", () => {
  it("falls back to grey", () => {
    assert.equal(resolveArtworkBackgroundHex(undefined), ARTWORK_BACKGROUND_PRESET_GREY);
    assert.equal(resolveArtworkBackgroundHex("nope"), ARTWORK_BACKGROUND_PRESET_GREY);
  });
});

describe("isDefaultArtworkBackgroundHex", () => {
  it("treats missing and grey as default", () => {
    assert.equal(isDefaultArtworkBackgroundHex(undefined), true);
    assert.equal(isDefaultArtworkBackgroundHex("#E5E7EB"), true);
    assert.equal(isDefaultArtworkBackgroundHex(ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK), false);
  });
});

describe("artworkBackgroundHexForOgQuery / ToRgb", () => {
  it("strips hash for query and parses RGB", () => {
    assert.equal(artworkBackgroundHexForOgQuery("#2c2d2d"), "2c2d2d");
    assert.deepEqual(artworkBackgroundHexToRgb("#e5e7eb"), { r: 229, g: 231, b: 235 });
  });
});

describe("resolveAiAnalysisBackground", () => {
  it("defaults to mid-grey when unset", () => {
    assert.equal(AI_ANALYSIS_CANVAS_DEFAULT_HEX, "#808080");
    assert.deepEqual(resolveAiAnalysisBackground(undefined), {
      r: 128,
      g: 128,
      b: 128,
      alpha: 1,
    });
  });

  it("uses stored presets including white", () => {
    assert.deepEqual(resolveAiAnalysisBackground(ARTWORK_BACKGROUND_PRESET_WHITE), {
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    });
    assert.deepEqual(resolveAiAnalysisBackground(ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK), {
      r: 0x2c,
      g: 0x2d,
      b: 0x2d,
      alpha: 1,
    });
  });
});
