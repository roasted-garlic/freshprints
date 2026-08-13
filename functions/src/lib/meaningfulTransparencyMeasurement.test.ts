import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import {
  CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE,
  measureMeaningfulTransparency,
} from "../../../packages/shared/src/utils/meaningfulTransparencyMeasurement";

async function makeTransparentPng(width = 400, height = 400): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const inCenter = x > width * 0.25 && x < width * 0.75 && y > height * 0.25 && y < height * 0.75;
      pixels[i] = 220;
      pixels[i + 1] = 40;
      pixels[i + 2] = 40;
      pixels[i + 3] = inCenter ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function makeOpaquePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe("measureMeaningfulTransparency (shared)", () => {
  it("rejects opaque RGB PNG", async () => {
    const result = await measureMeaningfulTransparency(sharp, await makeOpaquePng());
    assert.equal(result.passed, false);
    assert.ok(
      result.failureCode === "no_alpha_channel" || result.failureCode === "background_not_transparent",
    );
  });

  it("accepts transparent PNG", async () => {
    const result = await measureMeaningfulTransparency(sharp, await makeTransparentPng());
    assert.equal(result.passed, true);
  });

  it("exports Studio staff rejection copy without changing thresholds", () => {
    assert.match(CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE, /transparent background/i);
  });
});
