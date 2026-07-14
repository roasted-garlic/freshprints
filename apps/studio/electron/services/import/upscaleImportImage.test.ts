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
  it("returns the original bytes unchanged when already at/above the 10in target", async () => {
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

  it("upscales a narrow image once toward the 12in target (may exceed 2×)", async () => {
    const sourceBytes = await makeTestPng(1500, 2000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 1500, 2000);

    assert.equal(result.wasUpscaled, true);
    assert.equal(result.width, 3600);
    assert.equal(result.height, 4800);
    assert.equal(result.upscalePassCount, 1);
    assert.equal(result.upscaleFactor, 2.4);
    assert.equal(result.sizingWarningCode, "EXTENDED_UPSCALE");

    const outputMetadata = await sharp(result.bytes).metadata();
    assert.equal(outputMetadata.width, 3600);
    assert.equal(outputMetadata.height, 4800);
  });

  it("does not upscale a 12in @ 300dpi image further", async () => {
    const sourceBytes = await makeTestPng(3600, 3600);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 3600, 3600);

    assert.equal(result.wasUpscaled, false);
    assert.equal(result.width, 3600);
    assert.equal(result.height, 3600);
  });
});
