import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeTransparencyCanvas,
  assessMeaningfulTransparency,
  CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO,
  CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO,
  CUSTOMER_UPLOAD_FULL_BLEED_MIN_TRANSPARENT_RATIO,
  CUSTOMER_UPLOAD_SCREENSHOT_OPAQUE_BBOX_MIN_RATIO,
  CUSTOMER_UPLOAD_THIN_BORDER_MAX_EXTERIOR_RATIO,
} from "./customerUploadTransparency";

function rgbaBuffer(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number],
): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

describe("analyzeTransparencyCanvas", () => {
  it("detects edge-connected exterior transparency", () => {
    const width = 100;
    const height = 100;
    const data = rgbaBuffer(width, height, (x, y) => {
      const inCenter = x > 20 && x < 80 && y > 20 && y < 80;
      return inCenter ? [255, 0, 0, 255] : [0, 0, 0, 0];
    });
    const analysis = analyzeTransparencyCanvas(data, width, height, true);
    assert.ok(analysis.exteriorTransparentPixelCount > 0);
    assert.ok(
      analysis.exteriorTransparentPixelCount / (width * height) >=
        CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO,
    );
    assert.ok(analysis.opaqueBoundingBoxCoverageRatio >= 0.3);
  });

  it("flags thin transparent border around opaque screenshot interior", () => {
    const width = 400;
    const height = 400;
    const border = 2;
    const data = rgbaBuffer(width, height, (x, y) => {
      const onBorder =
        x < border || y < border || x >= width - border || y >= height - border;
      return onBorder ? [0, 0, 0, 0] : [240, 240, 240, 255];
    });
    const analysis = analyzeTransparencyCanvas(data, width, height, true);
    const exteriorRatio = analysis.exteriorTransparentPixelCount / (width * height);
    assert.ok(exteriorRatio < CUSTOMER_UPLOAD_THIN_BORDER_MAX_EXTERIOR_RATIO);
    assert.ok(
      analysis.opaqueBoundingBoxCoverageRatio >= CUSTOMER_UPLOAD_SCREENSHOT_OPAQUE_BBOX_MIN_RATIO,
    );
    const verdict = assessMeaningfulTransparency(analysis);
    assert.equal(verdict.passed, false);
  });
});

describe("assessMeaningfulTransparency", () => {
  it("fails when measurementFailed is set", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: 1000,
      exteriorTransparentPixelCount: 1000,
      opaqueBoundingBoxCoverageRatio: 0.5,
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
      exteriorTransparentPixelCount: 0,
      opaqueBoundingBoxCoverageRatio: 1,
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
      exteriorTransparentPixelCount: 0,
      opaqueBoundingBoxCoverageRatio: 1,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "background_not_transparent");
  });

  it("fails sparse accidental transparent pixels without exterior reach", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: 4,
      exteriorTransparentPixelCount: 0,
      opaqueBoundingBoxCoverageRatio: 0.99,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "background_not_transparent");
  });

  it("passes when exterior transparency meets the minimum ratio", () => {
    const total = 100 * 100;
    const exterior = Math.ceil(total * CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO);
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: exterior + 100,
      exteriorTransparentPixelCount: exterior,
      opaqueBoundingBoxCoverageRatio: 0.5,
    });
    assert.equal(result.passed, true);
    assert.ok(result.exteriorTransparentRatio >= CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO);
  });

  it("rejects thin-border screenshot shape even when trim would shrink margins", () => {
    const total = 200 * 200;
    const exterior = Math.floor(total * 0.015);
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 200,
      heightPx: 200,
      transparentPixelCount: exterior,
      exteriorTransparentPixelCount: exterior,
      opaqueBoundingBoxCoverageRatio: 0.95,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "background_not_transparent");
  });

  it("passes full-bleed artwork with low exterior reach but real transparency", () => {
    const total = 100 * 100;
    const transparent = Math.ceil(total * CUSTOMER_UPLOAD_FULL_BLEED_MIN_TRANSPARENT_RATIO) + 50;
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 100,
      heightPx: 100,
      transparentPixelCount: transparent,
      exteriorTransparentPixelCount: 0,
      opaqueBoundingBoxCoverageRatio: 0.85,
    });
    assert.equal(result.passed, true);
  });

  it("passes transparent typography touching one edge", () => {
    const total = 120 * 80;
    const exterior = Math.ceil(total * CUSTOMER_UPLOAD_EXTERIOR_TRANSPARENT_MIN_RATIO);
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 120,
      heightPx: 80,
      transparentPixelCount: exterior + 200,
      exteriorTransparentPixelCount: exterior,
      opaqueBoundingBoxCoverageRatio: 0.35,
    });
    assert.equal(result.passed, true);
  });

  it("fails invalid dimensions", () => {
    const result = assessMeaningfulTransparency({
      hasAlphaChannel: true,
      widthPx: 0,
      heightPx: 100,
      transparentPixelCount: 10,
      exteriorTransparentPixelCount: 10,
      opaqueBoundingBoxCoverageRatio: 0.5,
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureCode, "invalid_dimensions");
  });
});
