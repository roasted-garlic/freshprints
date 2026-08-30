import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import { upscaleImportImageIfNeeded } from "./upscaleImportImage";

async function makeTestPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 200, g: 50, b: 50, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("upscaleImportImageIfNeeded", () => {
  it("returns the original bytes unchanged when already at/above the 15in target", async () => {
    const sourceBytes = await makeTestPng(4500, 4000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 4500, 4000);

    assert.equal(result.wasUpscaled, false);
    assert.equal(result.width, 4500);
    assert.equal(result.height, 4000);
    assert.equal(result.bytes, sourceBytes);
    assert.equal(result.upscalePassCount, 0);
  });

  it("does not downsample a large production asset", async () => {
    const sourceBytes = await makeTestPng(9600, 9600);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 9600, 9600);

    assert.equal(result.wasUpscaled, false);
    assert.equal(result.width, 9600);
    assert.equal(result.height, 9600);
    assert.equal(result.bytes, sourceBytes);
  });

  it("upscales a narrow image once toward the 15in target (may exceed 2×)", async () => {
    const sourceBytes = await makeTestPng(1500, 2000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 1500, 2000);

    assert.equal(result.wasUpscaled, true);
    assert.equal(result.width, 3713);
    assert.equal(result.height, 4950);
    assert.equal(result.upscalePassCount, 1);
    assert.ok(result.upscaleFactor > 2.47 && result.upscaleFactor < 2.49);
    assert.equal(result.sizingWarningCode, "EXTENDED_UPSCALE");

    const outputMetadata = await sharp(result.bytes).metadata();
    assert.equal(outputMetadata.width, 3713);
    assert.equal(outputMetadata.height, 4950);
  });

  it("does not upscale a 16in @ 300dpi image further", async () => {
    const sourceBytes = await makeTestPng(4800, 4800);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 4800, 4800);

    assert.equal(result.wasUpscaled, false);
    assert.equal(result.width, 4800);
    assert.equal(result.height, 4800);
  });
});
