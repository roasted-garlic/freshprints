import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import { trimImportImageIfNeeded } from "./trimImportImage";

async function makeOpaquePng(width: number, height: number): Promise<Buffer> {
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

async function makePaddedPng(
  contentWidth: number,
  contentHeight: number,
  padTop: number,
  padRight: number,
  padBottom: number,
  padLeft: number,
): Promise<Buffer> {
  const content = await sharp({
    create: {
      width: contentWidth,
      height: contentHeight,
      channels: 4,
      background: { r: 200, g: 50, b: 50, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: contentWidth + padLeft + padRight,
      height: contentHeight + padTop + padBottom,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, top: padTop, left: padLeft }])
    .png()
    .toBuffer();
}

describe("trimImportImageIfNeeded", () => {
  it("returns the original bytes unchanged when there is no transparent padding", async () => {
    const sourceBytes = await makeOpaquePng(1000, 1200);

    const result = await trimImportImageIfNeeded(sourceBytes);

    assert.equal(result.wasTrimmed, false);
    assert.equal(result.width, 1000);
    assert.equal(result.height, 1200);
    assert.equal(result.bytes, sourceBytes);
  });

  it("trims symmetric transparent padding from all sides", async () => {
    const sourceBytes = await makePaddedPng(1000, 1200, 100, 100, 100, 100);

    const result = await trimImportImageIfNeeded(sourceBytes);

    assert.equal(result.wasTrimmed, true);
    assert.equal(result.width, 1000);
    assert.equal(result.height, 1200);
    assert.equal(result.originalWidth, 1200);
    assert.equal(result.originalHeight, 1400);

    const outputMetadata = await sharp(result.bytes).metadata();
    assert.equal(outputMetadata.width, 1000);
    assert.equal(outputMetadata.height, 1200);
  });

  it("trims asymmetric transparent padding on only some sides", async () => {
    const sourceBytes = await makePaddedPng(800, 900, 50, 0, 300, 0);

    const result = await trimImportImageIfNeeded(sourceBytes);

    assert.equal(result.wasTrimmed, true);
    assert.equal(result.width, 800);
    assert.equal(result.height, 900);
    assert.equal(result.originalWidth, 800);
    assert.equal(result.originalHeight, 1250);
  });
});
