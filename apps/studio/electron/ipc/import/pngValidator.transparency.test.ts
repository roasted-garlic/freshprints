import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, after } from "node:test";
import sharp from "sharp";

import { CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE } from "@fresh-prints/shared/utils/meaningfulTransparencyMeasurement";
import { mapPngValidationFailureToRejection } from "./mapPngValidationFailureToRejection";
import { PngValidationError, validatePngFile } from "./pngValidator";

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

async function makeAlphaChannelButOpaquePng(width = 300, height = 300): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 40;
    pixels[i + 1] = 120;
    pixels[i + 2] = 200;
    pixels[i + 3] = 255;
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

describe("validatePngFile meaningful transparency gate", () => {
  const tempDirs: string[] = [];

  after(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function writeTempPng(bytes: Buffer, name: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "studio-import-transparency-"));
    tempDirs.push(dir);
    const filePath = join(dir, name);
    await writeFile(filePath, bytes);
    return filePath;
  }

  it("rejects fully opaque PNG before trim/upscale success", async () => {
    const filePath = await writeTempPng(await makeOpaquePng(), "opaque.png");
    await assert.rejects(
      () => validatePngFile(filePath),
      (error: unknown) => {
        assert.ok(error instanceof PngValidationError);
        assert.equal(error.reasonCode, "BACKGROUND_NOT_TRANSPARENT");
        assert.equal(error.message, CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE);
        return true;
      },
    );
  });

  it("rejects alpha-channel-but-effectively-opaque PNG", async () => {
    const filePath = await writeTempPng(await makeAlphaChannelButOpaquePng(), "opaque-alpha.png");
    await assert.rejects(
      () => validatePngFile(filePath),
      (error: unknown) => {
        assert.ok(error instanceof PngValidationError);
        assert.equal(error.reasonCode, "BACKGROUND_NOT_TRANSPARENT");
        return true;
      },
    );
  });

  it("accepts genuinely transparent PNG", async () => {
    const filePath = await writeTempPng(await makeTransparentPng(), "transparent.png");
    const result = await validatePngFile(filePath);
    assert.equal(result.valid, true);
    assert.equal(result.fileName, "transparent.png");
  });

  it("maps transparency rejection for batch folder/ZIP/multi discovery", () => {
    const rejection = mapPngValidationFailureToRejection(
      "C:/imports/folder/opaque.png",
      new PngValidationError(
        CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE,
        "BACKGROUND_NOT_TRANSPARENT",
      ),
    );
    assert.equal(rejection.reasonCode, "BACKGROUND_NOT_TRANSPARENT");
    assert.equal(rejection.message, CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE);
  });
});
