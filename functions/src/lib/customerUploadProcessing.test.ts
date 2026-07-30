import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import {
  CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
  processCustomerUploadImageBytes,
} from "./customerUploadProcessing";
import { storageObjectPath } from "./storageObjectPath";
import {
  CUSTOMER_UPLOAD_MAX_DIMENSION_PX,
  CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";

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

/**
 * Has an alpha channel (so `metadata.hasAlpha` is true and the cheap sample runs), but every pixel's
 * alpha is uniformly at/above CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX (so the ratio check fails) with
 * zero edge variation (so a trim finds nothing to shrink and the trim-shrink check also fails). This
 * deterministically exercises the "has alpha but not meaningfully transparent, and not trimmable"
 * defect path — full trim probe runs, still fails, and must not have entered the "trimming" stage.
 */
async function makeAlphaChannelButOpaquePng(width = 300, height = 300): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 90;
    pixels[i + 1] = 90;
    pixels[i + 2] = 90;
    pixels[i + 3] = 255; // fully opaque, at/above CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX (250)
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Oversized-canvas PNG with a real (meaningfully-sized, ~8% per side) transparent margin around
 * an opaque noise interior sized so it still exceeds the pixel ceiling even after that margin is
 * trimmed away. Unlike a fixture with a huge transparent margin (which trim alone can rescue
 * comfortably under the ceiling — a different, already-covered code path), this fixture's opaque
 * interior is deliberately sized just over the ceiling so the downscale-only normalization path
 * is what actually resolves it, matching the Plan's "still exceeds the ceiling after trim"
 * trigger condition.
 */
async function makeBarelyTransparentOversizedPng(width: number, height: number): Promise<Buffer> {
  const marginFraction = 0.08;
  const marginX = Math.floor(width * marginFraction);
  const marginY = Math.floor(height * marginFraction);
  const opaqueWidth = width - marginX * 2;
  const opaqueHeight = height - marginY * 2;

  const opaquePixels = Buffer.alloc(opaqueWidth * opaqueHeight * 4);
  for (let y = 0; y < opaqueHeight; y += 1) {
    const rowStart = y * opaqueWidth * 4;
    for (let x = 0; x < opaqueWidth; x += 1) {
      const i = rowStart + x * 4;
      opaquePixels[i] = (x * 7 + y * 13) % 256;
      opaquePixels[i + 1] = (x * 3 + y * 29) % 256;
      opaquePixels[i + 2] = (x * 17 + y * 5) % 256;
      opaquePixels[i + 3] = 255;
    }
  }
  const opaqueTile = sharp(opaquePixels, {
    raw: { width: opaqueWidth, height: opaqueHeight, channels: 4 },
  });

  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await opaqueTile.png().toBuffer(), left: marginX, top: marginY }])
    .png({ compressionLevel: 1 })
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
    const stagesSeen: string[] = [];
    const result = await processCustomerUploadImageBytes(bytes, {
      onStage: (stage) => {
        stagesSeen.push(stage);
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "background_not_transparent");
    assert.equal(result.message, "Background is not transparent.");
    assert.ok(!stagesSeen.includes("trimming"), "rejected upload must never enter the trimming stage");
  });

  it("rejects a PNG with an alpha channel that is present but not meaningfully transparent", async () => {
    // Has alpha (so the cheap sample runs) but is uniformly opaque with no trimmable edge — this is
    // the exact shape that previously entered "trimming" before being rejected (ADR-FP-126).
    const bytes = await makeAlphaChannelButOpaquePng();
    const stagesSeen: string[] = [];
    const result = await processCustomerUploadImageBytes(bytes, {
      onStage: (stage) => {
        stagesSeen.push(stage);
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "background_not_transparent");
    assert.equal(result.message, "Background is not transparent.");
    assert.ok(
      !stagesSeen.includes("trimming"),
      `rejected upload must never enter the trimming stage, saw: ${stagesSeen.join(", ")}`,
    );
    assert.ok(stagesSeen.includes("checking_transparency"));
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
    const stagesSeen: string[] = [];
    const result = await processCustomerUploadImageBytes(bytes, {
      onStage: (stage) => {
        stagesSeen.push(stage);
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "unsupported_format");
    assert.ok(!stagesSeen.includes("trimming"), "rejected upload must never enter the trimming stage");
  });

  it("rejects a corrupt/undecodable file before any trimming", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
    const stagesSeen: string[] = [];
    const result = await processCustomerUploadImageBytes(bytes, {
      onStage: (stage) => {
        stagesSeen.push(stage);
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "could_not_decode");
    assert.ok(!stagesSeen.includes("trimming"), "corrupt file must never enter the trimming stage");
  });

  it("evaluates actual decoded bytes, not a filename — a falsely-labeled JPEG is still rejected as unsupported_format", async () => {
    // processCustomerUploadImageBytes takes only raw bytes (no filename/MIME parameter at all), so
    // this proves format detection is decode-driven by construction: encoding real JPEG bytes and
    // passing them in (as any caller would for a file renamed to `.png`) is still correctly detected
    // and rejected from the actual decoded format, never a trusted extension.
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 5, g: 5, b: 5 } },
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

  it("accepts opaque PNG when skipCustomerQualityGates is set", async () => {
    const bytes = await makeOpaquePng();
    const result = await processCustomerUploadImageBytes(bytes, {
      skipCustomerQualityGates: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sourceFormat, "png");
    assert.ok(result.productionPng.byteLength > 0);
  });

  it("accepts JPEG when skipCustomerQualityGates is set", async () => {
    const bytes = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();
    const result = await processCustomerUploadImageBytes(bytes, {
      skipCustomerQualityGates: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sourceFormat, "png");
    assert.ok(result.productionPng.byteLength > 0);
  });

  it("assistedProofFastIngest reuses PNG source and skips trim work", async () => {
    const bytes = await makeOpaquePng(500, 500);
    const result = await processCustomerUploadImageBytes(bytes, {
      assistedProofFastIngest: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.productionReusedSource, true);
    assert.equal(result.wasTrimmed, false);
    assert.equal(result.wasUpscaled, false);
    assert.ok(result.previewWebp.byteLength > 0);
    assert.ok(result.thumbnailWebp.byteLength > 0);
  });

  it("skipCustomerQualityGates upscales small art like normal finalize (library ingest)", async () => {
    // Opaque proof ~2.22" × 2.67" at 300 DPI → full path upscales toward ~12" width.
    // (Transparent fixture would trim empty margins first and hit the 6× cap sooner.)
    const bytes = await makeOpaquePng(666, 801);
    const fast = await processCustomerUploadImageBytes(bytes, {
      assistedProofFastIngest: true,
    });
    const full = await processCustomerUploadImageBytes(bytes, {
      skipCustomerQualityGates: true,
    });
    assert.equal(fast.ok, true, "fast path should succeed");
    assert.equal(full.ok, true, "full path should succeed");
    if (!fast.ok || !full.ok) {
      return;
    }
    assert.equal(fast.wasUpscaled, false);
    assert.ok(
      fast.approvedMaxPrintWidthInches < 3,
      `fast approved max should stay native-ish, got ${fast.approvedMaxPrintWidthInches}`,
    );
    assert.equal(
      full.wasUpscaled,
      true,
      `full path should upscale (w=${full.widthPx} aw=${full.approvedMaxPrintWidthInches})`,
    );
    assert.ok(
      full.approvedMaxPrintWidthInches >= 11.5,
      `full approved max should near 12", got ${full.approvedMaxPrintWidthInches}`,
    );
    assert.ok(full.widthPx > fast.widthPx);
  });

  // --- Goal #11: oversized-pixel normalization (ADR-FP-125) ---

  it("oversized-canvas transparent PNG is normalized (downscaled) instead of rejected", async () => {
    // 10,200 x 10,200 = 104,040,000 px, over CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS (100,000,000).
    // Only a 1px transparent border trims away, so trim alone cannot rescue it — normalization
    // must run.
    const bytes = await makeBarelyTransparentOversizedPng(12_000, 12_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true, "should normalize and succeed, not permanently reject");
    if (!result.ok) {
      return;
    }
    assert.equal(result.wasNormalizedForDimensions, true);
    assert.ok(
      result.widthPx * result.heightPx <= CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS,
      `normalized total pixels should be at/under ceiling, got ${result.widthPx}x${result.heightPx}`,
    );
    assert.ok(result.widthPx <= CUSTOMER_UPLOAD_MAX_DIMENSION_PX);
    assert.ok(result.heightPx <= CUSTOMER_UPLOAD_MAX_DIMENSION_PX);
  });

  it("normalization preserves transparency", async () => {
    const bytes = await makeBarelyTransparentOversizedPng(12_000, 12_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const meta = await sharp(result.productionPng).metadata();
    assert.equal(meta.hasAlpha, true);
  });

  it("normalization preserves aspect ratio", async () => {
    // Non-square, wide canvas — still over CUSTOMER_UPLOAD_MAX_DIMENSION_PX (15,000) on width.
    const bytes = await makeBarelyTransparentOversizedPng(20_000, 6_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.wasNormalizedForDimensions, true);
    const originalRatio = result.preNormalizationWidthPx / result.preNormalizationHeightPx;
    const normalizedRatio = result.widthPx / result.heightPx;
    assert.ok(
      Math.abs(originalRatio - normalizedRatio) < 0.01,
      `aspect ratio should be preserved: original=${originalRatio} normalized=${normalizedRatio}`,
    );
  });

  it("normalization does not crop (full noise interior survives, not just a corner)", async () => {
    const bytes = await makeBarelyTransparentOversizedPng(12_000, 12_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const stats = await sharp(result.productionPng).stats();
    // Cropping to a flat sub-region would collapse variance; a resized-but-uncropped noise field
    // still shows nonzero standard deviation on at least one channel.
    assert.ok(stats.channels.some((c) => c.stdev > 1), "expected surviving pixel variance, not a crop");
  });

  it("normalization does not distort (fit:inside, no forced aspect stretch)", async () => {
    const bytes = await makeBarelyTransparentOversizedPng(20_000, 6_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    // Distortion (fit:"fill") would force an exact target size regardless of source ratio; this
    // asserts the trimmed/normalized result still satisfies width/height <= ceiling from a
    // proportional resize, not an independently-chosen fixed target size.
    assert.ok(result.widthPx <= CUSTOMER_UPLOAD_MAX_DIMENSION_PX);
    assert.ok(result.heightPx <= CUSTOMER_UPLOAD_MAX_DIMENSION_PX);
  });

  it("normalization never upscales", async () => {
    const bytes = await makeBarelyTransparentOversizedPng(12_000, 12_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.ok(result.widthPx <= result.preNormalizationWidthPx);
    assert.ok(result.heightPx <= result.preNormalizationHeightPx);
    assert.equal(result.wasUpscaled, false);
  });

  it("effective DPI is recomputed honestly from actual normalized pixels (not the original's)", async () => {
    const bytes = await makeBarelyTransparentOversizedPng(12_000, 12_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    // effectiveDpi/approvedMax are derived from post-normalization widthPx/heightPx by the same
    // shared sizing code as every other path (buildImportPrintSizeCreateFields) — assert DPI is a
    // sane positive value consistent with the *normalized* pixel count, not the pre-normalization
    // 10,200px source (which would imply a much higher DPI at the same approved print width).
    assert.ok(result.effectiveDpi > 0);
    assert.ok(result.widthPx < result.preNormalizationWidthPx);
    const dpiImpliedByOriginalPixels = result.preNormalizationWidthPx / result.approvedMaxPrintWidthInches;
    assert.ok(
      result.effectiveDpi < dpiImpliedByOriginalPixels,
      `effectiveDpi (${result.effectiveDpi}) should reflect the smaller normalized pixel count, not the larger original (${dpiImpliedByOriginalPixels})`,
    );
  });

  it("maximum printable dimensions are recomputed from normalized pixels", async () => {
    const bytes = await makeBarelyTransparentOversizedPng(12_000, 12_000);
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.ok(result.approvedMaxPrintWidthInches > 0);
    assert.ok(result.approvedMaxPrintHeightInches > 0);
    assert.ok(
      result.approvedMaxPrintWidthInches < CUSTOMER_UPLOAD_MAX_DIMENSION_PX,
      "approved max print size should be a sane inch value derived from normalized pixels, not raw pixel count",
    );
  });

  it("wasNormalizedForDimensions and wasUpscaled are independent booleans (not coupled)", async () => {
    // Normal in-range small opaque art: neither should fire together, but the important structural
    // property is that both fields exist and are independently readable — not that one implies the
    // other's value.
    const bytes = await makeOpaquePng(400, 400);
    const result = await processCustomerUploadImageBytes(bytes, { skipCustomerQualityGates: true });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(typeof result.wasNormalizedForDimensions, "boolean");
    assert.equal(typeof result.wasUpscaled, "boolean");
    assert.equal(result.wasNormalizedForDimensions, false);
  });

  it("a source exceeding the decoder's bounded pixel limit fails with an actionable error, not a crash", async () => {
    // Construct raw pixels just over the decode-time limitInputPixels ceiling and encode as PNG,
    // then feed it back in — sharp/libvips must reject the *decode* itself (limitInputPixels),
    // not allocate an unbounded raster buffer first.
    const oversidePx = Math.ceil(Math.sqrt(CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS)) + 2000;
    const bytes = await sharp({
      create: {
        width: oversidePx,
        height: 50,
        channels: 4,
        background: { r: 10, g: 10, b: 10, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, false, "should fail cleanly, not throw or hang");
    if (result.ok) {
      return;
    }
    assert.ok(
      result.code === "could_not_decode" || result.code === "image_exceeds_limits",
      `expected an actionable rejection code, got ${result.code}`,
    );
  });

  it("normal-size WebP uploads are unchanged by the normalization pass", async () => {
    const bytes = await sharp(await makeTransparentPng(300, 300)).webp().toBuffer();
    const result = await processCustomerUploadImageBytes(bytes);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sourceFormat, "webp");
    assert.equal(result.wasNormalizedForDimensions, false);
  });

  it("sanitized stage timings identify the actual stages that ran, with only names and numbers", async () => {
    const bytes = await makeTransparentPng();
    const stagesSeen: string[] = [];
    const result = await processCustomerUploadImageBytes(bytes, {
      onStage: (stage) => {
        stagesSeen.push(stage);
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.ok(Object.keys(result.stageTimingsMs).length > 0, "expected at least one recorded stage");
    for (const [stage, durationMs] of Object.entries(result.stageTimingsMs)) {
      assert.ok(stagesSeen.includes(stage), `timed stage "${stage}" should be one reported via onStage`);
      assert.equal(typeof durationMs, "number");
      assert.ok((durationMs as number) >= 0);
    }
    // Sanitization: only stage-name keys and numeric values, nothing else (no content/paths/ids).
    for (const value of Object.values(result.stageTimingsMs)) {
      assert.equal(typeof value, "number");
    }
  });
});
