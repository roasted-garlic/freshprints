import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import { processCustomerUploadImageBytes } from "./customerUploadProcessing";
import { storageObjectPath } from "./storageObjectPath";

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

async function makeOpaquePng(width = 400, height = 400): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe("customerUploadProcessing", () => {
  it("strips leading slash from storage object paths", () => {
    assert.equal(storageObjectPath("/customer-uploads/a/b/source"), "customer-uploads/a/b/source");
  });

  it("accepts a meaningfully transparent PNG", async () => {
    const bytes = await makeTransparentPng();
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sourceFormat, "png");
    assert.ok(result.productionPng.byteLength > 0);
    assert.ok(result.previewWebp.byteLength > 0);
    assert.ok(result.thumbnailWebp.byteLength > 0);
    assert.equal(result.transparencyPassed, true);
  });

  it("rejects opaque PNG with locked message", async () => {
    const bytes = await makeOpaquePng();
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "background_not_transparent");
    assert.equal(result.message, "Background is not transparent.");
  });

  it("rejects JPEG", async () => {
    const bytes = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "unsupported_format");
  });
});
