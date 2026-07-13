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
  it("returns the original bytes unchanged when width already meets the 15in target", async () => {
    const sourceBytes = await makeTestPng(4500, 4000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 4500, 4000);

    assert.equal(result.wasUpscaled, false);
    assert.equal(result.width, 4500);
    assert.equal(result.height, 4000);
    assert.equal(result.bytes, sourceBytes);
  });

  it("upscales a narrow image up to the 4500px width target, preserving aspect ratio", async () => {
    const sourceBytes = await makeTestPng(1500, 2000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 1500, 2000);

    assert.equal(result.wasUpscaled, true);
    assert.equal(result.width, 4500);
    assert.equal(result.height, 6000);
    assert.equal(result.originalWidth, 1500);
    assert.equal(result.originalHeight, 2000);

    const outputMetadata = await sharp(result.bytes).metadata();
    assert.equal(outputMetadata.width, 4500);
    assert.equal(outputMetadata.height, 6000);
  });

  it("upscales a 3000px (10in @ 300dpi) image once to the 15in headroom target", async () => {
    const sourceBytes = await makeTestPng(3000, 4000);

    const result = await upscaleImportImageIfNeeded(sourceBytes, 3000, 4000);

    assert.equal(result.wasUpscaled, true);
    assert.equal(result.width, 4500);
    assert.equal(result.height, 6000);
  });
});
