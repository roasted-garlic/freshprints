import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { resolveDownscaleRatio } from "./normalizeImportOutputBytes";

function read(p: string): string {
  return readFileSync(p, "utf8");
}

const MAX = 150 * 1024 * 1024;
const TARGET = Math.floor(MAX * 0.97);

/**
 * Owner QA Amendment 3, Failure 2: a valid large PNG whose processed output exceeded the 150MB
 * ceiling was rejected. Normalization now recompresses losslessly first, then applies a bounded
 * minimal proportional downscale — never raising the ceiling or weakening Storage Rules.
 */
describe("normalizeImportOutputBytes downscale ratio (Amendment 3, Failure 2)", () => {
  it("never upscales: ratio is 1 when already under target, and always < 1 when over", () => {
    assert.equal(resolveDownscaleRatio(TARGET - 1, TARGET), 1);
    assert.equal(resolveDownscaleRatio(TARGET, TARGET), 1);
    assert.ok(resolveDownscaleRatio(TARGET * 2, TARGET) < 1);
  });

  it("applies a minimal proportional reduction, not an aggressive one", () => {
    // Slightly over budget should barely shrink, never collapse the image.
    const ratio = resolveDownscaleRatio(Math.floor(TARGET * 1.05), TARGET);
    assert.ok(ratio > 0.9, `expected a gentle reduction, got ${ratio}`);
    assert.ok(ratio <= 0.95, "ratio is clamped to guarantee real progress each pass");
  });

  it("clamps hard so a single pass can never destroy the image", () => {
    const ratio = resolveDownscaleRatio(TARGET * 1000, TARGET);
    assert.ok(ratio >= 0.3, `expected clamped floor, got ${ratio}`);
  });

  it("scales by the square root of the byte ratio (PNG bytes track pixel count)", () => {
    // 4x over budget should land near a 0.5 linear ratio (0.5^2 = 0.25 of the pixels).
    const ratio = resolveDownscaleRatio(TARGET * 4, TARGET);
    assert.ok(ratio > 0.45 && ratio < 0.52, `expected ~0.5, got ${ratio}`);
  });
});

describe("normalizeImportOutputBytes contract (Amendment 3, Failure 2)", () => {
  const source = read("apps/studio/electron/services/import/normalizeImportOutputBytes.ts");

  it("returns the original bytes untouched when already under the ceiling (ordinary small PNG unchanged)", () => {
    assert.match(source, /if \(pngBytes\.byteLength <= TARGET_BYTES\) \{/);
    const earlyReturn = source.slice(
      source.indexOf("if (pngBytes.byteLength <= TARGET_BYTES) {"),
      source.indexOf("const sharpApi = await loadSharpModule();"),
    );
    assert.match(earlyReturn, /bytes: pngBytes/);
    assert.match(earlyReturn, /wasRecompressed: false/);
    assert.match(earlyReturn, /wasDownscaled: false/);
  });

  it("tries lossless maximum compression before any downscale", () => {
    const compressIndex = source.indexOf("compressionLevel: 9");
    const resizeIndex = source.indexOf(".resize(");
    assert.ok(compressIndex > -1 && resizeIndex > -1);
    assert.ok(compressIndex < resizeIndex, "lossless recompression must be attempted first");
  });

  it("preserves aspect ratio and transparency (proportional resize, PNG output, no flatten)", () => {
    assert.match(source, /\.resize\(nextWidth, nextHeight/);
    assert.match(source, /Math\.floor\(width \* ratio\)/);
    assert.match(source, /Math\.floor\(height \* ratio\)/);
    assert.doesNotMatch(source, /\.flatten\(/);
    assert.doesNotMatch(source, /\.jpeg\(|\.webp\(/);
  });

  it("bounds downscale attempts and errors truthfully when it cannot fit", () => {
    assert.match(source, /const MAX_DOWNSCALE_ATTEMPTS = \d+;/);
    assert.match(source, /attempts < MAX_DOWNSCALE_ATTEMPTS/);
    assert.match(source, /throw new ImportOutputNormalizationError\(/);
  });

  it("targets safely below the hard ceiling rather than exactly on it", () => {
    assert.match(source, /MAX_SINGLE_PNG_SIZE_BYTES \* 0\.97/);
  });
});

describe("normalization wiring (Amendment 3, Failure 2)", () => {
  it("normalizes both the cached and fresh read paths through one helper", () => {
    const source = read("apps/studio/electron/ipc/import/readSelectedPngFileBytes.ts");
    assert.equal(
      (source.match(/buildNormalizedResult\(/g) ?? []).length,
      3,
      "expected one helper definition plus both read paths calling it",
    );
  });

  it("surfaces the real normalization error instead of a generic one", () => {
    const source = read("apps/studio/electron/ipc/import/readSelectedPngFileBytes.ts");
    assert.match(source, /if \(error instanceof ImportOutputNormalizationError\)/);
  });

  it("recalculates stored print size from normalized pixels and uploads only once", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importOrchestrationService.ts",
    );

    assert.match(source, /readResult\.data\.normalizedWidth/);
    assert.match(source, /effectiveWidth/);
    assert.match(source, /\.\.\.effectivePrintSizeFields/);
    // Exactly one upload call and one createDesign call — normalization must not duplicate either.
    assert.equal((source.match(/importUploadService\.uploadOriginalPng\(/g) ?? []).length, 1);
    assert.equal((source.match(/designService\.createDesign\(/g) ?? []).length, 1);
  });
});
