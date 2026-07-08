import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampRectToSheetOrigin,
  inchesToPixels,
  pixelsToInches,
  resizeRectPreservingAspectRatio,
  rotateRectByCardinalDegrees,
} from "./gangSheetLayoutUnits";

describe("inchesToPixels / pixelsToInches", () => {
  it("converts inches to pixels at a given density", () => {
    assert.equal(inchesToPixels(2, 50), 100);
  });

  it("converts pixels back to inches at the same density", () => {
    assert.equal(pixelsToInches(100, 50), 2);
  });

  it("round-trips without drift", () => {
    const original = 3.5;
    const pixels = inchesToPixels(original, 96);
    assert.equal(pixelsToInches(pixels, 96), original);
  });
});

describe("resizeRectPreservingAspectRatio", () => {
  const baseRect = { xInches: 1, yInches: 1, widthInches: 4, heightInches: 2 };

  it("preserves aspect ratio by default when growing width", () => {
    const resized = resizeRectPreservingAspectRatio(baseRect, 4);

    assert.equal(resized.widthInches, 8);
    assert.equal(resized.heightInches, 4);
  });

  it("preserves aspect ratio by default when shrinking width", () => {
    const resized = resizeRectPreservingAspectRatio(baseRect, -2);

    assert.equal(resized.widthInches, 2);
    assert.equal(resized.heightInches, 1);
  });

  it("does not change height when aspect ratio preservation is disabled", () => {
    const resized = resizeRectPreservingAspectRatio(baseRect, 4, { preserveAspectRatio: false });

    assert.equal(resized.widthInches, 8);
    assert.equal(resized.heightInches, 2);
  });

  it("clamps to the minimum size instead of collapsing to zero or negative", () => {
    const resized = resizeRectPreservingAspectRatio(baseRect, -10, { minSizeInches: 0.5 });

    assert.equal(resized.widthInches, 0.5);
    assert.ok(resized.heightInches > 0);
  });

  it("keeps position unchanged", () => {
    const resized = resizeRectPreservingAspectRatio(baseRect, 1);

    assert.equal(resized.xInches, 1);
    assert.equal(resized.yInches, 1);
  });
});

describe("clampRectToSheetOrigin", () => {
  it("leaves a rect within bounds unchanged", () => {
    const rect = { xInches: 2, yInches: 3, widthInches: 1, heightInches: 1 };
    assert.deepEqual(clampRectToSheetOrigin(rect), rect);
  });

  it("clamps negative x and y to zero", () => {
    const rect = { xInches: -1, yInches: -5, widthInches: 1, heightInches: 1 };
    const clamped = clampRectToSheetOrigin(rect);

    assert.equal(clamped.xInches, 0);
    assert.equal(clamped.yInches, 0);
  });
});

describe("rotateRectByCardinalDegrees", () => {
  it("returns the same rect unchanged for 0 degrees", () => {
    const rect = { xInches: 1, yInches: 2, widthInches: 4, heightInches: 2 };
    assert.deepEqual(rotateRectByCardinalDegrees(rect, 0), rect);
  });

  it("returns the same rect unchanged for 180 degrees", () => {
    const rect = { xInches: 1, yInches: 2, widthInches: 4, heightInches: 2 };
    assert.deepEqual(rotateRectByCardinalDegrees(rect, 180), rect);
  });

  it("swaps width/height for a 90 degree rotation, keeping the center fixed", () => {
    const rect = { xInches: 0, yInches: 0, widthInches: 4, heightInches: 2 };
    const rotated = rotateRectByCardinalDegrees(rect, 90);

    assert.equal(rotated.widthInches, 2);
    assert.equal(rotated.heightInches, 4);
    assert.equal(rotated.xInches, 1);
    assert.equal(rotated.yInches, -1);
  });

  it("swaps width/height for a 270 degree rotation", () => {
    const rect = { xInches: 0, yInches: 0, widthInches: 4, heightInches: 2 };
    const rotated = rotateRectByCardinalDegrees(rect, 270);

    assert.equal(rotated.widthInches, 2);
    assert.equal(rotated.heightInches, 4);
  });

  it("normalizes negative or over-360 degree values", () => {
    const rect = { xInches: 0, yInches: 0, widthInches: 4, heightInches: 2 };
    assert.deepEqual(rotateRectByCardinalDegrees(rect, -270), rotateRectByCardinalDegrees(rect, 90));
    assert.deepEqual(rotateRectByCardinalDegrees(rect, 450), rotateRectByCardinalDegrees(rect, 90));
  });
});
