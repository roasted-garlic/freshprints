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
  it("returns the original bytes unchanged when width already meets the target", async () => {
    const sourceBytes = await makeTestPng(3000, 4000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 3000, 4000);

    assert.equal(result.wasUpscaled, false);
    assert.equal(result.width, 3000);
    assert.equal(result.height, 4000);
    assert.equal(result.bytes, sourceBytes);
  });

  it("upscales a narrow image up to the 3000px width target, preserving aspect ratio", async () => {
    const sourceBytes = await makeTestPng(1500, 2000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 1500, 2000);

    assert.equal(result.wasUpscaled, true);
    assert.equal(result.width, 3000);
    assert.equal(result.height, 4000);
    assert.equal(result.originalWidth, 1500);
    assert.equal(result.originalHeight, 2000);

    const outputMetadata = await sharp(result.bytes).metadata();
    assert.equal(outputMetadata.width, 3000);
    assert.equal(outputMetadata.height, 4000);
  });
});
