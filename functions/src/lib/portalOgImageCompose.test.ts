import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import {
  PORTAL_OG_CANVAS_HEIGHT,
  PORTAL_OG_CANVAS_WIDTH,
  composePortalOgLetterboxImage,
} from "./portalOgImageCompose";

async function solidPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

describe("composePortalOgLetterboxImage", () => {
  it("outputs a 1200x630 JPEG", async () => {
    const input = await solidPng(800, 800);
    const result = await composePortalOgLetterboxImage(input);
    assert.equal(result.contentType, "image/jpeg");
    assert.equal(result.width, PORTAL_OG_CANVAS_WIDTH);
    assert.equal(result.height, PORTAL_OG_CANVAS_HEIGHT);
    const meta = await sharp(result.bytes).metadata();
    assert.equal(meta.width, PORTAL_OG_CANVAS_WIDTH);
    assert.equal(meta.height, PORTAL_OG_CANVAS_HEIGHT);
    assert.equal(meta.format, "jpeg");
  });

  it("letterboxes with Portal artwork-preview grey margins by default", async () => {
    const input = await solidPng(800, 800);
    const result = await composePortalOgLetterboxImage(input);
    const { data, info } = await sharp(result.bytes).raw().ensureAlpha().toBuffer({
      resolveWithObject: true,
    });
    const channels = info.channels;
    const idx = 0;
    // JPEG may round #e5e7eb (229,231,235) by ±2
    assert.ok(Math.abs(data[idx] - 229) <= 2);
    assert.ok(Math.abs(data[idx + 1] - 231) <= 2);
    assert.ok(Math.abs(data[idx + 2] - 235) <= 2);
    assert.equal(channels, 4);
  });

  it("letterboxes with per-design light-black margins", async () => {
    const input = await solidPng(800, 800);
    const result = await composePortalOgLetterboxImage(input, "#2c2d2d");
    const { data } = await sharp(result.bytes).raw().ensureAlpha().toBuffer({
      resolveWithObject: true,
    });
    // #2c2d2d → 44,45,45
    assert.ok(Math.abs(data[0] - 44) <= 2);
    assert.ok(Math.abs(data[1] - 45) <= 2);
    assert.ok(Math.abs(data[2] - 45) <= 2);
  });
});
