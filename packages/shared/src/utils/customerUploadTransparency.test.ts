import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessMeaningfulTransparency,
  CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO,
  CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO,
} from "./customerUploadTransparency";

describe("assessMeaningfulTransparency", () => {
  it("fails when measurementFailed is set", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: 1000,
      measurementFailed: true,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "transparency_check_failed");
  });

  it("fails without an alpha channel", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: false,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: 0,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "no_alpha_channel");
  });

  it("fails fully opaque alpha-capable images", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: 0,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "background_not_transparent");
  });

  it("fails sparse accidental transparent pixels below threshold", () => {
    const total = 100 * 100;
    const below = Math.floor(total * CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO) - 1;
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: Math.max(0, below),
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "background_not_transparent");
  });

  it("passes at the transparent-pixel ratio threshold", () => {
    const total = 100 * 100;
    const count = Math.ceil(total * CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO);
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: count,
    });
    assert.equal(result.passed, true);
    assert.ok(result.transparentPixelRatio >= CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO);
  });

  it("passes via trim shrink even when pixel ratio is low", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: 1,
      trimShrinkRatioWidth: CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO,
    });
    assert.equal(result.passed, true);
  });

  it("fails invalid dimensions", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 0,
      heightPx: 100,
      transparentPixelCount: 10,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "invalid_dimensions");
  });
});
